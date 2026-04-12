//! LDR / STR / LDRB / STRB / LDRH / STRH / LDRSB / LDRSH.

mod common;
use common::*;
use citrine_cpu::{Bus, Cpu};

const MOV: u32 = 0xD;

fn make_sys() -> (Cpu, TestBus) {
    (Cpu::new(), TestBus::new(0x1000))
}

#[test]
fn str_word_writes_memory() {
    let (mut cpu, mut bus) = make_sys();
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xAB),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40), // base address (word-aligned)
        ldr_str_imm(AL, 0, 0, 1, 1, 0, 1, 0, 0), // STR r0, [r1]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..3 {
        cpu.step(&mut bus);
    }
    assert_eq!(bus.read32(0x40), 0xAB);
}

#[test]
fn ldr_word_reads_memory() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x40, 0xDEAD_BEEF);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 0, 1, 1, 0, 1, 0, 0), // LDR r0, [r1]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xDEAD_BEEF);
}

#[test]
fn ldr_with_positive_offset() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x44, 0x11223344);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 0, 1, 1, 0, 1, 0, 4), // LDR r0, [r1, #4]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0x11223344);
}

#[test]
fn ldr_with_negative_offset() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x3C, 0x5555_5555);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 0, 1, 0, 0, 1, 0, 4), // LDR r0, [r1, #-4]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0x5555_5555);
}

#[test]
fn ldr_with_writeback_updates_base() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x44, 0x11);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 0, 1, 1, 1, 1, 0, 4), // LDR r0, [r1, #4]!
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0x11);
    assert_eq!(cpu.regs.read(1), 0x44);
}

#[test]
fn ldr_post_indexed_updates_base_after() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x40, 0x22);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 0, 0, 1, 0, 1, 0, 4), // LDR r0, [r1], #4
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0x22);
    assert_eq!(cpu.regs.read(1), 0x44);
}

#[test]
fn strb_writes_single_byte() {
    let (mut cpu, mut bus) = make_sys();
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xAB),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x41),
        ldr_str_imm(AL, 0, 1, 1, 1, 0, 1, 0, 0), // STRB r0, [r1]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..3 {
        cpu.step(&mut bus);
    }
    assert_eq!(bus.read8(0x41), 0xAB);
    // Neighbouring bytes untouched.
    assert_eq!(bus.read8(0x40), 0);
    assert_eq!(bus.read8(0x42), 0);
}

#[test]
fn ldrb_zero_extends() {
    let (mut cpu, mut bus) = make_sys();
    bus.write8(0x40, 0xFF);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldr_str_imm(AL, 1, 1, 1, 1, 0, 1, 0, 0), // LDRB r0, [r1]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xFF);
}

#[test]
fn ldr_with_register_offset() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x48, 0xABCDE);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        dp_imm(AL, MOV, 0, 0, 2, 0, 8),
        ldr_str_reg(AL, 1, 0, 1, 1, 0, 1, 0, 2, 0, 0), // LDR r0, [r1, r2]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..3 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xABCDE);
}

#[test]
fn ldr_with_shifted_register_offset() {
    let (mut cpu, mut bus) = make_sys();
    bus.write32(0x50, 0xBABE);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        dp_imm(AL, MOV, 0, 0, 2, 0, 4),
        ldr_str_reg(AL, 1, 0, 1, 1, 0, 1, 0, 2, 0, 2), // LDR r0, [r1, r2, LSL #2]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..3 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xBABE);
}

#[test]
fn strh_writes_halfword_only() {
    let (mut cpu, mut bus) = make_sys();
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0xBEEF & 0xFF),
        dp_reg(AL, MOV, 0, 0, 0, 0, 0, 0),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x12), // just 0x12; we check byte precision
        ldrh_strh_imm(AL, 0, 0b01, 1, 1, 0, 1, 0, 0), // STRH r0, [r1]
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..5 {
        cpu.step(&mut bus);
    }
    assert_eq!(bus.read16(0x40), 0x0012);
    // High bytes untouched at 0x42.
    assert_eq!(bus.read16(0x42), 0);
}

#[test]
fn ldrh_reads_halfword() {
    let (mut cpu, mut bus) = make_sys();
    bus.write16(0x40, 0xF00D);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldrh_strh_imm(AL, 1, 0b01, 1, 1, 0, 1, 0, 0),
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xF00D);
}

#[test]
fn ldrsb_sign_extends() {
    let (mut cpu, mut bus) = make_sys();
    bus.write8(0x40, 0xFF);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldrh_strh_imm(AL, 1, 0b10, 1, 1, 0, 1, 0, 0),
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xFFFF_FFFF);
}

#[test]
fn ldrsh_sign_extends() {
    let (mut cpu, mut bus) = make_sys();
    bus.write16(0x40, 0x8000);
    let program = [
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x40),
        ldrh_strh_imm(AL, 1, 0b11, 1, 1, 0, 1, 0, 0),
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..2 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 0xFFFF_8000);
}
