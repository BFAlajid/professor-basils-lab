//! Tests for MRS / MSR (move PSR ↔ register / immediate).
//!
//! Encoding reference:
//! ```text
//! MRS Rd, CPSR    : cond 0001 0000 1111 Rd 0000 0000 0000   = base 0x010F_0000
//! MRS Rd, SPSR    : cond 0001 0100 1111 Rd 0000 0000 0000   = base 0x014F_0000
//! MSR CPSR_<f>, Rm   : cond 0001 0010 mask 1111 0000 0000 Rm   = base 0x0120_F000
//! MSR SPSR_<f>, Rm   : cond 0001 0110 mask 1111 0000 0000 Rm   = base 0x0160_F000
//! MSR CPSR_<f>, #imm : cond 0011 0010 mask 1111 rotate imm8     = base 0x0320_F000
//! MSR SPSR_<f>, #imm : cond 0011 0110 mask 1111 rotate imm8     = base 0x0360_F000
//! ```

mod common;
use common::*;

use citrine_cpu::{psr, Cpu, Mode};

// ── Encoding helpers ─────────────────────────────────────────────────

/// Encode `MRS Rd, CPSR/SPSR`.
fn mrs(c: u32, use_spsr: bool, rd: u32) -> u32 {
    let base = if use_spsr { 0x014F_0000 } else { 0x010F_0000 };
    cond(c) | base | (rd << 12)
}

/// Encode `MSR CPSR/SPSR_<f>, Rm`. `field_mask` is 4 bits.
fn msr_reg(c: u32, use_spsr: bool, field_mask: u32, rm: u32) -> u32 {
    let base = if use_spsr { 0x0160_F000 } else { 0x0120_F000 };
    cond(c) | base | ((field_mask & 0xF) << 16) | (rm & 0xF)
}

/// Encode `MSR CPSR/SPSR_<f>, #imm`.
fn msr_imm(c: u32, use_spsr: bool, field_mask: u32, rotate: u32, imm8: u32) -> u32 {
    let base = if use_spsr { 0x0360_F000 } else { 0x0320_F000 };
    cond(c) | base | ((field_mask & 0xF) << 16) | ((rotate & 0xF) << 8) | (imm8 & 0xFF)
}

// 4-bit field-mask constants for MSR. The bits are (msb→lsb): f s x c.
const MASK_C: u32 = 0b0001;
const MASK_F: u32 = 0b1000;
const MASK_ALL: u32 = 0b1111;

fn run(words: &[u32]) -> Cpu {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, words);
    cpu.reset(0);
    for _ in 0..words.len() {
        cpu.step(&mut bus);
    }
    cpu
}

// ── Tests ────────────────────────────────────────────────────────────

#[test]
fn mrs_reads_cpsr() {
    // CPU starts in Supervisor with I+F masked. MRS r0, CPSR should reflect that.
    let cpu = run(&[mrs(AL, false, 0)]);
    let expected = Mode::Supervisor as u32 | psr::I | psr::F;
    assert_eq!(cpu.regs.read(0), expected);
}

#[test]
fn mrs_reads_spsr_in_supervisor_mode() {
    // Pre-load SPSR by setting it via the register file directly is hard from
    // assembly; instead we use MSR SPSR to seed it, then read it back.
    // Sequence: MSR SPSR_f, #0xF0000000 (sets all of NZCV in SPSR's flag byte)
    //           MRS r1, SPSR
    let cpu = run(&[
        msr_imm(AL, true, MASK_F, 0b0100, 0xF0), // imm = 0xF0 ROR 8 = 0xF0000000
        mrs(AL, true, 1),
    ]);
    // The flag byte 0xF0000000 means N=Z=C=V=1 in SPSR.
    assert_eq!(cpu.regs.read(1) & 0xF000_0000, 0xF000_0000);
}

