//! ARM11 (ARMv6K) instruction decoder.
//!
//! Decodes a 32-bit ARM instruction word into a `DecodedInstruction`. This is
//! intentionally a pure function so the executor can be tested independently
//! and so a future IR-based JIT can reuse the same decoder.
//!
//! The ARM encoding primarily dispatches on bits [27:25]:
//!
//! ```text
//! 000  Data processing (register shift) / multiply / halfword transfer / BX
//! 001  Data processing (immediate) / MSR immediate
//! 010  Load/store immediate offset
//! 011  Load/store register offset / undefined
//! 100  Load/store multiple (block transfer)
//! 101  Branch / Branch-with-link
//! 110  Coprocessor load/store        (unhandled in Phase 0)
//! 111  Coprocessor data / SWI        (unhandled in Phase 0)
//! ```

use crate::types::{
    AddressingMode, BlockMode, Condition, DataOp, DecodedInstruction, LoadStoreFlags, SaturatedOp,
    ShiftType, ShifterOperand, TransferSize,
};

/// Decode a single 32-bit ARM instruction word.
///
/// This never panics. Unknown or currently-unhandled encodings return
/// `DecodedInstruction::Undefined { raw }`.
pub fn decode(instr: u32) -> DecodedInstruction {
    let cond = Condition::from_bits(instr >> 28);
    let class = (instr >> 25) & 0b111;

    match class {
        0b000 => decode_class_000(cond, instr),
        0b001 => decode_class_001(cond, instr),
        0b010 => decode_single_data_transfer(cond, instr, /* imm */ true),
        0b011 => {
            // Register-offset load/store — but if bit 4 is set while bit 25 is set,
            // that's a "media instruction" / undefined in ARMv6K for most encodings.
            if (instr >> 4) & 1 == 1 {
                DecodedInstruction::Undefined { raw: instr }
            } else {
                decode_single_data_transfer(cond, instr, /* imm */ false)
            }
        }
        0b100 => decode_block_transfer(cond, instr),
        0b101 => decode_branch(cond, instr),
        0b110 => decode_class_110(cond, instr),
        0b111 => decode_class_111(cond, instr),
        _ => DecodedInstruction::Undefined { raw: instr },
    }
}

// ─────────────────────────────────────────────────────────────────────
// Class 000: data-processing register / multiply / halfword / BX
// ─────────────────────────────────────────────────────────────────────

