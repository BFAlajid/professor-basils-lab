//! Thumb-1 (ARMv6K) instruction decoder.
//!
//! Decodes a 16-bit Thumb instruction word into the same `DecodedInstruction`
//! enum the ARM decoder produces, so the executor needs no Thumb-specific
//! path. The point of this module is to translate Thumb encodings into the
//! ARM IR — sometimes one-to-one, sometimes by lifting an implicit field
//! (e.g. condition is always `Al` in Thumb-1 except for the conditional
//! branch form).
//!
//! ## A few non-obvious encoding notes
//!
//! - Most Thumb data-processing instructions implicitly set the flags (S=1).
//!   The two exceptions are ADD/MOV in the hi-register form (Format 5),
//!   which leave flags untouched.
//! - The Thumb LSR/ASR by #0 immediate encodings actually mean LSR #32 /
//!   ASR #32, which on ARMv6K is signalled by `amount = 0` in the
//!   `ImmediateShift` operand. The barrel shifter already understands this
//!   convention from the ARM decoder, so we keep it.
//! - PC-relative loads in Thumb use a PC value of `(current_pc + 4) & !3`.
//!   The decoder does NOT compute the effective address — it just emits an
//!   immediate offset. The executor reads PC and applies the alignment,
//!   exactly as in ARM mode.
//! - Format 19 BL is a TWO-instruction sequence on Thumb-1. The H=0 (prefix)
//!   half only stores intermediate state into LR; on its own it has no ARM
//!   IR equivalent. We decode it as `Undefined { raw }` and rely on the
//!   executor (wired up separately) to recognise the prefix/suffix pair.
//!   The H=1 (suffix) half is decoded as `Branch { link: true }` carrying
//!   the low half of the offset. Interpreting the full 22-bit BL target is
//!   the executor's job.

use crate::types::{
    AddressingMode, BlockMode, Condition, DataOp, DecodedInstruction, LoadStoreFlags, Reg,
    ShiftType, ShifterOperand, TransferSize,
};

/// Decode a single 16-bit Thumb instruction word.
///
/// Never panics. Unknown or unhandled encodings return
/// `DecodedInstruction::Undefined { raw }` where `raw` is the 16-bit word
/// zero-extended into a 32-bit field (so callers can keep a single
/// "undefined" representation).
pub fn decode_thumb(instr: u16) -> DecodedInstruction {
    // Top 3 bits give a coarse classification of Thumb-1 forms.
    let top3 = (instr >> 13) & 0b111;
    match top3 {
        0b000 => decode_top_000(instr), // formats 1 and 2
        0b001 => decode_format_3(instr),
        0b010 => decode_top_010(instr), // formats 4, 5, 6, 7, 8
        0b011 => decode_format_9(instr),
        0b100 => decode_top_100(instr), // formats 10, 11
        0b101 => decode_top_101(instr), // formats 12, 13, 14
        0b110 => decode_top_110(instr), // formats 15, 16, 17
        0b111 => decode_top_111(instr), // formats 18, 19
        _ => undef(instr),
    }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

#[inline]
fn undef(instr: u16) -> DecodedInstruction {
    DecodedInstruction::Undefined {
        raw: instr as u32,
    }
}

#[inline]
fn r3(field: u16) -> Reg {
    (field & 0b111) as Reg
}

/// Sign-extend an `n`-bit value to i32. `n` must be in 1..=32.
#[inline]
fn sign_extend(value: u32, bits: u32) -> i32 {
    let shift = 32 - bits;
    ((value << shift) as i32) >> shift
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b000 — formats 1 and 2
// ─────────────────────────────────────────────────────────────────────

fn decode_top_000(instr: u16) -> DecodedInstruction {
    // Bits [12:11] differentiate format 1 vs format 2:
    //   00, 01, 10 → format 1 (LSL/LSR/ASR immediate)
    //   11         → format 2 (add/subtract)
    let op = (instr >> 11) & 0b11;
    if op == 0b11 {
        decode_format_2(instr)
    } else {
        decode_format_1(instr, op)
    }
}

/// Format 1: move shifted register.
/// `0 0 0 op[2] offset5 Rs Rd` — LSL/LSR/ASR (op = 00/01/10), all set flags.
fn decode_format_1(instr: u16, op_bits: u16) -> DecodedInstruction {
    let amount = ((instr >> 6) & 0b11111) as u8;
    let rs = r3(instr >> 3);
    let rd = r3(instr);
    let shift = match op_bits {
        0b00 => ShiftType::Lsl,
        0b01 => ShiftType::Lsr,
        0b10 => ShiftType::Asr,
        _ => return undef(instr),
    };
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op: DataOp::Mov,
        set_flags: true,
        rn: 0,
        rd,
        operand: ShifterOperand::ImmediateShift {
            rm: rs,
            shift,
            amount,
        },
    }
}

/// Format 2: add/subtract register or 3-bit immediate.
/// `0 0 0 1 1 I op Rn/imm3 Rs Rd`
fn decode_format_2(instr: u16) -> DecodedInstruction {
    let immediate = (instr >> 10) & 1 == 1;
    let sub = (instr >> 9) & 1 == 1;
    let rn_or_imm = (instr >> 6) & 0b111;
    let rs = r3(instr >> 3);
    let rd = r3(instr);
    let op = if sub { DataOp::Sub } else { DataOp::Add };

    let operand = if immediate {
        ShifterOperand::Immediate {
            imm8: rn_or_imm as u32,
            rotate: 0,
        }
    } else {
        ShifterOperand::ImmediateShift {
            rm: rn_or_imm as Reg,
            shift: ShiftType::Lsl,
            amount: 0,
        }
    };

    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op,
        set_flags: true,
        rn: rs,
        rd,
        operand,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Format 3 — move/compare/add/subtract 8-bit immediate
// ─────────────────────────────────────────────────────────────────────

fn decode_format_3(instr: u16) -> DecodedInstruction {
    // 0 0 1 op Rd offset8
    let op_bits = (instr >> 11) & 0b11;
    let rd = r3(instr >> 8);
    let imm8 = (instr & 0xFF) as u32;
    let (op, rn) = match op_bits {
        0b00 => (DataOp::Mov, 0u8),
        0b01 => (DataOp::Cmp, rd),
        0b10 => (DataOp::Add, rd),
        0b11 => (DataOp::Sub, rd),
        _ => return undef(instr),
    };
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op,
        set_flags: true,
        rn,
        rd,
        operand: ShifterOperand::Immediate { imm8, rotate: 0 },
    }
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b010 — formats 4, 5, 6, 7, 8
// ─────────────────────────────────────────────────────────────────────

fn decode_top_010(instr: u16) -> DecodedInstruction {
    // Bit [12] = 1 → format 7 or 8 (load/store with register offset).
    if (instr >> 12) & 1 == 1 {
        // Bit [9] = 0 → format 7, = 1 → format 8.
        if (instr >> 9) & 1 == 0 {
            return decode_format_7(instr);
        } else {
            return decode_format_8(instr);
        }
    }
    // Bit [11] = 1 → format 6 (PC-relative load).
    if (instr >> 11) & 1 == 1 {
        return decode_format_6(instr);
    }
    // Bit [10] differentiates format 4 (ALU reg-reg) from format 5 (hi-reg / BX).
    if (instr >> 10) & 1 == 0 {
        decode_format_4(instr)
    } else {
        decode_format_5(instr)
    }
}

/// Format 4: ALU operations on R0..R7.
/// `0 1 0 0 0 0 op[3:0] Rs Rd`
fn decode_format_4(instr: u16) -> DecodedInstruction {
    let op_field = (instr >> 6) & 0xF;
    let rs = r3(instr >> 3);
    let rd = r3(instr);

    // The 16 sub-opcodes per the Thumb-1 spec.
    match op_field {
        0x0 => alu_reg(DataOp::And, rd, rs), // AND Rd, Rs
        0x1 => alu_reg(DataOp::Eor, rd, rs), // EOR Rd, Rs
        // LSL/LSR/ASR/ROR Rd, Rs — register-specified shift, op = MOV.
        0x2 => alu_reg_shift(rd, ShiftType::Lsl, rs),
        0x3 => alu_reg_shift(rd, ShiftType::Lsr, rs),
        0x4 => alu_reg_shift(rd, ShiftType::Asr, rs),
        0x5 => alu_reg(DataOp::Adc, rd, rs), // ADC Rd, Rs
        0x6 => alu_reg(DataOp::Sbc, rd, rs), // SBC Rd, Rs
        0x7 => alu_reg_shift(rd, ShiftType::Ror, rs),
        // TST sets flags, no writeback.
        0x8 => DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Tst,
            set_flags: true,
            rn: rd,
            rd: 0,
            operand: ShifterOperand::ImmediateShift {
                rm: rs,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        },
        // NEG Rd, Rs  →  RSB Rd, Rs, #0
        0x9 => DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Rsb,
            set_flags: true,
            rn: rs,
            rd,
            operand: ShifterOperand::Immediate { imm8: 0, rotate: 0 },
        },
        // CMP Rd, Rs (no writeback).
        0xA => DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Cmp,
            set_flags: true,
            rn: rd,
            rd: 0,
            operand: ShifterOperand::ImmediateShift {
                rm: rs,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        },
        // CMN Rd, Rs.
        0xB => DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Cmn,
            set_flags: true,
            rn: rd,
            rd: 0,
            operand: ShifterOperand::ImmediateShift {
                rm: rs,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        },
        0xC => alu_reg(DataOp::Orr, rd, rs), // ORR Rd, Rs
        // MUL Rd, Rs  →  Multiply { rd, rm = Rs, rs = Rd, accumulate = false }
        // The ARM MUL form computes Rd = Rm * Rs; in Thumb the destination
        // and one source share Rd, so we feed Rd into the rm slot and Rs
        // into the rs slot (or vice-versa — multiply is commutative).
        0xD => DecodedInstruction::Multiply {
            cond: Condition::Al,
            accumulate: false,
            set_flags: true,
            rd,
            rn: 0,
            rs: rd,
            rm: rs,
        },
        0xE => alu_reg(DataOp::Bic, rd, rs), // BIC Rd, Rs
        // MVN Rd, Rs (op = MVN, Rn ignored).
        0xF => DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Mvn,
            set_flags: true,
            rn: 0,
            rd,
            operand: ShifterOperand::ImmediateShift {
                rm: rs,
                shift: ShiftType::Lsl,
                amount: 0,
            },
        },
        _ => undef(instr),
    }
}

