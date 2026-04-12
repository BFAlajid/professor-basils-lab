//! Tests for condition-code-gated instructions.

mod common;
use common::*;

const MOV: u32 = 0xD;
const ADD: u32 = 0x4;
const CMP: u32 = 0xA;

const EQ: u32 = 0x0;
const NE: u32 = 0x1;
const CS: u32 = 0x2;
const CC: u32 = 0x3;
const MI: u32 = 0x4;
const PL: u32 = 0x5;
const VS: u32 = 0x6;
const VC: u32 = 0x7;
const HI: u32 = 0x8;
const LS: u32 = 0x9;
const GE: u32 = 0xA;
const LT: u32 = 0xB;
const GT: u32 = 0xC;
const LE: u32 = 0xD;
const NV: u32 = 0xF;

/// Drives `cond_value` into the destination register `rd`, then runs a
/// conditional MOV with `cond` writing 0xAA into a different register.
/// Returns the final value of the target register.
fn run_conditional(cond_program: &[u32], cond: u32) -> u32 {
    let mut program = cond_program.to_vec();
    program.push(dp_imm(cond, MOV, 0, 0, 1, 0, 0xAA));
    let (cpu, _) = run_program(&program);
    cpu.regs.read(1)
}

#[test]
fn eq_runs_when_z_set() {
    // CMP 1, 1 → Z=1
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 1), dp_imm(AL, CMP, 1, 0, 0, 0, 1)];
    assert_eq!(run_conditional(&setup, EQ), 0xAA);
}

#[test]
fn eq_skips_when_z_clear() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 1), dp_imm(AL, CMP, 1, 0, 0, 0, 2)];
    assert_eq!(run_conditional(&setup, EQ), 0);
}

#[test]
fn ne_runs_when_z_clear() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 1), dp_imm(AL, CMP, 1, 0, 0, 0, 2)];
    assert_eq!(run_conditional(&setup, NE), 0xAA);
}

#[test]
fn cs_runs_when_c_set() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 3)];
    assert_eq!(run_conditional(&setup, CS), 0xAA);
}

#[test]
fn cc_runs_when_c_clear() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 3), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, CC), 0xAA);
}

#[test]
fn mi_runs_when_n_set() {
    // CMP 0, 1 → result = -1, N=1
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 0), dp_imm(AL, CMP, 1, 0, 0, 0, 1)];
    assert_eq!(run_conditional(&setup, MI), 0xAA);
}

#[test]
fn pl_runs_when_n_clear() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 1)];
    assert_eq!(run_conditional(&setup, PL), 0xAA);
}

#[test]
fn vs_runs_on_overflow() {
    // ADDS 0x7FFFFFFF, 1 → signed overflow, V=1
    let setup = [
        dp_imm(AL, MVN, 0, 0, 0, 0, 0),
        dp_reg(AL, MOV, 0, 0, 0, 0, 1, 1),
        dp_imm(AL, ADD, 1, 0, 1, 0, 1),
    ];
    assert_eq!(run_conditional(&setup, VS), 0xAA);
}

const MVN: u32 = 0xF;

#[test]
fn vc_runs_on_no_overflow() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, ADD, 1, 0, 1, 0, 1)];
    assert_eq!(run_conditional(&setup, VC), 0xAA);
}

#[test]
fn hi_requires_c_and_not_z() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 3)];
    assert_eq!(run_conditional(&setup, HI), 0xAA);
}

#[test]
fn hi_fails_when_equal() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, HI), 0);
}

#[test]
fn ls_runs_on_borrow_or_equal() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, LS), 0xAA);
}

#[test]
fn ge_runs_when_n_eq_v() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 3)];
    assert_eq!(run_conditional(&setup, GE), 0xAA);
}

#[test]
fn lt_runs_when_n_ne_v() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 3), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, LT), 0xAA);
}

#[test]
fn gt_runs_when_neither_z_nor_n_ne_v() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 3)];
    assert_eq!(run_conditional(&setup, GT), 0xAA);
}

#[test]
fn gt_fails_on_equal() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, GT), 0);
}

#[test]
fn le_runs_when_z_or_n_ne_v() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 3), dp_imm(AL, CMP, 1, 0, 0, 0, 5)];
    assert_eq!(run_conditional(&setup, LE), 0xAA);
}

#[test]
fn nv_never_runs() {
    let setup = [dp_imm(AL, MOV, 0, 0, 0, 0, 5)];
    // NV is UNPREDICTABLE on ARMv6K but we decode it as never-true.
    assert_eq!(run_conditional(&setup, NV), 0);
}
