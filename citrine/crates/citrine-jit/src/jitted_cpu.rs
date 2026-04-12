//! Tiered execution wrapper around `citrine_cpu::Cpu`.
//!
//! Phase 1 wires the existing JIT building blocks into a real
//! profile→discover→compile→cache pipeline. The interpreter still executes
//! every instruction; compiled WASM modules are produced and stored but
//! never invoked. Phase 2 will replace the interpreter call with a
//! `WebAssembly.Instance.exports.run()` call when a hot block is reached.

use citrine_cpu::{Bus, Cpu, ExecResult};

use crate::basic_block::discover_block;
use crate::cache::{CompiledBlock, TranslationCache};
use crate::emitter::WasmEmitter;
use crate::profiler::HotPathProfiler;

/// Stats reported by `JittedCpu` for tests and the frontend.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct JitStats {
    /// Total instructions executed (== `cpu.cycles` is wrong because
    /// some instructions take multiple cycles; this is a step count).
    pub steps: u64,
    /// Number of unique PCs that have been promoted to hot status.
    pub hot_blocks: u64,
    /// Number of basic blocks compiled and inserted into the cache.
    pub blocks_compiled: u64,
    /// Number of cache hits (a step where the upcoming PC was already in
    /// the translation cache). The interpreter still ran — this just
    /// reports that the JIT *would* have dispatched.
    pub cache_hits: u64,
}

/// Tiered-execution wrapper. Owns its own `Cpu`, profiler, cache and emitter.
pub struct JittedCpu {
    pub cpu: Cpu,
    profiler: HotPathProfiler,
    cache: TranslationCache,
    emitter: WasmEmitter,
    stats: JitStats,
    /// Maximum instructions to include when discovering a hot block.
    pub max_block_size: u32,
}

impl JittedCpu {
    /// Build a JittedCpu with the given hot threshold (e.g., 10 = compile after
    /// 10 executions of the same PC).
    pub fn new(threshold: u64) -> Self {
        Self {
            cpu: Cpu::new(),
            profiler: HotPathProfiler::new(threshold),
            cache: TranslationCache::new(),
            emitter: WasmEmitter::new(),
            stats: JitStats::default(),
            max_block_size: 64,
        }
    }

    /// Reset state. Clears cache, profiler, stats. PC = `entry_pc`.
    pub fn reset(&mut self, entry_pc: u32) {
        self.cpu.reset(entry_pc);
        self.profiler.clear();
        self.cache.clear();
        self.stats = JitStats::default();
    }

    /// Step exactly one instruction. The interpreter always runs; on the
    /// promotion edge of a PC, also discovers + compiles + caches the block.
    pub fn step<B: Bus>(&mut self, bus: &mut B) -> ExecResult {
        let pc = self.cpu.regs.pc();

        // Cache lookup — for stats only in Phase 1; the interpreter runs
        // either way.
        if self.cache.get(pc).is_some() {
            self.stats.cache_hits += 1;
        }

        // Profile this PC. If `record` returns true, we just promoted it.
        let promoted = self.profiler.record(pc);
        if promoted {
            self.stats.hot_blocks += 1;
            // Only discover + compile if we haven't already cached this block.
            if self.cache.get(pc).is_none() {
                let block = discover_block(bus, pc, self.max_block_size);
                let wasm_bytes = self.emitter.emit(&block);
                self.cache.insert(CompiledBlock {
                    start_pc: block.start_pc,
                    instructions: block.length,
                    wasm_bytes,
                });
                self.stats.blocks_compiled += 1;
            }
        }

        // Always run the interpreter.
        let result = self.cpu.step(bus);
        self.stats.steps += 1;
        result
    }

    /// Run up to `max_steps` instructions through the JIT-aware step.
    /// Stops on the same spin-trap rule as `Cpu::run`.
    pub fn run<B: Bus>(&mut self, bus: &mut B, max_steps: u32) -> u32 {
        let mut executed = 0;
        let mut last_pc = self.cpu.regs.pc().wrapping_sub(1);
        while executed < max_steps {
            let pc = self.cpu.regs.pc();
            if pc == last_pc {
                break;
            }
            last_pc = pc;
            self.step(bus);
            executed += 1;
        }
        executed
    }

