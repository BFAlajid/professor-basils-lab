//! Branch and exchange tests.

mod common;
use common::*;

const MOV: u32 = 0xD;

#[test]
fn forward_branch_skips_instruction() {
    // Program: MOV r0, #1 ; B . ; MOV r0, #2 ; MOV r1, #7
    // Branch at PC=4, PC+8 = 12, offset 0 → target = 12, skips the MOV r0, #2 at PC=8.
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 1),
        b(AL, 0),
        dp_imm(AL, MOV, 0, 0, 0, 0, 2),
        dp_imm(AL, MOV, 0, 0, 1, 0, 7),
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..3 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 1);
    assert_eq!(cpu.regs.read(1), 7);
}

#[test]
fn backward_branch_loops() {
    // MOV r0, #0 ; ADD r0, r0, #1 ; CMP r0, #3 ; BNE -8
    // The BNE branches back to the ADD.
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0),
        dp_imm(AL, 0x4, 0, 0, 0, 0, 1),  // ADD r0, r0, #1
        dp_imm(AL, 0xA, 1, 0, 0, 0, 3),  // CMP r0, #3
        b(1, -16),                        // BNE offset back to ADD (PC+8-16 = ADD addr)
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    cpu.reset(0);
    // Run until r0 == 3, bounded.
    for _ in 0..50 {
        cpu.step(&mut bus);
        if cpu.regs.read(0) == 3 {
            break;
        }
    }
    assert_eq!(cpu.regs.read(0), 3);
}

#[test]
fn branch_with_link_saves_return_address() {
    // BL at PC=0, PC+8 = 8, offset 0 → target = 8 (the MOV r0, #0x99).
    let program = [
        bl(AL, 0),
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x77),
        // target
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x99),
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    cpu.reset(0);
    cpu.step(&mut bus);
    // LR should point to the instruction after BL (pc 0 + 4).
    assert_eq!(cpu.regs.lr(), 4);
    // Next executed instruction should be the target (at pc 8).
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(0), 0x99);
}

#[test]
fn bx_jumps_to_register_value() {
    // MOV r0, #0x20 ; BX r0  → jumps to 0x20.
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x20),
        bx(AL, 0),
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    // Place a MOV r1, #0xAB at 0x20
    bus.load_words(0x20, &[dp_imm(AL, MOV, 0, 0, 1, 0, 0xAB)]);
    cpu.reset(0);
    cpu.step(&mut bus); // MOV
    cpu.step(&mut bus); // BX
    cpu.step(&mut bus); // MOV at 0x20
    assert_eq!(cpu.regs.read(1), 0xAB);
}

#[test]
fn blx_reg_sets_lr_and_jumps() {
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0x20),
        blx_reg(AL, 0),
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    bus.load_words(0x20, &[dp_imm(AL, MOV, 0, 0, 1, 0, 0xCC)]);
    cpu.reset(0);
    cpu.step(&mut bus); // MOV
    cpu.step(&mut bus); // BLX
    assert_eq!(cpu.regs.lr(), 8);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.read(1), 0xCC);
}

#[test]
fn conditional_branch_skipped() {
    // MOV r0, #0 ; CMP r0, #0 ; BNE +4 ; MOV r0, #42
    let program = [
        dp_imm(AL, MOV, 0, 0, 0, 0, 0),
        dp_imm(AL, 0xA, 1, 0, 0, 0, 0), // CMP r0, #0 → Z=1
        b(1, 4),                          // BNE skipped because Z=1
        dp_imm(AL, MOV, 0, 0, 0, 0, 42),
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    cpu.reset(0);
    for _ in 0..4 {
        cpu.step(&mut bus);
    }
    assert_eq!(cpu.regs.read(0), 42);
}

#[test]
fn branch_and_link_then_return() {
    // BL at 0, PC+8=8, offset 0 → target is MOV r0, #99 at 0x08.
    let program = [
        bl(AL, 0),                       // 0x00
        dp_imm(AL, MOV, 0, 0, 1, 0, 1),  // 0x04 — executed after return
        dp_imm(AL, MOV, 0, 0, 0, 0, 99), // 0x08 target
        bx(AL, 14),                       // 0x0C return
    ];
    let mut cpu = citrine_cpu::Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &program);
    cpu.reset(0);
    cpu.step(&mut bus); // BL — PC → 8, LR = 4
    cpu.step(&mut bus); // MOV r0, #99
    cpu.step(&mut bus); // BX lr → PC = 4
    cpu.step(&mut bus); // MOV r1, #1
    assert_eq!(cpu.regs.read(0), 99);
    assert_eq!(cpu.regs.read(1), 1);
}
