//! 3DS-shaped memory bus.
//!
//! Phase 0's [`FlatMemory`](crate::bus::FlatMemory) pretends the world is a
//! single contiguous `Vec<u8>` starting at address 0. That is fine for the
//! "self-branching stub" smoke tests but real homebrew expects to find FCRAM
//! at `0x20000000`, VRAM at `0x18000000`, and so on. This bus implements the
//! Old 3DS physical layout by backing each region with its own `Vec<u8>` and
//! routing reads/writes by physical address.
//!
//! Old 3DS physical layout:
//!
//! | Region | Base         | Size  |
//! |--------|--------------|-------|
//! | IO     | `0x10000000` | 64 MB |
//! | VRAM   | `0x18000000` |  6 MB |
//! | DSP    | `0x1FF00000` | 512 K |
//! | WRAM   | `0x1FF80000` | 512 K |
//! | FCRAM  | `0x20000000` | 128 MB|
//!
//! Accesses into IO are recorded in [`ThreeDsBus::io_log`] but not stored —
//! Phase 1 has no real MMIO, only a placeholder for observation. Accesses
//! that do not land in any region are recorded in
//! [`ThreeDsBus::fault_log`]; reads return `0`, writes are dropped. On real
//! hardware this would be a data abort, but Phase 1 tolerates it so a
//! misbehaving program fails with a log trail instead of a panic.

use citrine_cpu::Bus;

/// Recorded MMIO or fault access (for tests and debugging).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BusAccess {
    Read { addr: u32, width: u8 },
    Write { addr: u32, width: u8, value: u32 },
}

/// Which region an address resolved into.
enum Routed<'a> {
    /// Backed RAM region plus the offset within it.
    Ram(&'a [u8], u32),
    /// Address lies in the IO range.
    Io,
    /// Address lies outside every mapped region.
    Fault,
}

/// Mutable variant of [`Routed`], produced by [`ThreeDsBus::route_mut`].
enum RoutedMut<'a> {
    Ram(&'a mut [u8], u32),
    Io,
    Fault,
}

/// 3DS-shaped memory bus. Backs FCRAM/VRAM/DSP/WRAM with separate
/// `Vec<u8>` regions and routes accesses by physical address.
pub struct ThreeDsBus {
    /// 128 MB main memory, based at `0x20000000`.
    pub fcram: Vec<u8>,
    /// 6 MB video RAM, based at `0x18000000`.
    pub vram: Vec<u8>,
    /// 512 KB DSP RAM, based at `0x1FF00000`.
    pub dsp: Vec<u8>,
    /// 512 KB AXI WRAM, based at `0x1FF80000`.
    pub wram: Vec<u8>,

    /// IO accesses are recorded but not stored anywhere — Phase 1 has no MMIO.
    pub io_log: Vec<BusAccess>,

    /// Out-of-range accesses end up here. A real CPU would raise a data abort;
    /// Phase 1 returns 0 on reads and silently drops writes.
    pub fault_log: Vec<BusAccess>,
}

impl ThreeDsBus {
    pub const FCRAM_BASE: u32 = 0x2000_0000;
    pub const FCRAM_SIZE: u32 = 0x0800_0000; // 128 MB
    pub const VRAM_BASE: u32 = 0x1800_0000;
    pub const VRAM_SIZE: u32 = 0x0060_0000; //   6 MB
    pub const DSP_BASE: u32 = 0x1FF0_0000;
    pub const DSP_SIZE: u32 = 0x0008_0000; // 512 KB
    pub const WRAM_BASE: u32 = 0x1FF8_0000;
    pub const WRAM_SIZE: u32 = 0x0008_0000; // 512 KB
    pub const IO_BASE: u32 = 0x1000_0000;
    pub const IO_SIZE: u32 = 0x0400_0000; //  64 MB

    /// Allocate the default 3DS memory layout (all regions zero-initialised).
    pub fn new() -> Self {
        Self {
            fcram: vec![0; Self::FCRAM_SIZE as usize],
            vram: vec![0; Self::VRAM_SIZE as usize],
            dsp: vec![0; Self::DSP_SIZE as usize],
            wram: vec![0; Self::WRAM_SIZE as usize],
            io_log: Vec::new(),
            fault_log: Vec::new(),
        }
    }

