//! Condition-code evaluation for ARM instructions.
//!
//! Every ARM instruction carries a 4-bit condition field (bits [31:28]).
//! Before execution, the CPU tests the current CPSR flags against the
//! condition and skips the instruction (still consuming the sequential
//! fetch cycle) if the test fails.

use crate::registers::RegisterFile;
use crate::types::Condition;

/// Evaluate `cond` against the given flag state.
pub fn check(cond: Condition, rf: &RegisterFile) -> bool {
    let n = rf.n();
    let z = rf.z();
    let c = rf.c();
    let v = rf.v();
    match cond {
        Condition::Eq => z,
        Condition::Ne => !z,
        Condition::Cs => c,
        Condition::Cc => !c,
        Condition::Mi => n,
        Condition::Pl => !n,
        Condition::Vs => v,
        Condition::Vc => !v,
        Condition::Hi => c && !z,
        Condition::Ls => !c || z,
        Condition::Ge => n == v,
        Condition::Lt => n != v,
        Condition::Gt => !z && (n == v),
        Condition::Le => z || (n != v),
        Condition::Al => true,
        Condition::Nv => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rf_with_flags(n: bool, z: bool, c: bool, v: bool) -> RegisterFile {
        let mut rf = RegisterFile::new();
        rf.set_nzcv(n, z, c, v);
        rf
    }

    #[test]
    fn eq_ne_depend_on_z() {
        assert!(check(Condition::Eq, &rf_with_flags(false, true, false, false)));
        assert!(!check(Condition::Eq, &rf_with_flags(false, false, false, false)));
        assert!(check(Condition::Ne, &rf_with_flags(false, false, false, false)));
        assert!(!check(Condition::Ne, &rf_with_flags(false, true, false, false)));
    }

    #[test]
    fn cs_cc_depend_on_c() {
        assert!(check(Condition::Cs, &rf_with_flags(false, false, true, false)));
        assert!(check(Condition::Cc, &rf_with_flags(false, false, false, false)));
    }

    #[test]
    fn hi_requires_c_and_not_z() {
        assert!(check(Condition::Hi, &rf_with_flags(false, false, true, false)));
        assert!(!check(Condition::Hi, &rf_with_flags(false, true, true, false)));
        assert!(!check(Condition::Hi, &rf_with_flags(false, false, false, false)));
    }

    #[test]
    fn ls_is_not_c_or_z() {
        assert!(check(Condition::Ls, &rf_with_flags(false, false, false, false)));
        assert!(check(Condition::Ls, &rf_with_flags(false, true, true, false)));
        assert!(!check(Condition::Ls, &rf_with_flags(false, false, true, false)));
    }

    #[test]
    fn ge_lt_depend_on_n_eq_v() {
        assert!(check(Condition::Ge, &rf_with_flags(false, false, false, false)));
        assert!(check(Condition::Ge, &rf_with_flags(true, false, false, true)));
        assert!(!check(Condition::Ge, &rf_with_flags(true, false, false, false)));
        assert!(check(Condition::Lt, &rf_with_flags(true, false, false, false)));
        assert!(!check(Condition::Lt, &rf_with_flags(false, false, false, false)));
    }

    #[test]
    fn gt_le_combine_z_with_signed_order() {
        assert!(check(Condition::Gt, &rf_with_flags(false, false, false, false)));
        assert!(!check(Condition::Gt, &rf_with_flags(false, true, false, false)));
        assert!(!check(Condition::Gt, &rf_with_flags(true, false, false, false)));
        assert!(check(Condition::Le, &rf_with_flags(false, true, false, false)));
        assert!(check(Condition::Le, &rf_with_flags(true, false, false, false)));
    }

    #[test]
    fn al_always_nv_never() {
        let rf = RegisterFile::new();
        assert!(check(Condition::Al, &rf));
        assert!(!check(Condition::Nv, &rf));
    }
}
