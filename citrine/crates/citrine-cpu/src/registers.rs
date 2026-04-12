//! ARM11 register file with processor modes, banked registers, CPSR and SPSR.
//!
//! ARMv6K has 37 unique 32-bit registers split between 7 processor modes:
//!   - User / System share R0..R14
//!   - FIQ banks R8..R14 (and has its own SPSR)
//!   - IRQ, Supervisor, Abort, Undefined each bank R13/R14 and have an SPSR
//!
//! R15 (PC) and the shared R0..R7 are unbanked.
//!
//! We model this by keeping one `common` slice for R0..R12 + PC and arrays of
//! banked copies for R8..R12 (FIQ only) and R13/R14 (all banked modes).

use core::fmt;

pub const SP: usize = 13;
pub const LR: usize = 14;
pub const PC: usize = 15;

/// CPSR mode field (bits [4:0]).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Mode {
    User = 0b10000,
    Fiq = 0b10001,
    Irq = 0b10010,
    Supervisor = 0b10011,
    Abort = 0b10111,
    Undefined = 0b11011,
    System = 0b11111,
}

impl Mode {
    pub fn from_bits(bits: u32) -> Option<Self> {
        match bits & 0x1F {
            0b10000 => Some(Self::User),
            0b10001 => Some(Self::Fiq),
            0b10010 => Some(Self::Irq),
            0b10011 => Some(Self::Supervisor),
            0b10111 => Some(Self::Abort),
            0b11011 => Some(Self::Undefined),
            0b11111 => Some(Self::System),
            _ => None,
        }
    }

    /// User and System share the same register bank.
    pub fn bank_index(self) -> BankIndex {
        match self {
            Self::User | Self::System => BankIndex::User,
            Self::Fiq => BankIndex::Fiq,
            Self::Irq => BankIndex::Irq,
            Self::Supervisor => BankIndex::Supervisor,
            Self::Abort => BankIndex::Abort,
            Self::Undefined => BankIndex::Undefined,
        }
    }

