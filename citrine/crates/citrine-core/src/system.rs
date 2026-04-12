//! System object tying a CPU to a flat-memory bus for the Phase 0 host.

use citrine_cpu::{Cpu, ExecResult};

use crate::bus::FlatMemory;

/// A self-contained ARM11 system: CPU + flat memory.
pub struct System {
    pub cpu: Cpu,
    pub memory: FlatMemory,
}

impl System {
    /// Create a system with `mem_size` bytes of RAM. PC starts at 0.
    pub fn new(mem_size: usize) -> Self {
        Self {
            cpu: Cpu::new(),
            memory: FlatMemory::new(mem_size),
        }
    }

    /// Load a flat binary blob at `base_address` and set the CPU's reset
    /// vector to it. Clears cycle counter and register file.
    pub fn load_binary(&mut self, base_address: u32, bytes: &[u8]) {
        self.memory.load(base_address, bytes);
        self.cpu.reset(base_address);
    }

    /// Execute exactly one instruction.
    pub fn step(&mut self) -> ExecResult {
        self.cpu.step(&mut self.memory)
    }

    /// Execute up to `max_steps` instructions. Returns how many were run.
    pub fn run(&mut self, max_steps: u32) -> u32 {
        self.cpu.run(&mut self.memory, max_steps)
    }

    /// Snapshot: R0..R15 + CPSR. Useful for tests and the web UI.
    pub fn snapshot(&self) -> [u32; 17] {
        self.cpu.snapshot()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_and_run_single_mov() {
        let mut sys = System::new(0x1000);
        // MOV r5, #0x42  — 0xE3A0 5042
        sys.load_binary(0x0, &0xE3A0_5042u32.to_le_bytes());
        sys.step();
        let snap = sys.snapshot();
        assert_eq!(snap[5], 0x42);
    }

    #[test]
    fn run_caps_at_max_steps() {
        let mut sys = System::new(0x1000);
        // MOV r0, #1 ; MOV r0, #2 ; MOV r0, #3
        let program = [
            0xE3A0_0001u32,
            0xE3A0_0002,
            0xE3A0_0003,
        ];
        let mut bytes = Vec::new();
        for w in &program {
            bytes.extend_from_slice(&w.to_le_bytes());
        }
        sys.load_binary(0, &bytes);
        let steps = sys.run(2);
        assert_eq!(steps, 2);
        // Only the first two MOVs should have executed.
        assert_eq!(sys.snapshot()[0], 2);
    }
}