    /// Copy a byte slice into FCRAM at the given physical address. The
    /// address must lie within FCRAM. Returns the number of bytes actually
    /// written (silently truncated if the slice extends past the end of
    /// FCRAM).
    pub fn write_fcram(&mut self, address: u32, bytes: &[u8]) -> usize {
        copy_into_region(&mut self.fcram, Self::FCRAM_BASE, address, bytes)
    }

    /// Copy a byte slice into VRAM. Same semantics as [`Self::write_fcram`].
    pub fn write_vram(&mut self, address: u32, bytes: &[u8]) -> usize {
        copy_into_region(&mut self.vram, Self::VRAM_BASE, address, bytes)
    }

    /// Borrow a slice of FCRAM (for the renderer or debug viewer). The
    /// returned slice is clamped to the region — an address past the end
    /// yields an empty slice, and a length that would cross the end is
    /// truncated.
    pub fn fcram_slice(&self, address: u32, len: u32) -> &[u8] {
        slice_from_region(&self.fcram, Self::FCRAM_BASE, address, len)
    }

    /// Borrow a slice of VRAM. Same clamping semantics as
    /// [`Self::fcram_slice`].
    pub fn vram_slice(&self, address: u32, len: u32) -> &[u8] {
        slice_from_region(&self.vram, Self::VRAM_BASE, address, len)
    }

    /// Resolve a read access: decide which region the span `[addr, addr+width)`
    /// falls into and return the backing slice plus offset. The full span
    /// must fit inside a single region — partial overlaps are treated as
    /// faults so that a cross-region read cannot silently stitch together
    /// bytes from two unrelated regions.
    fn route(&self, addr: u32, width: u32) -> Routed<'_> {
        if let Some(off) = region_offset(Self::FCRAM_BASE, Self::FCRAM_SIZE, addr, width) {
            return Routed::Ram(&self.fcram, off);
        }
        if let Some(off) = region_offset(Self::VRAM_BASE, Self::VRAM_SIZE, addr, width) {
            return Routed::Ram(&self.vram, off);
        }
        if let Some(off) = region_offset(Self::DSP_BASE, Self::DSP_SIZE, addr, width) {
            return Routed::Ram(&self.dsp, off);
        }
        if let Some(off) = region_offset(Self::WRAM_BASE, Self::WRAM_SIZE, addr, width) {
            return Routed::Ram(&self.wram, off);
        }
        if in_io_range(addr) {
            return Routed::Io;
        }
        Routed::Fault
    }

    /// Mutable counterpart of [`Self::route`].
    fn route_mut(&mut self, addr: u32, width: u32) -> RoutedMut<'_> {
        if let Some(off) = region_offset(Self::FCRAM_BASE, Self::FCRAM_SIZE, addr, width) {
            return RoutedMut::Ram(&mut self.fcram, off);
        }
        if let Some(off) = region_offset(Self::VRAM_BASE, Self::VRAM_SIZE, addr, width) {
            return RoutedMut::Ram(&mut self.vram, off);
        }
        if let Some(off) = region_offset(Self::DSP_BASE, Self::DSP_SIZE, addr, width) {
            return RoutedMut::Ram(&mut self.dsp, off);
        }
        if let Some(off) = region_offset(Self::WRAM_BASE, Self::WRAM_SIZE, addr, width) {
            return RoutedMut::Ram(&mut self.wram, off);
        }
        if in_io_range(addr) {
            return RoutedMut::Io;
        }
        RoutedMut::Fault
    }
}

impl Default for ThreeDsBus {
    fn default() -> Self {
        Self::new()
    }
}

impl Bus for ThreeDsBus {
    fn read8(&mut self, addr: u32) -> u8 {
        match self.route(addr, 1) {
            Routed::Ram(region, off) => region[off as usize],
            Routed::Io => {
                self.io_log.push(BusAccess::Read { addr, width: 1 });
                0
            }
            Routed::Fault => {
                self.fault_log.push(BusAccess::Read { addr, width: 1 });
                0
            }
        }
    }

    fn read16(&mut self, addr: u32) -> u16 {
        match self.route(addr, 2) {
            Routed::Ram(region, off) => {
                let a = off as usize;
                u16::from_le_bytes([region[a], region[a + 1]])
            }
            Routed::Io => {
                self.io_log.push(BusAccess::Read { addr, width: 2 });
                0
            }
            Routed::Fault => {
                self.fault_log.push(BusAccess::Read { addr, width: 2 });
                0
            }
        }
    }

