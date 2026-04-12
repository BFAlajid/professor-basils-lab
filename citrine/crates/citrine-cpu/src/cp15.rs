//! CP15 — system control coprocessor stub.
//!
//! Phase 1 only models a handful of registers. Reads return cached values,
//! writes log the access. Real cache/TLB control is a Phase 2 concern.
//!
//! Registers modelled:
//!
//! ```text
//! CRn 1  — Control register (cache/MMU enable bits)
//! CRn 7  — Cache operations sink (writes recorded for inspection)
//! CRn 13 — Software Thread ID register (TLS pointer)
//! ```
//!
//! Reads of unknown registers return zero. Writes of unknown registers are
//! silently dropped — that matches what real ARMv6K hardware does for the
//! many "auxiliary control" registers a hosted environment never touches.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cp15 {
    /// CRn 1 — control register (cache/MMU enable bits).
    pub control: u32,
    /// CRn 13 — Software Thread ID register (TLS pointer).
    pub thread_id: u32,
    /// CRn 7 — cache operations sink (writes log here).
    /// Stores `(crm, opc2)` of the most recent cache op so tests can observe.
    pub last_cache_op: Option<(u8, u8)>,
}

impl Cp15 {
    pub const fn new() -> Self {
        Self {
            control: 0,
            thread_id: 0,
            last_cache_op: None,
        }
    }

    /// Read a coprocessor register. Unknown registers return zero.
    pub fn read(&self, crn: u8, _crm: u8, _opc1: u8, _opc2: u8) -> u32 {
        match crn {
            1 => self.control,
            13 => self.thread_id,
            // Cache operation registers are write-only on real hardware;
            // reads from them are unpredictable. Return zero.
            7 => 0,
            _ => 0,
        }
    }

    /// Write a coprocessor register. Unknown registers are dropped.
    pub fn write(&mut self, crn: u8, crm: u8, _opc1: u8, opc2: u8, value: u32) {
        match crn {
            1 => self.control = value,
            13 => self.thread_id = value,
            7 => {
                // Cache maintenance op — record (CRm, opc2) for tests.
                let _ = value;
                self.last_cache_op = Some((crm, opc2));
            }
            _ => {}
        }
    }
}

impl Default for Cp15 {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_cp15_is_zero() {
        let cp = Cp15::new();
        assert_eq!(cp.control, 0);
        assert_eq!(cp.thread_id, 0);
        assert_eq!(cp.last_cache_op, None);
    }

    #[test]
    fn write_then_read_control_register() {
        let mut cp = Cp15::new();
        cp.write(1, 0, 0, 0, 0xDEAD_BEEF);
        assert_eq!(cp.read(1, 0, 0, 0), 0xDEAD_BEEF);
    }

    #[test]
    fn write_then_read_thread_id_register() {
        let mut cp = Cp15::new();
        cp.write(13, 0, 0, 3, 0x1234_5678);
        assert_eq!(cp.read(13, 0, 0, 3), 0x1234_5678);
    }

    #[test]
    fn cache_op_writes_are_recorded() {
        let mut cp = Cp15::new();
        cp.write(7, 5, 0, 1, 0);
        assert_eq!(cp.last_cache_op, Some((5, 1)));
        cp.write(7, 10, 0, 4, 0);
        assert_eq!(cp.last_cache_op, Some((10, 4)));
    }

    #[test]
    fn unknown_register_writes_are_silently_ignored() {
        let mut cp = Cp15::new();
        cp.write(2, 0, 0, 0, 0xFFFF_FFFF);
        assert_eq!(cp.read(2, 0, 0, 0), 0);
    }
}
