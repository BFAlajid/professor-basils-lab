//! Memory bus trait.
//!
//! This lives in `citrine-cpu` so the executor can talk to memory without
//! depending on any host-side implementation. `citrine-core` provides the
//! flat-memory implementation; later phases can swap it for an MMU-backed bus.

/// 32-bit little-endian memory bus.
///
/// All accesses are byte-aligned in the current phase; alignment enforcement
/// happens at the ARM data-abort level on real hardware. Phase 0 silently
/// rounds down misaligned word/halfword accesses, matching most Rust runtime
/// emulators' behaviour for homebrew.
pub trait Bus {
    fn read8(&mut self, addr: u32) -> u8;
    fn read16(&mut self, addr: u32) -> u16;
    fn read32(&mut self, addr: u32) -> u32;

    fn write8(&mut self, addr: u32, value: u8);
    fn write16(&mut self, addr: u32, value: u16);
    fn write32(&mut self, addr: u32, value: u32);
}
