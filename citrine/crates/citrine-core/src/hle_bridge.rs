//! HLE SVC bridge.
//!
//! Connects the CPU and the HLE kernel. Before each instruction step, we
//! peek at the next word and decode it. If it turns out to be an
//! unconditional `SVC #imm`, we route it to the kernel [`SvcDispatcher`]
//! instead of letting the CPU take a real ARM exception entry. PC is
//! advanced by 4, R0 is set to the dispatcher's return value, and the
//! banked SVC registers are left untouched — this is the entire point of
//! HLE: the kernel state lives on the host side, not inside the
//! emulated supervisor bank.
//!
//! Conditional SVCs (cond != AL) are not intercepted; they fall through
//! to `Cpu::step`, which evaluates the condition against CPSR naturally.
//! On real hardware such SVCs either execute or are skipped sequentially
//! depending on flags, and the CPU path already handles that.

use citrine_cpu::{decode, Bus, Condition, Cpu, DecodedInstruction};
use citrine_kernel::{Kernel, SvcContext, SvcDispatcher};

/// Result of a single bridged step.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BridgedStep {
    /// Cycles consumed (mirrors `ExecResult.cycles` for normal steps; 1
    /// for HLE-handled SVCs).
    pub cycles: u32,
    /// True if this step was an HLE-handled SVC.
    pub was_svc: bool,
    /// Raw SVC number, if `was_svc` is true. Otherwise 0.
    pub svc_number: u8,
    /// True if the SVC handler asked the thread to block.
    pub blocked: bool,
}

/// Step the CPU once, intercepting `SoftwareInterrupt` instructions and
/// routing them to the kernel dispatcher instead of taking the real ARM
/// exception. PC is advanced past the SVC instruction and R0 is set to
/// the dispatcher's return value.
///
/// For non-SVC instructions, this is exactly equivalent to `cpu.step(bus)`.
pub fn step_with_hle<B: Bus, D: SvcDispatcher>(
    cpu: &mut Cpu,
    bus: &mut B,
    kernel: &mut Kernel,
    dispatcher: &mut D,
) -> BridgedStep {
    let pc = cpu.regs.pc();
    let instr = bus.read32(pc & !3);
    let decoded = decode(instr);

    if let DecodedInstruction::SoftwareInterrupt { cond, imm24 } = decoded {
        if cond == Condition::Al {
            // Capture the live EABI argument registers before dispatching.
            let r0 = cpu.regs.read(0);
            let r1 = cpu.regs.read(1);
            let r2 = cpu.regs.read(2);
            let r3 = cpu.regs.read(3);
            let r4 = cpu.regs.read(4);
            let r5 = cpu.regs.read(5);

            let ctx = SvcContext {
                r0,
                r1,
                r2,
                r3,
                r4,
                r5,
                kernel,
            };

            let svc_num = imm24 as u8;
            let result = dispatcher.dispatch(svc_num, ctx);

            cpu.regs.write(0, result.r0);
            cpu.regs.set_pc(pc.wrapping_add(4));
            cpu.cycles = cpu.cycles.wrapping_add(1);

            return BridgedStep {
                cycles: 1,
                was_svc: true,
                svc_number: svc_num,
                blocked: result.block,
            };
        }
        // Conditional SVC — let the CPU handle the flag check itself.
    }

    let exec = cpu.step(bus);
    BridgedStep {
        cycles: exec.cycles,
        was_svc: false,
        svc_number: 0,
        blocked: false,
    }
}

/// Run up to `max_steps` instructions through the HLE bridge. Stops
/// early when the same PC is observed twice in a row (spin trap) or
/// when a bridged SVC returns `block = true`.
pub fn run_with_hle<B: Bus, D: SvcDispatcher>(
    cpu: &mut Cpu,
    bus: &mut B,
    kernel: &mut Kernel,
    dispatcher: &mut D,
    max_steps: u32,
) -> u32 {
    let mut executed = 0;
    let mut last_pc = cpu.regs.pc().wrapping_sub(1);
    while executed < max_steps {
        let pc = cpu.regs.pc();
        if pc == last_pc {
            break;
        }
        last_pc = pc;
        let step = step_with_hle(cpu, bus, kernel, dispatcher);
        executed += 1;
        if step.blocked {
            break;
        }
    }
    executed
}

#[cfg(test)]
mod tests {
    use super::*;
    use citrine_cpu::{Bus, Cpu, Mode};
    use citrine_kernel::{Kernel, SvcContext, SvcDispatcher, SvcResult};

