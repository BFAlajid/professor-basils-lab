//! Flat memory bus implementation.
//!
//! Phase 0 ignores the 3DS memory map. The bus is just a linear byte array
//! that responds to reads/writes in 8/16/32-bit widths. Accesses outside the
//! range fall into the MMIO stub, which records them so a test can observe
//! MMIO patterns later on.

use citrine_cpu::Bus;

/// A recorded MMIO access, for debugging and testing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MmioLog {
    Read { addr: u32, width: u8 },
    Write { addr: u32, width: u8, value: u32 },
}

/// Flat-memory bus — backing store is a single `Vec<u8>`.
pub struct FlatMemory {
    ram: Vec<u8>,
    /// Addresses outside `ram.len()` go through this log instead of panicking.
    pub mmio_log: Vec<MmioLog>,
    /// When `true`, MMIO misses also print to stderr (useful for debugging).
    pub trace_mmio: bool,
}

impl FlatMemory {
    /// Allocate `size` bytes of zeroed RAM.
    pub fn new(size: usize) -> Self {
        Self {
            ram: vec![0; size],
            mmio_log: Vec::new(),
            trace_mmio: false,
        }
    }

    /// Size of the backing RAM in bytes.
    pub fn len(&self) -> usize {
        self.ram.len()
    }
    pub fn is_empty(&self) -> bool {
        self.ram.is_empty()
    }

    /// Copy a raw byte slice into memory starting at `base`. Silently truncates
    /// if the destination is too small.
    pub fn load(&mut self, base: u32, data: &[u8]) {
        let start = base as usize;
        let end = (start + data.len()).min(self.ram.len());
        if start < self.ram.len() {
            self.ram[start..end].copy_from_slice(&data[..end - start]);
        }
    }

    /// Read a slice of raw bytes.
    pub fn slice(&self, addr: u32, len: u32) -> &[u8] {
        let start = (addr as usize).min(self.ram.len());
        let end = (start + len as usize).min(self.ram.len());
        &self.ram[start..end]
    }

    fn in_range(&self, addr: u32, width: u32) -> bool {
        (addr as usize).saturating_add(width as usize) <= self.ram.len()
    }
}

impl Bus for FlatMemory {
    fn read8(&mut self, addr: u32) -> u8 {
        if (addr as usize) < self.ram.len() {
            self.ram[addr as usize]
        } else {
            self.mmio_log.push(MmioLog::Read { addr, width: 1 });
            if self.trace_mmio {
                eprintln!("MMIO read8 @ {:#010x}", addr);
            }
            0
        }
    }

    fn read16(&mut self, addr: u32) -> u16 {
        if self.in_range(addr, 2) {
            let a = addr as usize;
            u16::from_le_bytes([self.ram[a], self.ram[a + 1]])
        } else {
            self.mmio_log.push(MmioLog::Read { addr, width: 2 });
            if self.trace_mmio {
                eprintln!("MMIO read16 @ {:#010x}", addr);
            }
            0
        }
    }

    fn read32(&mut self, addr: u32) -> u32 {
        if self.in_range(addr, 4) {
            let a = addr as usize;
            u32::from_le_bytes([
                self.ram[a],
                self.ram[a + 1],
                self.ram[a + 2],
                self.ram[a + 3],
            ])
        } else {
            self.mmio_log.push(MmioLog::Read { addr, width: 4 });
            if self.trace_mmio {
                eprintln!("MMIO read32 @ {:#010x}", addr);
            }
            0
        }
    }

    fn write8(&mut self, addr: u32, value: u8) {
        if (addr as usize) < self.ram.len() {
            self.ram[addr as usize] = value;
        } else {
            self.mmio_log.push(MmioLog::Write {
                addr,
                width: 1,
                value: value as u32,
            });
            if self.trace_mmio {
                eprintln!("MMIO write8 @ {:#010x} = {:#04x}", addr, value);
            }
        }
    }

    fn write16(&mut self, addr: u32, value: u16) {
        if self.in_range(addr, 2) {
            let a = addr as usize;
            let [b0, b1] = value.to_le_bytes();
            self.ram[a] = b0;
            self.ram[a + 1] = b1;
        } else {
            self.mmio_log.push(MmioLog::Write {
                addr,
                width: 2,
                value: value as u32,
            });
            if self.trace_mmio {
                eprintln!("MMIO write16 @ {:#010x} = {:#06x}", addr, value);
            }
        }
    }

    fn write32(&mut self, addr: u32, value: u32) {
        if self.in_range(addr, 4) {
            let a = addr as usize;
            let [b0, b1, b2, b3] = value.to_le_bytes();
            self.ram[a] = b0;
            self.ram[a + 1] = b1;
            self.ram[a + 2] = b2;
            self.ram[a + 3] = b3;
        } else {
            self.mmio_log.push(MmioLog::Write {
                addr,
                width: 4,
                value,
            });
            if self.trace_mmio {
                eprintln!("MMIO write32 @ {:#010x} = {:#010x}", addr, value);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn word_read_after_write() {
        let mut mem = FlatMemory::new(64);
        mem.write32(0x10, 0xAABB_CCDD);
        assert_eq!(mem.read32(0x10), 0xAABB_CCDD);
    }

    #[test]
    fn mmio_out_of_range_logged() {
        let mut mem = FlatMemory::new(32);
        let v = mem.read32(0x1000);
        assert_eq!(v, 0);
        assert_eq!(mem.mmio_log.len(), 1);
    }

    #[test]
    fn load_binary_into_memory() {
        let mut mem = FlatMemory::new(64);
        mem.load(0x10, &[1, 2, 3, 4]);
        assert_eq!(mem.read32(0x10), 0x0403_0201);
    }
}
