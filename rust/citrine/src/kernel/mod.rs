pub mod process;
pub mod thread;
pub mod sync;
pub mod ipc;
pub mod svc;

use std::collections::HashMap;

pub struct Kernel {
    handles: HandleTable,
    pub next_process_id: u32,
    pub next_thread_id: u32,
    pub threads: Vec<thread::Thread>,
    pub current_thread: usize,
    pub sync_objects: HashMap<u32, sync::SyncObject>,
    pub ports: HashMap<String, u32>,
    pub sessions: HashMap<u32, String>,
    pub svc_number: u32,
}

pub struct HandleTable {
    entries: HashMap<u32, HandleEntry>,
    next_handle: u32,
}

#[derive(Clone)]
pub enum HandleEntry {
    Process(u32),
    Thread(u32),
    Mutex(u32),
    Semaphore(u32),
    Event(u32),
    Port(String),
    Session(String),
    SharedMemory(u32, u32),
    Timer,
}

impl HandleTable {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
            next_handle: 0x100,
        }
    }

    pub fn allocate(&mut self, entry: HandleEntry) -> u32 {
        let handle = self.next_handle;
        self.next_handle += 1;
        self.entries.insert(handle, entry);
        handle
    }

    pub fn get(&self, handle: u32) -> Option<&HandleEntry> {
        self.entries.get(&handle)
    }

    pub fn close(&mut self, handle: u32) -> bool {
        self.entries.remove(&handle).is_some()
    }
}

impl Kernel {
    pub fn new() -> Self {
        Self {
            handles: HandleTable::new(),
            next_process_id: 1,
            next_thread_id: 1,
            threads: Vec::new(),
            current_thread: 0,
            sync_objects: HashMap::new(),
            ports: HashMap::new(),
            sessions: HashMap::new(),
            svc_number: 0,
        }
    }

    pub fn allocate_handle(&mut self, entry: HandleEntry) -> u32 {
        self.handles.allocate(entry)
    }

    pub fn get_handle(&self, handle: u32) -> Option<&HandleEntry> {
        self.handles.get(handle)
    }

    pub fn close_handle(&mut self, handle: u32) -> bool {
        self.handles.close(handle)
    }

    pub fn register_port(&mut self, name: &str) {
        let handle = self.handles.allocate(HandleEntry::Port(name.to_string()));
        self.ports.insert(name.to_string(), handle);
    }

    pub fn connect_to_port(&mut self, name: &str) -> Option<u32> {
        if self.ports.contains_key(name) {
            let session_handle = self.handles.allocate(HandleEntry::Session(name.to_string()));
            self.sessions.insert(session_handle, name.to_string());
            Some(session_handle)
        } else {
            None
        }
    }

    pub fn get_session_service(&self, handle: u32) -> Option<&String> {
        self.sessions.get(&handle)
    }

    pub fn schedule_next(&mut self) -> Option<usize> {
        if self.threads.is_empty() { return None; }
        let start = self.current_thread;
        let count = self.threads.len();
        for i in 1..=count {
            let idx = (start + i) % count;
            if self.threads[idx].state == thread::ThreadState::Ready {
                self.current_thread = idx;
                self.threads[idx].state = thread::ThreadState::Running;
                return Some(idx);
            }
        }
        if self.threads[start].state == thread::ThreadState::Running {
            return Some(start);
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handle_allocate_and_get() {
        let mut kernel = Kernel::new();
        let h = kernel.allocate_handle(HandleEntry::Event(1));
        assert!(kernel.get_handle(h).is_some());
    }

    #[test]
    fn handle_close() {
        let mut kernel = Kernel::new();
        let h = kernel.allocate_handle(HandleEntry::Timer);
        assert!(kernel.close_handle(h));
        assert!(kernel.get_handle(h).is_none());
    }

    #[test]
    fn port_registration() {
        let mut kernel = Kernel::new();
        kernel.register_port("srv:");
        let session = kernel.connect_to_port("srv:");
        assert!(session.is_some());
    }
}