    /// Minimal in-test bus: a flat `Vec<u8>` with little-endian helpers.
    struct TinyBus {
        ram: Vec<u8>,
    }
    impl TinyBus {
        fn new(size: usize) -> Self {
            Self { ram: vec![0; size] }
        }
        fn load(&mut self, base: u32, data: &[u8]) {
            let start = base as usize;
            self.ram[start..start + data.len()].copy_from_slice(data);
        }
        fn load_word(&mut self, base: u32, word: u32) {
            self.load(base, &word.to_le_bytes());
        }
    }
    impl Bus for TinyBus {
        fn read8(&mut self, addr: u32) -> u8 {
            *self.ram.get(addr as usize).unwrap_or(&0)
        }
        fn read16(&mut self, addr: u32) -> u16 {
            u16::from_le_bytes([self.read8(addr), self.read8(addr.wrapping_add(1))])
        }
        fn read32(&mut self, addr: u32) -> u32 {
            u32::from_le_bytes([
                self.read8(addr),
                self.read8(addr.wrapping_add(1)),
                self.read8(addr.wrapping_add(2)),
                self.read8(addr.wrapping_add(3)),
            ])
        }
        fn write8(&mut self, addr: u32, value: u8) {
            if let Some(b) = self.ram.get_mut(addr as usize) {
                *b = value;
            }
        }
        fn write16(&mut self, addr: u32, value: u16) {
            let [a, b] = value.to_le_bytes();
            self.write8(addr, a);
            self.write8(addr.wrapping_add(1), b);
        }
        fn write32(&mut self, addr: u32, value: u32) {
            let [a, b, c, d] = value.to_le_bytes();
            self.write8(addr, a);
            self.write8(addr.wrapping_add(1), b);
            self.write8(addr.wrapping_add(2), c);
            self.write8(addr.wrapping_add(3), d);
        }
    }

    /// Recording dispatcher: logs every call and returns a configurable
    /// R0 and block flag.
    struct RecordingDispatcher {
        calls: Vec<(u8, u32, u32)>, // (svc, r0, r1)
        next_r0: u32,
        block_next: bool,
    }
    impl RecordingDispatcher {
        fn new() -> Self {
            Self {
                calls: Vec::new(),
                next_r0: 0,
                block_next: false,
            }
        }
    }
    impl SvcDispatcher for RecordingDispatcher {
        fn dispatch(&mut self, svc: u8, ctx: SvcContext<'_>) -> SvcResult {
            self.calls.push((svc, ctx.r0, ctx.r1));
            SvcResult {
                r0: self.next_r0,
                block: self.block_next,
            }
        }
    }

    /// Encode `MOV Rd, #imm` (AL, S=0, rotate=0).
    fn mov_imm(rd: u8, imm: u8) -> u32 {
        0xE3A0_0000 | ((rd as u32) << 12) | imm as u32
    }

    /// Encode `SVC #imm24` (AL condition).
    fn svc(imm24: u32) -> u32 {
        0xEF00_0000 | (imm24 & 0x00FF_FFFF)
    }

    fn fresh_cpu() -> Cpu {
        let mut cpu = Cpu::new();
        cpu.reset(0);
        cpu
    }

