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

    fn next_f64(&mut self) -> f64 {
        self.next() as f64 / u32::MAX as f64
    }
}

fn defensive_multiplier(atk_type: u8, def_type1: u8, def_type2: u8) -> f64 {
    let def2: i8 = if def_type2 == 255 { -1 } else { def_type2 as i8 };
    pkmn_type_chart::get_defensive_multiplier(atk_type, def_type1, def2)
}

#[wasm_bindgen]
pub fn score_move(
    power: u16,
    move_type: u8,
    attacker_type1: u8,
    attacker_type2: u8,
    defender_type1: u8,
    defender_type2: u8,
    accuracy: u8,
    is_status: bool,
) -> f64 {
    if !is_authorized() { return 50.0; }

    if is_status {
        return 40.0;
    }

    if power == 0 {
        return 10.0;
    }

    let stab: f64 = if move_type == attacker_type1
        || (attacker_type2 != 255 && move_type == attacker_type2)
    {
        1.5
    } else {
        1.0
    };

    let type_eff = defensive_multiplier(move_type, defender_type1, defender_type2);

    power as f64 * stab * type_eff * (accuracy as f64 / 100.0)
}

#[wasm_bindgen]
pub fn score_matchup(
    switch_type1: u8,
    switch_type2: u8,
    opp_type1: u8,
    opp_type2: u8,
    hp_ratio: f64,
) -> f64 {
    let mut score: f64 = 50.0;

    let opp_types: Vec<u8> = if opp_type2 != 255 {
        vec![opp_type1, opp_type2]
    } else {
        vec![opp_type1]
    };

    let switch_types: Vec<u8> = if switch_type2 != 255 {
        vec![switch_type1, switch_type2]
    } else {
        vec![switch_type1]
    };

    for &opp_type in &opp_types {
        let mult = defensive_multiplier(opp_type, switch_type1, switch_type2);
        if mult == 0.0 {
            score += 40.0;
        }
        if mult < 1.0 {
            score += 20.0;
        }
        if mult > 1.0 {
            score -= 20.0;
        }
    }

    for &my_type in &switch_types {
        let mult = defensive_multiplier(my_type, opp_type1, opp_type2);
        if mult > 1.0 {
            score += 15.0;
        }
    }

    score * hp_ratio
}

#[wasm_bindgen]
pub fn select_ai_action(
    move_scores: &[f64],
    num_moves: u8,
    switch_scores: &[f64],
    num_switches: u8,
    difficulty: u8,
    seed: u32,
    is_fainted: bool,
    can_mega: bool,
    can_tera: bool,
    should_tera: bool,
    can_dmax: bool,
    should_dmax: bool,
) -> Vec<f64> {
    if !is_authorized() {
        let random_idx = (seed % (num_moves as u32)) as f64;
        return vec![0.0, random_idx];
    }

    let mut rng = Xorshift32::new(seed);

    if is_fainted {
        let mut best_idx: f64 = 0.0;
        let mut best_score: f64 = f64::NEG_INFINITY;
        for i in 0..(num_switches as usize) {
            let idx = switch_scores[i * 2];
            let sc = switch_scores[i * 2 + 1];
            if sc > best_score {
                best_score = sc;
                best_idx = idx;
            }
        }
        return vec![1.0, best_idx];
    }

    let nm = num_moves as usize;

    if difficulty == 0 {
        let roll = rng.next_f64();
        if roll < 0.3 {
            let random_idx = (rng.next() % (nm as u32)) as f64;
            return vec![0.0, random_idx];
        }
    }

    let mut best_move_score: f64 = f64::NEG_INFINITY;
    let mut best_move_index: usize = 0;
    for i in 0..nm {
        if move_scores[i] > best_move_score {
            best_move_score = move_scores[i];
            best_move_index = i;
        }
    }

    let switch_threshold: f64 = if difficulty == 2 { 40.0 } else { 30.0 };
    if best_move_score < switch_threshold && num_switches > 0 {
        let mut best_switch_idx: f64 = 0.0;
        let mut best_switch_score: f64 = f64::NEG_INFINITY;
        for i in 0..(num_switches as usize) {
            let idx = switch_scores[i * 2];
            let sc = switch_scores[i * 2 + 1];
            if sc > best_switch_score {
                best_switch_score = sc;
                best_switch_idx = idx;
            }
        }

        let switch_multiplier: f64 = if difficulty == 2 { 1.3 } else { 1.5 };
        if best_switch_score > best_move_score * switch_multiplier {
            return vec![1.0, best_switch_idx];
        }
    }

    let bmi = best_move_index as f64;

    if can_mega {
        return vec![2.0, bmi];
    }
    if can_tera && should_tera {
        return vec![3.0, bmi];
    }
    if can_dmax && should_dmax {
        return vec![4.0, bmi];
    }

    vec![0.0, bmi]
}

