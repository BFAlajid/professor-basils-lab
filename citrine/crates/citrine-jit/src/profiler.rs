//! Hot-path profiler.
//!
//! Tracks how often each basic-block start PC has been entered. Once a PC
//! crosses `threshold`, it is promoted to "hot" and becomes a candidate for
//! WASM compilation. Promotion is one-way — once hot, always hot — until the
//! block is invalidated by self-modifying code or an explicit reset.

use std::collections::{HashMap, HashSet};

/// Counts entries per basic-block start PC and tracks which PCs are hot.
pub struct HotPathProfiler {
    /// PC → execution count
    counts: HashMap<u32, u64>,
    /// PCs that have crossed the hot threshold and should be JIT-compiled.
    hot_set: HashSet<u32>,
    /// Threshold above which a block becomes "hot".
    threshold: u64,
}

impl HotPathProfiler {
    /// Create a profiler that promotes a PC to hot once its execution count
    /// reaches `threshold`. A `threshold` of 0 promotes on the first record.
    pub fn new(threshold: u64) -> Self {
        Self {
            counts: HashMap::new(),
            hot_set: HashSet::new(),
            threshold,
        }
    }

    /// Increment the counter for `pc`. Returns true if this call promoted
    /// `pc` to hot status (i.e., crossed the threshold for the first time).
    pub fn record(&mut self, pc: u32) -> bool {
        let entry = self.counts.entry(pc).or_insert(0);
        *entry = entry.saturating_add(1);
        let count = *entry;
        if count >= self.threshold && self.hot_set.insert(pc) {
            return true;
        }
        false
    }

    pub fn is_hot(&self, pc: u32) -> bool {
        self.hot_set.contains(&pc)
    }

    pub fn count(&self, pc: u32) -> u64 {
        self.counts.get(&pc).copied().unwrap_or(0)
    }

    pub fn hot_pcs(&self) -> impl Iterator<Item = u32> + '_ {
        self.hot_set.iter().copied()
    }

    /// Reset all profiling state. The threshold is preserved.
    pub fn clear(&mut self) {
        self.counts.clear();
        self.hot_set.clear();
    }

    /// Forget profiling data for `pc` (count and hot status). Used when an
    /// invalidation event drops the corresponding compiled block.
    pub fn forget(&mut self, pc: u32) {
        self.counts.remove(&pc);
        self.hot_set.remove(&pc);
    }

    pub fn threshold(&self) -> u64 {
        self.threshold
    }
}

impl Default for HotPathProfiler {
    fn default() -> Self {
        // 100 entries before promotion is the default for similar JITs.
        Self::new(100)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_increments_count() {
        let mut p = HotPathProfiler::new(10);
        p.record(0x1000);
        p.record(0x1000);
        p.record(0x1000);
        assert_eq!(p.count(0x1000), 3);
    }

    #[test]
    fn record_independent_pcs() {
        let mut p = HotPathProfiler::new(10);
        p.record(0x1000);
        p.record(0x1000);
        p.record(0x2000);
        assert_eq!(p.count(0x1000), 2);
        assert_eq!(p.count(0x2000), 1);
        assert_eq!(p.count(0x3000), 0);
    }

    #[test]
    fn promotion_at_threshold() {
        let mut p = HotPathProfiler::new(3);
        assert!(!p.record(0x1000));
        assert!(!p.record(0x1000));
        // Third call reaches threshold and should promote.
        assert!(p.record(0x1000));
        // Subsequent calls should not re-promote.
        assert!(!p.record(0x1000));
    }

    #[test]
    fn is_hot_after_promotion() {
        let mut p = HotPathProfiler::new(2);
        assert!(!p.is_hot(0x1000));
        p.record(0x1000);
        assert!(!p.is_hot(0x1000));
        p.record(0x1000);
        assert!(p.is_hot(0x1000));
    }

    #[test]
    fn zero_threshold_promotes_immediately() {
        let mut p = HotPathProfiler::new(0);
        // Even with threshold 0, the first record (count becomes 1 ≥ 0) promotes once.
        assert!(p.record(0x1000));
        assert!(p.is_hot(0x1000));
    }

    #[test]
    fn hot_pcs_iterator() {
        let mut p = HotPathProfiler::new(1);
        p.record(0x1000);
        p.record(0x2000);
        p.record(0x3000);
        let mut hot: Vec<u32> = p.hot_pcs().collect();
        hot.sort();
        assert_eq!(hot, vec![0x1000, 0x2000, 0x3000]);
    }

    #[test]
    fn clear_resets_state() {
        let mut p = HotPathProfiler::new(1);
        p.record(0x1000);
        p.record(0x2000);
        assert!(p.is_hot(0x1000));
        p.clear();
        assert!(!p.is_hot(0x1000));
        assert_eq!(p.count(0x1000), 0);
        assert_eq!(p.hot_pcs().count(), 0);
    }

    #[test]
    fn forget_drops_single_pc() {
        let mut p = HotPathProfiler::new(1);
        p.record(0x1000);
        p.record(0x2000);
        p.forget(0x1000);
        assert!(!p.is_hot(0x1000));
        assert_eq!(p.count(0x1000), 0);
        assert!(p.is_hot(0x2000));
    }
}
