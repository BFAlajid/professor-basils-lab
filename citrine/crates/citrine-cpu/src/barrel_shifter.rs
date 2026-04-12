//! ARM barrel shifter. Produces both the shifted value and the carry-out.
//!
//! The carry-out is separate from the input carry because data-processing
//! instructions that use a shifted-register operand update the CPSR `C`
//! flag from the shifter's carry when `S` is set and the opcode is logical.

use crate::types::ShiftType;

/// Result of a shift: the shifted 32-bit value and the shifter carry-out.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ShiftResult {
    pub value: u32,
    pub carry_out: bool,
}

impl ShiftResult {
    pub const fn new(value: u32, carry_out: bool) -> Self {
        Self { value, carry_out }
    }
}

/// Perform a shift encoded in ARM immediate form
/// (`amount` is the raw 5-bit shift amount from the instruction; `0` means
/// the special "full" forms for LSR/ASR/ROR → RRX).
pub fn shift_immediate(kind: ShiftType, value: u32, amount: u8, carry_in: bool) -> ShiftResult {
    let amount = amount as u32;
    match kind {
        ShiftType::Lsl => lsl(value, amount, carry_in),
        ShiftType::Lsr => {
            // LSR #0 encodes LSR #32
            let n = if amount == 0 { 32 } else { amount };
            lsr(value, n, carry_in)
        }
        ShiftType::Asr => {
            let n = if amount == 0 { 32 } else { amount };
            asr(value, n, carry_in)
        }
        ShiftType::Ror => {
            if amount == 0 {
                rrx(value, carry_in)
            } else {
                ror(value, amount, carry_in)
            }
        }
    }
}

/// Perform a shift whose amount comes from a register (low 8 bits of Rs).
/// Register-specified shifts have different "zero" semantics: `LSL Rs`
/// with Rs&0xFF == 0 is a no-op and `C` is unchanged.
pub fn shift_register(kind: ShiftType, value: u32, amount: u32, carry_in: bool) -> ShiftResult {
    let amt = amount & 0xFF;
    if amt == 0 {
        return ShiftResult::new(value, carry_in);
    }
    match kind {
        ShiftType::Lsl => {
            if amt == 32 {
                ShiftResult::new(0, (value & 1) != 0)
            } else if amt > 32 {
                ShiftResult::new(0, false)
            } else {
                lsl(value, amt, carry_in)
            }
        }
        ShiftType::Lsr => {
            if amt == 32 {
                ShiftResult::new(0, (value & (1 << 31)) != 0)
            } else if amt > 32 {
                ShiftResult::new(0, false)
            } else {
                lsr(value, amt, carry_in)
            }
        }
        ShiftType::Asr => {
            if amt >= 32 {
                let sign = (value as i32) >> 31;
                ShiftResult::new(sign as u32, sign != 0)
            } else {
                asr(value, amt, carry_in)
            }
        }
        ShiftType::Ror => {
            let n = amt & 0x1F;
            if n == 0 {
                // amt is a nonzero multiple of 32 — value unchanged, carry = bit 31.
                ShiftResult::new(value, (value & (1 << 31)) != 0)
            } else {
                ror(value, n, carry_in)
            }
        }
    }
}

fn lsl(value: u32, amount: u32, carry_in: bool) -> ShiftResult {
    if amount == 0 {
        ShiftResult::new(value, carry_in)
    } else if amount < 32 {
        let carry = (value >> (32 - amount)) & 1 != 0;
        ShiftResult::new(value << amount, carry)
    } else if amount == 32 {
        ShiftResult::new(0, (value & 1) != 0)
    } else {
        ShiftResult::new(0, false)
    }
}

fn lsr(value: u32, amount: u32, _carry_in: bool) -> ShiftResult {
    if amount < 32 {
        let carry = (value >> (amount - 1)) & 1 != 0;
        ShiftResult::new(value >> amount, carry)
    } else if amount == 32 {
        ShiftResult::new(0, (value & (1 << 31)) != 0)
    } else {
        ShiftResult::new(0, false)
    }
}

fn asr(value: u32, amount: u32, _carry_in: bool) -> ShiftResult {
    if amount < 32 {
        let carry = ((value as i32) >> (amount - 1)) & 1 != 0;
        ShiftResult::new(((value as i32) >> amount) as u32, carry)
    } else {
        // ASR #32+: all bits become the sign bit.
        let sign = (value as i32) >> 31;
        ShiftResult::new(sign as u32, sign != 0)
    }
}