fn decode_class_000(cond: Condition, instr: u32) -> DecodedInstruction {
    // Multiply and multiply-long share bits [7:4] = 1001.
    if ((instr >> 4) & 0xF) == 0b1001 {
        // Differentiate on bits [27:23] (top 5 bits of the opcode class):
        //   00000 → MUL/MLA
        //   00001 → UMULL/UMLAL/SMULL/SMLAL
        let top = (instr >> 23) & 0b11111;
        if top == 0b00000 {
            return decode_multiply(cond, instr);
        }
        if top == 0b00001 {
            return decode_multiply_long(cond, instr);
        }
        // Other 1001 encodings (SWP) — not implemented in Phase 0.
        return DecodedInstruction::Undefined { raw: instr };
    }

    // Halfword / signed byte / signed halfword: bit [7] = 1 and bit [4] = 1
    // and bits [6:5] != 00.
    let bit7 = (instr >> 7) & 1 == 1;
    let bit4 = (instr >> 4) & 1 == 1;
    let sh = (instr >> 5) & 0b11;
    if bit7 && bit4 && sh != 0 {
        return decode_halfword_transfer(cond, instr);
    }

    // ── MRS / MSR (register form) ───────────────────────────────────
    // Both share bits [27:23] = 00010 (op_bits high nibble == 0b0001) and
    // bits [7:4] = 0000. Distinguish by bit [21] (R: 0=CPSR, 1=SPSR) and
    // bit [22] (op: 0=MRS, 1=MSR... actually it's the other way; we use the
    // dedicated mask patterns below for clarity).
    //
    // MRS Rd, CPSR : cond 00010 0001 1111 Rd 0000 0000 0000  → mask 0x0FBF_0FFF, val 0x010F_0000
    // MRS Rd, SPSR : cond 00010 1001 1111 Rd 0000 0000 0000  → mask 0x0FBF_0FFF, val 0x014F_0000
    // MSR CPSR, Rm : cond 00010 010 mask 1111 0000 0000 Rm   → mask 0x0FB0_FFF0, val 0x0120_F000
    // MSR SPSR, Rm : cond 00010 110 mask 1111 0000 0000 Rm   → mask 0x0FB0_FFF0, val 0x0160_F000
    // Note: bit 22 (R bit) selects CPSR vs SPSR, so the mask must INCLUDE bit 22.
    if (instr & 0x0FFF_0FFF) == 0x010F_0000 {
        // MRS Rd, CPSR
        let rd = ((instr >> 12) & 0xF) as u8;
        return DecodedInstruction::PsrTransfer {
            cond,
            is_read: true,
            use_spsr: false,
            rd,
            field_mask: 0,
            operand: ShifterOperand::Immediate { imm8: 0, rotate: 0 },
        };
    }
    if (instr & 0x0FFF_0FFF) == 0x014F_0000 {
        // MRS Rd, SPSR
        let rd = ((instr >> 12) & 0xF) as u8;
        return DecodedInstruction::PsrTransfer {
            cond,
            is_read: true,
            use_spsr: true,
            rd,
            field_mask: 0,
            operand: ShifterOperand::Immediate { imm8: 0, rotate: 0 },
        };
    }
    if (instr & 0x0FF0_FFF0) == 0x0120_F000 {
        // MSR CPSR_<f>, Rm
        let field_mask = ((instr >> 16) & 0xF) as u8;
        let rm = (instr & 0xF) as u8;
        return DecodedInstruction::PsrTransfer {
            cond,
            is_read: false,
            use_spsr: false,
            rd: 0,
            field_mask,
            operand: ShifterOperand::ImmediateShift {
                rm,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        };
    }
    if (instr & 0x0FF0_FFF0) == 0x0160_F000 {
        // MSR SPSR_<f>, Rm
        let field_mask = ((instr >> 16) & 0xF) as u8;
        let rm = (instr & 0xF) as u8;
        return DecodedInstruction::PsrTransfer {
            cond,
            is_read: false,
            use_spsr: true,
            rd: 0,
            field_mask,
            operand: ShifterOperand::ImmediateShift {
                rm,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        };
    }

    // ── Saturated arithmetic (QADD/QSUB/QDADD/QDSUB) ────────────────
    // All four share bits [27:24] = 0001, bit [4] = 0, and bits [7:5] = 010
    // (so [7:4] = 0101). The op2 selector lives in bits [22:21]:
    //   00 → QADD
    //   01 → QSUB
    //   10 → QDADD
    //   11 → QDSUB
    // Bits [23] = 0 and bit [20] = 0; bits [11:8] = 0000.
    if ((instr >> 23) & 0b11111) == 0b00010
        && ((instr >> 20) & 1) == 0
        && ((instr >> 4) & 0xFF) == 0b0000_0101
        && ((instr >> 8) & 0xF) == 0
    {
        let op2 = (instr >> 21) & 0b11;
        let op = match op2 {
            0b00 => SaturatedOp::Qadd,
            0b01 => SaturatedOp::Qsub,
            0b10 => SaturatedOp::Qdadd,
            _ => SaturatedOp::Qdsub,
        };
        return DecodedInstruction::SaturatedArith {
            cond,
            op,
            rn: ((instr >> 16) & 0xF) as u8,
            rd: ((instr >> 12) & 0xF) as u8,
            rm: (instr & 0xF) as u8,
        };
    }

    // BX / BLX (register): bits [27:20] = 0001 0010 and bits [7:4] = 0001 / 0011
    // bits [19:8] = 1111 1111 1111.
    let op_bits = (instr >> 20) & 0xFF;
    let id_bits = (instr >> 8) & 0xFFF;
    let trail = (instr >> 4) & 0xF;
    if (op_bits == 0b0001_0010) && (id_bits == 0xFFF) && (trail == 0b0001 || trail == 0b0011) {
        return DecodedInstruction::BranchExchange {
            cond,
            link: trail == 0b0011,
            rm: (instr & 0xF) as u8,
        };
    }

    // Otherwise it's a plain data-processing with a register operand.
    decode_data_processing_register(cond, instr)
}

fn decode_multiply(cond: Condition, instr: u32) -> DecodedInstruction {
    let set_flags = (instr >> 20) & 1 == 1;
    let accumulate = (instr >> 21) & 1 == 1;
    DecodedInstruction::Multiply {
        cond,
        accumulate,
        set_flags,
        rd: ((instr >> 16) & 0xF) as u8,
        rn: ((instr >> 12) & 0xF) as u8,
        rs: ((instr >> 8) & 0xF) as u8,
        rm: (instr & 0xF) as u8,
    }
}

fn decode_multiply_long(cond: Condition, instr: u32) -> DecodedInstruction {
    let set_flags = (instr >> 20) & 1 == 1;
    let accumulate = (instr >> 21) & 1 == 1;
    let signed = (instr >> 22) & 1 == 1;
    DecodedInstruction::MultiplyLong {
        cond,
        signed,
        accumulate,
        set_flags,
        rd_lo: ((instr >> 12) & 0xF) as u8,
        rd_hi: ((instr >> 16) & 0xF) as u8,
        rs: ((instr >> 8) & 0xF) as u8,
        rm: (instr & 0xF) as u8,
    }
}

fn decode_data_processing_register(cond: Condition, instr: u32) -> DecodedInstruction {
    let op = DataOp::from_bits(instr >> 21);
    let set_flags = (instr >> 20) & 1 == 1;
    let rn = ((instr >> 16) & 0xF) as u8;
    let rd = ((instr >> 12) & 0xF) as u8;
    let rm = (instr & 0xF) as u8;
    let shift_type = ShiftType::from_bits(instr >> 5);

    // Bit 4: 0 = shift by immediate, 1 = shift by register (Rs).
    let operand = if (instr >> 4) & 1 == 0 {
        let amount = ((instr >> 7) & 0x1F) as u8;
        // RRX is encoded as ROR with amount = 0.
        if shift_type == ShiftType::Ror && amount == 0 {
            ShifterOperand::Rrx { rm }
        } else {
            ShifterOperand::ImmediateShift {
                rm,
                shift: shift_type,
                amount,
            }
        }
    } else {
        let rs = ((instr >> 8) & 0xF) as u8;
        ShifterOperand::RegisterShift {
            rm,
            shift: shift_type,
            rs,
        }
    };

    DecodedInstruction::DataProcessing {
        cond,
        op,
        set_flags,
        rn,
        rd,
        operand,
    }
}

fn decode_halfword_transfer(cond: Condition, instr: u32) -> DecodedInstruction {
    let pre = (instr >> 24) & 1 == 1;
    let up = (instr >> 23) & 1 == 1;
    let imm_offset = (instr >> 22) & 1 == 1; // I-bit for halfword: 1 = immediate
    let writeback = ((instr >> 21) & 1 == 1) || !pre;
    let load = (instr >> 20) & 1 == 1;
    let rn = ((instr >> 16) & 0xF) as u8;
    let rd = ((instr >> 12) & 0xF) as u8;
    let sh = (instr >> 5) & 0b11;
    let size = match sh {
        0b01 => TransferSize::Halfword,
        0b10 => TransferSize::SignedByte,
        0b11 => TransferSize::SignedHalfword,
        _ => return DecodedInstruction::Undefined { raw: instr },
    };

    // Halfword encodings cannot store signed variants; LDRSB/LDRSH imply load.
    if !load && (size == TransferSize::SignedByte || size == TransferSize::SignedHalfword) {
        return DecodedInstruction::Undefined { raw: instr };
    }

    let address = if imm_offset {
        // Halfword immediate is split: high nibble in [11:8], low nibble in [3:0].
        let imm = ((instr >> 4) & 0xF0) | (instr & 0xF);
        AddressingMode::Immediate { imm12: imm }
    } else {
        AddressingMode::Register {
            rm: (instr & 0xF) as u8,
            shift: ShiftType::Lsl,
            amount: 0,
        }
    };

    DecodedInstruction::HalfwordDataTransfer {
        cond,
        load,
        size,
        flags: LoadStoreFlags {
            pre,
            up,
            writeback,
        },
        rn,
        rd,
        address,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Class 001: data-processing immediate / MSR immediate
// ─────────────────────────────────────────────────────────────────────

fn decode_class_001(cond: Condition, instr: u32) -> DecodedInstruction {
    let op = DataOp::from_bits(instr >> 21);
    let set_flags = (instr >> 20) & 1 == 1;

    // The TST/TEQ/CMP/CMN slot with S=0 in immediate form is reserved by ARM
    // for MSR-immediate (MRS has no immediate form). The R-bit at position 22
    // selects CPSR vs SPSR. Mask 0x0FB0_F000 zeros bit 22 so a single check
    // catches both variants; the value of bit 22 is then tested separately.
    //
    // MSR CPSR_<f>, #imm : cond 00110 010 mask 1111 rot imm8
    // MSR SPSR_<f>, #imm : cond 00110 110 mask 1111 rot imm8
    if op.is_test() && !set_flags {
        if (instr & 0x0FB0_F000) == 0x0320_F000 {
            let use_spsr = (instr & 0x0040_0000) != 0;
            let field_mask = ((instr >> 16) & 0xF) as u8;
            let rotate = (instr >> 8) & 0xF;
            let imm8 = instr & 0xFF;
            return DecodedInstruction::PsrTransfer {
                cond,
                is_read: false,
                use_spsr,
                rd: 0,
                field_mask,
                operand: ShifterOperand::Immediate { imm8, rotate },
            };
        }
        // Anything else in this slot is reserved/unpredictable.
        return DecodedInstruction::Undefined { raw: instr };
    }

    let rn = ((instr >> 16) & 0xF) as u8;
    let rd = ((instr >> 12) & 0xF) as u8;
    let rotate = (instr >> 8) & 0xF;
    let imm8 = instr & 0xFF;
    let operand = ShifterOperand::Immediate { imm8, rotate };

    DecodedInstruction::DataProcessing {
        cond,
        op,
        set_flags,
        rn,
        rd,
        operand,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Class 010 / 011: single data transfer (LDR/STR/LDRB/STRB)
// ─────────────────────────────────────────────────────────────────────

fn decode_single_data_transfer(
    cond: Condition,
    instr: u32,
    immediate_form: bool,
) -> DecodedInstruction {
    let pre = (instr >> 24) & 1 == 1;
    let up = (instr >> 23) & 1 == 1;
    let byte = (instr >> 22) & 1 == 1;
    let writeback = ((instr >> 21) & 1 == 1) || !pre;
    let load = (instr >> 20) & 1 == 1;
    let rn = ((instr >> 16) & 0xF) as u8;
    let rd = ((instr >> 12) & 0xF) as u8;
    let size = if byte {
        TransferSize::Byte
    } else {
        TransferSize::Word
    };

    let address = if immediate_form {
        AddressingMode::Immediate {
            imm12: instr & 0xFFF,
        }
    } else {
        let amount = ((instr >> 7) & 0x1F) as u8;
        let shift = ShiftType::from_bits(instr >> 5);
        let rm = (instr & 0xF) as u8;
        AddressingMode::Register { rm, shift, amount }
    };

    DecodedInstruction::SingleDataTransfer {
        cond,
        load,
        size,
        flags: LoadStoreFlags {
            pre,
            up,
            writeback,
        },
        rn,
        rd,
        address,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Class 100: block data transfer (LDM/STM)
// ─────────────────────────────────────────────────────────────────────

fn decode_block_transfer(cond: Condition, instr: u32) -> DecodedInstruction {
    let pre = (instr >> 24) & 1 == 1;
    let up = (instr >> 23) & 1 == 1;
    let s_bit = (instr >> 22) & 1 == 1;
    let writeback = (instr >> 21) & 1 == 1;
    let load = (instr >> 20) & 1 == 1;
    let rn = ((instr >> 16) & 0xF) as u8;
    let reg_list = (instr & 0xFFFF) as u16;
    DecodedInstruction::BlockTransfer {
        cond,
        load,
        mode: BlockMode::from_pu(pre, up),
        writeback,
        s_bit,
        rn,
        reg_list,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Class 110: coprocessor load/store (LDC/STC) — unmodelled, undefined
// ─────────────────────────────────────────────────────────────────────

fn decode_class_110(_cond: Condition, instr: u32) -> DecodedInstruction {
    // LDC/STC are not used by the 3DS HLE kernel; treat as undefined.
    DecodedInstruction::Undefined { raw: instr }
}

// ─────────────────────────────────────────────────────────────────────
// Class 111: coprocessor data/transfer (CDP/MRC/MCR) and SWI/SVC
// ─────────────────────────────────────────────────────────────────────

fn decode_class_111(cond: Condition, instr: u32) -> DecodedInstruction {
    // SWI / SVC: bits [27:24] = 1111.
    if ((instr >> 24) & 0xF) == 0b1111 {
        return DecodedInstruction::SoftwareInterrupt {
            cond,
            imm24: instr & 0x00FF_FFFF,
        };
    }

    // Coprocessor data / register transfer: bits [27:24] = 1110.
    // Distinguish CDP (bit [4]=0) from MRC/MCR (bit [4]=1).
    if ((instr >> 24) & 0xF) == 0b1110 {
        if ((instr >> 4) & 1) == 1 {
            // MRC/MCR — register transfer.
            // Bit [20] selects direction: 1 = MRC (read coproc → Rt),
            // 0 = MCR (write Rt → coproc).
            let is_read = ((instr >> 20) & 1) == 1;
            let opc1 = ((instr >> 21) & 0b111) as u8;
            let crn = ((instr >> 16) & 0xF) as u8;
            let rt = ((instr >> 12) & 0xF) as u8;
            let cp_num = ((instr >> 8) & 0xF) as u8;
            let opc2 = ((instr >> 5) & 0b111) as u8;
            let crm = (instr & 0xF) as u8;
            return DecodedInstruction::CoprocessorRegisterTransfer {
                cond,
                is_read,
                cp_num,
                opc1,
                opc2,
                crn,
                crm,
                rt,
            };
        }
        // CDP (coprocessor data operation) — unmodelled.
    }

    DecodedInstruction::Undefined { raw: instr }
}

// ─────────────────────────────────────────────────────────────────────
// Class 101: branch / branch-with-link
// ─────────────────────────────────────────────────────────────────────

fn decode_branch(cond: Condition, instr: u32) -> DecodedInstruction {
    let link = (instr >> 24) & 1 == 1;
    // Sign-extend the 24-bit immediate, shift left by 2.
    let raw = instr & 0x00FF_FFFF;
    let sign_extended = ((raw << 8) as i32) >> 6; // shift 8 in, then arithmetic shift 6 back
    DecodedInstruction::Branch {
        cond,
        link,
        offset: sign_extended,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper: encode a data-processing register operand instruction the hand-assembled way.
    fn dp_reg(cond: u32, op: u32, s: u32, rn: u32, rd: u32, rm: u32) -> u32 {
        (cond << 28) | (op << 21) | (s << 20) | (rn << 16) | (rd << 12) | rm
    }

    #[test]
    fn decodes_add_register() {
        // ADDS r0, r1, r2  → cond=AL, op=ADD(0100), S=1, Rn=1, Rd=0, Rm=2
        let instr = dp_reg(0xE, 0b0100, 1, 1, 0, 2);
        let d = decode(instr);
        match d {
            DecodedInstruction::DataProcessing {
                cond,
                op,
                set_flags,
                rn,
                rd,
                operand,
            } => {
                assert_eq!(cond, Condition::Al);
                assert_eq!(op, DataOp::Add);
                assert!(set_flags);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::ImmediateShift {
                        rm,
                        shift,
                        amount,
                    } => {
                        assert_eq!(rm, 2);
                        assert_eq!(shift, ShiftType::Lsl);
                        assert_eq!(amount, 0);
                    }
                    _ => panic!("expected ImmediateShift"),
                }
            }
            other => panic!("wrong kind: {:?}", other),
        }
    }

    #[test]
    fn decodes_mov_immediate() {
        // MOV r0, #0xFF → cond=AL, I=1, op=MOV(1101), S=0, Rd=0, imm8=0xFF
        // 0xE3A000FF
        let instr = 0xE3A0_00FF;
        let d = decode(instr);
        match d {
            DecodedInstruction::DataProcessing {
                op,
                set_flags,
                rd,
                operand,
                ..
            } => {
                assert_eq!(op, DataOp::Mov);
                assert!(!set_flags);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        assert_eq!(imm8, 0xFF);
                        assert_eq!(rotate, 0);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_branch_and_link() {
        // BL +8: 0xEB000000 with offset=0 means branch-with-link to PC+8.
        // Actually EB000000 is BL #0 (relative offset 0 → PC+8 in execution).
        let instr = 0xEB00_0000u32;
        let d = decode(instr);
        match d {
            DecodedInstruction::Branch { cond, link, offset } => {
                assert_eq!(cond, Condition::Al);
                assert!(link);
                assert_eq!(offset, 0);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_branch_backwards() {
        // B -4: 0xEAFFFFFE (offset = -2 * 4 = -8, landing 0 bytes before PC relative)
        let instr = 0xEAFF_FFFEu32;
        match decode(instr) {
            DecodedInstruction::Branch { offset, link, .. } => {
                assert!(!link);
                assert_eq!(offset, -8);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_bx_register() {
        // BX r14: 0xE12FFF1E
        let instr = 0xE12F_FF1Eu32;
        match decode(instr) {
            DecodedInstruction::BranchExchange { link, rm, .. } => {
                assert!(!link);
                assert_eq!(rm, 14);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_blx_register() {
        // BLX r3: 0xE12FFF33
        let instr = 0xE12F_FF33u32;
        match decode(instr) {
            DecodedInstruction::BranchExchange { link, rm, .. } => {
                assert!(link);
                assert_eq!(rm, 3);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_mul() {
        // MULS r0, r1, r2 → cond=AL, acc=0, S=1, Rd=0, Rs=2, Rm=1
        // Encoding: E_0_1_00000_Rd(0)_0000_Rs(2)_1001_Rm(1)
        // 0xE010_0291
        let instr = 0xE010_0291u32;
        match decode(instr) {
            DecodedInstruction::Multiply {
                accumulate,
                set_flags,
                rd,
                rs,
                rm,
                ..
            } => {
                assert!(!accumulate);
                assert!(set_flags);
                assert_eq!(rd, 0);
                assert_eq!(rs, 2);
                assert_eq!(rm, 1);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_ldr_immediate_offset() {
        // LDR r0, [r1, #4]  → 0xE591_0004
        let instr = 0xE591_0004u32;
        match decode(instr) {
            DecodedInstruction::SingleDataTransfer {
                load,
                size,
                flags,
                rn,
                rd,
                address,
                ..
            } => {
                assert!(load);
                assert_eq!(size, TransferSize::Word);
                assert!(flags.pre);
                assert!(flags.up);
                assert!(!flags.writeback);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 4),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_ldmfd() {
        // LDMFD sp!, {r0, r1, r2, pc} → 0xE8BD_8007
        let instr = 0xE8BD_8007u32;
        match decode(instr) {
            DecodedInstruction::BlockTransfer {
                load,
                mode,
                writeback,
                rn,
                reg_list,
                ..
            } => {
                assert!(load);
                assert_eq!(mode, BlockMode::IncrementAfter); // LDMFD = LDMIA
                assert!(writeback);
                assert_eq!(rn, 13);
                assert_eq!(reg_list, 0x8007);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn decodes_ldrh_immediate() {
        // LDRH r0, [r1, #4] → E1D100B4
        let instr = 0xE1D1_00B4u32;
        match decode(instr) {
            DecodedInstruction::HalfwordDataTransfer {
                load, size, rd, rn, ..
            } => {
                assert!(load);
                assert_eq!(size, TransferSize::Halfword);
                assert_eq!(rd, 0);
                assert_eq!(rn, 1);
            }
            _ => panic!("got {:?}", decode(instr)),
        }
    }
}
