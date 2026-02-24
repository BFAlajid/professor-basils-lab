use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Deterministic xorshift32 PRNG (same as pkmn-catch-rate)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helper: get defensive multiplier for a single attacking type vs dual-type
// defender, using the pkmn-type-chart crate.
//
// def_type2 == 255 means mono-type (single type).
// ---------------------------------------------------------------------------

fn defensive_multiplier(atk_type: u8, def_type1: u8, def_type2: u8) -> f64 {
    let def2: i8 = if def_type2 == 255 { -1 } else { def_type2 as i8 };
    pkmn_type_chart::get_defensive_multiplier(atk_type, def_type1, def2)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Score a single move against a target.
///
/// Returns a score representing how effective this move is.
///
/// Parameters:
/// - `power`: Move base power (0 for status moves)
/// - `move_type`: Type index of the move (0-17)
/// - `attacker_type1`: Attacker's first type (0-17)
/// - `attacker_type2`: Attacker's second type (255 for mono)
/// - `defender_type1`: Defender's first type (0-17)
/// - `defender_type2`: Defender's second type (255 for mono)
/// - `accuracy`: Move accuracy (0-100)
/// - `is_status`: Whether this is a status move
///
/// Logic (matching JS `scoreMoveAgainstTarget`):
/// - Status moves: return 40
/// - No power (0): return 10
/// - STAB: 1.5x if move_type matches either attacker type
/// - Type effectiveness via `get_defensive_multiplier`
/// - Score = power * stab * type_eff * (accuracy / 100)
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
    // Status moves get a moderate base score
    if is_status {
        return 40.0;
    }

    // No power means a non-status move with 0 power (e.g., Seismic Toss)
    if power == 0 {
        return 10.0;
    }

    // STAB check: 1.5x if move_type matches either attacker type
    let stab: f64 = if move_type == attacker_type1
        || (attacker_type2 != 255 && move_type == attacker_type2)
    {
        1.5
    } else {
        1.0
    };

    // Type effectiveness: single attacking type vs defender dual-type
    let type_eff = defensive_multiplier(move_type, defender_type1, defender_type2);

    // Score = power * stab * type_eff * (accuracy / 100)
    power as f64 * stab * type_eff * (accuracy as f64 / 100.0)
}

/// Score how well a Pokemon matches up against an opponent.
/// Used for switch-in decisions.
///
/// Parameters:
/// - `switch_type1`, `switch_type2`: Switch-in's types (255 for mono)
/// - `opp_type1`, `opp_type2`: Opponent's types (255 for mono)
/// - `hp_ratio`: Switch-in's current HP / max HP (0.0 - 1.0)
///
/// Logic (matching JS `scoreMatchup`):
/// - Start at 50
/// - For each opponent type (as attacker): check defensive_multiplier vs switch's types
///   - mult < 1 (resist): +20
///   - mult == 0 (immune): +40
///   - mult > 1 (weak): -20
/// - For each switch type (as attacker): check defensive_multiplier vs opponent's types
///   - mult > 1 (super effective): +15
/// - Multiply final score by hp_ratio
#[wasm_bindgen]
pub fn score_matchup(
    switch_type1: u8,
    switch_type2: u8,
    opp_type1: u8,
    opp_type2: u8,
    hp_ratio: f64,
) -> f64 {
    let mut score: f64 = 50.0;

    // Collect opponent types (skip 255 = mono)
    let opp_types: Vec<u8> = if opp_type2 != 255 {
        vec![opp_type1, opp_type2]
    } else {
        vec![opp_type1]
    };

    // Collect switch-in types
    let switch_types: Vec<u8> = if switch_type2 != 255 {
        vec![switch_type1, switch_type2]
    } else {
        vec![switch_type1]
    };

    // Defensive matchup: for each opp type attacking, how do switch's types defend?
    for &opp_type in &opp_types {
        let mult = defensive_multiplier(opp_type, switch_type1, switch_type2);
        if mult == 0.0 {
            score += 40.0; // immune
        }
        if mult < 1.0 {
            score += 20.0; // resist (includes 0.0 and 0.5 and 0.25)
        }
        if mult > 1.0 {
            score -= 20.0; // weak
        }
    }

    // Offensive matchup: for each switch type attacking, how do opp's types defend?
    for &my_type in &switch_types {
        let mult = defensive_multiplier(my_type, opp_type1, opp_type2);
        if mult > 1.0 {
            score += 15.0;
        }
    }

    // HP factor: prefer healthy Pokemon
    score * hp_ratio
}

