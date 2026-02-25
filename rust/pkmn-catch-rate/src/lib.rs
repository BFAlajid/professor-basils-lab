use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
fn is_authorized() -> bool {
    use std::sync::atomic::{AtomicU8, Ordering};
    static AUTH: AtomicU8 = AtomicU8::new(2);
    let v = AUTH.load(Ordering::Relaxed);
    if v != 2 { return v == 1; }
    let ok = js_sys::eval("window.location.hostname")
        .ok()
        .and_then(|v| v.as_string())
        .map(|h| {
            h == "professor-basils-lab.vercel.app"
                || h.ends_with(".vercel.app")
                || h == "localhost"
                || h == "127.0.0.1"
        })
        .unwrap_or(false);
    AUTH.store(if ok { 1 } else { 0 }, Ordering::Relaxed);
    ok
}

#[cfg(not(target_arch = "wasm32"))]
fn is_authorized() -> bool { true }

struct Xorshift32 {
    state: u32,
}

impl Xorshift32 {
    fn new(seed: u32) -> Self {
        Self {
            state: if seed == 0 { 1 } else { seed },
        }
    }

    fn next(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    fn next_f64_65536(&mut self) -> f64 {
        (self.next() as f64 / u32::MAX as f64) * 65536.0
    }
}

#[wasm_bindgen]
pub fn calculate_catch_probability(
    capture_rate: u8,
    current_hp: u16,
    max_hp: u16,
    status_mod: f64,
    ball_mod: f64,
    seed: u32,
) -> Vec<f64> {
    if !is_authorized() {
        return vec![0.0, 1.0, 0.0, 0.0, 0.0, 0.0];
    }

    if ball_mod >= 255.0 {
        return vec![1.0, 4.0, 1.0, 1.0, 1.0, 1.0];
    }

    let max_hp_f = max_hp as f64;
    let current_hp_f = current_hp as f64;
    let capture_rate_f = capture_rate as f64;

    let modified_rate = (((3.0 * max_hp_f - 2.0 * current_hp_f) * capture_rate_f * ball_mod)
        / (3.0 * max_hp_f)
        * status_mod)
        .min(255.0);

    if modified_rate >= 255.0 {
        return vec![1.0, 4.0, 1.0, 1.0, 1.0, 1.0];
    }

    let shake_probability = 65536.0 / (255.0 / modified_rate).powf(0.1875);

    let mut rng = Xorshift32::new(seed);

    let mut shakes = [0.0_f64; 4];
    let mut num_shakes = 0u8;

    for i in 0..4 {
        let roll = rng.next_f64_65536();
        num_shakes += 1;
        if roll < shake_probability {
            shakes[i] = 1.0;
        } else {
            shakes[i] = 0.0;
            break;
        }
    }

    let is_caught = if num_shakes == 4 && shakes.iter().all(|&s| s == 1.0) {
        1.0
    } else {
        0.0
    };

    vec![
        is_caught,
        num_shakes as f64,
        shakes[0],
        shakes[1],
        shakes[2],
        shakes[3],
    ]
}

#[wasm_bindgen]
pub fn should_wild_flee(capture_rate: u8, turn: u8, seed: u32) -> f64 {
    if !is_authorized() { return 1.0; }
    let base_flee = ((255.0 - capture_rate as f64) / 255.0).max(0.0) * 0.15;
    let turn_bonus = turn as f64 * 0.02;
    let flee_threshold = (base_flee + turn_bonus).min(0.3);

    let mut rng = Xorshift32::new(seed);
    let roll = rng.next() as f64 / u32::MAX as f64;

    if roll < flee_threshold {
        1.0
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper to extract fields from the result vector.
    fn is_caught(result: &[f64]) -> bool {
        result[0] == 1.0
    }
    fn num_shakes(result: &[f64]) -> u8 {
        result[1] as u8
    }
    fn shake(result: &[f64], i: usize) -> bool {
        result[2 + i] == 1.0
    }

    // 1. Master Ball always catches (ball_mod >= 255)
    #[test]
    fn master_ball_always_catches() {
        let result = calculate_catch_probability(3, 100, 100, 1.0, 255.0, 42);
        assert!(is_caught(&result));
        assert_eq!(num_shakes(&result), 4);
        for i in 0..4 {
            assert!(shake(&result, i));
        }
    }

    // 2. High capture rate + full HP -> still catchable
    #[test]
    fn high_capture_rate_full_hp() {
        // Magikarp has capture rate 255. With a regular Poke Ball (1.0),
        // full HP, no status, this should still be catchable sometimes.
        // We just verify we get a valid result shape.
        let result = calculate_catch_probability(255, 100, 100, 1.0, 1.0, 12345);
        assert_eq!(result.len(), 6);
        assert!(num_shakes(&result) >= 1 && num_shakes(&result) <= 4);
    }

    // 3. Low capture rate + full HP -> harder to catch
    #[test]
    fn low_capture_rate_full_hp() {
        // Mewtwo has capture rate 3. With a Poke Ball at full HP, very hard.
        // Run with several seeds and expect at least some failures.
        let mut caught_count = 0;
        for seed in 1..=100 {
            let result = calculate_catch_probability(3, 200, 200, 1.0, 1.0, seed);
            if is_caught(&result) {
                caught_count += 1;
            }
        }
        // With capture rate 3, very unlikely to catch at full HP — should be rare.
        assert!(
            caught_count < 50,
            "Expected fewer catches with low capture rate, got {}/100",
            caught_count
        );
    }

    // 4. Low HP increases catch rate
    #[test]
    fn low_hp_increases_catch_rate() {
        let mut caught_full_hp = 0;
        let mut caught_low_hp = 0;
        for seed in 1..=500 {
            let full = calculate_catch_probability(45, 200, 200, 1.0, 1.0, seed);
            let low = calculate_catch_probability(45, 1, 200, 1.0, 1.0, seed);
            if is_caught(&full) {
                caught_full_hp += 1;
            }
            if is_caught(&low) {
                caught_low_hp += 1;
            }
        }
        assert!(
            caught_low_hp > caught_full_hp,
            "Low HP should yield more catches: low={} vs full={}",
            caught_low_hp,
            caught_full_hp
        );
    }

    // 5. Sleep status modifier (2.5x)
    #[test]
    fn sleep_status_increases_catch_rate() {
        let mut caught_none = 0;
        let mut caught_sleep = 0;
        for seed in 1..=500 {
            let none = calculate_catch_probability(45, 100, 200, 1.0, 1.0, seed);
            let sleep = calculate_catch_probability(45, 100, 200, 2.5, 1.0, seed);
            if is_caught(&none) {
                caught_none += 1;
            }
            if is_caught(&sleep) {
                caught_sleep += 1;
            }
        }
        assert!(
            caught_sleep > caught_none,
            "Sleep should yield more catches: sleep={} vs none={}",
            caught_sleep,
            caught_none
        );
    }

    // 6. Paralyze status modifier (1.5x)
    #[test]
    fn paralyze_status_increases_catch_rate() {
        let mut caught_none = 0;
        let mut caught_para = 0;
        for seed in 1..=500 {
            let none = calculate_catch_probability(45, 100, 200, 1.0, 1.0, seed);
            let para = calculate_catch_probability(45, 100, 200, 1.5, 1.0, seed);
            if is_caught(&none) {
                caught_none += 1;
            }
            if is_caught(&para) {
                caught_para += 1;
            }
        }
        assert!(
            caught_para > caught_none,
            "Paralyze should yield more catches: para={} vs none={}",
            caught_para,
            caught_none
        );
    }

    // 7. Modified rate >= 255 -> guaranteed catch (very high ball_mod)
    #[test]
    fn guaranteed_catch_high_ball_mod() {
        // ball_mod of 100.0 with capture_rate 255 should push modified rate to 255
        let result = calculate_catch_probability(255, 1, 200, 2.5, 100.0, 999);
        assert!(is_caught(&result));
        assert_eq!(num_shakes(&result), 4);
        for i in 0..4 {
            assert!(shake(&result, i));
        }
    }

    // 8. Deterministic: same seed produces same result
    #[test]
    fn deterministic_same_seed() {
        let r1 = calculate_catch_probability(45, 80, 200, 1.0, 1.0, 77777);
        let r2 = calculate_catch_probability(45, 80, 200, 1.0, 1.0, 77777);
        assert_eq!(r1, r2, "Same seed should produce identical results");
    }

    // 9. Different seeds produce different results
    #[test]
    fn different_seeds_differ() {
        // With a middling capture rate, different seeds should eventually
        // produce different shake outcomes over many trials.
        let mut found_diff = false;
        for seed_a in 1..=50 {
            let r1 = calculate_catch_probability(45, 100, 200, 1.0, 1.0, seed_a);
            let r2 = calculate_catch_probability(45, 100, 200, 1.0, 1.0, seed_a + 1000);
            if r1 != r2 {
                found_diff = true;
                break;
            }
        }
        assert!(found_diff, "Different seeds should produce different results");
    }

    // 10. should_wild_flee: turn 1, high capture rate -> very unlikely to flee
    #[test]
    fn flee_unlikely_high_capture_rate_turn1() {
        // Use large seed values (simulating JS Math.random() * 0xFFFFFFFF)
        let mut flee_count = 0;
        for i in 0..1000u32 {
            let seed = 1_000_000_000u32.wrapping_add(i.wrapping_mul(4_000_000));
            if should_wild_flee(255, 1, seed) == 1.0 {
                flee_count += 1;
            }
        }
        // capture_rate=255 -> baseFlee = 0.0, turnBonus = 0.02 -> threshold = 0.02
        // Expect ~2% flee rate
        assert!(
            flee_count < 80,
            "High capture rate + turn 1 should rarely flee, got {}/1000",
            flee_count
        );
    }

    // 11. should_wild_flee: high turn, low capture rate -> more likely to flee
    #[test]
    fn flee_more_likely_low_capture_high_turn() {
        let mut flee_low_turn = 0;
        let mut flee_high_turn = 0;
        for i in 0..1000u32 {
            let seed = 1_000_000_000u32.wrapping_add(i.wrapping_mul(4_000_000));
            if should_wild_flee(3, 1, seed) == 1.0 {
                flee_low_turn += 1;
            }
            if should_wild_flee(3, 10, seed) == 1.0 {
                flee_high_turn += 1;
            }
        }
        assert!(
            flee_high_turn > flee_low_turn,
            "Higher turn should cause more fleeing: turn10={} vs turn1={}",
            flee_high_turn,
            flee_low_turn
        );
    }

    // 12. should_wild_flee: deterministic with same seed
    #[test]
    fn flee_deterministic() {
        let r1 = should_wild_flee(100, 5, 42424242);
        let r2 = should_wild_flee(100, 5, 42424242);
        assert_eq!(r1, r2, "Same seed should produce identical flee result");
    }
}
