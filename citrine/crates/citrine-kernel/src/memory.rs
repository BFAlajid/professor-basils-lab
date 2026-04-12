//! 3DS physical memory map and region helpers.
//!
//! Old 3DS layout (the variant we target first):
//!
//! | Region | Base         | Size  |
//! |--------|--------------|-------|
//! | IO     | `0x10000000` | 64 MB |
//! | VRAM   | `0x18000000` |  6 MB |
//! | DSP    | `0x1FF00000` | 512 K |
//! | WRAM   | `0x1FF80000` | 512 K |
//! | FCRAM  | `0x20000000` | 128 MB|
//!
//! These are physical bases. Virtual mappings (heap, linear heap, GSP heap)
//! are layered on top by `ControlMemory` and live in the kernel state, not
//! in this static map.

/// A contiguous physical region (name + base + size).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MemoryRegion {
    pub name: &'static str,
    pub base: u32,
    pub size: u32,
}

impl MemoryRegion {
    /// First address past the region. Saturates rather than wraps so the
    /// last region (FCRAM ending near the top of the address space) reports
    /// a sane endpoint.
    pub fn end(&self) -> u32 {
        self.base.saturating_add(self.size)
    }

    /// Whether `addr` falls inside `[base, base+size)`.
    pub fn contains(&self, addr: u32) -> bool {
        addr >= self.base && addr < self.end()
    }

    /// Distance from `base` to `addr`, or `None` if outside.
    pub fn offset_of(&self, addr: u32) -> Option<u32> {
        if self.contains(addr) {
            Some(addr - self.base)
        } else {
            None
        }
    }
}

/// All physical regions visible to the kernel.
pub struct MemoryMap {
    pub regions: Vec<MemoryRegion>,
}

impl MemoryMap {
    /// The Old 3DS physical layout.
    pub fn default_3ds() -> Self {
        Self {
            regions: vec![
                MemoryRegion {
                    name: "IO",
                    base: 0x1000_0000,
                    size: 0x0400_0000,
                },
                MemoryRegion {
                    name: "VRAM",
                    base: 0x1800_0000,
                    size: 0x0060_0000,
                },
                MemoryRegion {
                    name: "DSP",
                    base: 0x1FF0_0000,
                    size: 0x0008_0000,
                },
                MemoryRegion {
                    name: "WRAM",
                    base: 0x1FF8_0000,
                    size: 0x0008_0000,
                },
                MemoryRegion {
                    name: "FCRAM",
                    base: 0x2000_0000,
                    size: 0x0800_0000,
                },
            ],
        }
    }

    /// First region containing `addr`.
    pub fn region_of(&self, addr: u32) -> Option<&MemoryRegion> {
        self.regions.iter().find(|r| r.contains(addr))
    }

    /// Look up a region by name.
    pub fn region_by_name(&self, name: &str) -> Option<&MemoryRegion> {
        self.regions.iter().find(|r| r.name == name)
    }
}

impl Default for MemoryMap {
    fn default() -> Self {
        Self::default_3ds()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn region_contains() {
        let r = MemoryRegion {
            name: "FCRAM",
            base: 0x2000_0000,
            size: 0x0800_0000,
        };
        assert!(r.contains(0x2000_0000));
        assert!(r.contains(0x2400_0000));
        assert!(r.contains(0x27FF_FFFF));
        assert!(!r.contains(0x2800_0000));
        assert!(!r.contains(0x1FFF_FFFF));
    }

    #[test]
    fn region_offset_of() {
        let r = MemoryRegion {
            name: "VRAM",
            base: 0x1800_0000,
            size: 0x0060_0000,
        };
        assert_eq!(r.offset_of(0x1800_0000), Some(0));
        assert_eq!(r.offset_of(0x1800_1000), Some(0x1000));
        assert_eq!(r.offset_of(0x1860_0000), None);
        assert_eq!(r.offset_of(0x0000_0000), None);
    }

    #[test]
    fn region_end_saturates() {
        let r = MemoryRegion {
            name: "Top",
            base: 0xFFFF_FF00,
            size: 0x0000_FFFF,
        };
        assert_eq!(r.end(), u32::MAX);
    }

    #[test]
    fn region_of_locates_address() {
        let map = MemoryMap::default_3ds();
        let r = map.region_of(0x2010_0000).expect("FCRAM");
        assert_eq!(r.name, "FCRAM");
        let r = map.region_of(0x1800_1000).expect("VRAM");
        assert_eq!(r.name, "VRAM");
        let r = map.region_of(0x1FF0_1000).expect("DSP");
        assert_eq!(r.name, "DSP");
    }

    #[test]
    fn region_of_returns_none_for_unmapped() {
        let map = MemoryMap::default_3ds();
        assert!(map.region_of(0x0000_0000).is_none());
        assert!(map.region_of(0x0FFF_FFFF).is_none());
    }

    #[test]
    fn default_map_includes_fcram() {
        let map = MemoryMap::default_3ds();
        let fcram = map.region_by_name("FCRAM").expect("FCRAM exists");
        assert_eq!(fcram.base, 0x2000_0000);
        assert_eq!(fcram.size, 0x0800_0000);
    }

    #[test]
    fn default_map_has_all_named_regions() {
        let map = MemoryMap::default_3ds();
        for name in ["IO", "VRAM", "DSP", "WRAM", "FCRAM"] {
            assert!(map.region_by_name(name).is_some(), "{name} missing");
        }
    }
}