    /// Read-only stats accessor.
    pub fn stats(&self) -> JitStats {
        self.stats
    }

    /// Read-only cache accessor (for test introspection and the frontend).
    pub fn cache(&self) -> &TranslationCache {
        &self.cache
    }

    /// Force-invalidate a cached block. Used when self-modifying code is
    /// detected by an external memory watchpoint.
    pub fn invalidate(&mut self, start_pc: u32) {
        self.cache.invalidate(start_pc);
    }

    /// Invalidate every cached block whose source bytes overlap [addr, addr+len).
    pub fn invalidate_range(&mut self, addr: u32, len: u32) {
        self.cache.invalidate_range(addr, len);
    }

    /// Returns true if the PC is currently considered hot.
    pub fn is_hot(&self, pc: u32) -> bool {
        self.profiler.is_hot(pc)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal in-memory bus for tests. Mirrors the ones in basic_block/cpu,
    /// kept local so this test module has no dependency on citrine-core.
    struct TestBus {
        ram: Vec<u8>,
    }

    impl TestBus {
        fn new(size: usize) -> Self {
            Self { ram: vec![0; size] }
        }

        fn load(&mut self, base: u32, words: &[u32]) {
            let mut a = base as usize;
            for w in words {
                self.ram[a..a + 4].copy_from_slice(&w.to_le_bytes());
                a += 4;
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

    /// Encode `B .` (branch to self — offset = -8 from PC+8).
    fn b_self() -> u32 {
        0xEAFF_FFFEu32
    }

    // 1 — a freshly built JittedCpu reports zeros everywhere.
    #[test]
    fn new_cpu_has_default_stats() {
        let jit = JittedCpu::new(5);
        let s = jit.stats();
        assert_eq!(s.steps, 0);
        assert_eq!(s.hot_blocks, 0);
        assert_eq!(s.blocks_compiled, 0);
        assert_eq!(s.cache_hits, 0);
        assert!(jit.cache().is_empty());
    }

    // 2 — each step increments the step counter by one.
    #[test]
    fn step_increments_step_counter() {
        let mut jit = JittedCpu::new(1000); // high threshold, no promotion
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[mov_imm(0, 1), mov_imm(1, 2), mov_imm(2, 3)]);
        jit.reset(0);
        jit.step(&mut bus);
        jit.step(&mut bus);
        jit.step(&mut bus);
        assert_eq!(jit.stats().steps, 3);
    }

    // 3 — with a high threshold, no compilation happens.
    #[test]
    fn cold_step_does_not_compile() {
        let mut jit = JittedCpu::new(1000);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[mov_imm(0, 1), mov_imm(1, 2)]);
        jit.reset(0);
        jit.step(&mut bus);
        jit.step(&mut bus);
        assert_eq!(jit.stats().blocks_compiled, 0);
        assert_eq!(jit.stats().hot_blocks, 0);
        assert!(jit.cache().is_empty());
    }

    // 4 — crossing the threshold compiles the block.
    #[test]
    fn promotion_at_threshold_compiles_block() {
        // threshold=0 → the first record() promotes immediately.
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        // A self-branch at PC=0 keeps us pointing at the same PC.
        bus.load(0, &[b_self()]);
        jit.reset(0);
        jit.step(&mut bus);
        assert_eq!(jit.stats().hot_blocks, 1);
        assert_eq!(jit.stats().blocks_compiled, 1);
    }

    // 5 — after promotion, the block is in the translation cache.
    #[test]
    fn promoted_block_is_in_cache() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[mov_imm(0, 1), b_self()]);
        jit.reset(0);
        jit.step(&mut bus);
        assert!(jit.cache().get(0).is_some());
    }