fn ror(value: u32, amount: u32, _carry_in: bool) -> ShiftResult {
    let n = amount & 31;
    if n == 0 {
        ShiftResult::new(value, (value & (1 << 31)) != 0)
    } else {
        let rotated = value.rotate_right(n);
        let carry = (rotated & (1 << 31)) != 0;
        ShiftResult::new(rotated, carry)
    }
}

fn rrx(value: u32, carry_in: bool) -> ShiftResult {
    let carry_out = (value & 1) != 0;
    let c_bit = if carry_in { 1u32 << 31 } else { 0 };
    let result = (value >> 1) | c_bit;
    ShiftResult::new(result, carry_out)
}

/// Rotate an 8-bit immediate right by `2 * rotate` as used in data-processing
/// immediate operands. Returns the value and the shifter carry-out. When
/// `rotate == 0`, the carry-out is the input carry (left untouched).
pub fn rotate_immediate(imm8: u32, rotate: u32, carry_in: bool) -> ShiftResult {
    if rotate == 0 {
        ShiftResult::new(imm8, carry_in)
    } else {
        let rotated = (imm8 as u32).rotate_right(2 * rotate);
        let carry = (rotated & (1 << 31)) != 0;
        ShiftResult::new(rotated, carry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lsl_zero_preserves_carry() {
        assert_eq!(
            shift_immediate(ShiftType::Lsl, 0xDEAD_BEEF, 0, true),
            ShiftResult::new(0xDEAD_BEEF, true)
        );
        assert_eq!(
            shift_immediate(ShiftType::Lsl, 0xDEAD_BEEF, 0, false),
            ShiftResult::new(0xDEAD_BEEF, false)
        );
    }

    #[test]
    fn lsl_basic() {
        assert_eq!(
            shift_immediate(ShiftType::Lsl, 1, 1, false),
            ShiftResult::new(2, false)
        );
        assert_eq!(
            shift_immediate(ShiftType::Lsl, 0x8000_0000, 1, false),
            ShiftResult::new(0, true)
        );
    }

    #[test]
    fn lsr_immediate_zero_is_lsr_32() {
        assert_eq!(
            shift_immediate(ShiftType::Lsr, 0x8000_0001, 0, false),
            ShiftResult::new(0, true)
        );
    }

    #[test]
    fn asr_immediate_zero_is_asr_32() {
        assert_eq!(
            shift_immediate(ShiftType::Asr, 0x8000_0000, 0, false),
            ShiftResult::new(0xFFFF_FFFF, true)
        );
        assert_eq!(
            shift_immediate(ShiftType::Asr, 0x7000_0000, 0, false),
            ShiftResult::new(0, false)
        );
    }

    #[test]
    fn ror_immediate_zero_is_rrx() {
        assert_eq!(
            shift_immediate(ShiftType::Ror, 0x0000_0003, 0, false),
            ShiftResult::new(0x0000_0001, true)
        );
        assert_eq!(
            shift_immediate(ShiftType::Ror, 0x0000_0002, 0, true),
            ShiftResult::new(0x8000_0001, false)
        );
    }

    #[test]
    fn register_shift_zero_preserves_carry() {
        assert_eq!(
            shift_register(ShiftType::Lsl, 0xAAAA_5555, 0, true),
            ShiftResult::new(0xAAAA_5555, true)
        );
    }

    #[test]
    fn register_shift_lsl_32() {
        assert_eq!(
            shift_register(ShiftType::Lsl, 0x0000_0001, 32, false),
            ShiftResult::new(0, true)
        );
        assert_eq!(
            shift_register(ShiftType::Lsl, 0x0000_0002, 33, false),
            ShiftResult::new(0, false)
        );
    }

    #[test]
    fn register_shift_asr_big_preserves_sign() {
        assert_eq!(
            shift_register(ShiftType::Asr, 0x8000_0000, 100, false),
            ShiftResult::new(0xFFFF_FFFF, true)
        );
    }

    #[test]
    fn rotate_imm_zero_preserves_carry() {
        assert_eq!(
            rotate_immediate(0xFF, 0, true),
            ShiftResult::new(0xFF, true)
        );
    }

    #[test]
    fn rotate_imm_nonzero() {
        // 0x000000FF ROR by 8 = 0xFF000000
        let result = rotate_immediate(0xFF, 4, false);
        assert_eq!(result.value, 0xFF00_0000);
        assert!(result.carry_out);
    }
}
