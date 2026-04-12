//! Shared test helpers: a minimal in-memory bus and a handful of
//! ARM encoder helpers. Lives in the integration-test tree so every
//! test file can reuse it via `mod common;`.

#![allow(dead_code)]

use citrine_cpu::{Bus, Cpu};

/// Flat little-endian memory bus for integration tests.
pub struct TestBus {
    pub ram: Vec<u8>,
}

impl TestBus {
    pub fn new(size: usize) -> Self {
        Self { ram: vec![0; size] }
    }

    pub fn load_words(&mut self, base: u32, words: &[u32]) {
        let mut addr = base as usize;
        for w in words {
            let b = w.to_le_bytes();
            self.ram[addr..addr + 4].copy_from_slice(&b);
            addr += 4;
        }
    }
}

impl Bus for TestBus {
    fn read8(&mut self, addr: u32) -> u8 {
        *self.ram.get(addr as usize).unwrap_or(&0)
    }
    fn read16(&mut self, addr: u32) -> u16 {
        let lo = self.read8(addr);
        let hi = self.read8(addr.wrapping_add(1));
        u16::from_le_bytes([lo, hi])
    }
    fn read32(&mut self, addr: u32) -> u32 {
        u32::from_le_bytes([
            self.read8(addr),
            self.read8(addr.wrapping_add(1)),
            self.read8(addr.wrapping_add(2)),
            self.read8(addr.wrapping_add(3)),
        ])
    }
    fn write8(&mut self, addr: u32, value: u8) {
        if let Some(b) = self.ram.get_mut(addr as usize) {
            *b = value;
        }
    }
    fn write16(&mut self, addr: u32, value: u16) {
        let [a, b] = value.to_le_bytes();
        self.write8(addr, a);
        self.write8(addr.wrapping_add(1), b);
    }
    fn write32(&mut self, addr: u32, value: u32) {
        let [a, b, c, d] = value.to_le_bytes();
        self.write8(addr, a);
        self.write8(addr.wrapping_add(1), b);
        self.write8(addr.wrapping_add(2), c);
        self.write8(addr.wrapping_add(3), d);
    }
}

/// Run a pre-built word program and return the final CPU state.
pub fn run_program(words: &[u32]) -> (Cpu, TestBus) {
    let mut cpu = Cpu::new();
    let mut bus = TestBus::new(0x4000);
    bus.load_words(0, words);
    cpu.reset(0);
    for _ in 0..words.len() {
        cpu.step(&mut bus);
    }
    (cpu, bus)
}

// ── ARM instruction encoders ────────────────────────────────────────

pub const AL: u32 = 0xE;

/// Build an ARM condition prefix.
pub const fn cond(c: u32) -> u32 {
    c << 28
}

// Data-processing ---------------------------------------------------

/// Encode any DP-register instruction with an immediate-shifted Rm operand
/// (shift type & amount given separately).
pub fn dp_reg(
    c: u32,
    op: u32,
    s: u32,
    rn: u32,
    rd: u32,
    rm: u32,
    shift_type: u32,
    shift_amount: u32,
) -> u32 {
    cond(c)
        | (op << 21)
        | (s << 20)
        | (rn << 16)
        | (rd << 12)
        | ((shift_amount & 0x1F) << 7)
        | ((shift_type & 0b11) << 5)
        | (rm & 0xF)
}

/// Encode a DP-register instruction with a register-specified shift.
pub fn dp_reg_shift(
    c: u32,
    op: u32,
    s: u32,
    rn: u32,
    rd: u32,
    rm: u32,
    shift_type: u32,
    rs: u32,
) -> u32 {
    cond(c)
        | (op << 21)
        | (s << 20)
        | (rn << 16)
        | (rd << 12)
        | ((rs & 0xF) << 8)
        | ((shift_type & 0b11) << 5)
        | (1 << 4)
        | (rm & 0xF)
}

/// Encode a DP-immediate instruction (imm8 rotated by rotate*2).
pub fn dp_imm(c: u32, op: u32, s: u32, rn: u32, rd: u32, rotate: u32, imm8: u32) -> u32 {
    cond(c)
        | (1 << 25)
        | (op << 21)
        | (s << 20)
        | (rn << 16)
        | (rd << 12)
        | ((rotate & 0xF) << 8)
        | (imm8 & 0xFF)
}

// Multiply ----------------------------------------------------------