/// Build a `DataProcessing` for an ALU op of the form `Rd = Rd OP Rs` (Thumb).
fn alu_reg(op: DataOp, rd: Reg, rs: Reg) -> DecodedInstruction {
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op,
        set_flags: true,
        rn: rd,
        rd,
        operand: ShifterOperand::ImmediateShift {
            rm: rs,
            shift: ShiftType::Lsl,
            amount: 0,
        },
    }
}

/// Build a `MOV Rd, Rd <shift> Rs` for the LSL/LSR/ASR/ROR register-shift forms.
fn alu_reg_shift(rd: Reg, shift: ShiftType, rs: Reg) -> DecodedInstruction {
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op: DataOp::Mov,
        set_flags: true,
        rn: 0,
        rd,
        operand: ShifterOperand::RegisterShift { rm: rd, shift, rs },
    }
}

/// Format 5: hi-register operations / branch exchange.
/// `0 1 0 0 0 1 op[1:0] H1 H2 Rs Rd`
fn decode_format_5(instr: u16) -> DecodedInstruction {
    let op = (instr >> 8) & 0b11;
    let h1 = (instr >> 7) & 1;
    let h2 = (instr >> 6) & 1;
    let rs = (((h2 as u16) << 3) | ((instr >> 3) & 0b111)) as Reg;
    let rd = (((h1 as u16) << 3) | (instr & 0b111)) as Reg;

    match op {
        0b00 => {
            // ADD Rd, Rs (hi-reg form does NOT set flags).
            // At least one of H1/H2 should be set per spec; otherwise the
            // encoding is unpredictable. We still decode it cleanly.
            DecodedInstruction::DataProcessing {
                cond: Condition::Al,
                op: DataOp::Add,
                set_flags: false,
                rn: rd,
                rd,
                operand: ShifterOperand::ImmediateShift {
                    rm: rs,
                    shift: ShiftType::Lsl,
                    amount: 0,
                },
            }
        }
        0b01 => {
            // CMP Rd, Rs (always sets flags).
            DecodedInstruction::DataProcessing {
                cond: Condition::Al,
                op: DataOp::Cmp,
                set_flags: true,
                rn: rd,
                rd: 0,
                operand: ShifterOperand::ImmediateShift {
                    rm: rs,
                    shift: ShiftType::Lsl,
                    amount: 0,
                },
            }
        }
        0b10 => {
            // MOV Rd, Rs (hi-reg form does NOT set flags).
            DecodedInstruction::DataProcessing {
                cond: Condition::Al,
                op: DataOp::Mov,
                set_flags: false,
                rn: 0,
                rd,
                operand: ShifterOperand::ImmediateShift {
                    rm: rs,
                    shift: ShiftType::Lsl,
                    amount: 0,
                },
            }
        }
        0b11 => {
            // BX/BLX Rs. H1 selects link (0 = BX, 1 = BLX).
            DecodedInstruction::BranchExchange {
                cond: Condition::Al,
                link: h1 == 1,
                rm: rs,
            }
        }
        _ => undef(instr),
    }
}

