use crate::cpu::Cpu;
use crate::cpu::arm;
use crate::cpu::thumb;
use crate::memory::Memory;
use crate::kernel::{Kernel, HandleEntry};
use crate::kernel::svc;
use crate::kernel::thread::{Thread, ThreadState};
use crate::kernel::sync::{SyncObject, MutexState, EventState, SemaphoreState, ResetType};
use crate::kernel::ipc::IpcCommand;
use crate::services::ServiceManager;
use crate::loader::threedsx;
use crate::hw::Hardware;

const CYCLES_PER_FRAME: u64 = 4_468_531; // 268MHz / 60fps
const TIMESLICE_CYCLES: u64 = 100_000; // Context switch every ~100k cycles
const SLEEP_TICK_NS: u64 = 16_666_667; // ~16.7ms per frame for sleep timers
const TOP_FB_SIZE: usize = 400 * 240 * 4;
const BOT_FB_SIZE: usize = 320 * 240 * 4;

pub struct Emulator {
    pub cpu: Cpu,
    pub mem: Memory,
    pub kernel: Kernel,
    pub services: ServiceManager,
    pub hw: Hardware,
    pub running: bool,
    svc_log: Vec<(u32, u32, u32)>, // (svc_num, input_r0, result_r0)
    ipc_log: Vec<(String, u16)>, // (service_name, command_id)
    trace_log: Vec<(u32, u32, bool)>, // Ring buffer: last 32 instructions
    slice_start: u64, // Cycle count at start of current time slice
    last_failed_port: String, // Last ConnectToPort that returned NOT_FOUND
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
            svc_log: Vec::new(),
            ipc_log: Vec::new(),
            trace_log: Vec::new(),
            slice_start: 0,
            last_failed_port: String::new(),
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
        // Common optional services homebrew may try to connect to
        self.kernel.register_port("cfg:u");
        self.kernel.register_port("cfg:s");
        self.kernel.register_port("ndm:u");
        self.kernel.register_port("ac:u");
        self.kernel.register_port("am:net");
        self.kernel.register_port("ptm:u");
        self.kernel.register_port("ptm:sysm");
        self.kernel.register_port("ns:s");
        self.kernel.register_port("y2r:u");
        self.kernel.register_port("ldr:ro");
        self.kernel.register_port("ir:USER");
        self.kernel.register_port("ir:u");
        self.kernel.register_port("csnd:SND");
        self.kernel.register_port("cam:u");
        self.kernel.register_port("err:f");