#[wasm_bindgen]
pub fn determine_turn_order(
    p1_priority: i8,
    p2_priority: i8,
    p1_speed: u16,
    p2_speed: u16,
    seed: u32,
) -> f64 {
    if p1_priority > p2_priority {
        return 1.0;
    }
    if p2_priority > p1_priority {
        return 0.0;
    }
    if p1_speed > p2_speed {
        return 1.0;
    }
    if p2_speed > p1_speed {
        return 0.0;
    }
    let mut rng = Xorshift32::new(seed);
    if rng.next_f64() < 0.5 {
        1.0
    } else {
        0.0
    }
}

#[wasm_bindgen]
pub fn should_terastallize(
    ai_type1: u8,
    ai_type2: u8,
    opp_type1: u8,
    opp_type2: u8,
    tera_type: u8,
    hp_ratio: f64,
    difficulty: u8,
    seed: u32,
) -> f64 {
    let mut rng = Xorshift32::new(seed);

    let opp_types: Vec<u8> = if opp_type2 != 255 {
        vec![opp_type1, opp_type2]
    } else {
        vec![opp_type1]
    };

    for &opp_type in &opp_types {
        let mult = defensive_multiplier(opp_type, ai_type1, ai_type2);
        if mult > 1.0 {
            let tera_mult = defensive_multiplier(opp_type, tera_type, 255);
            if tera_mult <= 1.0 {
                return 1.0;
            }
        }
    }

    match difficulty {
        2 => {
            if hp_ratio > 0.5 {
                if rng.next_f64() < 0.25 {
                    return 1.0;
                }
            }
            0.0
        }
        0 => {
            if rng.next_f64() < 0.15 {
                1.0
            } else {
                0.0
            }
        }
        _ => {
            if hp_ratio > 0.6 {
                if rng.next_f64() < 0.4 {
                    return 1.0;
                }
            }
            0.0
        }
    }
}