/// Format 6: PC-relative load.
/// `0 1 0 0 1 Rd word8`  →  LDR Rd, [PC, #(word8 << 2)]
fn decode_format_6(instr: u16) -> DecodedInstruction {
    let rd = r3(instr >> 8);
    let imm12 = ((instr & 0xFF) as u32) << 2;
    DecodedInstruction::SingleDataTransfer {
        cond: Condition::Al,
        load: true,
        size: TransferSize::Word,
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: 15, // PC
        rd,
        address: AddressingMode::Immediate { imm12 },
    }
}

/// Format 7: load/store with register offset (word/byte).
/// `0 1 0 1 L B 0 Ro Rb Rd`
fn decode_format_7(instr: u16) -> DecodedInstruction {
    let load = (instr >> 11) & 1 == 1;
    let byte = (instr >> 10) & 1 == 1;
    let ro = r3(instr >> 6);
    let rb = r3(instr >> 3);
    let rd = r3(instr);
    DecodedInstruction::SingleDataTransfer {
        cond: Condition::Al,
        load,
        size: if byte {
            TransferSize::Byte
        } else {
            TransferSize::Word
        },
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: rb,
        rd,
        address: AddressingMode::Register {
            rm: ro,
            shift: ShiftType::Lsl,
            amount: 0,
        },
    }
}

/// Format 8: load/store sign-extended byte/halfword.
/// `0 1 0 1 H S 1 Ro Rb Rd`
fn decode_format_8(instr: u16) -> DecodedInstruction {
    let h_bit = (instr >> 11) & 1 == 1;
    let s_bit = (instr >> 10) & 1 == 1;
    let ro = r3(instr >> 6);
    let rb = r3(instr >> 3);
    let rd = r3(instr);
    let (load, size) = match (h_bit, s_bit) {
        (false, false) => (false, TransferSize::Halfword), // STRH
        (true, false) => (true, TransferSize::Halfword),   // LDRH
        (false, true) => (true, TransferSize::SignedByte), // LDRSB
        (true, true) => (true, TransferSize::SignedHalfword), // LDRSH
    };
    DecodedInstruction::HalfwordDataTransfer {
        cond: Condition::Al,
        load,
        size,
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: rb,
        rd,
        address: AddressingMode::Register {
            rm: ro,
            shift: ShiftType::Lsl,
            amount: 0,
        },
    }
}

// ─────────────────────────────────────────────────────────────────────
// Format 9 — load/store with immediate offset (word/byte)
// ─────────────────────────────────────────────────────────────────────

