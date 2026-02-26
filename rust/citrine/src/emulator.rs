use crate::cpu::Cpu;
use crate::cpu::arm;
use crate::cpu::thumb;
use crate::memory::Memory;
use crate::kernel::Kernel;
use crate::kernel::svc;
use crate::kernel::thread::{Thread, ThreadState};
use crate::services::ServiceManager;
use crate::loader::threedsx;
use crate::hw::Hardware;

const CYCLES_PER_FRAME: u64 = 4_468_531; // 268MHz / 60fps
const VRAM_BASE: u32 = 0x1F00_0000;
const TOP_FB_SIZE: usize = 400 * 240 * 4;
const BOT_FB_SIZE: usize = 320 * 240 * 4;

pub struct Emulator {
    pub cpu: Cpu,
    pub mem: Memory,
    pub kernel: Kernel,
    pub services: ServiceManager,
    pub hw: Hardware,
    pub running: bool,
}

impl Emulator {
    pub fn new() -> Self {
        let mut emu = Self {
            cpu: Cpu::new(),
            mem: Memory::new(),
            kernel: Kernel::new(),
            services: ServiceManager::new(),
            hw: Hardware::new(),
            running: false,
        };
        emu.init_system_services();
        emu
    }

    fn init_system_services(&mut self) {
        self.kernel.register_port("srv:");
        self.kernel.register_port("apt:U");
        self.kernel.register_port("apt:S");
        self.kernel.register_port("gsp::Gpu");
        self.kernel.register_port("hid:USER");
        self.kernel.register_port("fs:USER");
        self.kernel.register_port("dsp::DSP");
    }
    pub fn load_3dsx(&mut self, data: &[u8]) -> bool {
        let base_addr = crate::memory::VADDR_CODE_BASE;
        match threedsx::load(data, &mut self.mem, base_addr) {
            Some(entry) => {
                let pid = self.kernel.next_process_id;
                self.kernel.next_process_id += 1;
                let tid = self.kernel.next_thread_id;
                self.kernel.next_thread_id += 1;

                let stack_top = 0x0800_4000u32;
                let thread = Thread::new(tid, pid, entry, stack_top, 0x30);
                self.kernel.threads.push(thread);
                self.kernel.current_thread = 0;
                self.kernel.threads[0].state = ThreadState::Running;

                self.cpu.set_pc(entry);
                self.cpu.regs[13] = stack_top;
                self.running = true;
                true
            }
            None => false,
        }
    }

    pub fn run_frame(&mut self) {
        if !self.running { return; }

        let target = self.cpu.cycles + CYCLES_PER_FRAME;
        while self.cpu.cycles < target && self.running {
            if self.cpu.halted {
                self.cpu.cycles = target;
                break;
            }

            self.step();
        }

        self.hw.tick(CYCLES_PER_FRAME);
    }

    fn step(&mut self) {
        if self.cpu.in_thumb_mode() {
            let pc = self.cpu.pc();
            let instr = self.mem.read16(pc);
            self.cpu.set_pc(pc + 2);
            thumb::execute(&mut self.cpu, &mut self.mem, instr);
        } else {
            let pc = self.cpu.pc();
            let instr = self.mem.read32(pc);
            self.cpu.set_pc(pc + 4);

            let cond = (instr >> 28) & 0xF;
            if !self.cpu.check_condition(cond) {
                self.cpu.add_cycles(1);
                return;
            }

            arm::execute(&mut self.cpu, &mut self.mem, instr);
        }

        // Check for SVC
        if self.kernel.svc_number != 0 || (self.cpu.mode() == crate::cpu::MODE_SVC) {
            let svc_num = self.cpu.regs[15] & 0xFF;
            if svc_num != 0 {
                self.handle_svc();
            }
        }
    }

    fn handle_svc(&mut self) {
        svc::dispatch(&mut self.cpu, &mut self.mem, &mut self.kernel);

        // Handle SendSyncRequest
        let svc_num = self.cpu.regs[15] & 0xFF;
        if svc_num == 0x32 {
            let handle = self.cpu.regs[0];
            if let Some(service_name) = self.kernel.get_session_service(handle) {
                let name = service_name.clone();
                self.services.handle_request(&name, &mut self.mem);
            }
        }
    }
    pub fn set_buttons(&mut self, buttons: u32) {
        self.services.set_buttons(buttons);
    }

    pub fn get_fb_top(&self) -> Vec<u8> {
        self.mem.read_block(VRAM_BASE, TOP_FB_SIZE)
    }

    pub fn get_fb_bottom(&self) -> Vec<u8> {
        self.mem.read_block(VRAM_BASE + TOP_FB_SIZE as u32, BOT_FB_SIZE)
    }

    pub fn reset(&mut self) {
        self.cpu = Cpu::new();
        self.mem = Memory::new();
        self.kernel = Kernel::new();
        self.services = ServiceManager::new();
        self.hw = Hardware::new();
        self.running = false;
        self.init_system_services();
    }

    pub fn debug_info(&self) -> String {
        format!(
            "PC={:08X} CPSR={:08X} mode={} cycles={} threads={} running={}",
            self.cpu.pc(),
            self.cpu.cpsr,
            match self.cpu.mode() {
                0x10 => "USR",
                0x11 => "FIQ",
                0x12 => "IRQ",
                0x13 => "SVC",
                0x17 => "ABT",
                0x1B => "UND",
                0x1F => "SYS",
                _ => "???",
            },
            self.cpu.cycles,
            self.kernel.threads.len(),
            self.running,
        )
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emulator_creation() {
        let emu = Emulator::new();
        assert!(!emu.running);
        assert_eq!(emu.cpu.pc(), 0x0010_0000);
    }

    #[test]
    fn emulator_reset() {
        let mut emu = Emulator::new();
        emu.running = true;
        emu.cpu.regs[0] = 0xDEAD;
        emu.reset();
        assert!(!emu.running);
        assert_eq!(emu.cpu.regs[0], 0);
    }

    #[test]
    fn framebuffer_sizes() {
        let emu = Emulator::new();
        assert_eq!(emu.get_fb_top().len(), 400 * 240 * 4);
        assert_eq!(emu.get_fb_bottom().len(), 320 * 240 * 4);
    }

    #[test]
    fn set_buttons() {
        let mut emu = Emulator::new();
        emu.set_buttons(0xFF);
        assert_eq!(emu.services.buttons, 0xFF);
    }

    #[test]
    fn debug_info_format() {
        let emu = Emulator::new();
        let info = emu.debug_info();
        assert!(info.contains("PC="));
        assert!(info.contains("SVC"));
    }
}