#[wasm_bindgen]
pub fn should_dynamax(
    hp_ratio: f64,
    alive_count: u8,
    difficulty: u8,
    seed: u32,
) -> f64 {
    let mut rng = Xorshift32::new(seed);

    if alive_count <= 1 {
        return 1.0;
    }

    match difficulty {
        2 => {
            if hp_ratio > 0.8 {
                if rng.next_f64() < 0.6 {
                    return 1.0;
                }
            }
            0.0
        }
        0 => {
            if alive_count <= 2 {
                if rng.next_f64() < 0.5 {
                    return 1.0;
                } else {
                    return 0.0;
                }
            }
            if rng.next_f64() < 0.15 {
                1.0
            } else {
                0.0
            }
        }
        _ => {
            if hp_ratio > 0.7 {
                if rng.next_f64() < 0.5 {
                    return 1.0;
                }
            }
            0.0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 1. Status move returns 40
    #[test]
    fn score_move_status_returns_40() {
        let score = score_move(0, 0, 1, 255, 4, 255, 100, true);
        assert_eq!(score, 40.0);
    }

    // 2. No power returns 10
    #[test]
    fn score_move_no_power_returns_10() {
        let score = score_move(0, 0, 1, 255, 4, 255, 100, false);
        assert_eq!(score, 10.0);
    }

    // 3. STAB bonus (Fire move, Fire attacker)
    //    Fire (1) vs Normal (0) mono: power=80, accuracy=100
    //    Expected: 80 * 1.5 * 1.0 * 1.0 = 120
    #[test]
    fn score_move_stab_bonus() {
        let score = score_move(80, 1, 1, 255, 0, 255, 100, false);
        assert_eq!(score, 120.0);
    }

    // 4. Super effective (Fire vs Grass)
    //    Fire (1) vs Grass (4) mono, no STAB (attacker Normal/0): power=80, accuracy=100
    //    Expected: 80 * 1.0 * 2.0 * 1.0 = 160
    #[test]
    fn score_move_super_effective() {
        let score = score_move(80, 1, 0, 255, 4, 255, 100, false);
        assert_eq!(score, 160.0);
    }

    // 5. Not very effective (Fire vs Water)
    //    Fire (1) vs Water (2) mono, no STAB: power=80, accuracy=100
    //    Expected: 80 * 1.0 * 0.5 * 1.0 = 40
    #[test]
    fn score_move_not_very_effective() {
        let score = score_move(80, 1, 0, 255, 2, 255, 100, false);
        assert_eq!(score, 40.0);
    }

    // 6. Combined STAB + super effective
    //    Fire (1) attacker uses Fire move (1) vs Grass (4) mono: power=80, accuracy=100
    //    Expected: 80 * 1.5 * 2.0 * 1.0 = 240
    #[test]
    fn score_move_stab_plus_super_effective() {
        let score = score_move(80, 1, 1, 255, 4, 255, 100, false);
        assert_eq!(score, 240.0);
    }

    // Extra: accuracy factor
    //    Fire (1) vs Grass (4), STAB, accuracy=50
    //    Expected: 80 * 1.5 * 2.0 * 0.5 = 120
    #[test]
    fn score_move_accuracy_factor() {
        let score = score_move(80, 1, 1, 255, 4, 255, 50, false);
        assert_eq!(score, 120.0);
    }

    // Extra: dual-type defender
    //    Ground (8) vs Fire(1)/Steel(16): effectiveness = 2.0 * 2.0 = 4.0
    //    No STAB (attacker = Water/2), power=100, accuracy=100
    //    Expected: 100 * 1.0 * 4.0 * 1.0 = 400
    #[test]
    fn score_move_dual_type_defender() {
        let score = score_move(100, 8, 2, 255, 1, 16, 100, false);
        assert_eq!(score, 400.0);
    }

    // -----------------------------------------------------------------------
    // score_matchup tests
    // -----------------------------------------------------------------------

    // 7. Resist gives bonus
    //    Switch-in: Steel (16) mono, Opponent: Normal (0) mono, hp_ratio=1.0
    //    Normal attacks Steel: 0.5 -> resist -> +20
    //    Steel attacks Normal: 1.0 -> no bonus
    //    Score = (50 + 20) * 1.0 = 70
    #[test]
    fn score_matchup_resist_gives_bonus() {
        let score = score_matchup(16, 255, 0, 255, 1.0);
        assert_eq!(score, 70.0);
    }

    // 8. Weakness gives penalty
    //    Switch-in: Grass (4) mono, Opponent: Fire (1) mono, hp_ratio=1.0
    //    Fire attacks Grass: 2.0 -> weak -> -20
    //    Grass attacks Fire: 0.5 -> no bonus (not > 1)
    //    Score = (50 - 20) * 1.0 = 30
    #[test]
    fn score_matchup_weakness_gives_penalty() {
        let score = score_matchup(4, 255, 1, 255, 1.0);
        assert_eq!(score, 30.0);
    }

    // 9. Immune gives big bonus
    //    Switch-in: Ghost (13) mono, Opponent: Normal (0) mono, hp_ratio=1.0
    //    Normal attacks Ghost: 0.0 -> immune (+40) AND resist (+20) = +60
    //    Ghost attacks Normal: 0.0 -> no bonus (not > 1)
    //    Score = (50 + 40 + 20) * 1.0 = 110
    #[test]
    fn score_matchup_immune_gives_big_bonus() {
        let score = score_matchup(13, 255, 0, 255, 1.0);
        assert_eq!(score, 110.0);
    }

    // 10. hp_ratio scales result
    //    Switch-in: Steel (16) mono, Opponent: Normal (0) mono, hp_ratio=0.5
    //    Score = (50 + 20) * 0.5 = 35
    #[test]
    fn score_matchup_hp_ratio_scales() {
        let score = score_matchup(16, 255, 0, 255, 0.5);
        assert_eq!(score, 35.0);
    }

    // -----------------------------------------------------------------------
    // select_ai_action tests
    // -----------------------------------------------------------------------

    // 11. Fainted forces switch
    #[test]
    fn select_ai_action_fainted_forces_switch() {
        let move_scores = [50.0, 30.0];
        let switch_scores = [2.0, 80.0, 4.0, 60.0]; // idx=2 score=80, idx=4 score=60
        let result = select_ai_action(
            &move_scores, 2, &switch_scores, 2,
            1, 42, true, false, false, false, false, false,
        );
        assert_eq!(result[0], 1.0); // SWITCH
        assert_eq!(result[1], 2.0); // best switch index
    }

    // 12. Picks best move normally
    #[test]
    fn select_ai_action_picks_best_move() {
        let move_scores = [50.0, 120.0, 30.0, 80.0];
        let switch_scores: [f64; 0] = [];
        let result = select_ai_action(
            &move_scores, 4, &switch_scores, 0,
            1, 42, false, false, false, false, false, false,
        );
        assert_eq!(result[0], 0.0); // MOVE
        assert_eq!(result[1], 1.0); // index 1 has highest score (120)
    }

    // 13. Switches when best move is bad (score < threshold)
    //     Normal difficulty: threshold=30, switchMultiplier=1.5
    //     Best move score = 20 < 30, best switch score = 80 > 20 * 1.5 = 30
    #[test]
    fn select_ai_action_switches_when_move_bad() {
        let move_scores = [20.0, 10.0];
        let switch_scores = [3.0, 80.0]; // idx=3 score=80
        let result = select_ai_action(
            &move_scores, 2, &switch_scores, 1,
            1, 42, false, false, false, false, false, false,
        );
        assert_eq!(result[0], 1.0); // SWITCH
        assert_eq!(result[1], 3.0); // index 3
    }

    // 14. Mega evolve when available
    #[test]
    fn select_ai_action_mega_evolve() {
        let move_scores = [100.0, 80.0];
        let switch_scores: [f64; 0] = [];
        let result = select_ai_action(
            &move_scores, 2, &switch_scores, 0,
            1, 42, false, true, false, false, false, false,
        );
        assert_eq!(result[0], 2.0); // MEGA_EVOLVE
        assert_eq!(result[1], 0.0); // best move index
    }

    // Extra: Terastallize when available and recommended
    #[test]
    fn select_ai_action_terastallize() {
        let move_scores = [100.0, 80.0];
        let switch_scores: [f64; 0] = [];
        let result = select_ai_action(
            &move_scores, 2, &switch_scores, 0,
            1, 42, false, false, true, true, false, false,
        );
        assert_eq!(result[0], 3.0); // TERASTALLIZE
        assert_eq!(result[1], 0.0);
    }

    // Extra: Dynamax when available and recommended
    #[test]
    fn select_ai_action_dynamax() {
        let move_scores = [100.0, 80.0];
        let switch_scores: [f64; 0] = [];
        let result = select_ai_action(
            &move_scores, 2, &switch_scores, 0,
            1, 42, false, false, false, false, true, true,
        );
        assert_eq!(result[0], 4.0); // DYNAMAX
        assert_eq!(result[1], 0.0);
    }

    // Extra: Mega takes priority over tera and dmax
    #[test]
    fn select_ai_action_mega_priority() {
        let move_scores = [100.0];
        let switch_scores: [f64; 0] = [];
        let result = select_ai_action(
            &move_scores, 1, &switch_scores, 0,
            2, 42, false, true, true, true, true, true,
        );
        assert_eq!(result[0], 2.0); // MEGA_EVOLVE beats tera and dmax
    }

    // -----------------------------------------------------------------------
    // determine_turn_order tests
    // -----------------------------------------------------------------------

    // 15. Higher priority goes first
    #[test]
    fn turn_order_higher_priority_first() {
        // P1 has priority +1, P2 has priority 0 -> P1 first
        assert_eq!(determine_turn_order(1, 0, 100, 200, 42), 1.0);
        // P2 has higher priority
        assert_eq!(determine_turn_order(0, 2, 200, 100, 42), 0.0);
    }

    // 16. Same priority, faster goes first
    #[test]
    fn turn_order_same_priority_faster_first() {
        // Same priority (0), P1 speed=150, P2 speed=100 -> P1 first
        assert_eq!(determine_turn_order(0, 0, 150, 100, 42), 1.0);
        // Same priority, P2 faster
        assert_eq!(determine_turn_order(0, 0, 80, 200, 42), 0.0);
    }

    // 17. Speed tie is deterministic with same seed
    #[test]
    fn turn_order_speed_tie_deterministic() {
        let r1 = determine_turn_order(0, 0, 100, 100, 42);
        let r2 = determine_turn_order(0, 0, 100, 100, 42);
        assert_eq!(r1, r2, "Same seed should produce same result for speed ties");
    }

    // Extra: negative priority (Trick Room style move)
    #[test]
    fn turn_order_negative_priority() {
        // P1 has -6 priority (e.g., Trick Room), P2 has 0
        assert_eq!(determine_turn_order(-6, 0, 300, 100, 42), 0.0);
    }

    // -----------------------------------------------------------------------
    // should_terastallize tests
    // -----------------------------------------------------------------------

    // 18. Tera fixes weakness
    //     AI: Grass (4) mono, Opponent: Fire (1) mono, tera_type: Water (2)
    //     Fire vs Grass = 2.0 (super effective) -> check tera
    //     Fire vs Water = 0.5 (resisted) <= 1 -> fix -> return 1.0
    #[test]
    fn should_tera_fixes_weakness() {
        let result = should_terastallize(4, 255, 1, 255, 2, 0.8, 1, 42);
        assert_eq!(result, 1.0);
    }

    // Extra: Tera doesn't fix when tera type is also weak
    //     AI: Grass (4) mono, Opponent: Fire (1) mono, tera_type: Bug (11)
    //     Fire vs Grass = 2.0 -> check tera
    //     Fire vs Bug = 2.0 > 1 -> doesn't fix
    //     Then falls through to difficulty logic (normal, hp=0.3 < 0.6 -> false)
    #[test]
    fn should_tera_no_fix_still_weak() {
        let result = should_terastallize(4, 255, 1, 255, 11, 0.3, 1, 42);
        assert_eq!(result, 0.0);
    }

    // Extra: No weakness, hard difficulty, high HP -> random chance
    #[test]
    fn should_tera_hard_difficulty_random() {
        // AI: Steel (16) mono, Opp: Normal (0) mono -> no weakness
        // Hard difficulty, hp > 50% -> 25% chance
        // Run many well-spaced seeds and check we get both outcomes
        let mut yes_count = 0;
        for i in 0..500u32 {
            let seed = 1_000_000u32.wrapping_add(i.wrapping_mul(7_919));
            if should_terastallize(16, 255, 0, 255, 1, 0.9, 2, seed) == 1.0 {
                yes_count += 1;
            }
        }
        assert!(yes_count > 0, "Should sometimes tera on hard with high HP");
        assert!(yes_count < 500, "Should not always tera");
    }

    // -----------------------------------------------------------------------
    // should_dynamax tests
    // -----------------------------------------------------------------------

    // 19. Last Pokemon always dynamaxes
    #[test]
    fn should_dmax_last_pokemon() {
        let result = should_dynamax(0.1, 1, 1, 42);
        assert_eq!(result, 1.0);
    }

    // Extra: alive_count=0 also triggers (edge case)
    #[test]
    fn should_dmax_zero_alive() {
        let result = should_dynamax(0.5, 0, 1, 42);
        assert_eq!(result, 1.0);
    }

    // Extra: Hard difficulty, high HP -> random chance (60%)
    #[test]
    fn should_dmax_hard_high_hp() {
        let mut yes_count = 0;
        for i in 0..500u32 {
            let seed = 1_000_000u32.wrapping_add(i.wrapping_mul(7_919));
            if should_dynamax(0.95, 4, 2, seed) == 1.0 {
                yes_count += 1;
            }
        }
        assert!(yes_count > 0, "Should sometimes dmax on hard with high HP");
        assert!(yes_count < 500, "Should not always dmax");
    }

    // Extra: Hard difficulty, low HP -> never
    #[test]
    fn should_dmax_hard_low_hp() {
        let mut yes_count = 0;
        for seed in 1..=200 {
            if should_dynamax(0.3, 4, 2, seed) == 1.0 {
                yes_count += 1;
            }
        }
        assert_eq!(yes_count, 0, "Hard difficulty with low HP should never dmax");
    }

    // Extra: Normal difficulty, low HP -> never
    #[test]
    fn should_dmax_normal_low_hp() {
        let mut yes_count = 0;
        for seed in 1..=200 {
            if should_dynamax(0.3, 4, 1, seed) == 1.0 {
                yes_count += 1;
            }
        }
        assert_eq!(yes_count, 0, "Normal difficulty with low HP should never dmax");
    }

    // Extra: PRNG determinism
    #[test]
    fn prng_deterministic() {
        let mut rng1 = Xorshift32::new(12345);
        let mut rng2 = Xorshift32::new(12345);
        for _ in 0..100 {
            assert_eq!(rng1.next(), rng2.next());
        }
    }

    // Extra: PRNG zero seed becomes 1
    #[test]
    fn prng_zero_seed() {
        let mut rng = Xorshift32::new(0);
        let val = rng.next();
        assert_ne!(val, 0, "PRNG with zero seed should still produce values");
    }
}
