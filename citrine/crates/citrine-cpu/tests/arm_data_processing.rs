//! Integration tests for ARM data-processing instructions.

mod common;
use common::*;

// Opcodes (bits [24:21])
const AND: u32 = 0x0;
const EOR: u32 = 0x1;
const SUB: u32 = 0x2;
const RSB: u32 = 0x3;
const ADD: u32 = 0x4;
const ADC: u32 = 0x5;
const SBC: u32 = 0x6;
const RSC: u32 = 0x7;
const TST: u32 = 0x8;
const TEQ: u32 = 0x9;
const CMP: u32 = 0xA;
const CMN: u32 = 0xB;
const ORR: u32 = 0xC;
const MOV: u32 = 0xD;
const BIC: u32 = 0xE;
const MVN: u32 = 0xF;

#[test]
fn mov_immediate_loads_zero() {
    let (cpu, _) = run_program(&[dp_imm(AL, MOV, 0, 0, 0, 0, 0)]);
    assert_eq!(cpu.regs.read(0), 0);
}

#[test]
fn mov_immediate_loads_ff() {
    let (cpu, _) = run_program(&[dp_imm(AL, MOV, 0, 0, 1, 0, 0xFF)]);
    assert_eq!(cpu.regs.read(1), 0xFF);
}

#[test]
fn mov_rotated_immediate() {
    // 0xFF ROR 8 = 0xFF000000
    let (cpu, _) = run_program(&[dp_imm(AL, MOV, 0, 0, 2, 4, 0xFF)]);
    assert_eq!(cpu.regs.read(2), 0xFF00_0000);
}

#[test]
fn mvn_inverts() {
    let (cpu, _) = run_program(&[dp_imm(AL, MVN, 0, 0, 3, 0, 0)]);
    assert_eq!(cpu.regs.read(3), 0xFFFF_FFFF);
}

#[test]
fn add_immediate_to_register() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 10),
        dp_imm(AL, ADD, 0, 0, 1, 0, 5),
    ]);
    assert_eq!(cpu.regs.read(1), 15);
}

#[test]
fn add_register_and_register() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 3),
        dp_imm(AL, MOV, 0, 0, 1, 0, 4),
        dp_reg(AL, ADD, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 7);
}

#[test]
fn sub_produces_correct_result() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 20),
        dp_imm(AL, MOV, 0, 0, 1, 0, 8),
        dp_reg(AL, SUB, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 12);
}

#[test]
fn rsb_reverses_operands() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 5),
        dp_imm(AL, MOV, 0, 0, 1, 0, 20),
        dp_reg(AL, RSB, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 15);
}

#[test]
fn and_masks_correctly() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xF0),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x3C),
        dp_reg(AL, AND, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 0x30);
}

#[test]
fn orr_unions() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xF0),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x0F),
        dp_reg(AL, ORR, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 0xFF);
}

#[test]
fn eor_xors() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xAA),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0xFF),
        dp_reg(AL, EOR, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 0x55);
}

#[test]
fn bic_clears_bits() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x0F),
        dp_reg(AL, BIC, 0, 0, 2, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(2), 0xF0);
}

#[test]
fn tst_does_not_writeback() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xAA),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x55),
        dp_imm(AL, TST, 1, 0, 0, 0, 0x55),
    ]);
    assert_eq!(cpu.regs.read(0), 0xAA);
    // TST AA & 55 = 0 so Z should be set.
    assert!(cpu.regs.z());
}

#[test]
fn teq_sets_z_when_equal() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x42),
        dp_imm(AL, TEQ, 1, 0, 0, 0, 0x42),
    ]);
    assert!(cpu.regs.z());
}

#[test]
fn cmp_sets_c_when_no_borrow() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 10),
        dp_imm(AL, CMP, 1, 0, 0, 0, 3),
    ]);
    assert!(cpu.regs.c());
    assert!(!cpu.regs.z());
}

#[test]
fn cmp_sets_z_on_equal() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 7),
        dp_imm(AL, CMP, 1, 0, 0, 0, 7),
    ]);
    assert!(cpu.regs.z());
}

#[test]
fn cmn_uses_addition() {
    // CMN tests a + b, so CMN -1, 1 should produce 0 with Z=1 and C=1.
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0), // r0 = 0xFFFFFFFF
        dp_imm(AL, CMN, 1, 0, 0, 0, 1),
    ]);
    assert!(cpu.regs.z());
    assert!(cpu.regs.c());
}