    #[test]
    fn non_svc_instruction_falls_through_to_cpu_step() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, mov_imm(0, 1));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(!step.was_svc);
        assert_eq!(step.svc_number, 0);
        assert!(!step.blocked);
        assert_eq!(cpu.regs.read(0), 1);
        assert!(disp.calls.is_empty());
    }

    #[test]
    fn svc_routed_to_dispatcher() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(5));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(step.was_svc);
        assert_eq!(step.svc_number, 5);
        assert_eq!(disp.calls.len(), 1);
        assert_eq!(disp.calls[0].0, 5);
    }

    #[test]
    fn svc_advances_pc_by_four() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert_eq!(cpu.regs.pc(), 4);
    }

    #[test]
    fn svc_writes_r0_from_dispatcher() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0x28));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();
        disp.next_r0 = 0xCAFE;

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert_eq!(cpu.regs.read(0), 0xCAFE);
    }

    #[test]
    fn svc_passes_r0_through_to_context() {
        let mut cpu = fresh_cpu();
        cpu.regs.write(0, 0xABCD);
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0x3D));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        // (svc, r0, r1)
        assert_eq!(disp.calls[0].1, 0xABCD);
    }

    #[test]
    fn svc_passes_r1_through_to_context() {
        let mut cpu = fresh_cpu();
        cpu.regs.write(1, 0xDEAD_BEEF);
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0x3D));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert_eq!(disp.calls[0].2, 0xDEAD_BEEF);
    }

    #[test]
    fn svc_does_not_enter_exception_mode() {
        let mut cpu = fresh_cpu();
        let start_mode = cpu.regs.mode();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        // Fresh CPUs start in Supervisor; HLE must not touch the mode field
        // (no banked register swap, no CPSR mode change).
        assert_eq!(cpu.regs.mode(), start_mode);
        assert_eq!(cpu.regs.mode(), Mode::Supervisor);
    }

    #[test]
    fn svc_does_not_clobber_lr_svc() {
        let mut cpu = fresh_cpu();
        cpu.regs.set_lr(0xAABB_CCDD);
        let lr_before = cpu.regs.lr();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        // Real ARM SVC entry would overwrite LR_svc with the return
        // address. HLE must not do that — the kernel-side handler
        // manages return flow itself.
        assert_eq!(cpu.regs.lr(), lr_before);
    }

    #[test]
    fn multiple_svcs_in_sequence() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(1));
        bus.load_word(4, svc(2));
        bus.load_word(8, svc(3));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);
        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);
        step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert_eq!(disp.calls.len(), 3);
        assert_eq!(disp.calls[0].0, 1);
        assert_eq!(disp.calls[1].0, 2);
        assert_eq!(disp.calls[2].0, 3);
        assert_eq!(cpu.regs.pc(), 12);
    }

    #[test]
    fn mixed_svc_and_normal_instructions() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, mov_imm(1, 7));
        bus.load_word(4, svc(0));
        bus.load_word(8, mov_imm(2, 8));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let s1 = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);
        let s2 = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);
        let s3 = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(!s1.was_svc);
        assert!(s2.was_svc);
        assert!(!s3.was_svc);
        assert_eq!(cpu.regs.read(1), 7);
        assert_eq!(cpu.regs.read(2), 8);
        assert_eq!(disp.calls.len(), 1);
    }

    #[test]
    fn dispatcher_block_flag_is_propagated() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0x0A)); // SleepThread
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();
        disp.block_next = true;

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(step.blocked);
        assert!(step.was_svc);
    }

    #[test]
    fn run_with_hle_stops_on_spin_branch() {
        // B . (branch to self, AL) = EAFFFFFE
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, 0xEAFF_FFFE);
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp, 10);

        assert!(steps <= 2);
        assert_eq!(cpu.regs.pc(), 0);
    }

    #[test]
    fn run_with_hle_stops_on_block_signal() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        // Four SVCs in a row — without block_next, all four would run.
        bus.load_word(0, svc(0));
        bus.load_word(4, svc(0));
        bus.load_word(8, svc(0));
        bus.load_word(12, svc(0));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();
        disp.block_next = true;

        let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp, 10);

        assert_eq!(steps, 1);
        assert_eq!(disp.calls.len(), 1);
        assert_eq!(cpu.regs.pc(), 4);
    }

    #[test]
    fn run_with_hle_executes_up_to_max_steps() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, mov_imm(0, 1));
        bus.load_word(4, mov_imm(1, 2));
        bus.load_word(8, mov_imm(2, 3));
        bus.load_word(12, mov_imm(3, 4));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let steps = run_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp, 3);

        assert_eq!(steps, 3);
        assert_eq!(cpu.regs.read(0), 1);
        assert_eq!(cpu.regs.read(1), 2);
        assert_eq!(cpu.regs.read(2), 3);
        // The fourth MOV must not have run.
        assert_eq!(cpu.regs.read(3), 0);
    }

    #[test]
    fn step_with_hle_returns_correct_cycles_for_normal_instruction() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, mov_imm(0, 5));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        // A MOV immediate in the current executor returns > 0 cycles.
        assert!(step.cycles > 0);
        assert!(!step.was_svc);
    }

    #[test]
    fn svc_step_reports_single_cycle() {
        let mut cpu = fresh_cpu();
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0));
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert_eq!(step.cycles, 1);
        assert!(step.was_svc);
    }

    #[test]
    fn svc_dispatcher_sees_mutable_kernel_reference() {
        // Use the real DefaultSvcDispatcher + CreateThread to verify the
        // kernel borrow is genuinely mutable through the bridge.
        use citrine_kernel::DefaultSvcDispatcher;

        let mut cpu = fresh_cpu();
        cpu.regs.write(0, 0x30); // priority
        cpu.regs.write(1, 0x0010_0000); // entry
        cpu.regs.write(3, 0x0020_0000); // stack top
        let mut bus = TinyBus::new(0x100);
        bus.load_word(0, svc(0x08)); // CreateThread
        let mut kernel = Kernel::new();
        let mut disp = DefaultSvcDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(step.was_svc);
        assert_eq!(step.svc_number, 0x08);
        // The default CreateThread handler allocates a handle into r0.
        assert_ne!(cpu.regs.read(0), 0);
        assert_eq!(kernel.threads.count(), 1);
        assert_eq!(kernel.handles.len(), 1);
    }

    #[test]
    fn conditional_svc_falls_through_to_cpu_step() {
        // `SVCNE #7` with Z=1 (so NE fails) should be skipped by the
        // CPU path entirely — the dispatcher must not see the call.
        let mut cpu = fresh_cpu();
        // Set Z so NE (!z) is false.
        cpu.regs.set_nzcv(false, true, false, false);
        let mut bus = TinyBus::new(0x100);
        // NE = 0x1 in the condition field.
        bus.load_word(0, 0x1F00_0007);
        let mut kernel = Kernel::new();
        let mut disp = RecordingDispatcher::new();

        let step = step_with_hle(&mut cpu, &mut bus, &mut kernel, &mut disp);

        assert!(!step.was_svc);
        assert!(disp.calls.is_empty());
        // PC advances by 4 regardless (skipped sequentially).
        assert_eq!(cpu.regs.pc(), 4);
    }
}
