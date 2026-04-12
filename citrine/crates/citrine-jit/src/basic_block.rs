//! Basic block discovery — walks forward from a starting PC, decoding ARM
//! instructions until something writes PC, the decoder yields `Undefined`,
//! or `max_instructions` is reached.
//!
//! The IR stored in a block is just the sequence of `DecodedInstruction`s. The
//! emitter and the eventual ARM-to-WASM lowering both consume that sequence.

use citrine_cpu::types::DecodedInstruction;
use citrine_cpu::{decode, Bus};

/// PC is encoded as register R15 in ARM. A `BlockTransfer` reg_list with bit 15
/// set will load/store PC, which terminates the block.
const PC_REG: u8 = 15;
const PC_BIT_IN_REG_LIST: u16 = 1 << 15;

/// A linear sequence of decoded ARM instructions with no internal branches.
///
/// A block always starts at `start_pc`, contains `length` decoded instructions,
/// and either falls through to `start_pc + length * 4` or ends in a branch.
#[derive(Debug, Clone)]
pub struct BasicBlock {
    pub start_pc: u32,
    pub instructions: Vec<DecodedInstruction>,
    /// Number of instructions in the block. Equivalent to `instructions.len()`.
    pub length: u32,
    /// True if this block ends in a branch / unconditional PC write.
    pub terminates_with_branch: bool,
}

impl BasicBlock {
    /// Address one past the last instruction's word.
    pub fn end_pc(&self) -> u32 {
        self.start_pc.wrapping_add(self.length.wrapping_mul(4))
    }

    /// True if `addr` falls inside the byte range `[start_pc, end_pc())`.
    pub fn contains(&self, addr: u32) -> bool {
        addr >= self.start_pc && addr < self.end_pc()
    }
}

/// Returns true if `instr` ends a basic block.
fn is_terminator(instr: &DecodedInstruction) -> bool {
    match instr {
        DecodedInstruction::Branch { .. } => true,
        DecodedInstruction::BranchExchange { .. } => true,
        DecodedInstruction::BlockTransfer { reg_list, .. } => {
            (*reg_list & PC_BIT_IN_REG_LIST) != 0
        }
        DecodedInstruction::DataProcessing { rd, op, .. } => {
            // A test op (TST/TEQ/CMP/CMN) does not write rd even when rd==15
            // in the encoding, so it is not a PC-writing terminator.
            *rd == PC_REG && !op.is_test()
        }
        DecodedInstruction::SingleDataTransfer { load, rd, .. } => {
            // Only LDR into PC counts as a PC write. STR with rd=15 is fine
            // (it stores PC+8 to memory) but does not redirect control flow.
            *load && *rd == PC_REG
        }
        DecodedInstruction::HalfwordDataTransfer { load, rd, .. } => {
            *load && *rd == PC_REG
        }
        DecodedInstruction::Undefined { .. } => true,
        // SVC enters an exception handler — control transfers out of the block.
        DecodedInstruction::SoftwareInterrupt { .. } => true,
        _ => false,
    }
}