#[test]
fn msr_immediate_writes_flag_byte() {
    // MSR CPSR_f, #0xF0000000 → set NZCV bits.
    // imm8 = 0xF0, rotate = 4 (so rotate*2 = 8), giving 0xF0 ROR 8 = 0xF0000000.
    let cpu = run(&[msr_imm(AL, false, MASK_F, 0b0100, 0xF0)]);
    assert!(cpu.regs.n());
    assert!(cpu.regs.z());
    assert!(cpu.regs.c());
    assert!(cpu.regs.v());
}

#[test]
fn msr_immediate_does_not_touch_control_byte_when_mask_omits_it() {
    // Start in Supervisor (I=F=1). MSR CPSR_f, #0xF0000000 sets flags only —
    // mode and I/F bits should remain unchanged.
    let before = Mode::Supervisor as u32 | psr::I | psr::F;
    let cpu = run(&[msr_imm(AL, false, MASK_F, 0b0100, 0xF0)]);
    let cpsr = cpu.cpsr();
    assert_eq!(cpsr & psr::MODE_MASK, before & psr::MODE_MASK);
    assert_ne!(cpsr & psr::I, 0);
    assert_ne!(cpsr & psr::F, 0);
    // Flag byte updated.
    assert_eq!(cpsr & 0xF000_0000, 0xF000_0000);
}

#[test]
fn msr_register_writes_full_cpsr() {
    // MOV r0, # something useful, then MSR CPSR_fsxc, r0.
    // Build a CPSR value: System mode, no IRQ/FIQ mask, NZCV all clear.
    // System = 0x1F. So r0 = 0x0000_001F.
    let target_cpsr = Mode::System as u32; // 0x1F
    // We can't load 0x1F as a single immediate? Yes — 0x1F fits in imm8 with rotate=0.
    // MOV r0, #0x1F
    let mov_r0_31 = 0xE3A0_001F;
    let cpu = run(&[mov_r0_31, msr_reg(AL, false, MASK_ALL, 0)]);
    assert_eq!(cpu.regs.read(0), 0x1F);
    assert_eq!(cpu.cpsr() & psr::MODE_MASK, target_cpsr & psr::MODE_MASK);
    assert_eq!(cpu.cpsr() & psr::I, 0);
    assert_eq!(cpu.cpsr() & psr::F, 0);
}

#[test]
fn msr_changes_mode() {
    // Switch from Supervisor → System using MSR with the control byte mask set.
    // MOV r0, #0x1F (System mode, no I/F mask)
    let mov = 0xE3A0_001F;
    let cpu = run(&[mov, msr_reg(AL, false, MASK_C, 0)]);
    assert_eq!(cpu.regs.mode(), Mode::System);
}

#[test]
fn msr_preserves_mode_when_only_flag_byte_masked() {
    // Build a value that *would* switch to User mode (0x10) but mask only the
    // flag byte. Mode should stay Supervisor.
    // MOV r0, #0xF0000010 — can't load directly. Use two steps: load 0x10, then
    // OR with 0xF0000000 via shifts. Simpler: load 0x10000000 and shift left.
    // Actually easier: use immediate 0xF0 rotated by 8 (but that's only flags).
    //
    // Cleanest: load 0x10 into r0 then shift to high half? ARM has no rotate
    // instruction; instead use MOV with rotate. The combined value 0xF000_0010
    // is *not* expressible as one immediate. Use two stages:
    //   MOV r0, #0xF0000000
    //   ORR r0, r0, #0x10
    //   MSR CPSR_f, r0
    let mov = 0xE3A0_04F0; // MOV r0, #0xF0000000  (imm8=0xF0, rotate=4)
    let orr = 0xE380_0010; // ORR r0, r0, #0x10
    let msr = msr_reg(AL, false, MASK_F, 0); // mask = flag byte only
    let cpu = run(&[mov, orr, msr]);
    assert_eq!(cpu.regs.mode(), Mode::Supervisor);
    // But the flag byte should be set.
    assert!(cpu.regs.n());
    assert!(cpu.regs.z());
    assert!(cpu.regs.c());
    assert!(cpu.regs.v());
}

