pub struct Process {
    pub pid: u32,
    pub name: String,
    pub code_addr: u32,
    pub heap_addr: u32,
    pub code_size: u32,
    pub heap_size: u32,
    pub stack_size: u32,
    pub thread_ids: Vec<u32>,
    pub title_id: u64,
}

impl Process {
    pub fn new(pid: u32, name: &str, code_addr: u32, heap_addr: u32) -> Self {
        Self {
            pid,
            name: name.to_string(),
            code_addr,
            heap_addr,
            code_size: 0,
            heap_size: 0,
            stack_size: 0x4000,
            thread_ids: Vec::new(),
            title_id: 0,
        }
    }

    pub fn add_thread(&mut self, thread_id: u32) {
        self.thread_ids.push(thread_id);
    }

    pub fn remove_thread(&mut self, thread_id: u32) {
        self.thread_ids.retain(|&id| id != thread_id);
    }

    pub fn code_end(&self) -> u32 {
        self.code_addr.wrapping_add(self.code_size)
    }

    pub fn heap_end(&self) -> u32 {
        self.heap_addr.wrapping_add(self.heap_size)
    }

    pub fn set_code_size(&mut self, size: u32) {
        self.code_size = size;
    }

    pub fn set_heap_size(&mut self, size: u32) {
        self.heap_size = size;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_process() {
        let p = Process::new(1, "test.3dsx", 0x0010_0000, 0x0800_0000);
        assert_eq!(p.pid, 1);
        assert_eq!(p.name, "test.3dsx");
        assert_eq!(p.code_addr, 0x0010_0000);
        assert_eq!(p.heap_addr, 0x0800_0000);
    }

    #[test]
    fn thread_management() {
        let mut p = Process::new(1, "test", 0x0010_0000, 0x0800_0000);
        p.add_thread(1);
        p.add_thread(2);
        assert_eq!(p.thread_ids.len(), 2);
        p.remove_thread(1);
        assert_eq!(p.thread_ids.len(), 1);
        assert_eq!(p.thread_ids[0], 2);
    }

    #[test]
    fn code_and_heap_bounds() {
        let mut p = Process::new(1, "test", 0x0010_0000, 0x0800_0000);
        p.set_code_size(0x1000);
        p.set_heap_size(0x2000);
        assert_eq!(p.code_end(), 0x0010_1000);
        assert_eq!(p.heap_end(), 0x0800_2000);
    }
}
