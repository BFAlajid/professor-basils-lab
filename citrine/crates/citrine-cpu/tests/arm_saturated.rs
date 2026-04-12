//! Tests for saturated arithmetic (QADD / QSUB / QDADD / QDSUB).
//!
//! Encoding reference (all are class 000 with bits [7:4] = 0101):
//! ```text
//! QADD  cond 0001 0000 Rn Rd 0000 0101 Rm  → base 0x0100_0050
//! QSUB  cond 0001 0010 Rn Rd 0000 0101 Rm  → base 0x0120_0050
//! QDADD cond 0001 0100 Rn Rd 0000 0101 Rm  → base 0x0140_0050
//! QDSUB cond 0001 0110 Rn Rd 0000 0101 Rm  → base 0x0160_0050
//! ```

mod common;
use common::*;

use citrine_cpu::{psr, Cpu};

// ── Encoding helpers ─────────────────────────────────────────────────

const QADD_BASE: u32 = 0x0100_0050;
const QSUB_BASE: u32 = 0x0120_0050;
const QDADD_BASE: u32 = 0x0140_0050;
const QDSUB_BASE: u32 = 0x0160_0050;

/// Encode the four Q-prefixed instructions. Args are in encoding-field order:
/// `Rn` lives in bits [19:16] (the "first operand" per the user's spec —
/// `result = sat(Rn ± Rm)`), `Rd` is the destination, `Rm` is the second
/// operand (and is the doubled one for QDADD/QDSUB).
fn q_op(c: u32, base: u32, rd: u32, rn: u32, rm: u32) -> u32 {
    cond(c) | base | (rn << 16) | (rd << 12) | rm
}

fn qadd(c: u32, rd: u32, rn: u32, rm: u32) -> u32 {
    q_op(c, QADD_BASE, rd, rn, rm)
}

fn qsub(c: u32, rd: u32, rn: u32, rm: u32) -> u32 {
    q_op(c, QSUB_BASE, rd, rn, rm)
}

fn qdadd(c: u32, rd: u32, rn: u32, rm: u32) -> u32 {
    q_op(c, QDADD_BASE, rd, rn, rm)
}

fn qdsub(c: u32, rd: u32, rn: u32, rm: u32) -> u32 {
    q_op(c, QDSUB_BASE, rd, rn, rm)
}

/// MOV Rd, #imm8 (no rotate).
fn mov_imm(rd: u32, imm: u32) -> u32 {
    0xE3A0_0000 | (rd << 12) | (imm & 0xFF)
}

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
fn qadd_basic() {
    // r0 = 5 (Rn), r1 = 7 (Rm); result = sat(r0 + r1) = 12.
    let cpu = run(&[
        mov_imm(0, 5),
        mov_imm(1, 7),
        qadd(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(2), 12);
    assert_eq!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qadd_positive_overflow_clamps_to_imax() {
    // r0 = i32::MAX (Rn), r1 = 1 (Rm). result = sat(imax + 1) = imax, Q=1.
    // 0x80000000 is imm8 0x02 ROR by 1 (rotate field = 1). MVN inverts:
    let mvn_imax = 0xE3E0_0102; // MVN r0, #0x80000000 → r0 = 0x7FFF_FFFF
    let cpu = run(&[
        mvn_imax,
        mov_imm(1, 1),
        qadd(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(0), 0x7FFF_FFFF);
    assert_eq!(cpu.regs.read(2), 0x7FFF_FFFF);
    assert_ne!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qadd_negative_overflow_clamps_to_imin() {
    // r0 = i32::MIN (Rn), r1 = -1 (Rm). result = sat(imin + (-1)) = imin, Q=1.
    let mov_imin = 0xE3A0_0102; // MOV r0, #0x80000000
    let mvn_minus_one = 0xE3E0_1000; // MVN r1, #0 → r1 = 0xFFFFFFFF (-1 signed)
    let cpu = run(&[
        mov_imin,
        mvn_minus_one,
        qadd(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(0), 0x8000_0000);
    assert_eq!(cpu.regs.read(1), 0xFFFF_FFFF);
    assert_eq!(cpu.regs.read(2), 0x8000_0000);
    assert_ne!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qsub_basic() {
    // r0 = 10 (Rn), r1 = 3 (Rm). result = sat(r0 - r1) = 7.
    let cpu = run(&[
        mov_imm(0, 10),
        mov_imm(1, 3),
        qsub(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(2) as i32, 7);
    assert_eq!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qsub_overflow_sets_q_flag() {
    // r0 = i32::MIN (Rn), r1 = 1 (Rm). result = sat(imin - 1) = imin, Q=1.
    let mov_imin = 0xE3A0_0102; // MOV r0, #0x80000000
    let cpu = run(&[
        mov_imin,
        mov_imm(1, 1),
        qsub(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(2), 0x8000_0000);
    assert_ne!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qdadd_doubles_rm() {
    // r0 = 5 (Rn), r1 = 10 (Rm). result = sat(r0 + sat(2 * r1)) = 5 + 20 = 25.
    let cpu = run(&[
        mov_imm(0, 5),
        mov_imm(1, 10),
        qdadd(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(2) as i32, 25);
    assert_eq!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn qdsub_doubles_rm() {
    // r0 = 100 (Rn), r1 = 10 (Rm). result = sat(r0 - sat(2 * r1)) = 100 - 20 = 80.
    let cpu = run(&[
        mov_imm(0, 100),
        mov_imm(1, 10),
        qdsub(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1),
    ]);
    assert_eq!(cpu.regs.read(2) as i32, 80);
    assert_eq!(cpu.cpsr() & psr::Q, 0);
}

#[test]
fn q_flag_sticky_across_instructions() {
    // First QADD saturates → Q=1. Second QADD does not. Q stays set.
    let mvn_imax = 0xE3E0_0102; // MVN r0, #0x80000000 → r0 = 0x7FFFFFFF
    let cpu = run(&[
        mvn_imax,
        mov_imm(1, 1),
        qadd(AL, /*rd*/ 2, /*rn*/ 0, /*rm*/ 1), // saturates → Q=1
        mov_imm(3, 5),
        mov_imm(4, 6),
        qadd(AL, /*rd*/ 5, /*rn*/ 3, /*rm*/ 4), // no saturation
    ]);
    assert_eq!(cpu.regs.read(5), 11);
    assert_ne!(cpu.cpsr() & psr::Q, 0, "Q should remain set across non-saturating ops");
}
