//! Instruction executor.
//!
//! Takes a `DecodedInstruction` and applies its effect to the register file
//! and memory bus. Each handler returns the number of cycles the instruction
//! consumed (cycle-approximate; exact 3DS cycle counting is a Phase 1 concern).

use crate::barrel_shifter::{rotate_immediate, shift_immediate, shift_register, ShiftResult};
use crate::bus::Bus;
use crate::conditions::check;
use crate::exceptions::{enter_exception, ExceptionKind};
use crate::registers::{psr, RegisterFile, PC};
use crate::types::{
    AddressingMode, BlockMode, DataOp, DecodedInstruction, LoadStoreFlags, SaturatedOp,
    ShifterOperand, TransferSize,
};

/// A side-effect produced by an instruction that the `Cpu::step` driver
/// must apply *after* dispatch (because it requires access to state the
/// pure-register executor doesn't carry, like the CP15 coprocessor).
///
/// Most instructions return `Effect::None`. Only coprocessor moves emit
/// `CpRead` / `CpWrite`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Effect {
    None,
    /// Coprocessor read: after dispatch, fetch from the coproc and write
    /// the value into Rt.
    CpRead {
        rt: u8,
        cp_num: u8,
        crn: u8,
        crm: u8,
        opc1: u8,
        opc2: u8,
    },
    /// Coprocessor write: after dispatch, read Rt and apply to the coproc.
    CpWrite {
        rt: u8,
        cp_num: u8,
        crn: u8,
        crm: u8,
        opc1: u8,
        opc2: u8,
    },
}

/// Result of executing a single instruction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExecResult {
    /// Number of cycles consumed (approximate).
    pub cycles: u32,
    /// Whether PC was written by this instruction (branches, LDR into PC, ALU to PC, ...).
    pub branched: bool,
    /// Side-effect to be applied by the step driver after dispatch.
    pub effect: Effect,
}

impl ExecResult {
    pub const fn sequential(cycles: u32) -> Self {
        Self {
            cycles,
            branched: false,
            effect: Effect::None,
        }
    }
    pub const fn branched(cycles: u32) -> Self {
        Self {
            cycles,
            branched: true,
            effect: Effect::None,
        }
    }
    pub const fn with_effect(cycles: u32, effect: Effect) -> Self {
        Self {
            cycles,
            branched: false,
            effect,
        }
    }
}

