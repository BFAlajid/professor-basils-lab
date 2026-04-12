//! citrine-jit — tiered JIT skeleton for the ARM11 interpreter.
//!
//! Tier 0 is plain interpretation in `citrine-cpu`. Tier 1 (this crate, Phase 1
//! skeleton) profiles execution to find hot basic blocks and translates them at
//! runtime into fresh WASM modules that the host loads via `WebAssembly.compile`.
//! Phase 1 is data structures + a stub emitter; real ARM-to-WASM lowering lands later.

pub mod basic_block;
pub mod cache;
pub mod emitter;
pub mod jitted_cpu;
pub mod profiler;

pub use basic_block::{discover_block, BasicBlock};
pub use cache::{CompiledBlock, TranslationCache};
pub use emitter::WasmEmitter;
pub use jitted_cpu::{JitStats, JittedCpu};
pub use profiler::HotPathProfiler;
