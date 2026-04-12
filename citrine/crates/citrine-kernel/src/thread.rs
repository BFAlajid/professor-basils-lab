//! Thread state and a thread table.
//!
//! Phase 1 is single-threaded — we don't model preemption, scheduling
//! quanta, or context switches. The structures exist so the SVC layer can
//! call `CreateThread` / `ExitThread` and reason about the thread that's
//! "currently running".

/// Lifecycle state for a kernel thread.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThreadState {
    Ready,
    Running,
    Sleeping,
    Waiting,
    Terminated,
}

/// One kernel thread.
#[derive(Debug, Clone, Copy)]
pub struct Thread {
    pub id: u32,
    pub priority: i32,
    pub state: ThreadState,
    pub entry_point: u32,
    pub stack_top: u32,
    pub tls_base: u32,
    pub wake_at_ns: u64,
}

/// Per-process thread table. Stores all threads (live and terminated) so
/// callers can still resolve a handle to a thread that has exited.
pub struct ThreadTable {
    threads: Vec<Thread>,
    next_id: u32,
    pub current_id: u32,
}

impl ThreadTable {
    pub fn new() -> Self {
        Self {
            threads: Vec::new(),
            next_id: 1,
            current_id: 0,
        }
    }

    /// Register a new thread. The first thread created becomes the
    /// running thread.
    pub fn create(&mut self, entry: u32, stack_top: u32, priority: i32) -> u32 {
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        if self.next_id == 0 {
            self.next_id = 1;
        }
        let is_first = self.current_id == 0;
        let state = if is_first {
            ThreadState::Running
        } else {
            ThreadState::Ready
        };
        self.threads.push(Thread {
            id,
            priority,
            state,
            entry_point: entry,
            stack_top,
            tls_base: 0,
            wake_at_ns: 0,
        });
        if is_first {
            self.current_id = id;
        }
        id
    }

    pub fn get(&self, id: u32) -> Option<&Thread> {
        self.threads.iter().find(|t| t.id == id)
    }

    pub fn get_mut(&mut self, id: u32) -> Option<&mut Thread> {
        self.threads.iter_mut().find(|t| t.id == id)
    }

    /// Mark a thread as terminated. The entry stays in the table so a
    /// handle to it remains resolvable.
    pub fn terminate(&mut self, id: u32) {
        if let Some(t) = self.get_mut(id) {
            t.state = ThreadState::Terminated;
        }
    }

    pub fn count(&self) -> usize {
        self.threads.len()
    }

    /// The thread the CPU is currently executing, if any.
    pub fn current(&self) -> Option<&Thread> {
        if self.current_id == 0 {
            None
        } else {
            self.get(self.current_id)
        }
    }

    /// Switch the running thread. Used by the (future) scheduler.
    pub fn set_current(&mut self, id: u32) {
        self.current_id = id;
    }
}

impl Default for ThreadTable {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_assigns_unique_ids() {
        let mut table = ThreadTable::new();
        let a = table.create(0x100, 0x2000, 0x30);
        let b = table.create(0x200, 0x3000, 0x30);
        let c = table.create(0x300, 0x4000, 0x30);
        assert_ne!(a, b);
        assert_ne!(b, c);
        assert_eq!(table.count(), 3);
    }

    #[test]
    fn first_created_thread_is_running() {
        let mut table = ThreadTable::new();
        let id = table.create(0x100, 0x2000, 0x30);
        let t = table.get(id).expect("must exist");
        assert_eq!(t.state, ThreadState::Running);
        assert_eq!(table.current_id, id);
    }

    #[test]
    fn subsequent_threads_are_ready() {
        let mut table = ThreadTable::new();
        let _ = table.create(0x100, 0x2000, 0x30);
        let id = table.create(0x200, 0x3000, 0x30);
        let t = table.get(id).expect("must exist");
        assert_eq!(t.state, ThreadState::Ready);
    }

    #[test]
    fn terminate_marks_state() {
        let mut table = ThreadTable::new();
        let id = table.create(0x100, 0x2000, 0x30);
        table.terminate(id);
        assert_eq!(table.get(id).unwrap().state, ThreadState::Terminated);
    }

    #[test]
    fn terminate_unknown_id_is_noop() {
        let mut table = ThreadTable::new();
        table.terminate(99); // should not panic
        assert_eq!(table.count(), 0);
    }

    #[test]
    fn current_returns_running_thread() {
        let mut table = ThreadTable::new();
        assert!(table.current().is_none());
        let id = table.create(0x100, 0x2000, 0x30);
        let cur = table.current().expect("running thread");
        assert_eq!(cur.id, id);
    }

    #[test]
    fn get_mut_lets_state_change() {
        let mut table = ThreadTable::new();
        let id = table.create(0x100, 0x2000, 0x30);
        table.get_mut(id).unwrap().state = ThreadState::Sleeping;
        assert_eq!(table.get(id).unwrap().state, ThreadState::Sleeping);
    }
}