    // 6 — the compiled block's bytes begin with the WASM magic + version.
    #[test]
    fn compiled_block_starts_with_wasm_magic() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[mov_imm(0, 1), b_self()]);
        jit.reset(0);
        jit.step(&mut bus);
        let block = jit.cache().get(0).expect("compiled block at 0");
        assert!(block.wasm_bytes.len() >= 8);
        assert_eq!(&block.wasm_bytes[0..4], &[0x00, 0x61, 0x73, 0x6D]);
        assert_eq!(&block.wasm_bytes[4..8], &[0x01, 0x00, 0x00, 0x00]);
    }

    // 7 — once a block is cached, subsequent steps at that PC bump cache_hits.
    #[test]
    fn cache_hit_counter_increments() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        // A self-branch keeps the PC parked at 0 so we hit the cached entry
        // on every subsequent step.
        bus.load(0, &[b_self()]);
        jit.reset(0);
        jit.step(&mut bus); // promotes + compiles; cache was empty at entry
        assert_eq!(jit.stats().cache_hits, 0);
        jit.step(&mut bus); // now cache_hits should fire
        jit.step(&mut bus);
        assert_eq!(jit.stats().cache_hits, 2);
    }

    // 8 — execution below threshold never promotes anything.
    #[test]
    fn running_below_threshold_does_not_promote() {
        let mut jit = JittedCpu::new(10);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[mov_imm(0, 1), mov_imm(1, 2), mov_imm(2, 3)]);
        jit.reset(0);
        for _ in 0..3 {
            jit.step(&mut bus);
        }
        // Each PC seen exactly once — none should cross threshold=10.
        assert_eq!(jit.stats().hot_blocks, 0);
        assert_eq!(jit.stats().blocks_compiled, 0);
        assert!(!jit.is_hot(0));
    }

    // 9 — hitting the same PC above threshold only promotes it once.
    #[test]
    fn running_above_threshold_promotes_once_per_pc() {
        // Self-branch parks the PC at 0. threshold=5 → promotes on the 5th record.
        let mut jit = JittedCpu::new(5);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[b_self()]);
        jit.reset(0);
        for _ in 0..20 {
            jit.step(&mut bus);
        }
        assert_eq!(jit.stats().hot_blocks, 1);
        assert_eq!(jit.stats().blocks_compiled, 1);
        assert_eq!(jit.cache().len(), 1);
    }

    // 10 — two distinct hot PCs each produce their own compiled block.
    #[test]
    fn multiple_distinct_hot_pcs_compile_separately() {
        // threshold=0 → every unique PC we hit promotes immediately.
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        // A program that runs three MOVs then hits a self-branch.
        bus.load(
            0,
            &[mov_imm(0, 1), mov_imm(1, 2), mov_imm(2, 3), b_self()],
        );
        jit.reset(0);
        for _ in 0..10 {
            jit.step(&mut bus);
        }
        // We visit PCs 0x00, 0x04, 0x08, 0x0C — four unique PCs, so four
        // promotions and four compiled blocks.
        assert_eq!(jit.stats().hot_blocks, 4);
        assert_eq!(jit.stats().blocks_compiled, 4);
        assert_eq!(jit.cache().len(), 4);
        assert!(jit.cache().get(0x00).is_some());
        assert!(jit.cache().get(0x04).is_some());
        assert!(jit.cache().get(0x08).is_some());
        assert!(jit.cache().get(0x0C).is_some());
    }

    // 11 — invalidate() drops the cached block at exactly start_pc.
    #[test]
    fn invalidate_drops_cached_block() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[b_self()]);
        jit.reset(0);
        jit.step(&mut bus);
        assert!(jit.cache().get(0).is_some());
        jit.invalidate(0);
        assert!(jit.cache().get(0).is_none());
    }

    // 12 — invalidate_range() drops every cached block that overlaps the window.
    #[test]
    fn invalidate_range_drops_overlapping_blocks() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x200);
        bus.load(
            0,
            &[mov_imm(0, 1), mov_imm(1, 2), mov_imm(2, 3), b_self()],
        );
        jit.reset(0);
        for _ in 0..6 {
            jit.step(&mut bus);
        }
        // Four blocks cached at 0x00, 0x04, 0x08, 0x0C.
        assert_eq!(jit.cache().len(), 4);
        // Invalidate the byte window [0x04, 0x0C) — should drop the blocks
        // whose source ranges intersect that window.
        jit.invalidate_range(0x04, 0x08);
        // At minimum the block starting at 0x04 must be gone.
        assert!(jit.cache().get(0x04).is_none());
        // And the cache has fewer entries than before.
        assert!(jit.cache().len() < 4);
    }

    // 13 — reset() returns the JIT to a pristine state.
    #[test]
    fn reset_clears_cache_profiler_and_stats() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[b_self()]);
        jit.reset(0);
        for _ in 0..3 {
            jit.step(&mut bus);
        }
        assert!(jit.stats().steps > 0);
        assert!(!jit.cache().is_empty());
        assert!(jit.is_hot(0));

        jit.reset(0);
        assert_eq!(jit.stats(), JitStats::default());
        assert!(jit.cache().is_empty());
        assert!(!jit.is_hot(0));
    }

    // 14 — is_hot() reflects profiler state after promotion.
    #[test]
    fn is_hot_after_promotion() {
        let mut jit = JittedCpu::new(3);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[b_self()]);
        jit.reset(0);
        assert!(!jit.is_hot(0));
        jit.step(&mut bus);
        jit.step(&mut bus);
        assert!(!jit.is_hot(0));
        jit.step(&mut bus); // third step → count=3 ≥ threshold=3 → hot
        assert!(jit.is_hot(0));
    }

    // 15 — run() terminates on the spin-trap (same PC twice in a row).
    #[test]
    fn run_terminates_on_self_branch() {
        let mut jit = JittedCpu::new(1000);
        let mut bus = TestBus::new(0x100);
        bus.load(0, &[b_self()]);
        jit.reset(0);
        let executed = jit.run(&mut bus, 100);
        // Spin-trap mirrors Cpu::run exactly: 1 step, then the loop condition
        // stops us before step #2 because the PC already matches last_pc.
        assert!(executed <= 2);
        assert_eq!(jit.cpu.regs.pc(), 0);
    }

    // 16 — straight-line code runs for exactly max_steps (or until it falls
    // off the end into a zero word, which the CPU decodes + spin-traps on).
    #[test]
    fn run_executes_up_to_max_steps() {
        let mut jit = JittedCpu::new(1000);
        let mut bus = TestBus::new(0x100);
        bus.load(
            0,
            &[
                mov_imm(0, 1),
                mov_imm(1, 2),
                mov_imm(2, 3),
                mov_imm(3, 4),
                mov_imm(4, 5),
            ],
        );
        jit.reset(0);
        let executed = jit.run(&mut bus, 5);
        assert_eq!(executed, 5);
        assert_eq!(jit.stats().steps, 5);
    }

    // 17 — run() never exceeds the requested max_steps.
    #[test]
    fn run_caps_step_counter() {
        let mut jit = JittedCpu::new(1000);
        let mut bus = TestBus::new(0x400);
        // Fill RAM with MOVs so the PC advances linearly.
        let mut words = Vec::new();
        for i in 0..100u8 {
            words.push(mov_imm(0, i));
        }
        bus.load(0, &words);
        jit.reset(0);
        let executed = jit.run(&mut bus, 4);
        assert_eq!(executed, 4);
        assert_eq!(jit.stats().steps, 4);
    }

    // 18 — the compiled block records the correct (aligned) start_pc.
    #[test]
    fn compiled_block_records_correct_start_pc() {
        let mut jit = JittedCpu::new(0);
        let mut bus = TestBus::new(0x200);
        // Place the block at 0x100 and branch to self so the interpreter parks.
        bus.load(0x100, &[b_self()]);
        jit.reset(0x100);
        jit.step(&mut bus);
        let block = jit.cache().get(0x100).expect("block at 0x100");
        assert_eq!(block.start_pc, 0x100);
        // The instruction count should be at least 1 (the b_self).
        assert!(block.instructions >= 1);
    }
}