/// Walk forward from `start_pc` decoding instructions until a branch,
/// undefined instruction, or `max_instructions` is reached.
///
/// `start_pc` is rounded down to a 4-byte boundary; the resulting block is
/// always word-aligned.
pub fn discover_block<B: Bus>(
    bus: &mut B,
    start_pc: u32,
    max_instructions: u32,
) -> BasicBlock {
    let aligned_start = start_pc & !3;
    let mut instructions: Vec<DecodedInstruction> = Vec::new();
    let mut terminates_with_branch = false;

    if max_instructions == 0 {
        return BasicBlock {
            start_pc: aligned_start,
            instructions,
            length: 0,
            terminates_with_branch: false,
        };
    }

    let mut pc = aligned_start;
    for _ in 0..max_instructions {
        let raw = bus.read32(pc);
        let decoded = decode(raw);
        let terminates = is_terminator(&decoded);
        instructions.push(decoded);
        if terminates {
            terminates_with_branch = true;
            break;
        }
        pc = pc.wrapping_add(4);
    }

    let length = instructions.len() as u32;
    BasicBlock {
        start_pc: aligned_start,
        instructions,
        length,
        terminates_with_branch,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use citrine_cpu::Bus;

    /// Minimal in-memory bus for tests. Avoids depending on citrine-core.
    struct TestBus {
        ram: Vec<u8>,
    }

    impl TestBus {
        fn new(size: usize) -> Self {
            Self { ram: vec![0; size] }
        }

        fn write_word(&mut self, addr: u32, word: u32) {
            let bytes = word.to_le_bytes();
            for (i, b) in bytes.iter().enumerate() {
                self.ram[addr as usize + i] = *b;
            }
        }
    }

    impl Bus for TestBus {
        fn read8(&mut self, addr: u32) -> u8 {
            *self.ram.get(addr as usize).unwrap_or(&0)
        }
        fn read16(&mut self, addr: u32) -> u16 {
            u16::from_le_bytes([self.read8(addr), self.read8(addr.wrapping_add(1))])
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

    /// Encode `MOV Rd, #imm` (AL, S=0, rotate=0).
    fn mov_imm(rd: u8, imm: u8) -> u32 {
        0xE3A0_0000 | ((rd as u32) << 12) | imm as u32
    }

    /// Encode `ADD Rd, Rn, Rm` (AL, S=0).
    fn add_reg(rd: u8, rn: u8, rm: u8) -> u32 {
        0xE080_0000 | ((rn as u32) << 16) | ((rd as u32) << 12) | rm as u32
    }

    /// Encode `B label` with a relative byte offset (target = PC+8 + offset).
    /// Uses an offset of -8 (branch to self) for simplicity.
    fn branch_self() -> u32 {
        // EA = AL + 1010, branch with link=0
        // 24-bit offset of 0xFFFFFE = -2 words = -8 bytes from PC+8 → branches to self
        0xEAFF_FFFE
    }

    /// Encode `BX Rm`.
    fn bx(rm: u8) -> u32 {
        0xE12F_FF10 | rm as u32
    }

    /// Encode `LDM Rn!, {regs}` (Increment After, writeback).
    /// `reg_list` is a 16-bit mask, bit N = R N.
    fn ldm_ia_wb(rn: u8, reg_list: u16) -> u32 {
        // cond=AL(E), 100=block xfer class, P=0, U=1, S=0, W=1, L=1, Rn, list
        0xE8B0_0000 | ((rn as u32) << 16) | reg_list as u32
    }

    /// Encode `STM Rn!, {regs}` (Increment After, writeback).
    fn stm_ia_wb(rn: u8, reg_list: u16) -> u32 {
        0xE8A0_0000 | ((rn as u32) << 16) | reg_list as u32
    }

    /// Encode an undefined word that the decoder rejects (coprocessor SWI = class 111).
    fn undefined_word() -> u32 {
        // SWI: class 111, condition AL, anything in low bits.
        0xEF00_0000
    }

    #[test]
    fn discover_block_stops_at_branch() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(0, 1));
        bus.write_word(0x04, mov_imm(1, 2));
        bus.write_word(0x08, branch_self());
        bus.write_word(0x0C, mov_imm(2, 3)); // should NOT be in the block

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.start_pc, 0);
        assert_eq!(block.length, 3);
        assert_eq!(block.instructions.len(), 3);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_stops_at_max() {
        let mut bus = TestBus::new(0x100);
        // 5 straight-line MOVs, no branches.
        for i in 0..5u32 {
            bus.write_word(i * 4, mov_imm(i as u8, i as u8));
        }
        let block = discover_block(&mut bus, 0, 3);
        assert_eq!(block.length, 3);
        assert!(!block.terminates_with_branch);
    }

    #[test]
    fn discover_block_includes_pc_write() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(0, 1));
        // ADD r15, r0, r0 — writes PC, terminates the block
        bus.write_word(0x04, add_reg(15, 0, 0));
        bus.write_word(0x08, mov_imm(2, 2)); // unreachable in this block

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 2);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_stops_at_bx() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(14, 0));
        bus.write_word(0x04, bx(14));
        bus.write_word(0x08, mov_imm(0, 0));

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 2);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_stops_at_ldm_with_pc() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(0, 1));
        // LDM r13!, {r0, r15} — pops PC, terminates
        bus.write_word(0x04, ldm_ia_wb(13, 0b1000_0000_0000_0001));
        bus.write_word(0x08, mov_imm(1, 1));

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 2);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_continues_through_ldm_without_pc() {
        let mut bus = TestBus::new(0x100);
        // LDM r13!, {r0, r1} — no PC, does NOT terminate
        bus.write_word(0x00, ldm_ia_wb(13, 0b0000_0000_0000_0011));
        bus.write_word(0x04, mov_imm(2, 2));
        bus.write_word(0x08, branch_self());

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 3);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_stops_at_stm_with_pc() {
        let mut bus = TestBus::new(0x100);
        // STM r13!, {r0, r15}. Per spec: "BlockTransfer containing PC in the register
        // list" ends a block — even for stores. STM with PC reads PC+8, which is
        // awkward to translate, so we conservatively terminate.
        bus.write_word(0x00, stm_ia_wb(13, 0b1000_0000_0000_0001));
        bus.write_word(0x04, mov_imm(0, 0));

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 1);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_stops_at_undefined() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(0, 0));
        bus.write_word(0x04, undefined_word());
        bus.write_word(0x08, mov_imm(1, 1));

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 2);
        assert!(block.terminates_with_branch);
    }

    #[test]
    fn discover_block_aligns_start_pc() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, mov_imm(0, 0));
        bus.write_word(0x04, branch_self());

        // Pass an unaligned PC; the function should round down.
        let block = discover_block(&mut bus, 0x02, 16);
        assert_eq!(block.start_pc, 0);
    }

    #[test]
    fn discover_block_zero_max_returns_empty() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, branch_self());
        let block = discover_block(&mut bus, 0, 0);
        assert_eq!(block.length, 0);
        assert!(block.instructions.is_empty());
        assert!(!block.terminates_with_branch);
    }

    #[test]
    fn end_pc_and_contains() {
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x10, mov_imm(0, 0));
        bus.write_word(0x14, mov_imm(1, 1));
        bus.write_word(0x18, branch_self());

        let block = discover_block(&mut bus, 0x10, 16);
        assert_eq!(block.length, 3);
        assert_eq!(block.end_pc(), 0x10 + 3 * 4);
        assert!(block.contains(0x10));
        assert!(block.contains(0x18));
        assert!(!block.contains(0x10 + 3 * 4));
        assert!(!block.contains(0x0C));
    }

    #[test]
    fn cmp_with_pc_in_rd_field_does_not_terminate() {
        // CMP rd=15, rn=0, #1. The CMP opcode is a test op — it does not write
        // rd even though the encoding carries one. is_terminator() must not
        // promote this to a PC write.
        let mut bus = TestBus::new(0x100);
        bus.write_word(0x00, 0xE350_F001);
        bus.write_word(0x04, mov_imm(2, 2));
        bus.write_word(0x08, branch_self());

        let block = discover_block(&mut bus, 0, 16);
        assert_eq!(block.length, 3);
        assert!(block.terminates_with_branch);
    }
}
