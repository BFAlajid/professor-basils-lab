//! ARM exception entry helpers.
//!
//! When an exception is taken, the processor:
//! 1. Saves the current CPSR into the target mode's SPSR
//! 2. Sets LR of the target mode to the return address (pc + 4 for SVC,
//!    pc + 8 for IRQ, pc for prefetch abort, etc.)
//! 3. Switches CPSR mode and masks interrupts as required
//! 4. Jumps to the corresponding entry in the exception vector table at
//!    address 0x00000000 (or 0xFFFF0000 if high vectors are enabled)

use crate::registers::{psr, Mode, RegisterFile};

/// The seven ARM exception kinds, ordered by vector address.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExceptionKind {
    Reset,
    Undefined,
    Svc,
    PrefetchAbort,
    DataAbort,
    Irq,
    Fiq,
}

impl ExceptionKind {
    /// Vector address (low-vector base 0x00000000).
    pub fn vector(self) -> u32 {
        match self {
            Self::Reset => 0x0000_0000,
            Self::Undefined => 0x0000_0004,
            Self::Svc => 0x0000_0008,
            Self::PrefetchAbort => 0x0000_000C,
            Self::DataAbort => 0x0000_0010,
            Self::Irq => 0x0000_0018,
            Self::Fiq => 0x0000_001C,
        }
    }

    /// Mode the processor enters when this exception is taken.
    pub fn target_mode(self) -> Mode {
        match self {
            Self::Reset | Self::Svc => Mode::Supervisor,
            Self::Undefined => Mode::Undefined,
            Self::PrefetchAbort | Self::DataAbort => Mode::Abort,
            Self::Irq => Mode::Irq,
            Self::Fiq => Mode::Fiq,
        }
    }

    /// LR offset from the faulting PC. The convention is that the saved LR
    /// minus this offset (and minus another adjustment for the return form)
    /// yields the instruction to re-execute or skip.
    pub fn lr_offset(self) -> u32 {
        match self {
            // Reset has no return address; conventionally 0.
            Self::Reset => 0,
            // SVC and Undefined return to the instruction *after* the faulting
            // one — LR holds pc+4 (since pc points at the SVC itself).
            Self::Svc | Self::Undefined => 4,
            // Prefetch abort: LR = pc + 4 so SUBS pc, lr, #4 retries the same.
            Self::PrefetchAbort => 4,
            // Data abort: LR = pc + 8 so SUBS pc, lr, #8 retries.
            Self::DataAbort => 8,
            // IRQ/FIQ: LR = pc + 4 (the +4 covers the prefetch slot).
            Self::Irq | Self::Fiq => 4,
        }
    }

    /// FIQ is masked on entry to FIQ and Reset; for other exceptions FIQ
    /// remains in its previous state.
    pub fn masks_fiq(self) -> bool {
        matches!(self, Self::Reset | Self::Fiq)
    }
}

/// Enter an exception. Banks registers, saves CPSR, sets LR and PC.
///
/// `faulting_pc` is the address of the instruction that caused (or that was
/// about to execute when) the exception was taken. Callers are responsible
/// for choosing the correct value (typically `cpu.regs.pc()`).
pub fn enter_exception(rf: &mut RegisterFile, kind: ExceptionKind, faulting_pc: u32) {
    let saved_cpsr = rf.cpsr();
    let target = kind.target_mode();

    // Build the new CPSR: switch mode, mask IRQ, clear Thumb (ARM state on entry).
    let mut new_cpsr = (saved_cpsr & !psr::MODE_MASK) | (target as u32);
    new_cpsr |= psr::I; // mask IRQ on every exception entry
    if kind.masks_fiq() {
        new_cpsr |= psr::F;
    }
    new_cpsr &= !psr::T; // ARM state

    // set_cpsr handles register banking when the mode field changes.
    rf.set_cpsr(new_cpsr);

    // After the bank swap, LR/SPSR refer to the *new* mode's bank. Save the
    // return address into LR_<mode> and the previous CPSR into SPSR_<mode>.
    rf.set_lr(faulting_pc.wrapping_add(kind.lr_offset()));
    rf.set_spsr(saved_cpsr);

    // Branch to the vector.
    rf.set_pc(kind.vector());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vectors_match_arm_spec() {
        assert_eq!(ExceptionKind::Reset.vector(), 0x00);
        assert_eq!(ExceptionKind::Undefined.vector(), 0x04);
        assert_eq!(ExceptionKind::Svc.vector(), 0x08);
        assert_eq!(ExceptionKind::PrefetchAbort.vector(), 0x0C);
        assert_eq!(ExceptionKind::DataAbort.vector(), 0x10);
        assert_eq!(ExceptionKind::Irq.vector(), 0x18);
        assert_eq!(ExceptionKind::Fiq.vector(), 0x1C);
    }

    #[test]
    fn target_modes_match_arm_spec() {
        assert_eq!(ExceptionKind::Svc.target_mode(), Mode::Supervisor);
        assert_eq!(ExceptionKind::Undefined.target_mode(), Mode::Undefined);
        assert_eq!(ExceptionKind::PrefetchAbort.target_mode(), Mode::Abort);
        assert_eq!(ExceptionKind::DataAbort.target_mode(), Mode::Abort);
        assert_eq!(ExceptionKind::Irq.target_mode(), Mode::Irq);
        assert_eq!(ExceptionKind::Fiq.target_mode(), Mode::Fiq);
    }

    #[test]
    fn fiq_masks_fiq_others_do_not() {
        assert!(ExceptionKind::Fiq.masks_fiq());
        assert!(ExceptionKind::Reset.masks_fiq());
        assert!(!ExceptionKind::Svc.masks_fiq());
        assert!(!ExceptionKind::Irq.masks_fiq());
        assert!(!ExceptionKind::Undefined.masks_fiq());
    }

    #[test]
    fn enter_svc_from_user_sets_lr_spsr_pc() {
        let mut rf = RegisterFile::new();
        // Move into User mode first so we have a CPSR distinct from Supervisor.
        rf.set_cpsr(Mode::User as u32);
        let saved = rf.cpsr();
        enter_exception(&mut rf, ExceptionKind::Svc, 0x100);
        assert_eq!(rf.mode(), Mode::Supervisor);
        assert_eq!(rf.pc(), 0x08);
        assert_eq!(rf.lr(), 0x100 + 4);
        assert_eq!(rf.spsr(), saved);
        assert_ne!(rf.cpsr() & psr::I, 0);
    }
}
