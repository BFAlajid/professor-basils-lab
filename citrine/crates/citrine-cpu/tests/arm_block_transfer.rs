//! LDM / STM — block data transfer.

mod common;
use common::*;
use citrine_cpu::{Bus, Cpu};

const MOV: u32 = 0xD;

fn prime_regs(cpu: &mut Cpu, bus: &mut TestBus) {
    // Load r0..r4 with known values via individual MOV immediates.
    let setup = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x10),
        dp_imm(AL, MOV, 0, 0, 1, 0, 0x20),
        dp_imm(AL, MOV, 0, 0, 2, 0, 0x30),
        dp_imm(AL, MOV, 0, 0, 3, 0, 0x40),
        dp_imm(AL, MOV, 0, 0, 4, 0, 0x50),
    ];
    bus.load_words(0, &setup);
    cpu.reset(0);
    for _ in 0..setup.len() {
        cpu.step(bus);
    }
}

#[test]
fn stmia_stores_registers_ascending() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    prime_regs(&mut cpu, &mut bus);
    // Point r5 at 0x200 and STMIA r5, {r0-r4}
    let program = [
        dp_imm(AL, MOV, 0, 0, 5, 0, 0x80), // r5 = 0x80 (word-aligned)
        ldm_stm(AL, 0, 0, 1, 0, 0, 5, 0x001F), // STMIA r5, {r0-r4}
    ];
    bus.load_words(0x20, &program);
    cpu.regs.set_pc(0x20);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(bus.read32(0x80), 0x10);
    assert_eq!(bus.read32(0x84), 0x20);
    assert_eq!(bus.read32(0x88), 0x30);
    assert_eq!(bus.read32(0x8C), 0x40);
    assert_eq!(bus.read32(0x90), 0x50);
}

#[test]
fn stmia_writeback_updates_base() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    prime_regs(&mut cpu, &mut bus);
    let program = [
        dp_imm(AL, MOV, 0, 0, 5, 0, 0x80),
        ldm_stm(AL, 0, 0, 1, 0, 1, 5, 0x0007), // STMIA r5!, {r0-r2}
    ];
    bus.load_words(0x20, &program);
    cpu.regs.set_pc(0x20);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(5), 0x8C);
}

#[test]
fn stmdb_decrement_before() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    prime_regs(&mut cpu, &mut bus);
    let program = [
        dp_imm(AL, MOV, 0, 0, 5, 0, 0x90),
        ldm_stm(AL, 0, 1, 0, 0, 1, 5, 0x0007), // STMDB r5!, {r0-r2}
    ];
    bus.load_words(0x20, &program);
    cpu.regs.set_pc(0x20);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    // Base decreases by 12 (3 registers * 4 bytes)
    assert_eq!(cpu.regs.read(5), 0x84);
    // Stored starting at 0x84 in ascending order.
    assert_eq!(bus.read32(0x84), 0x10);
    assert_eq!(bus.read32(0x88), 0x20);
    assert_eq!(bus.read32(0x8C), 0x30);
}

#[test]
fn ldmia_loads_from_memory() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.write32(0x80, 0xAAAA);
    bus.write32(0x84, 0xBBBB);
    bus.write32(0x88, 0xCCCC);
    let program = [
        dp_imm(AL, MOV, 0, 0, 5, 0, 0x80),
        ldm_stm(AL, 1, 0, 1, 0, 0, 5, 0x0007),
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(0), 0xAAAA);
    assert_eq!(cpu.regs.read(1), 0xBBBB);
    assert_eq!(cpu.regs.read(2), 0xCCCC);
}

#[test]
fn ldmia_writeback_updates_base() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.write32(0x80, 1);
    bus.write32(0x84, 2);
    let program = [
        dp_imm(AL, MOV, 0, 0, 5, 0, 0x80),
        ldm_stm(AL, 1, 0, 1, 0, 1, 5, 0x0003),
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(5), 0x88);
}

#[test]
fn ldmfd_stack_pop_pattern() {
    // Simulate the classic "pop {r4-r6, pc}" epilogue pattern.
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.write32(0x80, 0xAAAA);
    bus.write32(0x84, 0xBBBB);
    bus.write32(0x88, 0xCCCC);
    bus.write32(0x8C, 0x40); // pc target
    let program = [
        dp_imm(AL, MOV, 0, 0, 13, 0, 0x80),
        ldm_stm(AL, 1, 0, 1, 0, 1, 13, 0x8070), // LDMFD sp!, {r4, r5, r6, pc}
    ];
    bus.load_words(0, &program);
    cpu.reset(0);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(4), 0xAAAA);
    assert_eq!(cpu.regs.read(5), 0xBBBB);
    assert_eq!(cpu.regs.read(6), 0xCCCC);
    assert_eq!(cpu.regs.pc(), 0x40);
    assert_eq!(cpu.regs.read(13), 0x90);
}

#[test]
fn stmfd_push_pattern() {
    // STMFD sp!, {r0-r2, lr} — full-descending push.
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    cpu.regs.write(0, 0x10);
    cpu.regs.write(1, 0x20);
    cpu.regs.write(2, 0x30);
    cpu.regs.set_lr(0x50);
    cpu.regs.set_sp(0x100);
    let program = [ldm_stm(AL, 0, 1, 0, 0, 1, 13, 0x4007)]; // STMFD sp!, {r0-r2, lr}
    bus.load_words(0, &program);
    cpu.regs.set_pc(0);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(13), 0x100 - 16);
    assert_eq!(bus.read32(0xF0), 0x10);
    assert_eq!(bus.read32(0xF4), 0x20);
    assert_eq!(bus.read32(0xF8), 0x30);
    assert_eq!(bus.read32(0xFC), 0x50);
}

#[test]
fn single_register_ldm_stm() {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    cpu.regs.write(0, 0x1234);
    cpu.regs.set_sp(0x100);
    let program = [
        ldm_stm(AL, 0, 1, 0, 0, 1, 13, 0x0001), // STMDB sp!, {r0}
        ldm_stm(AL, 1, 0, 1, 0, 1, 13, 0x0002), // LDMIA sp!, {r1}
    ];
    bus.load_words(0, &program);
    cpu.regs.set_pc(0);
    cpu.step(&mut bus);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(1), 0x1234);
    assert_eq!(cpu.regs.read(13), 0x100);
}
