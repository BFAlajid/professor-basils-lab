pub mod timer;

pub struct Hardware {
    pub timer: timer::SystemTimer,
}

impl Hardware {
    pub fn new() -> Self {
        Self {
            timer: timer::SystemTimer::new(),
        }
    }

    pub fn tick(&mut self, cycles: u64) {
        self.timer.add_cycles(cycles);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hardware_tick() {
        let mut hw = Hardware::new();
        hw.tick(100);
        assert_eq!(hw.timer.cycles(), 100);
        hw.tick(50);
        assert_eq!(hw.timer.cycles(), 150);
    }
}