    fn read32(&mut self, addr: u32) -> u32 {
        match self.route(addr, 4) {
            Routed::Ram(region, off) => {
                let a = off as usize;
                u32::from_le_bytes([region[a], region[a + 1], region[a + 2], region[a + 3]])
            }
            Routed::Io => {
                self.io_log.push(BusAccess::Read { addr, width: 4 });
                0
            }
            Routed::Fault => {
                self.fault_log.push(BusAccess::Read { addr, width: 4 });
                0
            }
        }
    }

    fn write8(&mut self, addr: u32, value: u8) {
        match self.route_mut(addr, 1) {
            RoutedMut::Ram(region, off) => {
                region[off as usize] = value;
            }
            RoutedMut::Io => {
                self.io_log.push(BusAccess::Write {
                    addr,
                    width: 1,
                    value: value as u32,
                });
            }
            RoutedMut::Fault => {
                self.fault_log.push(BusAccess::Write {
                    addr,
                    width: 1,
                    value: value as u32,
                });
            }
        }
    }

    fn write16(&mut self, addr: u32, value: u16) {
        match self.route_mut(addr, 2) {
            RoutedMut::Ram(region, off) => {
                let a = off as usize;
                let [b0, b1] = value.to_le_bytes();
                region[a] = b0;
                region[a + 1] = b1;
            }
            RoutedMut::Io => {
                self.io_log.push(BusAccess::Write {
                    addr,
                    width: 2,
                    value: value as u32,
                });
            }
            RoutedMut::Fault => {
                self.fault_log.push(BusAccess::Write {
                    addr,
                    width: 2,
                    value: value as u32,
                });
            }
        }
    }

    fn write32(&mut self, addr: u32, value: u32) {
        match self.route_mut(addr, 4) {
            RoutedMut::Ram(region, off) => {
                let a = off as usize;
                let [b0, b1, b2, b3] = value.to_le_bytes();
                region[a] = b0;
                region[a + 1] = b1;
                region[a + 2] = b2;
                region[a + 3] = b3;
            }
            RoutedMut::Io => {
                self.io_log.push(BusAccess::Write {
                    addr,
                    width: 4,
                    value,
                });
            }
            RoutedMut::Fault => {
                self.fault_log.push(BusAccess::Write {
                    addr,
                    width: 4,
                    value,
                });
            }
        }
    }
}

/// Does `[addr, addr+width)` sit entirely inside `[base, base+size)`?
/// Returns the offset from `base` if so. The span check uses saturating
/// arithmetic to avoid overflow near `u32::MAX`.
fn region_offset(base: u32, size: u32, addr: u32, width: u32) -> Option<u32> {
    if addr < base {
        return None;
    }
    let off = addr - base;
    let end = off.checked_add(width)?;
    if end <= size {
        Some(off)
    } else {
        None
    }
}

/// True if `addr` lies in the 64 MB IO window.
fn in_io_range(addr: u32) -> bool {
    addr >= ThreeDsBus::IO_BASE && addr < ThreeDsBus::IO_BASE + ThreeDsBus::IO_SIZE
}

/// Copy `bytes` into `region` starting at `address`, clamping to the end
/// of the region. Returns the number of bytes actually written. If the
/// address is outside the region, writes nothing and returns 0.
fn copy_into_region(region: &mut [u8], base: u32, address: u32, bytes: &[u8]) -> usize {
    if address < base {
        return 0;
    }
    let off = (address - base) as usize;
    if off >= region.len() {
        return 0;
    }
    let available = region.len() - off;
    let n = bytes.len().min(available);
    region[off..off + n].copy_from_slice(&bytes[..n]);
    n
}

