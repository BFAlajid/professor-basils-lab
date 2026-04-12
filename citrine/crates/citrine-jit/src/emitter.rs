//! Stub WASM emitter.
//!
//! Phase 1 produces a minimal but valid WASM module with one exported function
//! `run` that returns the basic block's instruction count as an `i32`. This is
//! enough to validate the host integration path: the host instantiates the
//! module via `WebAssembly.compile`, calls `run`, and asserts the return
//! matches the expected sentinel.
//!
//! Phase 2 will replace the stub body with real ARM-to-WASM lowering: each
//! instruction in the block becomes a sequence of WASM ops over a flat
//! `i32x16` register file plus calls back into host helpers for memory access.

use crate::basic_block::BasicBlock;

/// Section IDs from the WebAssembly binary format.
mod section {
    pub const TYPE: u8 = 1;
    pub const FUNCTION: u8 = 3;
    pub const EXPORT: u8 = 7;
    pub const CODE: u8 = 10;
}

/// WASM type-marker bytes used by this stub.
mod ty {
    /// `i32`
    pub const I32: u8 = 0x7F;
    /// Function type prefix
    pub const FUNC: u8 = 0x60;
}

/// WASM instruction opcodes used by the stub body.
mod op {
    pub const I32_CONST: u8 = 0x41;
    pub const END: u8 = 0x0B;
}

/// Export-kind tags.
mod export_kind {
    pub const FUNCTION: u8 = 0x00;
}

/// Stub WASM emitter. Stateless — kept as a struct so Phase 2 can attach
/// configuration (register layout, helper function indices, ...).
pub struct WasmEmitter;

impl WasmEmitter {
    pub fn new() -> Self {
        Self
    }

    /// Produce a valid WASM module from a basic block. Currently emits a
    /// stub function that returns the block's instruction count.
    pub fn emit(&self, block: &BasicBlock) -> Vec<u8> {
        let mut out = Vec::with_capacity(64);

        // Magic: \0asm
        out.extend_from_slice(&[0x00, 0x61, 0x73, 0x6D]);
        // Version: 1
        out.extend_from_slice(&[0x01, 0x00, 0x00, 0x00]);

        emit_type_section(&mut out);
        emit_function_section(&mut out);
        emit_export_section(&mut out);
        emit_code_section(&mut out, block.length as i32);

        out
    }
}

impl Default for WasmEmitter {
    fn default() -> Self {
        Self::new()
    }
}

/// Type section: one type, `() -> i32`.
fn emit_type_section(out: &mut Vec<u8>) {
    let mut payload: Vec<u8> = Vec::new();
    write_uleb128(&mut payload, 1); // 1 type
    payload.push(ty::FUNC);
    write_uleb128(&mut payload, 0); // 0 params
    write_uleb128(&mut payload, 1); // 1 result
    payload.push(ty::I32);
    write_section(out, section::TYPE, &payload);
}

/// Function section: one function with type index 0.
fn emit_function_section(out: &mut Vec<u8>) {
    let mut payload: Vec<u8> = Vec::new();
    write_uleb128(&mut payload, 1); // 1 function
    write_uleb128(&mut payload, 0); // type index 0
    write_section(out, section::FUNCTION, &payload);
}

/// Export section: one export named "run" pointing at function index 0.
fn emit_export_section(out: &mut Vec<u8>) {
    let mut payload: Vec<u8> = Vec::new();
    payload.push(1); // 1 export
    let name = b"run";
    write_uleb128(&mut payload, name.len() as u64);
    payload.extend_from_slice(name);
    payload.push(export_kind::FUNCTION);
    write_uleb128(&mut payload, 0); // function index 0
    write_section(out, section::EXPORT, &payload);
}

/// Code section: one function body that pushes `instruction_count` and ends.
fn emit_code_section(out: &mut Vec<u8>, instruction_count: i32) {
    // Function body: 0 locals, i32.const N, end.
    let mut body: Vec<u8> = Vec::new();
    write_uleb128(&mut body, 0); // 0 local declarations
    body.push(op::I32_CONST);
    write_sleb128_i32(&mut body, instruction_count);
    body.push(op::END);

    let mut payload: Vec<u8> = Vec::new();
    write_uleb128(&mut payload, 1); // 1 function body
    write_uleb128(&mut payload, body.len() as u64);
    payload.extend_from_slice(&body);

    write_section(out, section::CODE, &payload);
}

/// Push `[id, len(payload), payload...]` onto `out`.
fn write_section(out: &mut Vec<u8>, id: u8, payload: &[u8]) {
    out.push(id);
    write_uleb128(out, payload.len() as u64);
    out.extend_from_slice(payload);
}

/// Unsigned LEB128 encoder.
fn write_uleb128(out: &mut Vec<u8>, mut value: u64) {
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
            out.push(byte);
        } else {
            out.push(byte);
            return;
        }
    }
}

