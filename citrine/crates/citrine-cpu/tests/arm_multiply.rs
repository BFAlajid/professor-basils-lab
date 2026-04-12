//! Tests for MUL / MLA / UMULL / UMLAL / SMULL / SMLAL.

mod common;
use common::*;

const MOV: u32 = 0xD;
const MVN: u32 = 0xF;

#[test]
fn mul_basic() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 7),
        dp_imm(AL, MOV, 0, 0, 1, 0, 6),
        mul(AL, 0, 2, 0, 1),
    ]);
    assert_eq!(cpu.regs.read(2), 42);
}

#[test]
fn mul_of_zero() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0),
        dp_imm(AL, MOV, 0, 0, 1, 0, 999),
        mul(AL, 1, 2, 0, 1),
    ]);
    assert_eq!(cpu.regs.read(2), 0);
    assert!(cpu.regs.z());
}

#[test]
fn mul_flags_high_bit_sets_n() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = -1
        dp_imm(AL, MOV, 0, 0, 1, 0, 1),
        mul(AL, 1, 2, 0, 1),
    ]);
    assert!(cpu.regs.n());
}

#[test]
fn mla_adds_accumulator() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 3),
        dp_imm(AL, MOV, 0, 0, 1, 0, 4),
        dp_imm(AL, MOV, 0, 0, 2, 0, 100),
        mla(AL, 0, 3, 0, 1, 2), // r3 = r0*r1 + r2 = 12 + 100 = 112
    ]);
    assert_eq!(cpu.regs.read(3), 112);
}

#[test]
fn umull_stores_full_64_bit_result() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF), // r0 = 0xFF
        dp_reg(AL, MOV, 0, 0, 0, 0, 0, 0x10), // LSL #16 → r0 = 0xFF0000
        dp_imm(AL, MOV, 0, 0, 1, 0, 0xFF),
        dp_reg(AL, MOV, 0, 0, 1, 1, 0, 0x10), // r1 = 0xFF0000
        // UMULL r2, r3, r0, r1
        mull(AL, 0, 0, 0, 2, 3, 0, 1),
    ]);
    let lo = cpu.regs.read(2);
    let hi = cpu.regs.read(3);
    let full = ((hi as u64) << 32) | lo as u64;
    assert_eq!(full, 0xFF0000u64 * 0xFF0000u64);
}

#[test]
fn smull_handles_negative_operands() {
    let (cpu, _) = run_program(&[
        // r0 = -5
        dp_imm(AL, MVN, 0, 0, 0, 0, 4),
        dp_imm(AL, MOV, 0, 0, 1, 0, 3),
        // SMULL r2, r3, r0, r1 → -15 as 64-bit signed = 0xFFFFFFFFFFFFFFF1
        mull(AL, 1, 0, 0, 2, 3, 0, 1),
    ]);
    let lo = cpu.regs.read(2);
    let hi = cpu.regs.read(3);
    let full = ((hi as u64) << 32) | lo as u64;
    assert_eq!(full as i64, -15);
}

#[test]
fn umlal_accumulates_into_existing_pair() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 10),
        dp_imm(AL, MOV, 0, 0, 1, 0, 20),
        dp_imm(AL, MOV, 0, 0, 2, 0, 100), // RdLo starts at 100
        dp_imm(AL, MOV, 0, 0, 3, 0, 0),   // RdHi starts at 0
        // UMLAL r2, r3, r0, r1 → r2 = 100 + (10*20) = 300
        mull(AL, 0, 1, 0, 2, 3, 0, 1),
    ]);
    assert_eq!(cpu.regs.read(2), 300);
    assert_eq!(cpu.regs.read(3), 0);
}

#[test]
fn smlal_accumulates_signed() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = -1
        dp_imm(AL, MOV, 0, 0, 1, 0, 5), // r1 = 5
        dp_imm(AL, MOV, 0, 0, 2, 0, 100),
        dp_imm(AL, MOV, 0, 0, 3, 0, 0),
        // SMLAL r2,r3,r0,r1 → adds (-5) as 64-bit to (0 << 32 | 100)
        mull(AL, 1, 1, 0, 2, 3, 0, 1),
    ]);
    let lo = cpu.regs.read(2);
    let hi = cpu.regs.read(3);
    let full = ((hi as u64) << 32) | lo as u64;
    assert_eq!(full as i64, 95);
}

#[test]
fn mul_with_large_wraparound() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = 0xFFFFFFFF
        dp_imm(AL, MOV, 0, 0, 1, 0, 2),
        mul(AL, 0, 2, 0, 1),
    ]);
    // 0xFFFFFFFF * 2 = 0x1FFFFFFFE → low 32 bits 0xFFFFFFFE
    assert_eq!(cpu.regs.read(2), 0xFFFF_FFFE);
}