#[test]
fn adc_adds_carry_in() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF), // r0=0xFF
        dp_imm(AL, ADD, 1, 0, 0, 0, 1),    // r0=0x100, C=0 (no overflow in 32-bit)
        dp_imm(AL, MVN, 0, 0, 1, 0, 0),    // r1=0xFFFFFFFF
        dp_imm(AL, ADD, 1, 1, 2, 0, 1),    // r2 = 0, C=1, Z=1
        dp_imm(AL, MOV, 0, 0, 3, 0, 5),
        dp_reg(AL, ADC, 0, 3, 4, 3, 0, 0), // r4 = r3 + r3 + C (=1) = 11
    ]);
    assert_eq!(cpu.regs.read(4), 11);
}

#[test]
fn sbc_subtracts_one_when_carry_clear() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 10),
        dp_imm(AL, MOV, 0, 0, 1, 0, 3),
        // Clear C by CMP of smaller minus larger → borrow → C=0
        dp_imm(AL, MOV, 0, 0, 2, 0, 1),
        dp_imm(AL, CMP, 1, 2, 0, 0, 5),
        // SBC r3, r0, r1 → r3 = r0 - r1 - (1 - C) = 10 - 3 - 1 = 6
        dp_reg(AL, SBC, 0, 0, 3, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(3), 6);
}

#[test]
fn rsc_reverses_sbc() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 3),
        dp_imm(AL, MOV, 0, 0, 1, 0, 10),
        dp_imm(AL, MOV, 0, 0, 2, 0, 20),
        dp_imm(AL, CMP, 1, 2, 0, 0, 30), // 20 - 30 → C=0
        // RSC r3, r0, r1 → r3 = r1 - r0 - (1 - 0) = 10 - 3 - 1 = 6
        dp_reg(AL, RSC, 0, 0, 3, 1, 0, 0),
    ]);
    assert_eq!(cpu.regs.read(3), 6);
}

#[test]
fn mov_with_lsl_shifts() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 1),
        dp_reg(AL, MOV, 0, 0, 1, 0, 0, 4), // MOV r1, r0, LSL #4
    ]);
    assert_eq!(cpu.regs.read(1), 0x10);
}

#[test]
fn mov_with_lsr_shifts() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xF0),
        dp_reg(AL, MOV, 0, 0, 1, 0, 1, 4), // MOV r1, r0, LSR #4
    ]);
    assert_eq!(cpu.regs.read(1), 0x0F);
}

#[test]
fn mov_with_asr_shifts_sign() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MVN, 0, 0, 0, 0, 0),    // r0 = 0xFFFFFFFF
        dp_reg(AL, MOV, 0, 0, 1, 0, 2, 4), // MOV r1, r0, ASR #4
    ]);
    assert_eq!(cpu.regs.read(1), 0xFFFF_FFFF);
}

#[test]
fn mov_with_ror_rotates() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xFF),
        dp_reg(AL, MOV, 0, 0, 1, 0, 3, 4), // ROR #4
    ]);
    assert_eq!(cpu.regs.read(1), 0xF000_000F);
}

#[test]
fn mov_rrx_rotates_through_carry() {
    let (cpu, _) = run_program(&[
        // Set C=1 by CMP of 1-0
        dp_imm(AL, CMP, 1, 0, 0, 0, 0),
        dp_imm(AL, MOV, 0, 0, 0, 0, 2),
        // MOV r1, r0, RRX → encoded as ROR with shift_amount=0
        dp_reg(AL, MOV, 0, 0, 1, 0, 3, 0),
    ]);
    // RRX with C=1: (2>>1) | (1<<31) = 0x80000001
    assert_eq!(cpu.regs.read(1), 0x8000_0001);
}

#[test]
fn register_shift_by_register() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 1),
        dp_imm(AL, MOV, 0, 0, 1, 0, 3),
        dp_reg_shift(AL, MOV, 0, 0, 2, 0, 0, 1), // MOV r2, r0, LSL r1
    ]);
    assert_eq!(cpu.regs.read(2), 0b1000);
}

#[test]
fn add_with_shifted_register() {
    let (cpu, _) = run_program(&[
        dp_imm(AL, MOV, 0, 0, 0, 0, 2),
        dp_imm(AL, MOV, 0, 0, 1, 0, 3),
        dp_reg(AL, ADD, 0, 0, 2, 1, 0, 1), // r2 = r0 + (r1 LSL 1) = 2 + 6 = 8
    ]);
    assert_eq!(cpu.regs.read(2), 8);
}
