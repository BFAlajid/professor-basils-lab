// Minimal MMU — virtual address translation
// The 3DS uses an ARM11 MMU with L1/L2 page tables.
// For HLE homebrew, we use identity-like mapping since
// the kernel controls the address space directly.

pub struct Mmu {
    enabled: bool,
}

impl Mmu {
    pub fn new() -> Self {
        Self { enabled: false }
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn translate(&self, vaddr: u32) -> u32 {
        // HLE: virtual addresses are used directly by Memory
        vaddr
    }
}