/// Execute one decoded instruction.
///
/// The instruction has already been fetched, so `rf.pc()` points at the
/// instruction itself. Reads of R15 inside the instruction see `pc + 8`
/// (the classic ARM pipeline quirk); this is handled inline in the few
/// places it matters (data-processing operand reads, LDR/STR base).
pub fn execute<B: Bus>(rf: &mut RegisterFile, bus: &mut B, instr: DecodedInstruction) -> ExecResult {
    // All ARM instructions are conditionally executed.
    if !check(instr.condition(), rf) {
        return ExecResult::sequential(1);
    }

    match instr {
        DecodedInstruction::DataProcessing {
            op,
            set_flags,
            rn,
            rd,
            operand,
            ..
        } => exec_data_processing(rf, op, set_flags, rn, rd, operand),
        DecodedInstruction::Multiply {
            accumulate,
            set_flags,
            rd,
            rn,
            rs,
            rm,
            ..
        } => exec_multiply(rf, accumulate, set_flags, rd, rn, rs, rm),
        DecodedInstruction::MultiplyLong {
            signed,
            accumulate,
            set_flags,
            rd_lo,
            rd_hi,
            rm,
            rs,
            ..
        } => exec_multiply_long(rf, signed, accumulate, set_flags, rd_lo, rd_hi, rm, rs),
        DecodedInstruction::Branch { link, offset, .. } => exec_branch(rf, link, offset),
        DecodedInstruction::BranchExchange { link, rm, .. } => exec_bx(rf, link, rm),
        DecodedInstruction::SingleDataTransfer {
            load,
            size,
            flags,
            rn,
            rd,
            address,
            ..
        } => exec_single_data_transfer(rf, bus, load, size, flags, rn, rd, address),
        DecodedInstruction::HalfwordDataTransfer {
            load,
            size,
            flags,
            rn,
            rd,
            address,
            ..
        } => exec_single_data_transfer(rf, bus, load, size, flags, rn, rd, address),
        DecodedInstruction::BlockTransfer {
            load,
            mode,
            writeback,
            s_bit,
            rn,
            reg_list,
            ..
        } => exec_block_transfer(rf, bus, load, mode, writeback, s_bit, rn, reg_list),
        DecodedInstruction::PsrTransfer {
            is_read,
            use_spsr,
            rd,
            field_mask,
            operand,
            ..
        } => exec_psr_transfer(rf, is_read, use_spsr, rd, field_mask, operand),
        DecodedInstruction::SoftwareInterrupt { .. } => exec_svc(rf),
        DecodedInstruction::CoprocessorRegisterTransfer {
            is_read,
            cp_num,
            opc1,
            opc2,
            crn,
            crm,
            rt,
            ..
        } => {
            // For unmodelled coprocessors (anything other than CP15), we still
            // accept the instruction but produce no effect — the step driver
            // will see Effect::None and the access becomes a no-op.
            let effect = if is_read {
                Effect::CpRead {
                    rt,
                    cp_num,
                    crn,
                    crm,
                    opc1,
                    opc2,
                }
            } else {
                Effect::CpWrite {
                    rt,
                    cp_num,
                    crn,
                    crm,
                    opc1,
                    opc2,
                }
            };
            ExecResult::with_effect(2, effect)
        }
        DecodedInstruction::SaturatedArith { op, rn, rd, rm, .. } => {
            exec_saturated_arith(rf, op, rn, rd, rm)
        }
        DecodedInstruction::Undefined { .. } => {
            // Phase 0: a trapped undefined instruction advances PC normally and
            // costs one cycle. Later phases will raise the UND exception.
            ExecResult::sequential(1)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Data processing
// ─────────────────────────────────────────────────────────────────────

/// Read a general-purpose register for use as a data-processing operand.
/// Reading R15 returns `pc + 8` on ARM (the "current instruction + 8" rule).
fn read_reg_for_dp(rf: &RegisterFile, reg: u8) -> u32 {
    if reg as usize == PC {
        rf.pc().wrapping_add(8)
    } else {
        rf.read(reg)
    }
}

/// Evaluate the shifter operand, returning value and carry-out.
fn evaluate_operand(rf: &RegisterFile, operand: ShifterOperand) -> ShiftResult {
    let c_in = rf.c();
    match operand {
        ShifterOperand::Immediate { imm8, rotate } => rotate_immediate(imm8, rotate, c_in),
        ShifterOperand::ImmediateShift { rm, shift, amount } => {
            let rm_val = read_reg_for_dp(rf, rm);
            shift_immediate(shift, rm_val, amount, c_in)
        }
        ShifterOperand::RegisterShift { rm, shift, rs } => {
            // When Rs is used, R15 (if read as Rm) is pc + 12, not pc + 8.
            // ARMv6K quirk. Most compilers don't emit this so we keep it accurate.
            let rm_val = if rm as usize == PC {
                rf.pc().wrapping_add(12)
            } else {
                rf.read(rm)
            };
            let rs_val = rf.read(rs);
            shift_register(shift, rm_val, rs_val, c_in)
        }
        ShifterOperand::Rrx { rm } => {
            let rm_val = read_reg_for_dp(rf, rm);
            shift_immediate(crate::types::ShiftType::Ror, rm_val, 0, c_in)
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn exec_data_processing(
    rf: &mut RegisterFile,
    op: DataOp,
    set_flags: bool,
    rn: u8,
    rd: u8,
    operand: ShifterOperand,
) -> ExecResult {
    let ShiftResult {
        value: shifter_value,
        carry_out: shifter_carry,
    } = evaluate_operand(rf, operand);

    let a = read_reg_for_dp(rf, rn);
    let b = shifter_value;
    let c_in = rf.c() as u32;

    // Compute the result and the arithmetic carry/overflow where relevant.
    let (result, c_flag, v_flag, logical) = match op {
        DataOp::And => (a & b, shifter_carry, rf.v(), true),
        DataOp::Eor => (a ^ b, shifter_carry, rf.v(), true),
        DataOp::Sub => {
            let (res, c, v) = sub_with_flags(a, b, true);
            (res, c, v, false)
        }
        DataOp::Rsb => {
            let (res, c, v) = sub_with_flags(b, a, true);
            (res, c, v, false)
        }
        DataOp::Add => {
            let (res, c, v) = add_with_flags(a, b, false);
            (res, c, v, false)
        }
        DataOp::Adc => {
            let (res, c, v) = add_with_flags(a, b, rf.c());
            (res, c, v, false)
        }
        DataOp::Sbc => {
            let (res, c, v) = sub_with_flags(a, b, rf.c());
            (res, c, v, false)
        }
        DataOp::Rsc => {
            let (res, c, v) = sub_with_flags(b, a, rf.c());
            (res, c, v, false)
        }
        DataOp::Tst => (a & b, shifter_carry, rf.v(), true),
        DataOp::Teq => (a ^ b, shifter_carry, rf.v(), true),
        DataOp::Cmp => {
            let (res, c, v) = sub_with_flags(a, b, true);
            (res, c, v, false)
        }
        DataOp::Cmn => {
            let (res, c, v) = add_with_flags(a, b, false);
            (res, c, v, false)
        }
        DataOp::Orr => (a | b, shifter_carry, rf.v(), true),
        DataOp::Mov => (b, shifter_carry, rf.v(), true),
        DataOp::Bic => (a & !b, shifter_carry, rf.v(), true),
        DataOp::Mvn => (!b, shifter_carry, rf.v(), true),
    };

    // Suppress the _ hint: c_in is actually used above via rf.c() bool.
    let _ = c_in;

    // Writeback (unless test-only).
    let branched = if !op.is_test() {
        rf.write(rd, result);
        rd as usize == PC
    } else {
        false
    };

    if set_flags {
        // If S is set and Rd == R15, CPSR is restored from SPSR (mode switch).
        if !op.is_test() && rd as usize == PC {
            if rf.mode().has_spsr() {
                let spsr = rf.spsr();
                rf.set_cpsr(spsr);
            }
        } else {
            let n = (result >> 31) & 1 != 0;
            let z = result == 0;
            if logical {
                // Logical operations don't touch V; C comes from shifter.
                rf.set_nz(n, z);
                rf.set_flag_c(c_flag);
            } else {
                rf.set_nzcv(n, z, c_flag, v_flag);
            }
        }
    }

    if branched {
        ExecResult::branched(3)
    } else {
        ExecResult::sequential(1)
    }
}

fn add_with_flags(a: u32, b: u32, carry_in: bool) -> (u32, bool, bool) {
    let cin = carry_in as u32;
    let res64 = (a as u64).wrapping_add(b as u64).wrapping_add(cin as u64);
    let result = res64 as u32;
    let c = res64 > 0xFFFF_FFFF;
    // Overflow: signs of a and b agree, but result's sign disagrees.
    let v = ((a ^ result) & (b ^ result) & 0x8000_0000) != 0;
    (result, c, v)
}

fn sub_with_flags(a: u32, b: u32, carry_in: bool) -> (u32, bool, bool) {
    // ARM's "subtract with carry" uses `a - b - (1 - C)`; a plain SUB has C=1.
    let not_cin = (!carry_in) as u32;
    let res64 = (a as u64).wrapping_sub(b as u64).wrapping_sub(not_cin as u64);
    let result = res64 as u32;
    // C on subtract = NOT borrow (ARM convention: set if no borrow).
    let c = (res64 >> 32) == 0;
    let v = ((a ^ b) & (a ^ result) & 0x8000_0000) != 0;
    (result, c, v)
}

// ─────────────────────────────────────────────────────────────────────
// Multiply / multiply long
// ─────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn exec_multiply(
    rf: &mut RegisterFile,
    accumulate: bool,
    set_flags: bool,
    rd: u8,
    rn: u8,
    rs: u8,
    rm: u8,
) -> ExecResult {
    let m = rf.read(rm);
    let s = rf.read(rs);
    let result = if accumulate {
        m.wrapping_mul(s).wrapping_add(rf.read(rn))
    } else {
        m.wrapping_mul(s)
    };
    rf.write(rd, result);
    if set_flags {
        rf.set_nz((result >> 31) & 1 != 0, result == 0);
    }
    ExecResult::sequential(mul_cycles(s))
}

#[allow(clippy::too_many_arguments)]
fn exec_multiply_long(
    rf: &mut RegisterFile,
    signed: bool,
    accumulate: bool,
    set_flags: bool,
    rd_lo: u8,
    rd_hi: u8,
    rm: u8,
    rs: u8,
) -> ExecResult {
    let m = rf.read(rm);
    let s = rf.read(rs);
    let product: u64 = if signed {
        ((m as i32 as i64).wrapping_mul(s as i32 as i64)) as u64
    } else {
        (m as u64).wrapping_mul(s as u64)
    };
    let mut result = product;
    if accumulate {
        let existing =
            ((rf.read(rd_hi) as u64) << 32) | (rf.read(rd_lo) as u64);
        result = result.wrapping_add(existing);
    }
    rf.write(rd_lo, result as u32);
    rf.write(rd_hi, (result >> 32) as u32);
    if set_flags {
        rf.set_nz((result >> 63) & 1 != 0, result == 0);
    }
    ExecResult::sequential(mul_cycles(s) + 1)
}

/// Approximate ARM multiplier early-termination cycle count.
fn mul_cycles(rs: u32) -> u32 {
    // Count leading ones or zeros of the top 24 bits, capped at 4 cycles.
    let top = rs >> 8;
    if top == 0 || top == 0x00FF_FFFF {
        2
    } else if (rs >> 16) == 0 || (rs >> 16) == 0xFFFF {
        3
    } else if (rs >> 24) == 0 || (rs >> 24) == 0xFF {
        4
    } else {
        5
    }
}

// ─────────────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────────────

fn exec_branch(rf: &mut RegisterFile, link: bool, offset: i32) -> ExecResult {
    let pc = rf.pc();
    if link {
        // Return address is the instruction after the branch.
        rf.set_lr(pc.wrapping_add(4));
    }
    // Branch target is "PC + 8 + offset" because R15 reads as pc+8 mid-pipeline.
    let target = pc.wrapping_add(8).wrapping_add(offset as u32);
    rf.set_pc(target);
    ExecResult::branched(3)
}

fn exec_bx(rf: &mut RegisterFile, link: bool, rm: u8) -> ExecResult {
    let target = rf.read(rm);
    if link {
        rf.set_lr(rf.pc().wrapping_add(4));
    }
    // Bit 0 set → switch to Thumb state (Phase 0 decodes ARM only, but we
    // honour the bit in CPSR so re-entry still works).
    if target & 1 == 1 {
        rf.set_cpsr(rf.cpsr() | psr::T);
        rf.set_pc(target & !1);
    } else {
        rf.set_cpsr(rf.cpsr() & !psr::T);
        rf.set_pc(target & !3);
    }
    ExecResult::branched(3)
}

// ─────────────────────────────────────────────────────────────────────
// MRS / MSR (PSR transfer)
// ─────────────────────────────────────────────────────────────────────

fn exec_psr_transfer(
    rf: &mut RegisterFile,
    is_read: bool,
    use_spsr: bool,
    rd: u8,
    field_mask: u8,
    operand: ShifterOperand,
) -> ExecResult {
    if is_read {
        // MRS: copy CPSR or SPSR into Rd.
        let value = if use_spsr { rf.spsr() } else { rf.cpsr() };
        rf.write(rd, value);
        return ExecResult::sequential(1);
    }

    // MSR: evaluate the operand and merge selected bytes into the PSR.
    let ShiftResult { value, .. } = evaluate_operand(rf, operand);

    // Build a mask covering only the selected fields:
    //   bit 0 (c) → 0x0000_00FF (mode + I/F/T)
    //   bit 1 (x) → 0x0000_FF00 (extension)
    //   bit 2 (s) → 0x00FF_0000 (status)
    //   bit 3 (f) → 0xFF00_0000 (NZCV/Q + IT bits)
    let mut mask: u32 = 0;
    if field_mask & 0b0001 != 0 {
        mask |= 0x0000_00FF;
    }
    if field_mask & 0b0010 != 0 {
        mask |= 0x0000_FF00;
    }
    if field_mask & 0b0100 != 0 {
        mask |= 0x00FF_0000;
    }
    if field_mask & 0b1000 != 0 {
        mask |= 0xFF00_0000;
    }

    if use_spsr {
        // SPSR write — no banking effect on CPSR. Skipped silently in User/System.
        if rf.mode().has_spsr() {
            let current = rf.spsr();
            let new = (current & !mask) | (value & mask);
            rf.set_spsr(new);
        }
    } else {
        let current = rf.cpsr();
        let new = (current & !mask) | (value & mask);
        // set_cpsr will trigger banking if the mode field is in the mask.
        rf.set_cpsr(new);
    }

    ExecResult::sequential(1)
}

// ─────────────────────────────────────────────────────────────────────
// SVC / SWI
// ─────────────────────────────────────────────────────────────────────

fn exec_svc(rf: &mut RegisterFile) -> ExecResult {
    // The faulting PC is the address of the SVC instruction itself, which is
    // what `rf.pc()` currently holds. `enter_exception` will turn that into
    // LR_svc = pc + 4 (the instruction after the SVC).
    let faulting_pc = rf.pc();
    enter_exception(rf, ExceptionKind::Svc, faulting_pc);
    ExecResult::branched(3)
}

// ─────────────────────────────────────────────────────────────────────
// Saturated arithmetic (QADD / QSUB / QDADD / QDSUB)
// ─────────────────────────────────────────────────────────────────────

/// Saturate a signed 64-bit value into the i32 range, returning the clamped
/// value and a flag indicating whether saturation actually occurred.
fn saturate_to_i32(value: i64) -> (i32, bool) {
    if value > i32::MAX as i64 {
        (i32::MAX, true)
    } else if value < i32::MIN as i64 {
        (i32::MIN, true)
    } else {
        (value as i32, false)
    }
}

fn exec_saturated_arith(
    rf: &mut RegisterFile,
    op: SaturatedOp,
    rn: u8,
    rd: u8,
    rm: u8,
) -> ExecResult {
    let m = rf.read(rm) as i32 as i64;
    let n = rf.read(rn) as i32 as i64;

    let (result_i32, saturated) = match op {
        SaturatedOp::Qadd => saturate_to_i32(n.wrapping_add(m)),
        SaturatedOp::Qsub => saturate_to_i32(n.wrapping_sub(m)),
        SaturatedOp::Qdadd => {
            // result = sat(n + sat(2 * m)). Either saturation sticks Q.
            let (doubled, q1) = saturate_to_i32(m.wrapping_mul(2));
            let (res, q2) = saturate_to_i32(n.wrapping_add(doubled as i64));
            (res, q1 || q2)
        }
        SaturatedOp::Qdsub => {
            let (doubled, q1) = saturate_to_i32(m.wrapping_mul(2));
            let (res, q2) = saturate_to_i32(n.wrapping_sub(doubled as i64));
            (res, q1 || q2)
        }
    };

    rf.write(rd, result_i32 as u32);
    if saturated {
        // Q is sticky: once set it stays set until explicitly cleared via MSR.
        let cpsr = rf.cpsr() | psr::Q;
        rf.set_cpsr(cpsr);
    }
    ExecResult::sequential(1)
}

// ─────────────────────────────────────────────────────────────────────
// Load / store single data transfer (including halfword / signed)
// ─────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn exec_single_data_transfer<B: Bus>(
    rf: &mut RegisterFile,
    bus: &mut B,
    load: bool,
    size: TransferSize,
    flags: LoadStoreFlags,
    rn: u8,
    rd: u8,
    address: AddressingMode,
) -> ExecResult {
    // Base register (R15 reads as pc + 8 here too).
    let base = if rn as usize == PC {
        rf.pc().wrapping_add(8)
    } else {
        rf.read(rn)
    };

    // Offset calculation.
    let offset = match address {
        AddressingMode::Immediate { imm12 } => imm12,
        AddressingMode::Register { rm, shift, amount } => {
            let rm_val = rf.read(rm);
            shift_immediate(shift, rm_val, amount, rf.c()).value
        }
    };

    let addr = if flags.pre {
        if flags.up {
            base.wrapping_add(offset)
        } else {
            base.wrapping_sub(offset)
        }
    } else {
        base
    };

    // Do the access.
    let mut branched = false;
    if load {
        let value = match size {
            TransferSize::Byte => bus.read8(addr) as u32,
            TransferSize::SignedByte => (bus.read8(addr) as i8) as i32 as u32,
            TransferSize::Halfword => bus.read16(addr & !1) as u32,
            TransferSize::SignedHalfword => (bus.read16(addr & !1) as i16) as i32 as u32,
            TransferSize::Word => {
                // Unaligned word loads rotate — honour it for accuracy.
                let aligned = bus.read32(addr & !3);
                let rot = (addr & 3) * 8;
                aligned.rotate_right(rot)
            }
        };
        rf.write(rd, value);
        if rd as usize == PC {
            branched = true;
            // Clear Thumb bit handling matches real BX semantics; we keep it simple.
            let v = rf.pc();
            rf.set_pc(v & !3);
        }
    } else {
        // Store. STR of R15 writes pc + 12.
        let source = if rd as usize == PC {
            rf.pc().wrapping_add(12)
        } else {
            rf.read(rd)
        };
        match size {
            TransferSize::Byte => bus.write8(addr, source as u8),
            TransferSize::Halfword => bus.write16(addr & !1, source as u16),
            TransferSize::Word => bus.write32(addr & !3, source),
            // Signed sizes are load-only; decoder marks them Undefined for stores.
            _ => {}
        }
    }

    // Writeback / post-index update.
    if flags.writeback || !flags.pre {
        let final_base = if !flags.pre {
            if flags.up {
                base.wrapping_add(offset)
            } else {
                base.wrapping_sub(offset)
            }
        } else {
            addr
        };
        // If we loaded into Rn, the loaded value wins over the writeback.
        if !(load && rd == rn) {
            rf.write(rn, final_base);
        }
    }

    if branched {
        ExecResult::branched(5)
    } else if load {
        ExecResult::sequential(3)
    } else {
        ExecResult::sequential(2)
    }
}

// ─────────────────────────────────────────────────────────────────────
// Block data transfer (LDM/STM)
// ─────────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn exec_block_transfer<B: Bus>(
    rf: &mut RegisterFile,
    bus: &mut B,
    load: bool,
    mode: BlockMode,
    writeback: bool,
    _s_bit: bool,
    rn: u8,
    reg_list: u16,
) -> ExecResult {
    // Count registers and compute start/end address.
    let count = reg_list.count_ones();
    let base = rf.read(rn);
    let total_bytes = count * 4;

    // Addresses by mode.
    // IA: start = base,          end = base + 4*count
    // IB: start = base + 4,      end = base + 4*count
    // DA: start = base - 4*(count-1), end = base - 4*count + 4*count = base
    // DB: start = base - 4*count, end = base
    let (mut addr, final_base) = match mode {
        BlockMode::IncrementAfter => (base, base.wrapping_add(total_bytes)),
        BlockMode::IncrementBefore => (base.wrapping_add(4), base.wrapping_add(total_bytes)),
        BlockMode::DecrementAfter => (
            base.wrapping_sub(total_bytes).wrapping_add(4),
            base.wrapping_sub(total_bytes),
        ),
        BlockMode::DecrementBefore => (
            base.wrapping_sub(total_bytes),
            base.wrapping_sub(total_bytes),
        ),
    };

    // Transfer registers in ascending order (ARM semantics: low reg goes to
    // low address for every addressing mode).
    let mut branched = false;
    for i in 0..16u8 {
        if reg_list & (1 << i) != 0 {
            if load {
                let v = bus.read32(addr & !3);
                rf.write(i, v);
                if i as usize == PC {
                    branched = true;
                    rf.set_pc(v & !3);
                }
            } else {
                // If Rn is in the list and is the first one stored with STM
                // writeback, the original base is stored. Otherwise, the final
                // base. Phase 0 simplifies to "original base always".
                let v = if i == rn { base } else { rf.read(i) };
                bus.write32(addr & !3, v);
            }
            addr = addr.wrapping_add(4);
        }
    }

    if writeback {
        rf.write(rn, final_base);
    }

    if branched {
        ExecResult::branched(count + 4)
    } else if load {
        ExecResult::sequential(count + 2)
    } else {
        ExecResult::sequential(count + 1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal in-memory bus for unit tests.
    struct TestBus {
        ram: Vec<u8>,
    }

    impl TestBus {
        fn new(size: usize) -> Self {
            Self { ram: vec![0; size] }
        }
    }

    impl Bus for TestBus {
        fn read8(&mut self, addr: u32) -> u8 {
            *self.ram.get(addr as usize).unwrap_or(&0)
        }
        fn read16(&mut self, addr: u32) -> u16 {
            let lo = self.read8(addr);
            let hi = self.read8(addr.wrapping_add(1));
            u16::from_le_bytes([lo, hi])
        }
        fn read32(&mut self, addr: u32) -> u32 {
            let b0 = self.read8(addr);
            let b1 = self.read8(addr.wrapping_add(1));
            let b2 = self.read8(addr.wrapping_add(2));
            let b3 = self.read8(addr.wrapping_add(3));
            u32::from_le_bytes([b0, b1, b2, b3])
        }
        fn write8(&mut self, addr: u32, value: u8) {
            if let Some(b) = self.ram.get_mut(addr as usize) {
                *b = value;
            }
        }
        fn write16(&mut self, addr: u32, value: u16) {
            let [a, b] = value.to_le_bytes();
            self.write8(addr, a);
            self.write8(addr.wrapping_add(1), b);
        }
        fn write32(&mut self, addr: u32, value: u32) {
            let [a, b, c, d] = value.to_le_bytes();
            self.write8(addr, a);
            self.write8(addr.wrapping_add(1), b);
            self.write8(addr.wrapping_add(2), c);
            self.write8(addr.wrapping_add(3), d);
        }
    }

    #[test]
    fn add_sets_zero_flag() {
        let (r, c, v) = add_with_flags(0, 0, false);
        assert_eq!(r, 0);
        assert!(!c);
        assert!(!v);
    }

    #[test]
    fn add_unsigned_overflow_sets_c() {
        let (_, c, _) = add_with_flags(0xFFFF_FFFF, 1, false);
        assert!(c);
    }

    #[test]
    fn add_signed_overflow_sets_v() {
        let (_, _, v) = add_with_flags(0x7FFF_FFFF, 1, false);
        assert!(v);
    }

    #[test]
    fn sub_sets_c_when_no_borrow() {
        let (r, c, _) = sub_with_flags(5, 3, true);
        assert_eq!(r, 2);
        assert!(c);
    }

    #[test]
    fn sub_clears_c_on_borrow() {
        let (r, c, _) = sub_with_flags(3, 5, true);
        assert_eq!(r, 0xFFFF_FFFEu32);
        assert!(!c);
    }

    #[test]
    fn sub_signed_overflow() {
        let (_, _, v) = sub_with_flags(0x8000_0000, 1, true);
        assert!(v);
    }

    #[test]
    fn sbc_honours_input_carry() {
        let (r, _, _) = sub_with_flags(5, 3, false); // subtract with carry-in = 0 → extra -1
        assert_eq!(r, 1);
    }

    #[test]
    fn mul_cycles_small_multiplier() {
        assert_eq!(mul_cycles(0), 2);
        assert_eq!(mul_cycles(0xFF), 2);
        assert_eq!(mul_cycles(0x100), 3);
        assert_eq!(mul_cycles(0x10000), 4);
        assert_eq!(mul_cycles(0x01000000), 5);
    }

    // More targeted tests live in the integration test files under tests/.
    #[test]
    fn bus_roundtrip_word() {
        let mut bus = TestBus::new(64);
        bus.write32(0, 0x1234_5678);
        assert_eq!(bus.read32(0), 0x1234_5678);
        bus.write32(4, 0xDEAD_BEEF);
        assert_eq!(bus.read32(4), 0xDEAD_BEEF);
    }
}
