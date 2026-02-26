const CPU_FREQ_HZ: u64 = 268_111_856;


pub struct SystemTimer {
    cycle_count: u64,
}

impl SystemTimer {
    pub fn new() -> Self {
        Self { cycle_count: 0 }
    }

    pub fn add_cycles(&mut self, n: u64) {
        self.cycle_count = self.cycle_count.wrapping_add(n);
    }

    pub fn cycles(&self) -> u64 {
        self.cycle_count
    }

    pub fn microseconds(&self) -> u64 {
        self.cycle_count * 1_000_000 / CPU_FREQ_HZ
    }

    pub fn milliseconds(&self) -> u64 {
        self.microseconds() / 1000
    }

    pub fn reset(&mut self) {
        self.cycle_count = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timer_accumulate() {
        let mut t = SystemTimer::new();
        assert_eq!(t.cycles(), 0);
        t.add_cycles(1000);
        assert_eq!(t.cycles(), 1000);
        t.add_cycles(500);
        assert_eq!(t.cycles(), 1500);
    }

    #[test]
    fn timer_microseconds() {
        let mut t = SystemTimer::new();
        t.add_cycles(CPU_FREQ_HZ);
        assert_eq!(t.microseconds(), 1_000_000);
    }

    #[test]
    fn timer_reset() {
        let mut t = SystemTimer::new();
        t.add_cycles(12345);
        t.reset();
        assert_eq!(t.cycles(), 0);
    }
}