/// Signed LEB128 encoder for `i32`. WASM's `i32.const` immediate is a signed
/// LEB128, so we use this rather than uleb128 to keep the module valid even
/// when the instruction count exceeds 63.
fn write_sleb128_i32(out: &mut Vec<u8>, value: i32) {
    let mut value = value as i64;
    loop {
        let byte = (value & 0x7F) as u8;
        // Signed shift retains the sign bit.
        value >>= 7;
        let sign_bit = byte & 0x40;
        let done = (value == 0 && sign_bit == 0) || (value == -1 && sign_bit != 0);
        if done {
            out.push(byte);
            return;
        }
        out.push(byte | 0x80);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::basic_block::BasicBlock;
    use citrine_cpu::types::{Condition, DataOp, DecodedInstruction, ShifterOperand};

    /// Build a small `BasicBlock` with `n` synthetic MOV-immediate instructions.
    fn make_block(start_pc: u32, n: u32) -> BasicBlock {
        let instr = DecodedInstruction::DataProcessing {
            cond: Condition::Al,
            op: DataOp::Mov,
            set_flags: false,
            rn: 0,
            rd: 0,
            operand: ShifterOperand::Immediate { imm8: 1, rotate: 0 },
        };
        BasicBlock {
            start_pc,
            instructions: vec![instr; n as usize],
            length: n,
            terminates_with_branch: false,
        }
    }

    #[test]
    fn emit_produces_wasm_magic() {
        let e = WasmEmitter::new();
        let bytes = e.emit(&make_block(0, 3));
        assert!(bytes.len() >= 8);
        // \0asm, version 1
        assert_eq!(&bytes[0..4], &[0x00, 0x61, 0x73, 0x6D]);
        assert_eq!(&bytes[4..8], &[0x01, 0x00, 0x00, 0x00]);
    }

    #[test]
    fn emit_block_size_in_body() {
        let e = WasmEmitter::new();
        let bytes = e.emit(&make_block(0, 5));
        // The i32.const opcode (0x41) followed by sleb128(5) = 0x05, then end (0x0B),
        // should appear near the end of the stream.
        let n = bytes.len();
        assert_eq!(bytes[n - 3], op::I32_CONST);
        assert_eq!(bytes[n - 2], 0x05);
        assert_eq!(bytes[n - 1], op::END);
    }

    #[test]
    fn emitted_module_validates() {
        let e = WasmEmitter::new();
        let bytes = e.emit(&make_block(0, 1));
        // Minimal validation: the module starts with the WASM magic + version.
        assert_eq!(&bytes[0..8], &[0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00]);
        // It should also contain the four required section IDs in order.
        let positions: Vec<usize> = [section::TYPE, section::FUNCTION, section::EXPORT, section::CODE]
            .iter()
            .map(|id| bytes.iter().position(|b| *b == *id).expect("section present"))
            .collect();
        for w in positions.windows(2) {
            assert!(w[0] < w[1], "sections must appear in order");
        }
    }

    #[test]
    fn emit_contains_run_export_name() {
        let e = WasmEmitter::new();
        let bytes = e.emit(&make_block(0, 2));
        // "run" as raw bytes should appear in the export section.
        let needle = b"run";
        let found = bytes.windows(needle.len()).any(|w| w == needle);
        assert!(found, "expected 'run' export name in module bytes");
    }

    #[test]
    fn emit_zero_length_block() {
        let e = WasmEmitter::new();
        let bytes = e.emit(&make_block(0, 0));
        // Even a zero-length block must produce a valid module with i32.const 0.
        assert_eq!(&bytes[0..4], &[0x00, 0x61, 0x73, 0x6D]);
        let n = bytes.len();
        assert_eq!(bytes[n - 3], op::I32_CONST);
        assert_eq!(bytes[n - 2], 0x00);
        assert_eq!(bytes[n - 1], op::END);
    }

    #[test]
    fn emit_large_block_uses_multibyte_leb128() {
        let e = WasmEmitter::new();
        // 200 instructions — 200 in sleb128 takes 2 bytes (0xC8 0x01).
        let bytes = e.emit(&make_block(0, 200));
        // Walk back from end: end byte, then 2-byte sleb, then i32.const opcode.
        let n = bytes.len();
        assert_eq!(bytes[n - 1], op::END);
        // sleb128(200): 200 = 0b1100_1000. low7 = 0b1001000 = 0x48; remaining = 0b1.
        // Sign bit of low7 is 1, so we keep going. Next byte = 0b0000001 = 0x01.
        // First byte gets continuation: 0xC8.
        assert_eq!(bytes[n - 3], 0xC8);
        assert_eq!(bytes[n - 2], 0x01);
        assert_eq!(bytes[n - 4], op::I32_CONST);
    }

    #[test]
    fn write_uleb128_smoketest() {
        let mut buf = Vec::new();
        write_uleb128(&mut buf, 0);
        write_uleb128(&mut buf, 127);
        write_uleb128(&mut buf, 128);
        // 0 → [0x00], 127 → [0x7F], 128 → [0x80, 0x01]
        assert_eq!(buf, vec![0x00, 0x7F, 0x80, 0x01]);
    }

    #[test]
    fn write_sleb128_smoketest() {
        let mut buf = Vec::new();
        write_sleb128_i32(&mut buf, 0);
        write_sleb128_i32(&mut buf, 63);
        write_sleb128_i32(&mut buf, 64);
        // 0 → [0x00], 63 → [0x3F], 64 → [0xC0, 0x00] (sign bit forces second byte)
        assert_eq!(buf, vec![0x00, 0x3F, 0xC0, 0x00]);
    }
}