/// Select the best AI action given pre-computed scores.
///
/// Parameters:
/// - `move_scores`: flat array of f64 scores for each move (up to 4)
/// - `num_moves`: number of moves (1-4)
/// - `switch_scores`: flat array of (index, score) pairs for alive switch-ins
/// - `num_switches`: number of available switch-ins
/// - `difficulty`: 0 = easy, 1 = normal, 2 = hard
/// - `seed`: random seed for difficulty-based randomness
/// - `is_fainted`: whether AI active Pokemon is fainted (need forced switch)
/// - `can_mega`: can Mega Evolve (bool)
/// - `can_tera`: can Terastallize (bool)
/// - `should_tera`: whether terastallization is recommended (pre-computed by TS)
/// - `can_dmax`: can Dynamax (bool)
/// - `should_dmax`: whether dynamax is recommended (pre-computed by TS)
///
/// Returns Vec<f64> of 2 values: [action_type, action_value]
/// action_type: 0 = MOVE, 1 = SWITCH, 2 = MEGA_EVOLVE, 3 = TERASTALLIZE, 4 = DYNAMAX
/// action_value: move index (0-3) or Pokemon index for switch
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
    let mut rng = Xorshift32::new(seed);

    // 1. If fainted: find best switch-in from switch_scores, return [1, best_switch_index]
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

    // 2. Easy difficulty: 30% chance to pick a random move
    if difficulty == 0 {
        let roll = rng.next_f64();
        if roll < 0.3 {
            // Random move index in [0, num_moves)
            let random_idx = (rng.next() % (nm as u32)) as f64;
            return vec![0.0, random_idx];
        }
    }

    // 3. Find best move score
    let mut best_move_score: f64 = f64::NEG_INFINITY;
    let mut best_move_index: usize = 0;
    for i in 0..nm {
        if move_scores[i] > best_move_score {
            best_move_score = move_scores[i];
            best_move_index = i;
        }
    }

    // 4. Switch consideration
    let switch_threshold: f64 = if difficulty == 2 { 40.0 } else { 30.0 };
    if best_move_score < switch_threshold && num_switches > 0 {
        // Find best switch
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

    // 5. Pick best move index (already computed above)
    let bmi = best_move_index as f64;

    // 6. Mechanic layer
    // Mega Evolution: always mega evolve on first opportunity
    if can_mega {
        return vec![2.0, bmi];
    }
    // Terastallization: use when recommended
    if can_tera && should_tera {
        return vec![3.0, bmi];
    }
    // Dynamax: use when recommended
    if can_dmax && should_dmax {
        return vec![4.0, bmi];
    }

    // 7. Default: use best move
    vec![0.0, bmi]
}

/// Determine which player goes first based on priority and speed.
///
/// Returns 1.0 if player 1 goes first, 0.0 if player 2 goes first.
///
/// Logic:
/// - Higher priority goes first
/// - Same priority: higher speed goes first
/// - Same speed: random (50/50 using seed)
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
    // Same priority: compare speed
    if p1_speed > p2_speed {
        return 1.0;
    }
    if p2_speed > p1_speed {
        return 0.0;
    }
    // Speed tie: random 50/50
    let mut rng = Xorshift32::new(seed);
    if rng.next_f64() < 0.5 {
        1.0
    } else {
        0.0
    }
}

/// Determine if AI should Terastallize.
///
/// Returns 1.0 = yes, 0.0 = no.
///
/// Logic (matching JS `shouldTerastallize`):
/// 1. For each opponent type: check if it's super effective vs AI types.
///    If yes, check if tera type would fix this (mult <= 1). If so, return 1.0.
/// 2. Hard: if HP > 50%, 25% chance. Else return 0.0.
/// 3. Easy: 15% chance.
/// 4. Normal: if HP > 60%, 40% chance. Else return 0.0.
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

    // Collect opponent types
    let opp_types: Vec<u8> = if opp_type2 != 255 {
        vec![opp_type1, opp_type2]
    } else {
        vec![opp_type1]
    };

    // 1. Tera if we're in a bad defensive matchup and tera fixes it
    for &opp_type in &opp_types {
        let mult = defensive_multiplier(opp_type, ai_type1, ai_type2);
        if mult > 1.0 {
            // Check if tera type would fix this (single-type defender = tera_type)
            let tera_mult = defensive_multiplier(opp_type, tera_type, 255);
            if tera_mult <= 1.0 {
                return 1.0;
            }
        }
    }

    // 2. Difficulty-based random decisions
    match difficulty {
        2 => {
            // Hard: if HP > 50%, 25% chance
            if hp_ratio > 0.5 {
                if rng.next_f64() < 0.25 {
                    return 1.0;
                }
            }
            0.0
        }
        0 => {
            // Easy: 15% chance
            if rng.next_f64() < 0.15 {
                1.0
            } else {
                0.0
            }
        }
        _ => {
            // Normal: if HP > 60%, 40% chance
            if hp_ratio > 0.6 {
                if rng.next_f64() < 0.4 {
                    return 1.0;
                }
            }
            0.0
        }
    }
}

/// Determine if AI should Dynamax.
///
/// Returns 1.0 = yes, 0.0 = no.
///
/// Logic (matching JS `shouldDynamax`):
/// 1. Always Dynamax if alive_count <= 1
/// 2. Hard: if HP > 80%, 60% chance. Else return 0.0.
/// 3. Easy: if alive <= 2, 50% chance. Else 15% chance.
/// 4. Normal: if HP > 70%, 50% chance. Else return 0.0.
#[wasm_bindgen]
pub fn should_dynamax(
    hp_ratio: f64,
    alive_count: u8,
    difficulty: u8,
    seed: u32,
) -> f64 {
    let mut rng = Xorshift32::new(seed);

    // 1. Always Dynamax if it's the last Pokemon
    if alive_count <= 1 {
        return 1.0;
    }

    match difficulty {
        2 => {
            // Hard: Dynamax strategically — when HP is high
            if hp_ratio > 0.8 {
                if rng.next_f64() < 0.6 {
                    return 1.0;
                }
            }
            0.0
        }
        0 => {
            // Easy: rarely Dynamax early
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
            // Normal: Dynamax if HP is high
            if hp_ratio > 0.7 {
                if rng.next_f64() < 0.5 {
                    return 1.0;
                }
            }
            0.0
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // score_move tests
    // -----------------------------------------------------------------------

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
