pub mod regions;
pub mod mmu;

use regions::MemoryRegions;

pub const FCRAM_SIZE: usize = 128 * 1024 * 1024;
pub const VRAM_SIZE: usize = 6 * 1024 * 1024;
pub const CONFIG_MEM_SIZE: usize = 0x1000;
pub const SHARED_PAGE_SIZE: usize = 0x1000;
pub const TLS_SIZE: usize = 0x1000;

pub const VADDR_CODE_BASE: u32 = 0x0010_0000;
pub const VADDR_HEAP_BASE: u32 = 0x0800_0000;
pub const VADDR_LINEAR_BASE: u32 = 0x1400_0000;
pub const VADDR_IO_BASE: u32 = 0x1EC0_0000;
pub const VADDR_VRAM_BASE: u32 = 0x1F00_0000;
pub const VADDR_DSP_BASE: u32 = 0x1FF0_0000;
pub const VADDR_CONFIG_MEM: u32 = 0x1FF8_0000;
pub const VADDR_SHARED_PAGE: u32 = 0x1FF8_1000;
pub const VADDR_TLS_BASE: u32 = 0x1FF8_2000;

pub struct Memory {
    pub regions: MemoryRegions,
    heap_end: u32,
}

impl Memory {
    pub fn new() -> Self {
        Self {
            regions: MemoryRegions::new(),
            heap_end: VADDR_HEAP_BASE,
        }
    }

    pub fn read8(&self, addr: u32) -> u8 {
        self.regions.read8(addr)
    }

    pub fn read16(&self, addr: u32) -> u16 {
        let lo = self.read8(addr) as u16;
        let hi = self.read8(addr.wrapping_add(1)) as u16;
        lo | (hi << 8)
    }

    pub fn read32(&self, addr: u32) -> u32 {
        let lo = self.read16(addr) as u32;
        let hi = self.read16(addr.wrapping_add(2)) as u32;
        lo | (hi << 16)
    }

    pub fn write8(&mut self, addr: u32, val: u8) {
        self.regions.write8(addr, val);
    }

    pub fn write16(&mut self, addr: u32, val: u16) {
        self.write8(addr, val as u8);
        self.write8(addr.wrapping_add(1), (val >> 8) as u8);
    }

    pub fn write32(&mut self, addr: u32, val: u32) {
        self.write16(addr, val as u16);
        self.write16(addr.wrapping_add(2), (val >> 16) as u16);
    }

    pub fn write_block(&mut self, addr: u32, data: &[u8]) {
        for (i, &byte) in data.iter().enumerate() {
            self.write8(addr.wrapping_add(i as u32), byte);
        }
    }

    pub fn read_block(&self, addr: u32, len: usize) -> Vec<u8> {
        (0..len).map(|i| self.read8(addr.wrapping_add(i as u32))).collect()
    }

    pub fn alloc_heap(&mut self, size: u32) -> u32 {
        let aligned = (size + 0xFFF) & !0xFFF;
        let addr = self.heap_end;
        self.heap_end = self.heap_end.wrapping_add(aligned);
        addr
    }

    pub fn heap_end(&self) -> u32 {
        self.heap_end
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_write_8() {
        let mut mem = Memory::new();
        mem.write8(VADDR_HEAP_BASE, 0xAB);
        assert_eq!(mem.read8(VADDR_HEAP_BASE), 0xAB);
    }

    #[test]
    fn read_write_32() {
        let mut mem = Memory::new();
        mem.write32(VADDR_HEAP_BASE, 0xDEAD_BEEF);
        assert_eq!(mem.read32(VADDR_HEAP_BASE), 0xDEAD_BEEF);
    }

    #[test]
    fn write_block_read_back() {
        let mut mem = Memory::new();
        let data = [1, 2, 3, 4, 5];
        mem.write_block(VADDR_HEAP_BASE, &data);
        assert_eq!(mem.read_block(VADDR_HEAP_BASE, 5), data);
    }

    #[test]
    fn heap_allocation() {
        let mut mem = Memory::new();
        let a1 = mem.alloc_heap(0x100);
        let a2 = mem.alloc_heap(0x200);
        assert_eq!(a1, VADDR_HEAP_BASE);
        assert_eq!(a2, VADDR_HEAP_BASE + 0x1000);
    }
}