pub fn mul(c: u32, s: u32, rd: u32, rm: u32, rs: u32) -> u32 {
    cond(c) | (s << 20) | (rd << 16) | (rs << 8) | (0b1001 << 4) | rm
}

pub fn mla(c: u32, s: u32, rd: u32, rm: u32, rs: u32, rn: u32) -> u32 {
    cond(c) | (1 << 21) | (s << 20) | (rd << 16) | (rn << 12) | (rs << 8) | (0b1001 << 4) | rm
}

pub fn mull(c: u32, signed: u32, accumulate: u32, s: u32, rd_lo: u32, rd_hi: u32, rm: u32, rs: u32) -> u32 {
    cond(c)
        | (1 << 23)
        | (signed << 22)
        | (accumulate << 21)
        | (s << 20)
        | (rd_hi << 16)
        | (rd_lo << 12)
        | (rs << 8)
        | (0b1001 << 4)
        | rm
}

// Branch ------------------------------------------------------------

pub fn b(c: u32, offset_bytes: i32) -> u32 {
    // offset is in words, 24-bit signed. The ARM rule: target = PC+8+offset_bytes.
    let words = offset_bytes / 4;
    cond(c) | (0b101 << 25) | ((words as u32) & 0x00FF_FFFF)
}

pub fn bl(c: u32, offset_bytes: i32) -> u32 {
    let words = offset_bytes / 4;
    cond(c) | (0b101 << 25) | (1 << 24) | ((words as u32) & 0x00FF_FFFF)
}

pub fn bx(c: u32, rm: u32) -> u32 {
    cond(c) | 0x012F_FF10 | rm
}

pub fn blx_reg(c: u32, rm: u32) -> u32 {
    cond(c) | 0x012F_FF30 | rm
}

// Single data transfer ---------------------------------------------

#[allow(clippy::too_many_arguments)]
pub fn ldr_str_imm(
    c: u32,
    load: u32,
    byte: u32,
    pre: u32,
    up: u32,
    writeback: u32,
    rn: u32,
    rd: u32,
    imm12: u32,
) -> u32 {
    cond(c)
        | (0b01 << 26)
        | (pre << 24)
        | (up << 23)
        | (byte << 22)
        | (writeback << 21)
        | (load << 20)
        | (rn << 16)
        | (rd << 12)
        | (imm12 & 0xFFF)
}

#[allow(clippy::too_many_arguments)]
pub fn ldr_str_reg(
    c: u32,
    load: u32,
    byte: u32,
    pre: u32,
    up: u32,
    writeback: u32,
    rn: u32,
    rd: u32,
    rm: u32,
    shift_type: u32,
    shift_amount: u32,
) -> u32 {
    cond(c)
        | (0b011 << 25)
        | (pre << 24)
        | (up << 23)
        | (byte << 22)
        | (writeback << 21)
        | (load << 20)
        | (rn << 16)
        | (rd << 12)
        | ((shift_amount & 0x1F) << 7)
        | ((shift_type & 0b11) << 5)
        | rm
}

// Halfword transfer ------------------------------------------------

#[allow(clippy::too_many_arguments)]
pub fn ldrh_strh_imm(
    c: u32,
    load: u32,
    sh: u32, // 0b01 halfword, 0b10 signed byte, 0b11 signed halfword
    pre: u32,
    up: u32,
    writeback: u32,
    rn: u32,
    rd: u32,
    imm8: u32,
) -> u32 {
    let hi = (imm8 >> 4) & 0xF;
    let lo = imm8 & 0xF;
    cond(c)
        | (pre << 24)
        | (up << 23)
        | (1 << 22) // I = 1 (immediate offset)
        | (writeback << 21)
        | (load << 20)
        | (rn << 16)
        | (rd << 12)
        | (hi << 8)
        | (1 << 7)
        | (sh << 5)
        | (1 << 4)
        | lo
}

// Block transfer ---------------------------------------------------

#[allow(clippy::too_many_arguments)]
pub fn ldm_stm(
    c: u32,
    load: u32,
    pre: u32,
    up: u32,
    s_bit: u32,
    writeback: u32,
    rn: u32,
    reg_list: u16,
) -> u32 {
    cond(c)
        | (0b100 << 25)
        | (pre << 24)
        | (up << 23)
        | (s_bit << 22)
        | (writeback << 21)
        | (load << 20)
        | (rn << 16)
        | (reg_list as u32)
}