    /// Whether this mode has its own SPSR.
    pub fn has_spsr(self) -> bool {
        !matches!(self, Self::User | Self::System)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BankIndex {
    User = 0,
    Fiq = 1,
    Irq = 2,
    Supervisor = 3,
    Abort = 4,
    Undefined = 5,
}

const NUM_BANKS: usize = 6;

/// CPSR flag bits.
pub mod psr {
    pub const N: u32 = 1 << 31;
    pub const Z: u32 = 1 << 30;
    pub const C: u32 = 1 << 29;
    pub const V: u32 = 1 << 28;
    pub const Q: u32 = 1 << 27; // saturation sticky flag (ARMv5E+)
    pub const I: u32 = 1 << 7; // IRQ disable
    pub const F: u32 = 1 << 6; // FIQ disable
    pub const T: u32 = 1 << 5; // Thumb state
    pub const MODE_MASK: u32 = 0x1F;
}

/// Register file covering all ARMv6K processor modes.
#[derive(Clone)]
pub struct RegisterFile {
    /// R0..R7, R15 — always visible in every mode. R8..R12 live here in
    /// every mode except FIQ (FIQ banks them in `banked_hi_fiq`).
    r: [u32; 16],
    /// FIQ banked R8..R12 (5 regs). Swapped with `r[8..=12]` on FIQ entry.
    banked_hi_fiq: [u32; 5],
    /// User-mode R8..R12 when we're currently in FIQ mode (so switching back restores them).
    user_hi_saved: [u32; 5],
    /// Per-bank SP (R13) and LR (R14). User/System share index 0.
    banked_sp: [u32; NUM_BANKS],
    banked_lr: [u32; NUM_BANKS],
    /// SPSR per banked mode. User/System have no SPSR; slot 0 is unused.
    banked_spsr: [u32; NUM_BANKS],
    cpsr: u32,
}

impl RegisterFile {
    /// Fresh CPU state: all zeros, running in Supervisor mode with interrupts
    /// disabled — matches the ARM reset state.
    pub fn new() -> Self {
        let cpsr = Mode::Supervisor as u32 | psr::I | psr::F;
        Self {
            r: [0; 16],
            banked_hi_fiq: [0; 5],
            user_hi_saved: [0; 5],
            banked_sp: [0; NUM_BANKS],
            banked_lr: [0; NUM_BANKS],
            banked_spsr: [0; NUM_BANKS],
            cpsr,
        }
    }

    #[inline]
    pub fn cpsr(&self) -> u32 {
        self.cpsr
    }

    /// Write CPSR; if the mode field changed, perform a bank swap.
    pub fn set_cpsr(&mut self, value: u32) {
        let old_mode = Mode::from_bits(self.cpsr).unwrap_or(Mode::System);
        let new_mode = Mode::from_bits(value).unwrap_or(old_mode);
        if old_mode != new_mode {
            self.swap_banks(old_mode, new_mode);
        }
        self.cpsr = value;
    }

    pub fn mode(&self) -> Mode {
        Mode::from_bits(self.cpsr).unwrap_or(Mode::System)
    }

    pub fn spsr(&self) -> u32 {
        let idx = self.mode().bank_index() as usize;
        self.banked_spsr[idx]
    }

    pub fn set_spsr(&mut self, value: u32) {
        let mode = self.mode();
        if mode.has_spsr() {
            self.banked_spsr[mode.bank_index() as usize] = value;
        }
        // SPSR writes in User/System are UNPREDICTABLE; silently ignored here.
    }

    /// Read a GP register. R15 (PC) returns the stored value unmodified.
    /// The decoder/executor adds the +8 pipeline offset when needed.
    #[inline]
    pub fn read(&self, reg: u8) -> u32 {
        self.r[reg as usize & 0xF]
    }

    /// Write a GP register. R15 is written as-is (the branch helper is responsible for alignment).
    #[inline]
    pub fn write(&mut self, reg: u8, value: u32) {
        self.r[reg as usize & 0xF] = value;
    }

    /// Convenience accessors for PC / SP / LR.
    #[inline]
    pub fn pc(&self) -> u32 {
        self.r[PC]
    }
    #[inline]
    pub fn set_pc(&mut self, value: u32) {
        self.r[PC] = value;
    }
    #[inline]
    pub fn sp(&self) -> u32 {
        self.r[SP]
    }
    #[inline]
    pub fn set_sp(&mut self, value: u32) {
        self.r[SP] = value;
    }
    #[inline]
    pub fn lr(&self) -> u32 {
        self.r[LR]
    }
    #[inline]
    pub fn set_lr(&mut self, value: u32) {
        self.r[LR] = value;
    }

    /// Read the user-mode view of a register even when in a privileged mode.
    /// Used by LDM/STM with the S-bit and by MRS/MSR in some forms.
    pub fn read_user(&self, reg: u8) -> u32 {
        let r = reg as usize & 0xF;
        match (self.mode(), r) {
            (Mode::Fiq, 8..=12) => self.user_hi_saved[r - 8],
            (Mode::Fiq, 13) => self.banked_sp[BankIndex::User as usize],
            (Mode::Fiq, 14) => self.banked_lr[BankIndex::User as usize],
            (m, 13) if m.has_spsr() => self.banked_sp[BankIndex::User as usize],
            (m, 14) if m.has_spsr() => self.banked_lr[BankIndex::User as usize],
            _ => self.r[r],
        }
    }

    pub fn write_user(&mut self, reg: u8, value: u32) {
        let r = reg as usize & 0xF;
        match (self.mode(), r) {
            (Mode::Fiq, 8..=12) => self.user_hi_saved[r - 8] = value,
            (Mode::Fiq, 13) => self.banked_sp[BankIndex::User as usize] = value,
            (Mode::Fiq, 14) => self.banked_lr[BankIndex::User as usize] = value,
            (m, 13) if m.has_spsr() => self.banked_sp[BankIndex::User as usize] = value,
            (m, 14) if m.has_spsr() => self.banked_lr[BankIndex::User as usize] = value,
            _ => self.r[r] = value,
        }
    }

    /// Perform a mode switch: save the outgoing mode's banked registers and
    /// load the incoming mode's banks.
    fn swap_banks(&mut self, old: Mode, new: Mode) {
        // R13/R14 banking applies to every mode switch (even User <-> System,
        // though those share slot 0, so the operation is a no-op for them).
        let old_idx = old.bank_index() as usize;
        let new_idx = new.bank_index() as usize;
        self.banked_sp[old_idx] = self.r[SP];
        self.banked_lr[old_idx] = self.r[LR];
        self.r[SP] = self.banked_sp[new_idx];
        self.r[LR] = self.banked_lr[new_idx];

        // R8..R12 are only banked for FIQ.
        match (old, new) {
            (Mode::Fiq, Mode::Fiq) => {}
            (Mode::Fiq, _) => {
                // Leaving FIQ: stash R8..R12 to FIQ bank, restore user R8..R12.
                for i in 0..5 {
                    self.banked_hi_fiq[i] = self.r[8 + i];
                    self.r[8 + i] = self.user_hi_saved[i];
                }
            }
            (_, Mode::Fiq) => {
                // Entering FIQ: stash current R8..R12 to user_hi_saved, load FIQ bank.
                for i in 0..5 {
                    self.user_hi_saved[i] = self.r[8 + i];
                    self.r[8 + i] = self.banked_hi_fiq[i];
                }
            }
            _ => {}
        }
    }

    // ── Flag helpers ────────────────────────────────────────────────────

    #[inline]
    pub fn n(&self) -> bool {
        self.cpsr & psr::N != 0
    }
    #[inline]
    pub fn z(&self) -> bool {
        self.cpsr & psr::Z != 0
    }
    #[inline]
    pub fn c(&self) -> bool {
        self.cpsr & psr::C != 0
    }
    #[inline]
    pub fn v(&self) -> bool {
        self.cpsr & psr::V != 0
    }

    #[inline]
    pub fn set_nzcv(&mut self, n: bool, z: bool, c: bool, v: bool) {
        let mut cpsr = self.cpsr & !(psr::N | psr::Z | psr::C | psr::V);
        if n {
            cpsr |= psr::N;
        }
        if z {
            cpsr |= psr::Z;
        }
        if c {
            cpsr |= psr::C;
        }
        if v {
            cpsr |= psr::V;
        }
        self.cpsr = cpsr;
    }

    #[inline]
    pub fn set_nz(&mut self, n: bool, z: bool) {
        let mut cpsr = self.cpsr & !(psr::N | psr::Z);
        if n {
            cpsr |= psr::N;
        }
        if z {
            cpsr |= psr::Z;
        }
        self.cpsr = cpsr;
    }

    #[inline]
    pub fn set_flag_c(&mut self, c: bool) {
        if c {
            self.cpsr |= psr::C;
        } else {
            self.cpsr &= !psr::C;
        }
    }
}

impl Default for RegisterFile {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Debug for RegisterFile {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "RegisterFile {{")?;
        for i in 0..16 {
            writeln!(f, "  r{:<2} = {:#010x}", i, self.r[i])?;
        }
        writeln!(f, "  cpsr = {:#010x} (mode {:?})", self.cpsr, self.mode())?;
        write!(f, "}}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_state_is_supervisor_with_irq_fiq_masked() {
        let rf = RegisterFile::new();
        assert_eq!(rf.mode(), Mode::Supervisor);
        assert_ne!(rf.cpsr() & psr::I, 0);
        assert_ne!(rf.cpsr() & psr::F, 0);
        for i in 0..16 {
            assert_eq!(rf.read(i), 0);
        }
    }

    #[test]
    fn read_write_registers() {
        let mut rf = RegisterFile::new();
        rf.write(0, 0x1234_5678);
        assert_eq!(rf.read(0), 0x1234_5678);
        rf.set_sp(0x2000_0000);
        assert_eq!(rf.sp(), 0x2000_0000);
        assert_eq!(rf.read(SP as u8), 0x2000_0000);
    }

    #[test]
    fn fiq_banks_high_registers_and_sp_lr() {
        let mut rf = RegisterFile::new();
        // In Supervisor: write r8..r12 user values, SP and LR.
        for i in 8..=12 {
            rf.write(i, 0x1000 + i as u32);
        }
        rf.set_sp(0xAAAA_AAAA);
        rf.set_lr(0xBBBB_BBBB);

        // Switch to FIQ — R8..R12 and SP/LR should swap out to banks.
        rf.set_cpsr(Mode::Fiq as u32 | psr::I | psr::F);
        // FIQ banks start at zero.
        for i in 8..=12 {
            assert_eq!(rf.read(i), 0, "FIQ R{} should start at 0", i);
        }
        assert_eq!(rf.sp(), 0);
        assert_eq!(rf.lr(), 0);

        // Write FIQ-bank values.
        for i in 8..=12 {
            rf.write(i, 0x9000 + i as u32);
        }
        rf.set_sp(0xFEED_F00D);
        rf.set_lr(0xFACE_0FF0);

        // Go back to Supervisor — user R8..R12, SP, LR should reappear.
        rf.set_cpsr(Mode::Supervisor as u32 | psr::I | psr::F);
        for i in 8..=12 {
            assert_eq!(rf.read(i), 0x1000 + i as u32, "user R{} restored", i);
        }
        assert_eq!(rf.sp(), 0xAAAA_AAAA);
        assert_eq!(rf.lr(), 0xBBBB_BBBB);

        // Switch to FIQ again — FIQ bank values should come back.
        rf.set_cpsr(Mode::Fiq as u32 | psr::I | psr::F);
        for i in 8..=12 {
            assert_eq!(rf.read(i), 0x9000 + i as u32);
        }
        assert_eq!(rf.sp(), 0xFEED_F00D);
        assert_eq!(rf.lr(), 0xFACE_0FF0);
    }

    #[test]
    fn irq_banks_sp_lr_independently() {
        let mut rf = RegisterFile::new();
        rf.set_sp(0x1111_1111);
        rf.set_lr(0x2222_2222);
        rf.set_cpsr(Mode::Irq as u32);
        assert_eq!(rf.sp(), 0);
        assert_eq!(rf.lr(), 0);
        rf.set_sp(0x3333_3333);
        rf.set_lr(0x4444_4444);
        rf.set_cpsr(Mode::Supervisor as u32);
        assert_eq!(rf.sp(), 0x1111_1111);
        assert_eq!(rf.lr(), 0x2222_2222);
        rf.set_cpsr(Mode::Irq as u32);
        assert_eq!(rf.sp(), 0x3333_3333);
        assert_eq!(rf.lr(), 0x4444_4444);
    }

    #[test]
    fn set_nzcv_round_trip() {
        let mut rf = RegisterFile::new();
        rf.set_nzcv(true, false, true, false);
        assert!(rf.n());
        assert!(!rf.z());
        assert!(rf.c());
        assert!(!rf.v());
        rf.set_nzcv(false, true, false, true);
        assert!(!rf.n());
        assert!(rf.z());
        assert!(!rf.c());
        assert!(rf.v());
    }

    #[test]
    fn spsr_per_mode() {
        let mut rf = RegisterFile::new();
        rf.set_spsr(0xDEAD_BEEF); // Supervisor's SPSR
        rf.set_cpsr(Mode::Irq as u32);
        assert_eq!(rf.spsr(), 0); // IRQ SPSR fresh
        rf.set_spsr(0xCAFE_BABE);
        rf.set_cpsr(Mode::Supervisor as u32);
        assert_eq!(rf.spsr(), 0xDEAD_BEEF);
        rf.set_cpsr(Mode::Irq as u32);
        assert_eq!(rf.spsr(), 0xCAFE_BABE);
    }
}