        // Pre-create kernel objects that services return as handles
        // apt lock mutex
        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Mutex(MutexState::new()));
        let h = self.kernel.allocate_handle(HandleEntry::Mutex(sid));
        self.services.apt_lock_handle = h;

        // apt signal + resume events
        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Event(EventState::new(ResetType::OneShot)));
        let h = self.kernel.allocate_handle(HandleEntry::Event(sid));
        self.services.apt_signal_event = h;

        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Event(EventState::new(ResetType::OneShot)));
        let h = self.kernel.allocate_handle(HandleEntry::Event(sid));
        self.services.apt_resume_event = h;

        // gsp interrupt event
        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Event(EventState::new(ResetType::OneShot)));
        let h = self.kernel.allocate_handle(HandleEntry::Event(sid));
        self.services.gsp_interrupt_handle = Some(h);

        // srv: notification semaphore
        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Semaphore(SemaphoreState::new(0, 1)));
        let h = self.kernel.allocate_handle(HandleEntry::Semaphore(sid));
        self.services.srv_notif_semaphore = h;

        // hid shared memory + pad event
        let shm_addr = self.mem.alloc_heap(0x1000);
        let shm_handle = self.kernel.allocate_handle(HandleEntry::SharedMemory(shm_addr, 0x1000));
        self.services.hid_shm_handle = shm_handle;
        self.services.hid_shm_addr = shm_addr;

        let sid = self.kernel.alloc_sync_id();
        self.kernel.sync_objects.insert(sid, SyncObject::Event(EventState::new(ResetType::OneShot)));
        let h = self.kernel.allocate_handle(HandleEntry::Event(sid));
        self.services.hid_pad_event = h;

        // gsp shared memory
        let gsp_shm_addr = self.mem.alloc_heap(0x1000);
        let gsp_shm_handle = self.kernel.allocate_handle(HandleEntry::SharedMemory(gsp_shm_addr, 0x1000));
        self.services.gsp_shared_mem_handle = Some(gsp_shm_handle);

        // Pre-signal apt notification event so ctrulib init doesn't block
        self.signal_event_handle(self.services.apt_signal_event);
    }

    /// Signal an event handle (set signaled=true, wake waiting threads)
    fn signal_event_handle(&mut self, handle: u32) {
        if let Some(HandleEntry::Event(sid)) = self.kernel.get_handle(handle) {
            let sid = *sid;
            if let Some(SyncObject::Event(e)) = self.kernel.sync_objects.get_mut(&sid) {
                e.signaled = true;
                let woken: Vec<u32> = e.waiting.drain(..).collect();
                for tid in woken {
                    if let Some(t) = self.kernel.threads.iter_mut().find(|t| t.id == tid) {
                        t.wake();
                    }
                }
            }
        }
    }
    pub fn load_3dsx(&mut self, data: &[u8]) -> bool {
        let base_addr = crate::memory::VADDR_CODE_BASE;
        match threedsx::load(data, &mut self.mem, base_addr) {
            Some(entry) => {
                let pid = self.kernel.next_process_id;
                self.kernel.next_process_id += 1;
                let tid = self.kernel.next_thread_id;
                self.kernel.next_thread_id += 1;

                // Allocate stack from heap so it doesn't overlap with other allocations
                let stack_size = 0x1_0000u32; // 64KB
                let stack_base = self.mem.alloc_heap(stack_size);
                let stack_top = stack_base + stack_size;
                let thread = Thread::new(tid, pid, entry, stack_top, 0x30);
                self.kernel.threads.push(thread);
                self.kernel.current_thread = 0;
                self.kernel.threads[0].state = ThreadState::Running;

                // Switch to SYS mode for user code (ctrulib expects this)
                self.cpu.switch_mode(crate::cpu::MODE_SYS);
                self.cpu.cpsr &= !(crate::cpu::CPSR_I | crate::cpu::CPSR_F);
                self.cpu.set_pc(entry);
                self.cpu.regs[13] = stack_top;
                // CP15 TLS pointer — ctrulib reads this via MRC p15,0,Rd,c13,c0,3
                self.cpu.cp15.write(13, 0, 0, 3, crate::memory::VADDR_TLS_BASE);
                self.running = true;
                true
            }
            None => false,
        }
    }

    pub fn run_frame(&mut self) {
        if !self.running { return; }

        // Wake threads whose sleep timers expired
        self.kernel.wake_expired_sleepers(SLEEP_TICK_NS);

        let target = self.cpu.cycles + CYCLES_PER_FRAME;
        self.slice_start = self.cpu.cycles;

        while self.cpu.cycles < target && self.running {
            if self.cpu.halted {
                // Try to schedule another thread before giving up
                self.cpu.halted = false;
                self.context_switch();
                if self.cpu.halted {
                    self.cpu.cycles = target;
                    break;
                }
            }

            self.step();

            // Time-slice preemption: switch threads periodically
            if self.cpu.cycles - self.slice_start >= TIMESLICE_CYCLES {
                self.preempt();
                self.slice_start = self.cpu.cycles;
            }
        }

        self.hw.tick(CYCLES_PER_FRAME);

        // Signal apt + gsp events each frame (simulates VSync / notification delivery)
        self.signal_event_handle(self.services.apt_signal_event);
        if let Some(gsp_h) = self.services.gsp_interrupt_handle {
            self.signal_event_handle(gsp_h);
        }

        // Update HID shared memory with current button state
        if self.services.hid_shm_addr != 0 {
            crate::services::hid::update_shared_memory(
                &mut self.mem, self.services.hid_shm_addr, self.services.buttons,
            );
        }
    }

    fn step(&mut self) {
        if self.cpu.in_thumb_mode() {
            let pc = self.cpu.pc();
            let instr = self.mem.read16(pc);
            self.trace_push(pc, instr as u32, true);
            self.cpu.set_pc(pc.wrapping_add(4));
            thumb::execute(&mut self.cpu, &mut self.mem, instr);
            if self.cpu.pc() == pc.wrapping_add(4) {
                self.cpu.set_pc(pc.wrapping_add(2));
            }
        } else {
            let pc = self.cpu.pc();
            let instr = self.mem.read32(pc);
            self.trace_push(pc, instr, false);
            self.cpu.set_pc(pc.wrapping_add(8));
            arm::execute(&mut self.cpu, &mut self.mem, instr);
            if self.cpu.pc() == pc.wrapping_add(8) {
                self.cpu.set_pc(pc.wrapping_add(4));
            }
        }

        // Check for SVC
        if let Some(svc_num) = self.cpu.svc_pending.take() {
            self.handle_svc(svc_num);
        }

        // Context switch if an SVC blocked the current thread
        if self.kernel.needs_reschedule {
            self.context_switch();
        }
    }

    fn handle_svc(&mut self, svc_num: u32) {
        // Save registers before dispatch (mode switch can clobber banked regs)
        let pre_r0 = self.cpu.regs[0];
        let pre_r1 = self.cpu.regs[1];

        svc::dispatch(&mut self.cpu, &mut self.mem, &mut self.kernel, svc_num);

        // Route SendSyncRequest IPC to the target service
        if svc_num == 0x32 {
            if let Some(service_name) = self.kernel.get_session_service(pre_r0) {
                let name = service_name.clone();
                let cmd = IpcCommand::parse(&self.mem);
                if self.ipc_log.len() >= 32 { self.ipc_log.remove(0); }
                self.ipc_log.push((name.clone(), cmd.command_id));
                if name == "srv:" {
                    self.handle_srv_ipc();
                } else {
                    self.services.handle_request(&name, &mut self.mem);
                }
            }
        }

        // Capture failed port name (R1 = name_ptr before dispatch)
        if svc_num == 0x2D && self.cpu.regs[0] != 0 {
            let mut name = String::new();
            for i in 0..12u32 {
                let b = self.mem.read8(pre_r1 + i);
                if b == 0 { break; }
                name.push(b as char);
            }
            self.last_failed_port = name;
        }

        if self.svc_log.len() >= 32 { self.svc_log.remove(0); }
        self.svc_log.push((svc_num, pre_r0, self.cpu.regs[0]));
    }

    /// Handle srv: service IPC (needs kernel access to create session handles)
    fn handle_srv_ipc(&mut self) {
        let cmd = IpcCommand::parse(&self.mem);
        match cmd.command_id {
            0x0001 => {
                // RegisterClient
                IpcCommand::write_response(&mut self.mem, cmd.header, 0, &[]);
            }
            0x0002 => {
                // EnableNotification — return pre-created semaphore
                let h = self.services.srv_notif_semaphore;
                IpcCommand::write_response(&mut self.mem, cmd.header, 0, &[0, h]);
            }
            0x0005 => {
                // GetServiceHandle — parse service name from IPC params
                let mut name_bytes = Vec::new();
                name_bytes.extend_from_slice(&cmd.param(0).to_le_bytes());
                name_bytes.extend_from_slice(&cmd.param(1).to_le_bytes());
                let name_len = cmd.param(2) as usize;
                let name: String = name_bytes[..name_len.min(8)]
                    .iter()
                    .take_while(|&&b| b != 0)
                    .map(|&b| b as char)
                    .collect();

                if let Some(session_handle) = self.kernel.connect_to_port(&name) {
                    IpcCommand::write_response(&mut self.mem, cmd.header, 0, &[0, session_handle]);
                } else {
                    IpcCommand::write_response(&mut self.mem, cmd.header, 0xD8E007FA, &[]);
                }
            }
            _ => {
                IpcCommand::write_response(&mut self.mem, cmd.header, 0, &[]);
            }
        }
    }

    /// Ring buffer: keep last 32 instructions
    fn trace_push(&mut self, pc: u32, instr: u32, is_thumb: bool) {
        if self.trace_log.len() >= 32 {
            self.trace_log.remove(0);
        }
        self.trace_log.push((pc, instr, is_thumb));
    }

    /// Save current thread and switch to next runnable thread
    fn context_switch(&mut self) {
        let cur = self.kernel.current_thread;
        if cur < self.kernel.threads.len() {
            // Save CPU state to current thread
            self.kernel.threads[cur].save_cpu(&self.cpu.regs, self.cpu.cpsr);
            // Mark as Ready if it was Running (not Waiting/Dead)
            if self.kernel.threads[cur].state == ThreadState::Running {
                self.kernel.threads[cur].state = ThreadState::Ready;
            }
        }

        if let Some(next) = self.kernel.schedule_next() {
            // Restore next thread's CPU state
            self.kernel.threads[next].restore_into(&mut self.cpu.regs, &mut self.cpu.cpsr);
            self.cpu.halted = false;
        } else {
            // No runnable threads
            self.cpu.halted = true;
        }
    }

    /// Preemptive time-slice: yield current thread for round-robin fairness
    fn preempt(&mut self) {
        if self.kernel.threads.len() <= 1 { return; }
        // Only preempt if there's another Ready thread
        let has_ready = self.kernel.threads.iter().enumerate().any(|(i, t)| {
            i != self.kernel.current_thread && t.state == ThreadState::Ready
        });
        if has_ready {
            self.context_switch();
        }
    }
    pub fn set_buttons(&mut self, buttons: u32) {
        self.services.set_buttons(buttons);
    }

    pub fn get_fb_top(&self) -> Vec<u8> {
        self.mem.read_block(self.services.top_fb_addr, TOP_FB_SIZE)
    }

    pub fn get_fb_bottom(&self) -> Vec<u8> {
        self.mem.read_block(self.services.bot_fb_addr, BOT_FB_SIZE)
    }

    pub fn reset(&mut self) {
        self.cpu = Cpu::new();
        self.mem = Memory::new();
        self.kernel = Kernel::new();
        self.services = ServiceManager::new();
        self.hw = Hardware::new();
        self.running = false;
        self.svc_log.clear();
        self.ipc_log.clear();
        self.trace_log.clear();
        self.slice_start = 0;
        self.last_failed_port.clear();
        self.init_system_services();
    }

    pub fn debug_info(&self) -> String {
        let mode_str = match self.cpu.mode() {
            0x10 => "USR", 0x11 => "FIQ", 0x12 => "IRQ", 0x13 => "SVC",
            0x17 => "ABT", 0x1B => "UND", 0x1F => "SYS", _ => "???",
        };
        let thumb = if self.cpu.in_thumb_mode() { "T" } else { "A" };
        let mut s = format!(
            "PC={:08X} SP={:08X} LR={:08X} CPSR={:08X}\nmode={} {} cyc={} thr={}\n",
            self.cpu.pc(), self.cpu.regs[13], self.cpu.regs[14], self.cpu.cpsr,
            mode_str, thumb, self.cpu.cycles, self.kernel.threads.len(),
        );
        // Registers R0-R12
        for i in 0..13 {
            s += &format!("R{:<2}={:08X} ", i, self.cpu.regs[i]);
            if i % 4 == 3 { s += "\n"; }
        }
        s += "\n";
        // Framebuffer addresses + non-zero pixel check
        let fb_top = self.mem.read_block(self.services.top_fb_addr, TOP_FB_SIZE);
        let fb_nz = fb_top.iter().filter(|&&b| b != 0).count();
        s += &format!("FB top={:08X} bot={:08X} pixels={}\n",
            self.services.top_fb_addr, self.services.bot_fb_addr, fb_nz);
        s += &format!("heap={:08X}\n", self.mem.heap_end());
        if !self.kernel.last_connect_fail.is_empty() {
            s += &format!("PortFail: {}\n", self.kernel.last_connect_fail);
        }
        // IPC log
        if !self.ipc_log.is_empty() {
            s += "IPC:\n";
            for (svc_name, cmd_id) in &self.ipc_log {
                s += &format!("  {}:{:04X}\n", svc_name, cmd_id);
            }
        }
        // Last SVCs (svc_num, input_r0 → result_r0)
        if !self.svc_log.is_empty() {
            s += "SVCs:\n";
            for (num, in_r0, out_r0) in &self.svc_log {
                let name = match num {
                    0x01 => "CtrlMem", 0x02 => "QueryMem", 0x03 => "ExitProc",
                    0x08 => "CreateThr",
                    0x09 => "ExitThr", 0x0A => "Sleep", 0x0B => "GetPrio",
                    0x0C => "SetPrio", 0x13 => "CreateMtx", 0x14 => "RelMtx",
                    0x17 => "CreateEvt", 0x18 => "SigEvt", 0x19 => "ClrEvt",
                    0x1E => "CreateTmr", 0x21 => "CreateShmem", 0x22 => "MapShmem",
                    0x23 => "CloseH", 0x24 => "WaitSync1", 0x25 => "WaitSyncN",
                    0x27 => "DupH", 0x28 => "GetTick", 0x2D => "ConnPort",
                    0x32 => "SendSync", 0x35 => "GetPID", 0x37 => "GetTID",
                    0x38 => "GetResLim", 0x3C => "DbgStr", 0x3D => "Break",
                    _ => "?",
                };
                if *out_r0 != 0 {
                    s += &format!("  {:02X} {} in={:08X} => {:08X}\n", num, name, in_r0, out_r0);
                } else {
                    s += &format!("  {:02X} {} in={:08X} => OK\n", num, name, in_r0);
                }
            }
        }
        // Instruction trace (first 32)
        if !self.trace_log.is_empty() {
            s += "Trace:\n";
            for (pc, instr, is_thumb) in &self.trace_log {
                if *is_thumb {
                    s += &format!("  T {:08X}: {:04X}\n", pc, instr);
                } else {
                    s += &format!("  A {:08X}: {:08X}\n", pc, instr);
                }
            }
        }
        s
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
