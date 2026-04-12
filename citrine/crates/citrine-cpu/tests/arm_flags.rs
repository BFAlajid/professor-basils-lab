//! Tests for CPSR flag updates by arithmetic and logical operations.

mod common;
use common::*;

const AND: u32 = 0x0;
const SUB: u32 = 0x2;
const ADD: u32 = 0x4;
const ADC: u32 = 0x5;
const ORR: u32 = 0xC;
const MOV: u32 = 0xD;

#[test]
fn add_overflow_sets_c_and_clears_v_when_unsigned() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0),  // r0 = 0xFFFFFFFF
        dp_imm(AL, ADD, 1, 0, 1, 0, 1),  // r1 = 0, C=1, Z=1
    ]);
    assert!(cpu.regs.c());
    assert!(cpu.regs.z());
    assert!(!cpu.regs.n());
    assert!(!cpu.regs.v());
}

const MVN: u32 = 0xF;

#[test]
fn add_signed_overflow_sets_v() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x80), // r0 = 0x80
        dp_reg(AL, MOV, 0, 0, 0, 0, 0, 0x18), // ROR #24: rotate 0x80 → 0x80000000? actually MOV-reg with LSL — simpler way below
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x7F),
    ]);
    let _ = cpu; // placeholder so we compile; the real test is next.
    let (cpu, _) = run_program(&[
        // Load 0x7FFFFFFF: MVN 0x80000000 → too awkward for immediate encoding.
        // Instead: MVN r0, #0; LSR r0, r0, #1 → r0 = 0x7FFFFFFF
        dp_imm(AL, MVN, 0, 0, 0, 0, 0),
        dp_reg(AL, MOV, 0, 0, 0, 0, 1, 1),
        dp_imm(AL, ADD, 1, 0, 1, 0, 1),
    ]);
    assert!(cpu.regs.v());
    assert!(cpu.regs.n());
}

#[test]
fn sub_sets_n_on_negative_result() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 1),
        dp_imm(AL, SUB, 1, 0, 1, 0, 5),
    ]);
    assert!(cpu.regs.n());
    assert!(!cpu.regs.z());
    assert!(!cpu.regs.c()); // borrow
}

#[test]
fn sub_sets_z_on_zero_result() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 5),
        dp_imm(AL, SUB, 1, 0, 1, 0, 5),
    ]);
    assert!(cpu.regs.z());
    assert!(cpu.regs.c()); // no borrow
    assert!(!cpu.regs.n());
    assert!(!cpu.regs.v());
}

#[test]
fn logical_and_s_updates_n_z_not_v() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF),
        dp_imm(AL, AND, 1, 0, 1, 0, 0),
    ]);
    assert!(cpu.regs.z());
    assert!(!cpu.regs.n());
}

#[test]
fn logical_orr_s_sets_n_on_high_bit() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = 0xFFFFFFFF
        dp_imm(AL, ORR, 1, 0, 1, 0, 0),
    ]);
    assert!(cpu.regs.n());
}

#[test]
fn adc_carries_through_chain() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = 0xFFFFFFFF
        dp_imm(AL, ADD, 1, 0, 1, 0, 1), // r1 = 0, C=1
        dp_imm(AL, MOV, 0, 0, 2, 0, 0),
        dp_reg(AL, ADC, 0, 2, 3, 2, 0, 0), // r3 = 0 + 0 + 1 = 1
    ]);
    assert_eq!(cpu.regs.read(3), 1);
}

#[test]
fn s_bit_zero_does_not_update_flags() {
    let (cpu, _) = run_program(&[
        // Establish N=1 via CMP 0, 1
        dp_imm(AL, CMP, 1, 0, 0, 0, 1),
        // Do a non-S ADD that would otherwise clear N.
        dp_imm(AL, MOV, 0, 0, 0, 0, 5),
        dp_imm(AL, ADD, 0, 0, 1, 0, 5),
    ]);
    assert!(cpu.regs.n());
}

const CMP: u32 = 0xA;

#[test]
fn cmp_large_vs_small_sets_c() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF),
        dp_imm(AL, CMP, 1, 0, 0, 0, 1),
    ]);
    assert!(cpu.regs.c());
}

#[test]
fn cmp_small_vs_large_clears_c() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 1),
        dp_imm(AL, CMP, 1, 0, 0, 0, 0xFF),
    ]);
    assert!(!cpu.regs.c());
}
