use super::*;

pub struct MemoryRegions {
    pub fcram: Vec<u8>,
    pub vram: Vec<u8>,
    pub config_mem: Vec<u8>,
    pub shared_page: Vec<u8>,
    pub tls: Vec<u8>,
    io_regs: Vec<u8>,
}

const IO_SIZE: usize = 0x0040_0000;

impl MemoryRegions {
    pub fn new() -> Self {
        let mut regions = Self {
            fcram: vec![0; FCRAM_SIZE],
            vram: vec![0; VRAM_SIZE],
            config_mem: vec![0; CONFIG_MEM_SIZE],
            shared_page: vec![0; SHARED_PAGE_SIZE],
            tls: vec![0; TLS_SIZE],
            io_regs: vec![0; IO_SIZE],
        };
        regions.init_config_mem();
        regions
    }

    fn init_config_mem(&mut self) {
        // Kernel version: 2.57 (11.17 system)
        self.config_mem[0x00] = 2;
        self.config_mem[0x01] = 57;
        // Firm version
        self.config_mem[0x04] = 2;
        self.config_mem[0x05] = 57;
        // FCRAM size: 128 MB
        let fcram_size = 128u32 * 1024 * 1024;
        self.config_mem[0x20..0x24].copy_from_slice(&fcram_size.to_le_bytes());
        // App memory type: 0 (64 MB application)
        self.config_mem[0x30] = 0;
        // Hardware type: Old 3DS
        self.config_mem[0x40] = 0;
    }

    fn fcram_offset(vaddr: u32) -> Option<usize> {
        if vaddr >= VADDR_CODE_BASE && vaddr < VADDR_CODE_BASE + FCRAM_SIZE as u32 {
            return Some((vaddr - VADDR_CODE_BASE) as usize);
        }
        if vaddr >= VADDR_HEAP_BASE && vaddr < VADDR_HEAP_BASE + FCRAM_SIZE as u32 {
            return Some((vaddr - VADDR_HEAP_BASE + 0x0400_0000) as usize);
        }
        if vaddr >= VADDR_LINEAR_BASE && vaddr < VADDR_LINEAR_BASE + FCRAM_SIZE as u32 {
            return Some((vaddr - VADDR_LINEAR_BASE) as usize);
        }
        None
    }

    pub fn read8(&self, addr: u32) -> u8 {
        if let Some(off) = Self::fcram_offset(addr) {
            if off < self.fcram.len() {
                return self.fcram[off];
            }
        }

        if addr >= VADDR_VRAM_BASE && addr < VADDR_VRAM_BASE + VRAM_SIZE as u32 {
            let off = (addr - VADDR_VRAM_BASE) as usize;
            return self.vram[off];
        }

        if addr >= VADDR_CONFIG_MEM && addr < VADDR_CONFIG_MEM + CONFIG_MEM_SIZE as u32 {
            return self.config_mem[(addr - VADDR_CONFIG_MEM) as usize];
        }

        if addr >= VADDR_SHARED_PAGE && addr < VADDR_SHARED_PAGE + SHARED_PAGE_SIZE as u32 {
            return self.shared_page[(addr - VADDR_SHARED_PAGE) as usize];
        }

        if addr >= VADDR_TLS_BASE && addr < VADDR_TLS_BASE + TLS_SIZE as u32 {
            return self.tls[(addr - VADDR_TLS_BASE) as usize];
        }

        if addr >= VADDR_IO_BASE && addr < VADDR_IO_BASE + IO_SIZE as u32 {
            return self.io_regs[(addr - VADDR_IO_BASE) as usize];
        }

        0
    }

    pub fn write8(&mut self, addr: u32, val: u8) {
        if let Some(off) = Self::fcram_offset(addr) {
            if off < self.fcram.len() {
                self.fcram[off] = val;
                return;
            }
        }

        if addr >= VADDR_VRAM_BASE && addr < VADDR_VRAM_BASE + VRAM_SIZE as u32 {
            self.vram[(addr - VADDR_VRAM_BASE) as usize] = val;
            return;
        }

        if addr >= VADDR_TLS_BASE && addr < VADDR_TLS_BASE + TLS_SIZE as u32 {
            self.tls[(addr - VADDR_TLS_BASE) as usize] = val;
            return;
        }

        if addr >= VADDR_IO_BASE && addr < VADDR_IO_BASE + IO_SIZE as u32 {
            self.io_regs[(addr - VADDR_IO_BASE) as usize] = val;
            return;
        }

        if addr >= VADDR_SHARED_PAGE && addr < VADDR_SHARED_PAGE + SHARED_PAGE_SIZE as u32 {
            self.shared_page[(addr - VADDR_SHARED_PAGE) as usize] = val;
            return;
        }
    }

    pub fn fcram_slice(&self, offset: usize, len: usize) -> &[u8] {
        &self.fcram[offset..offset + len]
    }

    pub fn fcram_slice_mut(&mut self, offset: usize, len: usize) -> &mut [u8] {
        &mut self.fcram[offset..offset + len]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_region_maps_to_fcram() {
        let mut r = MemoryRegions::new();
        r.write8(VADDR_CODE_BASE + 10, 0x42);
        assert_eq!(r.fcram[10], 0x42);
    }

    #[test]
    fn vram_access() {
        let mut r = MemoryRegions::new();
        r.write8(VADDR_VRAM_BASE, 0xFF);
        assert_eq!(r.vram[0], 0xFF);
        assert_eq!(r.read8(VADDR_VRAM_BASE), 0xFF);
    }

    #[test]
    fn config_mem_initialized() {
        let r = MemoryRegions::new();
        let size = u32::from_le_bytes([r.config_mem[0x20], r.config_mem[0x21], r.config_mem[0x22], r.config_mem[0x23]]);
        assert_eq!(size, 128 * 1024 * 1024);
    }

    #[test]
    fn tls_read_write() {
        let mut r = MemoryRegions::new();
        r.write8(VADDR_TLS_BASE + 0x80, 0xAA);
        assert_eq!(r.read8(VADDR_TLS_BASE + 0x80), 0xAA);
    }

    #[test]
    fn unmapped_returns_zero() {
        let r = MemoryRegions::new();
        assert_eq!(r.read8(0xFFFF_FFFF), 0);
    }
}
