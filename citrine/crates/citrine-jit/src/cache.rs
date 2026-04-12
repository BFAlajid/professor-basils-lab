//! Translation cache.
//!
//! Maps a basic-block start PC to the WASM module bytes the emitter produced
//! for it. The host (citrine-web) is responsible for actually compiling the
//! bytes via `WebAssembly.compile` and stashing the resulting `Function`
//! reference; this crate only owns the byte-level artifact.
//!
//! Self-modifying code is handled by `invalidate_range`: the kernel calls in
//! whenever an instruction-cache flush spans previously-translated bytes, and
//! every block whose code window overlaps the range is dropped.

use std::collections::HashMap;

/// A WASM module produced from one ARM basic block.
#[derive(Debug, Clone)]
pub struct CompiledBlock {
    pub start_pc: u32,
    /// Length in ARM instructions (not bytes).
    pub instructions: u32,
    /// The generated WASM module bytes.
    pub wasm_bytes: Vec<u8>,
}

impl CompiledBlock {
    /// One past the last byte of the source ARM region.
    pub fn end_pc(&self) -> u32 {
        self.start_pc.wrapping_add(self.instructions.wrapping_mul(4))
    }
}

/// PC → compiled artifact.
pub struct TranslationCache {
    blocks: HashMap<u32, CompiledBlock>,
}

impl TranslationCache {
    pub fn new() -> Self {
        Self {
            blocks: HashMap::new(),
        }
    }

    pub fn insert(&mut self, block: CompiledBlock) {
        self.blocks.insert(block.start_pc, block);
    }

    pub fn get(&self, start_pc: u32) -> Option<&CompiledBlock> {
        self.blocks.get(&start_pc)
    }

    /// Drop the compiled artifact at exactly `start_pc`, if present.
    pub fn invalidate(&mut self, start_pc: u32) {
        self.blocks.remove(&start_pc);
    }

    /// Drop every compiled block whose source ARM range overlaps the byte
    /// window `[addr, addr + len)`. Used when self-modifying code or a DMA
    /// write touches translated memory.
    pub fn invalidate_range(&mut self, addr: u32, len: u32) {
        if len == 0 {
            return;
        }
        let range_end = addr.saturating_add(len);
        self.blocks.retain(|_, block| {
            let block_end = block.end_pc();
            // Disjoint if block_end <= addr OR block.start_pc >= range_end.
            block_end <= addr || block.start_pc >= range_end
        });
    }

    pub fn len(&self) -> usize {
        self.blocks.len()
    }

    pub fn is_empty(&self) -> bool {
        self.blocks.is_empty()
    }

    /// Iterate over every cached block.
    pub fn iter(&self) -> impl Iterator<Item = &CompiledBlock> {
        self.blocks.values()
    }

    /// Drop everything.
    pub fn clear(&mut self) {
        self.blocks.clear();
    }
}

impl Default for TranslationCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn block(start_pc: u32, instructions: u32) -> CompiledBlock {
        CompiledBlock {
            start_pc,
            instructions,
            wasm_bytes: vec![0xDE, 0xAD, 0xBE, 0xEF],
        }
    }

    #[test]
    fn new_cache_is_empty() {
        let c = TranslationCache::new();
        assert!(c.is_empty());
        assert_eq!(c.len(), 0);
    }

    #[test]
    fn insert_and_get() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        assert_eq!(c.len(), 1);
        let got = c.get(0x1000).expect("inserted block");
        assert_eq!(got.start_pc, 0x1000);
        assert_eq!(got.instructions, 4);
    }

    #[test]
    fn get_missing_returns_none() {
        let c = TranslationCache::new();
        assert!(c.get(0x1000).is_none());
    }

    #[test]
    fn insert_overwrites_same_pc() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.insert(block(0x1000, 8));
        assert_eq!(c.len(), 1);
        assert_eq!(c.get(0x1000).unwrap().instructions, 8);
    }

    #[test]
    fn invalidate() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.insert(block(0x2000, 4));
        c.invalidate(0x1000);
        assert!(c.get(0x1000).is_none());
        assert!(c.get(0x2000).is_some());
        assert_eq!(c.len(), 1);
    }

    #[test]
    fn invalidate_missing_is_noop() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.invalidate(0x9999);
        assert_eq!(c.len(), 1);
    }

    #[test]
    fn invalidate_range_drops_overlapping_blocks() {
        let mut c = TranslationCache::new();
        // Block A: 0x1000..0x1010 (4 instr)
        // Block B: 0x1010..0x1020
        // Block C: 0x2000..0x2010
        c.insert(block(0x1000, 4));
        c.insert(block(0x1010, 4));
        c.insert(block(0x2000, 4));

        // Invalidate the middle of block A
        c.invalidate_range(0x1004, 4);

        assert!(c.get(0x1000).is_none(), "block A should be dropped");
        assert!(c.get(0x1010).is_some(), "block B should remain");
        assert!(c.get(0x2000).is_some(), "block C should remain");
    }

    #[test]
    fn invalidate_range_drops_multiple_overlapping() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.insert(block(0x1010, 4));
        c.insert(block(0x2000, 4));

        // Invalidate from 0x1004 through 0x1014 — touches A and B.
        c.invalidate_range(0x1004, 0x14);

        assert!(c.get(0x1000).is_none());
        assert!(c.get(0x1010).is_none());
        assert!(c.get(0x2000).is_some());
    }

    #[test]
    fn invalidate_range_zero_length_is_noop() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.invalidate_range(0x1000, 0);
        assert_eq!(c.len(), 1);
    }

    #[test]
    fn invalidate_range_disjoint_keeps_blocks() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4)); // 0x1000..0x1010
        c.insert(block(0x2000, 4)); // 0x2000..0x2010
        c.invalidate_range(0x1010, 0xFF0); // 0x1010..0x2000
        // 0x1000 ends at 0x1010 — boundary touches but does not overlap.
        // 0x2000 begins at 0x2000 — also boundary.
        assert!(c.get(0x1000).is_some());
        assert!(c.get(0x2000).is_some());
    }

    #[test]
    fn iter_visits_all_blocks() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 1));
        c.insert(block(0x2000, 2));
        let count = c.iter().count();
        assert_eq!(count, 2);
    }

    #[test]
    fn clear_empties() {
        let mut c = TranslationCache::new();
        c.insert(block(0x1000, 4));
        c.insert(block(0x2000, 4));
        c.clear();
        assert!(c.is_empty());
    }

    #[test]
    fn compiled_block_end_pc() {
        let b = block(0x1000, 5);
        assert_eq!(b.end_pc(), 0x1000 + 5 * 4);
    }
}