#[test]
fn msr_to_spsr_per_mode() {
    // In Supervisor, MSR SPSR_f, #0xF0000000 should set the Supervisor SPSR.
    // Switching to IRQ should give a fresh (zero) SPSR; switching back to
    // Supervisor should restore the original.
    //
    // We seed the supervisor SPSR, switch modes via MSR CPSR_c, and read SPSR
    // again from each.
    //
    // MOV r0, #0xF0000000 ; MSR SPSR_f, r0     ; SPSR_svc = 0xF0000000
    // MOV r0, #0xD2 (IRQ mode + I masked = 0x12 + 0x80 = 0x92? actually let's do User)
    //      Actually we need a value loadable as a single immediate.
    //      IRQ mode = 0x12. Add I bit (0x80). Total = 0x92. Loadable directly.
    // MOV r0, #0x92        ; MSR CPSR_c, r0    ; switch to IRQ
    // MRS r1, SPSR                                ; r1 = 0 (fresh IRQ SPSR)
    let mov_flag = 0xE3A0_04F0; // MOV r0, #0xF0000000
    let msr_spsr = msr_reg(AL, true, MASK_F, 0);
    let mov_irq_cpsr = 0xE3A0_0092; // MOV r0, #0x92
    let msr_cpsr = msr_reg(AL, false, MASK_C, 0);
    let mrs_spsr = mrs(AL, true, 1);
    let cpu = run(&[mov_flag, msr_spsr, mov_irq_cpsr, msr_cpsr, mrs_spsr]);
    assert_eq!(cpu.regs.mode(), Mode::Irq);
    // IRQ SPSR is fresh.
    assert_eq!(cpu.regs.read(1), 0);
}

#[test]
fn mrs_after_mode_switch_returns_correct_cpsr() {
    // After MSR CPSR_c switching to System, MRS should reflect System mode.
    let mov = 0xE3A0_001F; // MOV r0, #0x1F (System mode, no I/F)
    let msr = msr_reg(AL, false, MASK_C, 0);
    let mrs_after = mrs(AL, false, 1);
    let cpu = run(&[mov, msr, mrs_after]);
    assert_eq!(cpu.regs.read(1) & psr::MODE_MASK, Mode::System as u32);
}

#[test]
fn msr_clears_n_flag() {
    // Set N first, then clear it via MSR with the flag byte = 0.
    // 0x80000000 needs imm8 = 0x02, rotate-field = 1 (rotate*2 = 2), so 0x02 ROR 2 = 0x80000000.
    let mov_n = 0xE3A0_0102; // MOV r0, #0x80000000
    let msr_set = msr_reg(AL, false, MASK_F, 0);
    let mov_zero = 0xE3A0_0000; // MOV r0, #0
    let msr_clear = msr_reg(AL, false, MASK_F, 0);
    let cpu = run(&[mov_n, msr_set, mov_zero, msr_clear]);
    assert!(!cpu.regs.n());
    assert!(!cpu.regs.z());
    assert!(!cpu.regs.c());
    assert!(!cpu.regs.v());
}

#[test]
fn msr_sets_v_flag() {
    // MSR CPSR_f, #0x10000000 → V bit only.
    // 0x10000000 = imm8 0x01 rotated by 2 (rotate*2 = 4). Wait, 0x01 ROR 4 = 0x10000000. yes.
    let cpu = run(&[msr_imm(AL, false, MASK_F, 2, 0x01)]);
    assert!(!cpu.regs.n());
    assert!(!cpu.regs.z());
    assert!(!cpu.regs.c());
    assert!(cpu.regs.v());
}

#[test]
fn msr_round_trip_through_spsr() {
    // MSR SPSR_fsxc, r0 ; MRS r1, SPSR ; check r1 == r0 (in modes that have SPSR)
    // Use a fully-loadable pattern: 0x0000_001F (System).
    let mov = 0xE3A0_001F;
    let msr_spsr = msr_reg(AL, true, MASK_ALL, 0);
    let mrs_back = mrs(AL, true, 1);
    let cpu = run(&[mov, msr_spsr, mrs_back]);
    assert_eq!(cpu.regs.read(1), 0x1F);
}