fn decode_format_9(instr: u16) -> DecodedInstruction {
    // 0 1 1 B L offset5 Rb Rd
    let byte = (instr >> 12) & 1 == 1;
    let load = (instr >> 11) & 1 == 1;
    let offset5 = ((instr >> 6) & 0b11111) as u32;
    let rb = r3(instr >> 3);
    let rd = r3(instr);
    let imm12 = if byte { offset5 } else { offset5 << 2 };
    DecodedInstruction::SingleDataTransfer {
        cond: Condition::Al,
        load,
        size: if byte {
            TransferSize::Byte
        } else {
            TransferSize::Word
        },
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: rb,
        rd,
        address: AddressingMode::Immediate { imm12 },
    }
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b100 — formats 10 and 11
// ─────────────────────────────────────────────────────────────────────

fn decode_top_100(instr: u16) -> DecodedInstruction {
    // Bit [12] = 0 → format 10 (load/store halfword imm).
    // Bit [12] = 1 → format 11 (SP-relative load/store).
    if (instr >> 12) & 1 == 0 {
        decode_format_10(instr)
    } else {
        decode_format_11(instr)
    }
}

/// Format 10: load/store halfword with immediate offset.
/// `1 0 0 0 L offset5 Rb Rd`  offset = offset5 << 1
fn decode_format_10(instr: u16) -> DecodedInstruction {
    let load = (instr >> 11) & 1 == 1;
    let offset = (((instr >> 6) & 0b11111) as u32) << 1;
    let rb = r3(instr >> 3);
    let rd = r3(instr);
    DecodedInstruction::HalfwordDataTransfer {
        cond: Condition::Al,
        load,
        size: TransferSize::Halfword,
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: rb,
        rd,
        address: AddressingMode::Immediate { imm12: offset },
    }
}

/// Format 11: SP-relative load/store.
/// `1 0 0 1 L Rd word8`  offset = word8 << 2, base = SP (R13)
fn decode_format_11(instr: u16) -> DecodedInstruction {
    let load = (instr >> 11) & 1 == 1;
    let rd = r3(instr >> 8);
    let imm12 = ((instr & 0xFF) as u32) << 2;
    DecodedInstruction::SingleDataTransfer {
        cond: Condition::Al,
        load,
        size: TransferSize::Word,
        flags: LoadStoreFlags {
            pre: true,
            up: true,
            writeback: false,
        },
        rn: 13, // SP
        rd,
        address: AddressingMode::Immediate { imm12 },
    }
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b101 — formats 12, 13, 14
// ─────────────────────────────────────────────────────────────────────

fn decode_top_101(instr: u16) -> DecodedInstruction {
    // Bit [12] = 0 → format 12 (load address).
    // Bit [12] = 1 → format 13 (add to SP) or format 14 (push/pop).
    if (instr >> 12) & 1 == 0 {
        return decode_format_12(instr);
    }
    // Bit [10] = 1 → format 14 (push/pop).  Bit [10] = 0 → format 13.
    if (instr >> 10) & 1 == 0 {
        decode_format_13(instr)
    } else {
        decode_format_14(instr)
    }
}

/// Format 12: load address (PC- or SP-relative).
/// `1 0 1 0 SP Rd word8`  Rd = (PC|SP) + (word8 << 2)
fn decode_format_12(instr: u16) -> DecodedInstruction {
    let use_sp = (instr >> 11) & 1 == 1;
    let rd = r3(instr >> 8);
    let imm = ((instr & 0xFF) as u32) << 2;
    // The immediate (max 1020) cannot be encoded as a plain 8-bit value, so
    // we use the rotate field. ROR by 30 == LSL by 2, so imm8 = (word8) and
    // rotate = 15 reproduces (word8 << 2). max word8 = 255 → max value 1020.
    let word8 = imm >> 2;
    let operand = ShifterOperand::Immediate {
        imm8: word8,
        rotate: 15,
    };
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op: DataOp::Add,
        set_flags: false,
        rn: if use_sp { 13 } else { 15 },
        rd,
        operand,
    }
}

/// Format 13: add (signed) immediate to SP.
/// `1 0 1 1 0 0 0 0 S word7`  SP = SP + (S ? -1 : +1) * (word7 << 2)
fn decode_format_13(instr: u16) -> DecodedInstruction {
    // Identifier bits [10:8] must be 000, bit [7] is the sign.
    if (instr >> 8) & 0b111 != 0 {
        return undef(instr);
    }
    let sub = (instr >> 7) & 1 == 1;
    let word7 = (instr & 0x7F) as u32;
    // word7 << 2 max = 508, encode as imm8 = word7, rotate = 15 (ROR 30 == LSL 2).
    let operand = ShifterOperand::Immediate {
        imm8: word7,
        rotate: 15,
    };
    DecodedInstruction::DataProcessing {
        cond: Condition::Al,
        op: if sub { DataOp::Sub } else { DataOp::Add },
        set_flags: false,
        rn: 13,
        rd: 13,
        operand,
    }
}

/// Format 14: push/pop registers.
/// `1 0 1 1 L 1 0 R rlist`
/// PUSH (L=0): STMDB sp!, {rlist[, LR]}
/// POP  (L=1): LDMIA sp!, {rlist[, PC]}
fn decode_format_14(instr: u16) -> DecodedInstruction {
    // Identifier bits: [12:11] = 10, [10:9] = 10. We're already inside the
    // 1011 prefix (top bits 0b101 + bit12 = 1 + bit11 = 1 from top_101's
    // dispatch), so verify [9] = 0 to distinguish from other 1011xx forms.
    if (instr >> 9) & 1 != 0 {
        return undef(instr);
    }
    let load = (instr >> 11) & 1 == 1;
    let r_bit = (instr >> 8) & 1 == 1;
    let mut reg_list = (instr & 0xFF) as u16;
    if r_bit {
        // PUSH adds LR (R14); POP adds PC (R15).
        if load {
            reg_list |= 1 << 15;
        } else {
            reg_list |= 1 << 14;
        }
    }
    let mode = if load {
        BlockMode::IncrementAfter // POP = LDMIA
    } else {
        BlockMode::DecrementBefore // PUSH = STMDB
    };
    DecodedInstruction::BlockTransfer {
        cond: Condition::Al,
        load,
        mode,
        writeback: true,
        s_bit: false,
        rn: 13,
        reg_list,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b110 — formats 15, 16, 17
// ─────────────────────────────────────────────────────────────────────

fn decode_top_110(instr: u16) -> DecodedInstruction {
    // Bit [12] = 0 → format 15 (LDM/STM).
    // Bit [12] = 1 → format 16 (conditional branch) or 17 (SWI).
    if (instr >> 12) & 1 == 0 {
        decode_format_15(instr)
    } else {
        // cond = bits [11:8]. cond == 0xF is reserved as SWI (format 17).
        // cond == 0xE is undefined per ARMv6K Thumb-1.
        let cond_field = (instr >> 8) & 0xF;
        if cond_field == 0xF {
            // SWI (format 17). We don't decode SVC in this phase.
            return undef(instr);
        }
        if cond_field == 0xE {
            return undef(instr);
        }
        decode_format_16(instr, cond_field)
    }
}

/// Format 15: multiple load/store.
/// `1 1 0 0 L Rb rlist`  LDMIA / STMIA Rb!, {rlist}
fn decode_format_15(instr: u16) -> DecodedInstruction {
    let load = (instr >> 11) & 1 == 1;
    let rb = r3(instr >> 8);
    let reg_list = (instr & 0xFF) as u16;
    DecodedInstruction::BlockTransfer {
        cond: Condition::Al,
        load,
        mode: BlockMode::IncrementAfter,
        writeback: true,
        s_bit: false,
        rn: rb,
        reg_list,
    }
}

/// Format 16: conditional branch.
/// `1 1 0 1 cond4 soffset8`
fn decode_format_16(instr: u16, cond_field: u16) -> DecodedInstruction {
    let cond = Condition::from_bits(cond_field as u32);
    // Sign-extend the 8-bit signed offset, then shift left by 1.
    let offset = sign_extend((instr & 0xFF) as u32, 8) << 1;
    DecodedInstruction::Branch {
        cond,
        link: false,
        offset,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Top 0b111 — formats 18 and 19
// ─────────────────────────────────────────────────────────────────────

fn decode_top_111(instr: u16) -> DecodedInstruction {
    // Bit [12] = 0 → format 18 (unconditional branch).
    // Bit [12] = 1 → format 19 (long branch with link).
    if (instr >> 12) & 1 == 0 {
        decode_format_18(instr)
    } else {
        decode_format_19(instr)
    }
}

/// Format 18: unconditional branch.
/// `1 1 1 0 0 offset11`
fn decode_format_18(instr: u16) -> DecodedInstruction {
    // Make sure bit [11] is 0 (otherwise this would be a BLX-blx encoding,
    // not part of Thumb-1 ARMv6K's basic set).
    if (instr >> 11) & 1 != 0 {
        return undef(instr);
    }
    let offset = sign_extend((instr & 0x7FF) as u32, 11) << 1;
    DecodedInstruction::Branch {
        cond: Condition::Al,
        link: false,
        offset,
    }
}

/// Format 19: long branch with link (BL).
/// `1 1 1 1 H offset11`
///
/// BL on Thumb-1 is two instructions:
///   H = 0 (prefix): LR ← PC + (sign_extend(offset11) << 12)
///   H = 1 (suffix): tmp ← PC; PC ← LR + (offset11 << 1); LR ← (tmp - 2) | 1
///
/// The prefix half has no ARM-IR equivalent on its own — we surface it as
/// `Undefined` so the executor can recognise the pair. The suffix half is
/// surfaced as a `Branch { link: true }` carrying just its low 12-bit slice
/// of the target offset; reconstructing the full 22-bit displacement is the
/// executor's responsibility (it has the prior LR value).
fn decode_format_19(instr: u16) -> DecodedInstruction {
    let high = (instr >> 11) & 1 == 1;
    if !high {
        return undef(instr); // prefix half — handled by executor pairing
    }
    let offset = ((instr & 0x7FF) as i32) << 1;
    DecodedInstruction::Branch {
        cond: Condition::Al,
        link: true,
        offset,
    }
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Format 1: shifted register move ──

    #[test]
    fn format1_lsl_immediate() {
        // LSL r0, r1, #5  →  000 00 00101 001 000  = 0x0148
        let instr = 0b0000_0001_0100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op,
                set_flags,
                rd,
                operand,
                ..
            } => {
                assert_eq!(op, DataOp::Mov);
                assert!(set_flags);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::ImmediateShift { rm, shift, amount } => {
                        assert_eq!(rm, 1);
                        assert_eq!(shift, ShiftType::Lsl);
                        assert_eq!(amount, 5);
                    }
                    _ => panic!("expected ImmediateShift"),
                }
            }
            other => panic!("wrong kind: {:?}", other),
        }
    }

    #[test]
    fn format1_lsr_immediate() {
        // LSR r2, r3, #1  →  000 01 00001 011 010
        let instr = 0b0000_1000_0101_1010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, operand, rd, .. } => {
                assert_eq!(op, DataOp::Mov);
                assert_eq!(rd, 2);
                match operand {
                    ShifterOperand::ImmediateShift { rm, shift, amount } => {
                        assert_eq!(rm, 3);
                        assert_eq!(shift, ShiftType::Lsr);
                        assert_eq!(amount, 1);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format1_asr_immediate() {
        // ASR r4, r5, #16  →  000 10 10000 101 100
        let instr = 0b0001_0100_0010_1100u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, operand, rd, .. } => {
                assert_eq!(op, DataOp::Mov);
                assert_eq!(rd, 4);
                match operand {
                    ShifterOperand::ImmediateShift { rm, shift, amount } => {
                        assert_eq!(rm, 5);
                        assert_eq!(shift, ShiftType::Asr);
                        assert_eq!(amount, 16);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 2: add/subtract ──

    #[test]
    fn format2_add_register() {
        // ADD r0, r1, r2 → 0001 1 0 0 010 001 000
        let instr = 0b0001_1000_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op,
                set_flags,
                rn,
                rd,
                operand,
                ..
            } => {
                assert_eq!(op, DataOp::Add);
                assert!(set_flags);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::ImmediateShift { rm, .. } => assert_eq!(rm, 2),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format2_sub_register() {
        // SUB r3, r4, r5 → 0001 1 0 1 101 100 011
        let instr = 0b0001_1011_0110_0011u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Sub);
                assert_eq!(rn, 4);
                assert_eq!(rd, 3);
                match operand {
                    ShifterOperand::ImmediateShift { rm, .. } => assert_eq!(rm, 5),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format2_add_immediate3() {
        // ADD r0, r1, #7 → 0001 1 1 0 111 001 000
        let instr = 0b0001_1101_1100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Add);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        assert_eq!(imm8, 7);
                        assert_eq!(rotate, 0);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format2_sub_immediate3() {
        // SUB r2, r3, #1 → 0001 1 1 1 001 011 010
        let instr = 0b0001_1111_0101_1010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rn, rd, .. } => {
                assert_eq!(op, DataOp::Sub);
                assert_eq!(rn, 3);
                assert_eq!(rd, 2);
            }
            _ => panic!(),
        }
    }

    // ── Format 3: 8-bit immediate ──

    #[test]
    fn format3_mov_immediate8() {
        // MOV r0, #0xFF → 001 00 000 11111111
        let instr = 0b0010_0000_1111_1111u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, set_flags, rd, operand, rn, .. } => {
                assert_eq!(op, DataOp::Mov);
                assert!(set_flags);
                assert_eq!(rd, 0);
                assert_eq!(rn, 0);
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
    fn format3_cmp_immediate8() {
        // CMP r3, #0x42 → 001 01 011 01000010
        let instr = 0b0010_1011_0100_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rn, operand, .. } => {
                assert_eq!(op, DataOp::Cmp);
                assert_eq!(rn, 3);
                match operand {
                    ShifterOperand::Immediate { imm8, .. } => assert_eq!(imm8, 0x42),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format3_add_immediate8() {
        // ADD r5, #1 → 001 10 101 00000001
        let instr = 0b0011_0101_0000_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rn, rd, .. } => {
                assert_eq!(op, DataOp::Add);
                assert_eq!(rn, 5);
                assert_eq!(rd, 5);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format3_sub_immediate8() {
        // SUB r7, #2 → 001 11 111 00000010
        let instr = 0b0011_1111_0000_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rd, rn, .. } => {
                assert_eq!(op, DataOp::Sub);
                assert_eq!(rd, 7);
                assert_eq!(rn, 7);
            }
            _ => panic!(),
        }
    }

    // ── Format 4: ALU register-register ──

    #[test]
    fn format4_and() {
        // AND r0, r1 → 010000 0000 001 000
        let instr = 0b0100_0000_0000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rd, rn, operand, .. } => {
                assert_eq!(op, DataOp::And);
                assert_eq!(rd, 0);
                assert_eq!(rn, 0);
                match operand {
                    ShifterOperand::ImmediateShift { rm, .. } => assert_eq!(rm, 1),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_eor() {
        // EOR r2, r3 → 010000 0001 011 010
        let instr = 0b0100_0000_0101_1010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rd, rn, .. } => {
                assert_eq!(op, DataOp::Eor);
                assert_eq!(rd, 2);
                assert_eq!(rn, 2);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_lsl_register() {
        // LSL r0, r1 → 010000 0010 001 000
        let instr = 0b0100_0000_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rd, operand, .. } => {
                assert_eq!(op, DataOp::Mov);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::RegisterShift { rm, shift, rs } => {
                        assert_eq!(rm, 0);
                        assert_eq!(shift, ShiftType::Lsl);
                        assert_eq!(rs, 1);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_lsr_register() {
        // LSR r4, r5 → 010000 0011 101 100
        let instr = 0b0100_0000_1110_1100u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, operand, .. } => {
                assert_eq!(op, DataOp::Mov);
                match operand {
                    ShifterOperand::RegisterShift { shift, .. } => {
                        assert_eq!(shift, ShiftType::Lsr);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_asr_register() {
        // ASR r1, r2 → 010000 0100 010 001
        let instr = 0b0100_0001_0001_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { operand, .. } => match operand {
                ShifterOperand::RegisterShift { shift, .. } => {
                    assert_eq!(shift, ShiftType::Asr);
                }
                _ => panic!(),
            },
            _ => panic!(),
        }
    }

    #[test]
    fn format4_adc() {
        // ADC r0, r1 → 010000 0101 001 000
        let instr = 0b0100_0001_0100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, .. } => assert_eq!(op, DataOp::Adc),
            _ => panic!(),
        }
    }

    #[test]
    fn format4_sbc() {
        // SBC r0, r1 → 010000 0110 001 000
        let instr = 0b0100_0001_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, .. } => assert_eq!(op, DataOp::Sbc),
            _ => panic!(),
        }
    }

    #[test]
    fn format4_ror_register() {
        // ROR r0, r1 → 010000 0111 001 000
        let instr = 0b0100_0001_1100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, operand, .. } => {
                assert_eq!(op, DataOp::Mov);
                match operand {
                    ShifterOperand::RegisterShift { shift, .. } => {
                        assert_eq!(shift, ShiftType::Ror);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_tst() {
        // TST r2, r3 → 010000 1000 011 010
        let instr = 0b0100_0010_0001_1010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, set_flags, rn, rd, ..
            } => {
                assert_eq!(op, DataOp::Tst);
                assert!(set_flags);
                assert_eq!(rn, 2);
                assert_eq!(rd, 0);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_neg() {
        // NEG r0, r1 → 010000 1001 001 000
        let instr = 0b0100_0010_0100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Rsb);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        assert_eq!(imm8, 0);
                        assert_eq!(rotate, 0);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_cmp_register() {
        // CMP r3, r4 → 010000 1010 100 011
        let instr = 0b0100_0010_1010_0011u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, set_flags, rn, rd, ..
            } => {
                assert_eq!(op, DataOp::Cmp);
                assert!(set_flags);
                assert_eq!(rn, 3);
                assert_eq!(rd, 0);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_cmn() {
        // CMN r0, r1 → 010000 1011 001 000
        let instr = 0b0100_0010_1100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, .. } => assert_eq!(op, DataOp::Cmn),
            _ => panic!(),
        }
    }

    #[test]
    fn format4_orr() {
        // ORR r0, r1 → 010000 1100 001 000
        let instr = 0b0100_0011_0000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, .. } => assert_eq!(op, DataOp::Orr),
            _ => panic!(),
        }
    }

    #[test]
    fn format4_mul() {
        // MUL r0, r1 → 010000 1101 001 000
        let instr = 0b0100_0011_0100_1000u16;
        match decode_thumb(instr) {
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
                // We feed Rd into rs and Rs into rm; the executor multiplies
                // rm * rs, which is commutative.
                assert_eq!(rs, 0);
                assert_eq!(rm, 1);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format4_bic() {
        // BIC r0, r1 → 010000 1110 001 000
        let instr = 0b0100_0011_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, .. } => assert_eq!(op, DataOp::Bic),
            _ => panic!(),
        }
    }

    #[test]
    fn format4_mvn() {
        // MVN r0, r1 → 010000 1111 001 000
        let instr = 0b0100_0011_1100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, set_flags, rd, .. } => {
                assert_eq!(op, DataOp::Mvn);
                assert!(set_flags);
                assert_eq!(rd, 0);
            }
            _ => panic!(),
        }
    }

    // ── Format 5: hi-register ops / BX/BLX ──

    #[test]
    fn format5_add_hi_to_lo() {
        // ADD r0, r8 → 010001 00 0 1 000 000  (H1=0, H2=1, Rs=0, Rd=0)
        let instr = 0b0100_0100_0100_0000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, set_flags, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Add);
                assert!(!set_flags); // hi-reg ADD does NOT set flags
                assert_eq!(rd, 0);
                assert_eq!(rn, 0);
                match operand {
                    ShifterOperand::ImmediateShift { rm, .. } => assert_eq!(rm, 8),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format5_mov_hi_to_hi() {
        // MOV r9, r10 → 010001 10 1 1 010 001  (H1=1 → Rd=R9, H2=1 → Rs=R10)
        let instr = 0b0100_0110_1101_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, set_flags, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Mov);
                assert!(!set_flags);
                assert_eq!(rd, 9);
                match operand {
                    ShifterOperand::ImmediateShift { rm, .. } => assert_eq!(rm, 10),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format5_cmp_hi() {
        // CMP r0, r8 → 010001 01 0 1 000 000
        let instr = 0b0100_0101_0100_0000u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, set_flags, .. } => {
                assert_eq!(op, DataOp::Cmp);
                assert!(set_flags);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format5_bx_lr() {
        // BX LR → 010001 11 0 1 110 000  (H1=0 BX, H2=1 → Rs=R14)
        let instr = 0b0100_0111_0111_0000u16;
        match decode_thumb(instr) {
            DecodedInstruction::BranchExchange { link, rm, .. } => {
                assert!(!link);
                assert_eq!(rm, 14);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format5_blx_register() {
        // BLX r3 → 010001 11 1 0 011 000  (H1=1 BLX, H2=0 → Rs=R3)
        let instr = 0b0100_0111_1001_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::BranchExchange { link, rm, .. } => {
                assert!(link);
                assert_eq!(rm, 3);
            }
            _ => panic!(),
        }
    }

    // ── Format 6: PC-relative load ──

    #[test]
    fn format6_ldr_pc_relative() {
        // LDR r0, [PC, #16] → 01001 000 00000100   (word8=4 → 4*4=16)
        let instr = 0b0100_1000_0000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load,
                size,
                rn,
                rd,
                address,
                flags,
                ..
            } => {
                assert!(load);
                assert_eq!(size, TransferSize::Word);
                assert_eq!(rn, 15);
                assert_eq!(rd, 0);
                assert!(flags.pre);
                assert!(flags.up);
                assert!(!flags.writeback);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 16),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 7: load/store with register offset ──

    #[test]
    fn format7_str_register() {
        // STR r0, [r1, r2] → 0101 00 0 010 001 000
        let instr = 0b0101_0000_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, rn, rd, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Word);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match address {
                    AddressingMode::Register { rm, .. } => assert_eq!(rm, 2),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format7_ldrb_register() {
        // LDRB r3, [r4, r5] → 0101 11 0 101 100 011
        let instr = 0b0101_1101_0110_0011u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, rn, rd, ..
            } => {
                assert!(load);
                assert_eq!(size, TransferSize::Byte);
                assert_eq!(rn, 4);
                assert_eq!(rd, 3);
            }
            _ => panic!(),
        }
    }

    // ── Format 8: sign-extended halfword/byte ──

    #[test]
    fn format8_strh() {
        // STRH r0, [r1, r2] → 0101 00 1 010 001 000
        let instr = 0b0101_0010_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer {
                load, size, rn, rd, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Halfword);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match address {
                    AddressingMode::Register { rm, .. } => assert_eq!(rm, 2),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format8_ldrsb() {
        // LDRSB r0, [r1, r2] → 0101 01 1 010 001 000
        let instr = 0b0101_0110_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer { load, size, .. } => {
                assert!(load);
                assert_eq!(size, TransferSize::SignedByte);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format8_ldrh_reg_offset() {
        // LDRH r0, [r1, r2] → 0101 10 1 010 001 000
        let instr = 0b0101_1010_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer { load, size, .. } => {
                assert!(load);
                assert_eq!(size, TransferSize::Halfword);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format8_ldrsh() {
        // LDRSH r0, [r1, r2] → 0101 11 1 010 001 000
        let instr = 0b0101_1110_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer { load, size, .. } => {
                assert!(load);
                assert_eq!(size, TransferSize::SignedHalfword);
            }
            _ => panic!(),
        }
    }

    // ── Format 9: load/store with immediate offset ──

    #[test]
    fn format9_str_word_imm() {
        // STR r0, [r1, #8] → 011 0 0 00010 001 000  (offset5=2, 2*4=8)
        let instr = 0b0110_0000_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, rn, rd, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Word);
                assert_eq!(rn, 1);
                assert_eq!(rd, 0);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 8),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format9_ldr_word_imm() {
        // LDR r2, [r3, #4] → 011 0 1 00001 011 010
        let instr = 0b0110_1000_0101_1010u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, rn, rd, address, ..
            } => {
                assert!(load);
                assert_eq!(rn, 3);
                assert_eq!(rd, 2);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 4),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format9_strb_imm() {
        // STRB r0, [r1, #1] → 011 1 0 00001 001 000
        let instr = 0b0111_0000_0100_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Byte);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 1),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format9_ldrb_imm() {
        // LDRB r4, [r5, #3] → 011 1 1 00011 101 100
        let instr = 0b0111_1000_1110_1100u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, rd, rn, address, ..
            } => {
                assert!(load);
                assert_eq!(size, TransferSize::Byte);
                assert_eq!(rd, 4);
                assert_eq!(rn, 5);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 3),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 10: load/store halfword immediate ──

    #[test]
    fn format10_strh_imm() {
        // STRH r0, [r1, #4] → 1000 0 00010 001 000  (offset5=2 → 2*2=4)
        let instr = 0b1000_0000_1000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer {
                load, size, rn, rd, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Halfword);
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
    fn format10_ldrh_imm() {
        // LDRH r3, [r4, #2] → 1000 1 00001 100 011
        let instr = 0b1000_1000_0110_0011u16;
        match decode_thumb(instr) {
            DecodedInstruction::HalfwordDataTransfer {
                load, rn, rd, address, ..
            } => {
                assert!(load);
                assert_eq!(rn, 4);
                assert_eq!(rd, 3);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 2),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 11: SP-relative load/store ──

    #[test]
    fn format11_str_sp_relative() {
        // STR r0, [sp, #16] → 1001 0 000 00000100  (word8=4 → 16)
        let instr = 0b1001_0000_0000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, size, rn, rd, address, ..
            } => {
                assert!(!load);
                assert_eq!(size, TransferSize::Word);
                assert_eq!(rn, 13);
                assert_eq!(rd, 0);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 16),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format11_ldr_sp_relative() {
        // LDR r1, [sp, #20] → 1001 1 001 00000101
        let instr = 0b1001_1001_0000_0101u16;
        match decode_thumb(instr) {
            DecodedInstruction::SingleDataTransfer {
                load, rn, rd, address, ..
            } => {
                assert!(load);
                assert_eq!(rn, 13);
                assert_eq!(rd, 1);
                match address {
                    AddressingMode::Immediate { imm12 } => assert_eq!(imm12, 20),
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 12: load address ──

    #[test]
    fn format12_add_pc_relative() {
        // ADD r0, PC, #16 → 1010 0 000 00000100  (word8=4)
        let instr = 0b1010_0000_0000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, set_flags, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Add);
                assert!(!set_flags);
                assert_eq!(rn, 15);
                assert_eq!(rd, 0);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        // 4 << 2 = 16, encoded with rotate=15 (ROR 30 = LSL 2).
                        assert_eq!(imm8, 4);
                        assert_eq!(rotate, 15);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format12_add_sp_relative() {
        // ADD r2, SP, #8 → 1010 1 010 00000010  (word8=2)
        let instr = 0b1010_1010_0000_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { rn, rd, operand, .. } => {
                assert_eq!(rn, 13);
                assert_eq!(rd, 2);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        assert_eq!(imm8, 2);
                        assert_eq!(rotate, 15);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    // ── Format 13: add offset to SP ──

    #[test]
    fn format13_add_to_sp() {
        // ADD SP, #16 → 10110000 0 0000100  (S=0, word7=4)
        let instr = 0b1011_0000_0000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing {
                op, rn, rd, operand, ..
            } => {
                assert_eq!(op, DataOp::Add);
                assert_eq!(rn, 13);
                assert_eq!(rd, 13);
                match operand {
                    ShifterOperand::Immediate { imm8, rotate } => {
                        assert_eq!(imm8, 4); // 4 << 2 = 16
                        assert_eq!(rotate, 15);
                    }
                    _ => panic!(),
                }
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format13_sub_from_sp() {
        // SUB SP, #16 → 10110000 1 0000100
        let instr = 0b1011_0000_1000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::DataProcessing { op, rn, rd, .. } => {
                assert_eq!(op, DataOp::Sub);
                assert_eq!(rn, 13);
                assert_eq!(rd, 13);
            }
            _ => panic!(),
        }
    }

    // ── Format 14: push/pop ──

    #[test]
    fn format14_push_low_regs() {
        // PUSH {r0, r4} → 1011 0 10 0 00010001
        let instr = 0b1011_0100_0001_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::BlockTransfer {
                load,
                mode,
                writeback,
                rn,
                reg_list,
                ..
            } => {
                assert!(!load);
                assert_eq!(mode, BlockMode::DecrementBefore); // STMDB
                assert!(writeback);
                assert_eq!(rn, 13);
                assert_eq!(reg_list, 0b0001_0001);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format14_push_with_lr() {
        // PUSH {r0, lr} → 1011 0 10 1 00000001
        let instr = 0b1011_0101_0000_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::BlockTransfer { reg_list, load, .. } => {
                assert!(!load);
                // r0 (bit 0) and LR (bit 14)
                assert_eq!(reg_list, (1 << 0) | (1 << 14));
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format14_pop_with_pc() {
        // POP {r0, pc} → 1011 1 10 1 00000001
        let instr = 0b1011_1101_0000_0001u16;
        match decode_thumb(instr) {
            DecodedInstruction::BlockTransfer {
                load, mode, writeback, rn, reg_list, ..
            } => {
                assert!(load);
                assert_eq!(mode, BlockMode::IncrementAfter); // LDMIA
                assert!(writeback);
                assert_eq!(rn, 13);
                // r0 (bit 0) and PC (bit 15)
                assert_eq!(reg_list, (1 << 0) | (1 << 15));
            }
            _ => panic!(),
        }
    }

    // ── Format 15: multiple load/store ──

    #[test]
    fn format15_stmia() {
        // STMIA r0!, {r1, r2, r3} → 1100 0 000 00001110
        let instr = 0b1100_0000_0000_1110u16;
        match decode_thumb(instr) {
            DecodedInstruction::BlockTransfer {
                load, mode, writeback, rn, reg_list, ..
            } => {
                assert!(!load);
                assert_eq!(mode, BlockMode::IncrementAfter);
                assert!(writeback);
                assert_eq!(rn, 0);
                assert_eq!(reg_list, 0b1110);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format15_ldmia() {
        // LDMIA r3!, {r0, r1} → 1100 1 011 00000011
        let instr = 0b1100_1011_0000_0011u16;
        match decode_thumb(instr) {
            DecodedInstruction::BlockTransfer {
                load, rn, reg_list, ..
            } => {
                assert!(load);
                assert_eq!(rn, 3);
                assert_eq!(reg_list, 0b11);
            }
            _ => panic!(),
        }
    }

    // ── Format 16: conditional branch ──

    #[test]
    fn format16_beq_forward() {
        // BEQ +4 → 1101 0000 00000010  (offset8=2 → 4)
        let instr = 0b1101_0000_0000_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, link, offset } => {
                assert_eq!(cond, Condition::Eq);
                assert!(!link);
                assert_eq!(offset, 4);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format16_bne_backward() {
        // BNE -2 → 1101 0001 11111111  (offset8 = -1 → -2)
        let instr = 0b1101_0001_1111_1111u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, offset, .. } => {
                assert_eq!(cond, Condition::Ne);
                assert_eq!(offset, -2);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format16_blt() {
        // BLT +8 → 1101 1011 00000100  (cond=LT, offset8=4 → 8)
        let instr = 0b1101_1011_0000_0100u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, offset, .. } => {
                assert_eq!(cond, Condition::Lt);
                assert_eq!(offset, 8);
            }
            _ => panic!(),
        }
    }

    // ── Format 17: SWI ──

    #[test]
    fn format17_swi_undefined() {
        // SWI #0x42 → 1101 1111 01000010
        let instr = 0b1101_1111_0100_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::Undefined { raw } => assert_eq!(raw, instr as u32),
            _ => panic!("expected Undefined for SWI"),
        }
    }

    // ── Format 18: unconditional branch ──

    #[test]
    fn format18_b_forward() {
        // B +0x10 → 11100 00000001000  (offset11=8 → 16)
        let instr = 0b1110_0000_0000_1000u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, link, offset } => {
                assert_eq!(cond, Condition::Al);
                assert!(!link);
                assert_eq!(offset, 16);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn format18_b_backward() {
        // B -2 → 11100 11111111111  (offset11 = -1 → -2)
        let instr = 0b1110_0111_1111_1111u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, offset, .. } => {
                assert_eq!(cond, Condition::Al);
                assert_eq!(offset, -2);
            }
            _ => panic!(),
        }
    }

    // ── Format 19: BL prefix/suffix ──

    #[test]
    fn format19_bl_prefix_undefined() {
        // BL prefix (H=0) → 11110 ...  decoded as Undefined.
        let instr = 0b1111_0000_0000_0000u16;
        match decode_thumb(instr) {
            DecodedInstruction::Undefined { raw } => assert_eq!(raw, instr as u32),
            _ => panic!("expected Undefined for BL prefix"),
        }
    }

    #[test]
    fn format19_bl_suffix_branch_link() {
        // BL suffix (H=1) → 11111 00000000010  → Branch { link: true, offset = 4 }
        let instr = 0b1111_1000_0000_0010u16;
        match decode_thumb(instr) {
            DecodedInstruction::Branch { cond, link, offset } => {
                assert_eq!(cond, Condition::Al);
                assert!(link);
                assert_eq!(offset, 4); // 2 << 1
            }
            _ => panic!(),
        }
    }

    // ── Sanity: every decoded instruction (except Undefined) carries Al
    //          unless it's a conditional branch ──

    #[test]
    fn most_thumb_decodes_are_unconditional() {
        // ADD r0, r1, r2 (format 2 register form)
        let inst = 0b0001_1000_1000_1000u16;
        assert_eq!(decode_thumb(inst).condition(), Condition::Al);
        // CMP r3, #0x42 (format 3)
        let inst = 0b0010_1011_0100_0010u16;
        assert_eq!(decode_thumb(inst).condition(), Condition::Al);
    }
}
