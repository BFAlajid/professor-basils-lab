//! Tests for SVC / SWI exception entry and the underlying `enter_exception`.
//!
//! Encoding reference:
//! ```text
//! SVC imm24 : cond 1111 imm24[23:0]    = base 0x0F00_0000
//! ```

mod common;
use common::*;

use citrine_cpu::{enter_exception, psr, Cpu, ExceptionKind, Mode};

// ── Encoding helpers ─────────────────────────────────────────────────

/// Encode `SVC #imm24`.
fn svc(c: u32, imm24: u32) -> u32 {
    cond(c) | (0b1111 << 24) | (imm24 & 0x00FF_FFFF)
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
fn svc_jumps_to_vector() {
    // The SVC at PC=0 should jump to the SVC vector at 0x08.
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &[svc(AL, 0x42)]);
    cpu.reset(0);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.pc(), 0x0000_0008);
}

#[test]
fn svc_saves_return_address_in_lr_svc() {
    // PC of the SVC is 0; LR_svc should be PC+4 = 4.
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &[svc(AL, 0)]);
    cpu.reset(0);
    cpu.step(&mut bus);
    assert_eq!(cpu.regs.mode(), Mode::Supervisor);
    assert_eq!(cpu.regs.lr(), 4);
}

#[test]
fn svc_saves_cpsr_in_spsr_svc() {
    // Move into User first via MSR (so the saved CPSR is recognisably non-supervisor).
    // MOV r0, #0x10 ; MSR CPSR_c, r0  → User mode
    // SVC #1                          → enter Supervisor, SPSR_svc holds User CPSR
    let mov = 0xE3A0_0010;
    let msr = 0xE121_F000; // MSR CPSR_c, r0 — base 0x0120_F000 with mask=1
    let prog = [mov, msr, svc(AL, 1)];
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    bus.load_words(0, &prog);
    cpu.reset(0);
    cpu.step(&mut bus); // MOV
    cpu.step(&mut bus); // MSR — switches to User
    let pre_cpsr = cpu.cpsr();
    assert_eq!(cpu.regs.mode(), Mode::User);
    cpu.step(&mut bus); // SVC
    assert_eq!(cpu.regs.mode(), Mode::Supervisor);
    // SPSR_svc should equal the User-mode CPSR captured before entry.
    assert_eq!(cpu.regs.spsr(), pre_cpsr);
}

#[test]
fn svc_switches_to_supervisor_mode() {
    // Switch to System first, then SVC, expect Supervisor.
    let mov = 0xE3A0_001F; // MOV r0, #0x1F (System)
    let msr = 0xE121_F000; // MSR CPSR_c, r0
    let prog = [mov, msr, svc(AL, 0)];
    let cpu = run(&prog);
    assert_eq!(cpu.regs.mode(), Mode::Supervisor);
}

#[test]
fn svc_sets_irq_mask() {
    // Even if I is clear before SVC, after SVC it must be set.
    // MOV r0, #0x10 (User, I/F clear) ; MSR CPSR_c, r0 ; SVC #0
    let mov = 0xE3A0_0010;
    let msr = 0xE121_F000;
    let prog = [mov, msr, svc(AL, 0)];
    let cpu = run(&prog);
    assert_ne!(cpu.cpsr() & psr::I, 0);
}

#[test]
fn svc_clears_thumb_bit() {
    // Verify directly through enter_exception that taking an exception clears
    // CPSR.T. We can't easily reach this through `step()` because once T is
    // set, the step driver dispatches to the Thumb decoder, which would change
    // how the SVC instruction word is interpreted. The behaviour we care about
    // — `enter_exception` clearing T — is exactly what enter_exception does.
    use citrine_cpu::RegisterFile;
    let mut rf = RegisterFile::new();
    // Manufacture a CPSR with T=1 in user mode.
    rf.set_cpsr(Mode::User as u32 | psr::T);
    assert_ne!(rf.cpsr() & psr::T, 0);
    enter_exception(&mut rf, ExceptionKind::Svc, 0x100);
    assert_eq!(rf.cpsr() & psr::T, 0);
    assert_eq!(rf.mode(), Mode::Supervisor);
}

#[test]
fn exception_lr_offset_correct_per_kind() {
    // Verify the LR offset table by invoking enter_exception directly.
    use citrine_cpu::RegisterFile;
    for &(kind, expected) in &[
        (ExceptionKind::Reset, 0u32),
        (ExceptionKind::Undefined, 4),
        (ExceptionKind::Svc, 4),
        (ExceptionKind::PrefetchAbort, 4),
        (ExceptionKind::DataAbort, 8),
        (ExceptionKind::Irq, 4),
        (ExceptionKind::Fiq, 4),
    ] {
        let mut rf = RegisterFile::new();
        rf.set_cpsr(Mode::User as u32); // give us a CPSR distinct from supervisor
        enter_exception(&mut rf, kind, 0x1000);
        assert_eq!(
            rf.lr(),
            0x1000u32.wrapping_add(expected),
            "wrong LR offset for {:?}",
            kind
        );
    }
}

#[test]
fn two_consecutive_svcs_overwrite_lr() {
    // Two SVCs in a row: the second should overwrite LR_svc with its own
    // return address. The vector at 0x08 will jump back to user code in real
    // ROMs, but for this test we just observe LR after each call manually.
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x1000);
    // Layout:
    //   0x00: SVC #0          ← first SVC
    //   0x08: (vector) — return manually by writing PC = LR & ...
    // We'll bypass the vector handler by setting PC manually.
    bus.load_words(0, &[svc(AL, 0)]);
    bus.load_words(0x100, &[svc(AL, 1)]);
    cpu.reset(0);
    cpu.step(&mut bus); // first SVC at PC=0
    assert_eq!(cpu.regs.lr(), 4);

    // Pretend the kernel returned to PC=0x100 in user mode by manually
    // restoring CPSR (User) and setting PC.
    cpu.regs.set_cpsr(Mode::User as u32);
    cpu.regs.set_pc(0x100);

    cpu.step(&mut bus); // second SVC at PC=0x100
    assert_eq!(cpu.regs.mode(), Mode::Supervisor);
    assert_eq!(cpu.regs.lr(), 0x104);
}