/// Borrow a slice of `region` starting at `address`, clamping to the end
/// of the region. Returns an empty slice if the address is outside the
/// region.
fn slice_from_region(region: &[u8], base: u32, address: u32, len: u32) -> &[u8] {
    if address < base {
        return &[];
    }
    let off = (address - base) as usize;
    if off >= region.len() {
        return &[];
    }
    let available = region.len() - off;
    let n = (len as usize).min(available);
    &region[off..off + n]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_allocates_all_regions_zero() {
        let bus = ThreeDsBus::new();
        assert!(bus.fcram.iter().all(|&b| b == 0));
        assert!(bus.vram.iter().all(|&b| b == 0));
        assert!(bus.dsp.iter().all(|&b| b == 0));
        assert!(bus.wram.iter().all(|&b| b == 0));
        assert!(bus.io_log.is_empty());
        assert!(bus.fault_log.is_empty());
    }

    #[test]
    fn region_sizes_match_constants() {
        let bus = ThreeDsBus::new();
        assert_eq!(bus.fcram.len(), ThreeDsBus::FCRAM_SIZE as usize);
        assert_eq!(bus.vram.len(), ThreeDsBus::VRAM_SIZE as usize);
        assert_eq!(bus.dsp.len(), ThreeDsBus::DSP_SIZE as usize);
        assert_eq!(bus.wram.len(), ThreeDsBus::WRAM_SIZE as usize);
    }

    #[test]
    fn fcram_base_is_0x20000000() {
        assert_eq!(ThreeDsBus::FCRAM_BASE, 0x2000_0000);
        assert_eq!(ThreeDsBus::FCRAM_SIZE, 0x0800_0000);
        assert_eq!(ThreeDsBus::VRAM_BASE, 0x1800_0000);
        assert_eq!(ThreeDsBus::VRAM_SIZE, 0x0060_0000);
        assert_eq!(ThreeDsBus::DSP_BASE, 0x1FF0_0000);
        assert_eq!(ThreeDsBus::DSP_SIZE, 0x0008_0000);
        assert_eq!(ThreeDsBus::WRAM_BASE, 0x1FF8_0000);
        assert_eq!(ThreeDsBus::WRAM_SIZE, 0x0008_0000);
        assert_eq!(ThreeDsBus::IO_BASE, 0x1000_0000);
        assert_eq!(ThreeDsBus::IO_SIZE, 0x0400_0000);
    }

    #[test]
    fn read_write_fcram_byte_at_base() {
        let mut bus = ThreeDsBus::new();
        bus.write8(ThreeDsBus::FCRAM_BASE, 0xAB);
        assert_eq!(bus.read8(ThreeDsBus::FCRAM_BASE), 0xAB);
        // Adjacent bytes must remain zero — we only touched one.
        assert_eq!(bus.read8(ThreeDsBus::FCRAM_BASE + 1), 0x00);
    }

    #[test]
    fn read_write_fcram_word_at_offset() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::FCRAM_BASE + 0x10;
        bus.write32(addr, 0xDEAD_BEEF);
        assert_eq!(bus.read32(addr), 0xDEAD_BEEF);
        // Little-endian spot check.
        assert_eq!(bus.read8(addr), 0xEF);
        assert_eq!(bus.read8(addr + 1), 0xBE);
        assert_eq!(bus.read8(addr + 2), 0xAD);
        assert_eq!(bus.read8(addr + 3), 0xDE);
    }

    #[test]
    fn fcram_word_round_trips_through_separate_byte_writes() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::FCRAM_BASE + 0x200;
        bus.write8(addr, 0x11);
        bus.write8(addr + 1, 0x22);
        bus.write8(addr + 2, 0x33);
        bus.write8(addr + 3, 0x44);
        assert_eq!(bus.read32(addr), 0x4433_2211);
    }

    #[test]
    fn read_write_vram_word() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::VRAM_BASE + 0x100;
        bus.write32(addr, 0xCAFE_F00D);
        assert_eq!(bus.read32(addr), 0xCAFE_F00D);
    }

    #[test]
    fn read_write_dsp_byte() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::DSP_BASE;
        bus.write8(addr, 0x5A);
        assert_eq!(bus.read8(addr), 0x5A);
        // And a byte deeper into DSP RAM.
        bus.write8(addr + 0x1234, 0xA5);
        assert_eq!(bus.read8(addr + 0x1234), 0xA5);
    }

    #[test]
    fn read_write_wram_word() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::WRAM_BASE + 0x80;
        bus.write32(addr, 0x1234_5678);
        assert_eq!(bus.read32(addr), 0x1234_5678);
    }

    #[test]
    fn address_at_fcram_top_is_in_range() {
        let mut bus = ThreeDsBus::new();
        // Last word in FCRAM: base + size - 4. Span [size-4, size) fits.
        let addr = ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE - 4;
        bus.write32(addr, 0xFEED_FACE);
        assert_eq!(bus.read32(addr), 0xFEED_FACE);
        assert!(bus.fault_log.is_empty());
    }

    #[test]
    fn address_one_past_fcram_top_is_out_of_range() {
        let mut bus = ThreeDsBus::new();
        // FCRAM_BASE + FCRAM_SIZE is the first address *past* FCRAM — also
        // past every other region, so it must fault.
        let addr = ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE;
        assert_eq!(bus.read32(addr), 0);
        assert_eq!(bus.fault_log.len(), 1);
        assert_eq!(
            bus.fault_log[0],
            BusAccess::Read { addr, width: 4 }
        );
    }

    #[test]
    fn unmapped_low_address_returns_zero_and_logs() {
        let mut bus = ThreeDsBus::new();
        assert_eq!(bus.read32(0x0000_0000), 0);
        assert_eq!(bus.fault_log.len(), 1);
        assert!(bus.io_log.is_empty());
        assert_eq!(
            bus.fault_log[0],
            BusAccess::Read { addr: 0, width: 4 }
        );
    }

    #[test]
    fn io_read_is_logged_to_io_log() {
        let mut bus = ThreeDsBus::new();
        let v = bus.read32(0x1000_0004);
        assert_eq!(v, 0);
        assert_eq!(bus.io_log.len(), 1);
        assert!(bus.fault_log.is_empty());
        assert_eq!(
            bus.io_log[0],
            BusAccess::Read {
                addr: 0x1000_0004,
                width: 4,
            }
        );
    }

    #[test]
    fn io_write_is_logged_to_io_log() {
        let mut bus = ThreeDsBus::new();
        bus.write32(0x1000_4000, 0x42);
        assert_eq!(bus.io_log.len(), 1);
        assert!(bus.fault_log.is_empty());
        assert_eq!(
            bus.io_log[0],
            BusAccess::Write {
                addr: 0x1000_4000,
                width: 4,
                value: 0x42,
            }
        );
    }

    #[test]
    fn unaligned_word_read_does_not_panic() {
        let mut bus = ThreeDsBus::new();
        // Lay down a known pattern and then read it with a +1 offset.
        bus.write32(ThreeDsBus::FCRAM_BASE, 0xAABB_CCDD);
        bus.write32(ThreeDsBus::FCRAM_BASE + 4, 0x1122_3344);
        // Unaligned word read at base+1 — the bus must tolerate this.
        let v = bus.read32(ThreeDsBus::FCRAM_BASE + 1);
        // bytes at base+1..base+5 are: BB, CC, AA (wait — little-endian).
        // FCRAM[0]=DD, [1]=CC, [2]=BB, [3]=AA, [4]=44, [5]=33, [6]=22, [7]=11.
        // So base+1..base+5 = [CC, BB, AA, 44] -> 0x44AA_BBCC.
        assert_eq!(v, 0x44AA_BBCC);
        assert!(bus.fault_log.is_empty());
    }

    #[test]
    fn write_fcram_helper_copies_bytes() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::FCRAM_BASE + 0x1000;
        let n = bus.write_fcram(addr, &[1, 2, 3, 4]);
        assert_eq!(n, 4);
        assert_eq!(bus.read8(addr), 1);
        assert_eq!(bus.read8(addr + 1), 2);
        assert_eq!(bus.read8(addr + 2), 3);
        assert_eq!(bus.read8(addr + 3), 4);
    }

    #[test]
    fn write_fcram_truncates_at_region_end() {
        let mut bus = ThreeDsBus::new();
        // Start 50 bytes before the end of FCRAM and try to write 100 bytes.
        let start = ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE - 50;
        let payload: Vec<u8> = (0..100).map(|i| i as u8).collect();
        let n = bus.write_fcram(start, &payload);
        assert_eq!(n, 50, "should have copied only the first 50 bytes");
        // The first 50 bytes of the payload should be at the tail of FCRAM.
        for i in 0..50u32 {
            assert_eq!(bus.read8(start + i), i as u8);
        }
    }

    #[test]
    fn fcram_slice_returns_correct_window() {
        let mut bus = ThreeDsBus::new();
        let addr = ThreeDsBus::FCRAM_BASE + 0x10;
        bus.write_fcram(addr, &[0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x01, 0x02]);
        let s = bus.fcram_slice(addr, 8);
        assert_eq!(s, &[0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x01, 0x02]);
    }

    #[test]
    fn fcram_slice_clamps_at_region_end() {
        let bus = ThreeDsBus::new();
        // Ask for 16 bytes starting 4 before the end: only 4 should come back.
        let addr = ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE - 4;
        let s = bus.fcram_slice(addr, 16);
        assert_eq!(s.len(), 4);
        // And a slice past the end is empty.
        let s = bus.fcram_slice(ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE, 16);
        assert!(s.is_empty());
    }

    #[test]
    fn bus_trait_is_implemented_for_three_ds_bus() {
        // Call each trait method through a `&mut dyn Bus` to make sure the
        // impl is actually trait-compatible (not just an inherent method set).
        let mut bus = ThreeDsBus::new();
        let dyn_bus: &mut dyn Bus = &mut bus;
        let addr = ThreeDsBus::FCRAM_BASE + 0x20;

        dyn_bus.write8(addr, 0x11);
        dyn_bus.write16(addr + 2, 0x2233);
        dyn_bus.write32(addr + 4, 0x4455_6677);

        assert_eq!(dyn_bus.read8(addr), 0x11);
        assert_eq!(dyn_bus.read16(addr + 2), 0x2233);
        assert_eq!(dyn_bus.read32(addr + 4), 0x4455_6677);
    }

    #[test]
    fn default_matches_new() {
        let a = ThreeDsBus::default();
        let b = ThreeDsBus::new();
        assert_eq!(a.fcram.len(), b.fcram.len());
        assert_eq!(a.vram.len(), b.vram.len());
        assert_eq!(a.dsp.len(), b.dsp.len());
        assert_eq!(a.wram.len(), b.wram.len());
        assert!(a.io_log.is_empty() && b.io_log.is_empty());
        assert!(a.fault_log.is_empty() && b.fault_log.is_empty());
    }

    #[test]
    fn cross_region_word_read_treats_as_fault() {
        let mut bus = ThreeDsBus::new();
        // Span [FCRAM_END-2, FCRAM_END+2) — the last two bytes sit past the
        // region. No other region butts up against it either, so the access
        // must fault as a whole rather than silently stitching bytes.
        let addr = ThreeDsBus::FCRAM_BASE + ThreeDsBus::FCRAM_SIZE - 2;
        let v = bus.read32(addr);
        assert_eq!(v, 0);
        assert_eq!(bus.fault_log.len(), 1);
        assert_eq!(
            bus.fault_log[0],
            BusAccess::Read { addr, width: 4 }
        );
    }

    #[test]
    fn write_fcram_with_address_outside_fcram_is_noop() {
        let mut bus = ThreeDsBus::new();
        // VRAM base is nowhere near FCRAM — helper must refuse to write.
        let n = bus.write_fcram(ThreeDsBus::VRAM_BASE, &[1, 2, 3, 4]);
        assert_eq!(n, 0);
        // And FCRAM itself stays zero.
        assert_eq!(bus.read32(ThreeDsBus::FCRAM_BASE), 0);
    }

    #[test]
    fn io_range_upper_bound_is_exclusive() {
        let mut bus = ThreeDsBus::new();
        // Last byte of IO: in range.
        let last_io = ThreeDsBus::IO_BASE + ThreeDsBus::IO_SIZE - 1;
        let _ = bus.read8(last_io);
        assert_eq!(bus.io_log.len(), 1);
        assert!(bus.fault_log.is_empty());

        // First byte past IO: fault. (IO_BASE + IO_SIZE = 0x14000000, which
        // is in the gap between IO and VRAM.)
        let past_io = ThreeDsBus::IO_BASE + ThreeDsBus::IO_SIZE;
        let _ = bus.read8(past_io);
        assert_eq!(bus.fault_log.len(), 1);
        // io_log should not have gained a second entry.
        assert_eq!(bus.io_log.len(), 1);
    }

    #[test]
    fn regions_are_independent() {
        // Writing to one region must not disturb any other. A regression
        // here would mean the router is mixing up which Vec it hands out.
        let mut bus = ThreeDsBus::new();
        bus.write32(ThreeDsBus::FCRAM_BASE, 0x1111_1111);
        bus.write32(ThreeDsBus::VRAM_BASE, 0x2222_2222);
        bus.write32(ThreeDsBus::DSP_BASE, 0x3333_3333);
        bus.write32(ThreeDsBus::WRAM_BASE, 0x4444_4444);

        assert_eq!(bus.read32(ThreeDsBus::FCRAM_BASE), 0x1111_1111);
        assert_eq!(bus.read32(ThreeDsBus::VRAM_BASE), 0x2222_2222);
        assert_eq!(bus.read32(ThreeDsBus::DSP_BASE), 0x3333_3333);
        assert_eq!(bus.read32(ThreeDsBus::WRAM_BASE), 0x4444_4444);
    }
}
