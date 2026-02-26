#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThreadState {
    Ready,
    Running,
    Waiting,
    Dead,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WaitReason {
    None,
    Sleep(u64),
    Mutex(u32),
    Semaphore(u32),
    Event(u32),
    Arbitration(u32),
    SyncMultiple,
}

#[derive(Clone)]
pub struct SavedRegisters {
    pub regs: [u32; 16],
    pub cpsr: u32,
}

impl SavedRegisters {
    pub fn new() -> Self {
        Self {
            regs: [0; 16],
            cpsr: 0,
        }
    }

    pub fn pc(&self) -> u32 {
        self.regs[15]
    }

    pub fn sp(&self) -> u32 {
        self.regs[13]
    }
}

#[derive(Clone)]
pub struct Thread {
    pub id: u32,
    pub process_id: u32,
    pub priority: i32,
    pub state: ThreadState,
    pub saved: SavedRegisters,
    pub wait_reason: WaitReason,
    pub wait_timeout: u64,
    pub tls_addr: u32,
    pub stack_top: u32,
    pub entrypoint: u32,
}

impl Thread {
    pub fn new(id: u32, process_id: u32, entrypoint: u32, stack_top: u32, priority: i32) -> Self {
        let mut saved = SavedRegisters::new();
        saved.regs[15] = entrypoint;
        saved.regs[13] = stack_top;
        if entrypoint & 1 != 0 {
            saved.cpsr = 0x10 | (1 << 5);
            saved.regs[15] = entrypoint & !1;
        } else {
            saved.cpsr = 0x10;
        }

        Self {
            id,
            process_id,
            priority,
            state: ThreadState::Ready,
            saved,
            wait_reason: WaitReason::None,
            wait_timeout: 0,
            tls_addr: crate::memory::VADDR_TLS_BASE,
            stack_top,
            entrypoint,
        }
    }

    pub fn suspend(&mut self, reason: WaitReason) {
        self.state = ThreadState::Waiting;
        self.wait_reason = reason;
    }

    pub fn suspend_timed(&mut self, reason: WaitReason, timeout_ns: u64) {
        self.state = ThreadState::Waiting;
        self.wait_reason = reason;
        self.wait_timeout = timeout_ns;
    }

    pub fn wake(&mut self) {
        if self.state == ThreadState::Waiting {
            self.state = ThreadState::Ready;
            self.wait_reason = WaitReason::None;
            self.wait_timeout = 0;
        }
    }

    pub fn kill(&mut self) {
        self.state = ThreadState::Dead;
    }

    pub fn is_alive(&self) -> bool {
        self.state != ThreadState::Dead
    }

    pub fn is_waiting_on(&self, handle: u32) -> bool {
        match self.wait_reason {
            WaitReason::Mutex(h) | WaitReason::Semaphore(h) | WaitReason::Event(h) => h == handle,
            WaitReason::Arbitration(a) => a == handle,
            _ => false,
        }
    }

    pub fn save_cpu(&mut self, regs: &[u32; 16], cpsr: u32) {
        self.saved.regs = *regs;
        self.saved.cpsr = cpsr;
    }

    pub fn restore_into(&self, regs: &mut [u32; 16], cpsr: &mut u32) {
        *regs = self.saved.regs;
        *cpsr = self.saved.cpsr;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_thread_state() {
        let t = Thread::new(1, 1, 0x0010_0000, 0x0800_4000, 0x30);
        assert_eq!(t.id, 1);
        assert_eq!(t.state, ThreadState::Ready);
        assert_eq!(t.saved.pc(), 0x0010_0000);
        assert_eq!(t.saved.sp(), 0x0800_4000);
        assert_eq!(t.priority, 0x30);
    }

    #[test]
    fn thumb_entrypoint() {
        let t = Thread::new(1, 1, 0x0010_0001, 0x0800_4000, 0x30);
        assert_eq!(t.saved.pc(), 0x0010_0000);
        assert!(t.saved.cpsr & (1 << 5) != 0);
    }

    #[test]
    fn suspend_and_wake() {
        let mut t = Thread::new(1, 1, 0x0010_0000, 0x0800_4000, 0x30);
        t.suspend(WaitReason::Mutex(0x100));
        assert_eq!(t.state, ThreadState::Waiting);
        assert!(t.is_waiting_on(0x100));
        t.wake();
        assert_eq!(t.state, ThreadState::Ready);
    }

    #[test]
    fn kill_thread() {
        let mut t = Thread::new(1, 1, 0x0010_0000, 0x0800_4000, 0x30);
        assert!(t.is_alive());
        t.kill();
        assert!(!t.is_alive());
        assert_eq!(t.state, ThreadState::Dead);
    }

    #[test]
    fn save_restore_cpu() {
        let mut t = Thread::new(1, 1, 0x0010_0000, 0x0800_4000, 0x30);
        let mut regs = [0u32; 16];
        regs[0] = 0xDEAD;
        regs[15] = 0x0010_1000;
        t.save_cpu(&regs, 0x1F);
        let mut out_regs = [0u32; 16];
        let mut out_cpsr = 0u32;
        t.restore_into(&mut out_regs, &mut out_cpsr);
        assert_eq!(out_regs[0], 0xDEAD);
        assert_eq!(out_regs[15], 0x0010_1000);
        assert_eq!(out_cpsr, 0x1F);
    }
}
