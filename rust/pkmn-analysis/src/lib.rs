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

const NUM_TYPES: usize = 18;
const MONO_TYPE_SENTINEL: u8 = 255;

#[wasm_bindgen]
pub fn analyze_team(team_types: &[u8], team_size: u8) -> Vec<f64> {
    if !is_authorized() {
        let mut r = vec![0.0; 54];
        r.push(0.0); // threat
        r.push(0.0); // uncovered count
        r.push(0.0); // covered count
        r.push(0.0); // gaps count
        r.push(0.0); // suggestions count
        return r;
    }

    let size = team_size as usize;
    let mut result: Vec<f64> = Vec::new();

    let mut weak_counts = [0u32; NUM_TYPES];
    let mut resist_counts = [0u32; NUM_TYPES];
    let mut immune_counts = [0u32; NUM_TYPES];

    for atk in 0..NUM_TYPES {
        for i in 0..size {
            let idx = i * 2;
            if idx + 1 >= team_types.len() {
                break;
            }
            let def1 = team_types[idx];
            let def2_raw = team_types[idx + 1];
            let def2: i8 = if def2_raw == MONO_TYPE_SENTINEL {
                -1
            } else {
                def2_raw as i8
            };
            let mult = pkmn_type_chart::get_defensive_multiplier(atk as u8, def1, def2);
            if mult == 0.0 {
                immune_counts[atk] += 1;
            } else if mult > 1.0 {
                weak_counts[atk] += 1;
            } else if mult < 1.0 {
                resist_counts[atk] += 1;
            }
        }
        result.push(weak_counts[atk] as f64);
        result.push(resist_counts[atk] as f64);
        result.push(immune_counts[atk] as f64);
    }

    let mut uncovered: Vec<usize> = Vec::new();
    for t in 0..NUM_TYPES {
        if weak_counts[t] >= 3 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            uncovered.push(t);
        }
    }

    let mut team_atk_types: Vec<u8> = Vec::new();
    for i in 0..size {
        let idx = i * 2;
        if idx + 1 >= team_types.len() {
            break;
        }
        let t1 = team_types[idx];
        let t2 = team_types[idx + 1];
        if t1 < NUM_TYPES as u8 && !team_atk_types.contains(&t1) {
            team_atk_types.push(t1);
        }
        if t2 != MONO_TYPE_SENTINEL && t2 < NUM_TYPES as u8 && !team_atk_types.contains(&t2) {
            team_atk_types.push(t2);
        }
    }

    let mut covered: Vec<usize> = Vec::new();
    let mut gaps: Vec<usize> = Vec::new();
    for def in 0..NUM_TYPES {
        let mut is_covered = false;
        for &atk in &team_atk_types {
            if pkmn_type_chart::get_effectiveness(atk, def as u8) > 1.0 {
                is_covered = true;
                break;
            }
        }
        if is_covered {
            covered.push(def);
        } else {
            gaps.push(def);
        }
    }

    let mut threat: f64 = 0.0;

    let mut is_uncovered = [false; NUM_TYPES];
    for &t in &uncovered {
        is_uncovered[t] = true;
    }

    let mut is_tier2 = [false; NUM_TYPES];

    for t in 0..NUM_TYPES {
        if is_uncovered[t] {
            threat += 12.0;
        } else if weak_counts[t] >= 2 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            threat += 6.0;
            is_tier2[t] = true;
        } else if weak_counts[t] >= 1 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            threat += 2.0;
        }
    }

    threat += gaps.len() as f64;

    // Clamp to 0-100
    if threat < 0.0 {
        threat = 0.0;
    }
    if threat > 100.0 {
        threat = 100.0;
    }

    let mut problematic: Vec<usize> = Vec::new();
    for t in 0..NUM_TYPES {
        if weak_counts[t] >= 2 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            problematic.push(t);
        }
    }

    let mut suggestions: Vec<(usize, f64)> = Vec::new();
    for candidate in 0..NUM_TYPES {
        let mut score: f64 = 0.0;
        for &prob_type in &problematic {
            // How does this candidate type defend against the problematic attacking type?
            let mult =
                pkmn_type_chart::get_defensive_multiplier(prob_type as u8, candidate as u8, -1);
            if mult == 0.0 {
                score += 3.0;
            } else if mult < 1.0 {
                score += 2.0;
            }
        }
        if score > 0.0 {
            suggestions.push((candidate, score));
        }
    }

    suggestions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    suggestions.truncate(3);

    result.push(threat);

    result.push(uncovered.len() as f64);
    for &t in &uncovered {
        result.push(t as f64);
    }

    result.push(covered.len() as f64);
    for &t in &covered {
        result.push(t as f64);
    }

    result.push(gaps.len() as f64);
    for &t in &gaps {
        result.push(t as f64);
    }

    result.push(suggestions.len() as f64);
    for &(t, s) in &suggestions {
        result.push(t as f64);
        result.push(s);
    }

    result
}

#[wasm_bindgen]
pub fn analyze_defensive_coverage(team_types: &[u8], team_size: u8) -> Vec<f64> {
    if !is_authorized() {
        return (0..NUM_TYPES).flat_map(|_| [0.0, 0.0, 1.0, 1.0]).collect();
    }

    let size = team_size as usize;
    let mut result: Vec<f64> = Vec::with_capacity(NUM_TYPES * 4);

    for atk in 0..NUM_TYPES {
        let mut worst: f64 = 0.0;
        let mut best: f64 = f64::MAX;
        let mut any_resists = false;
        let mut has_members = false;

        let mut offensive_covered: f64 = 0.0;

        for i in 0..size {
            let idx = i * 2;
            if idx + 1 >= team_types.len() {
                break;
            }
            has_members = true;
            let def1 = team_types[idx];
            let def2_raw = team_types[idx + 1];
            let def2: i8 = if def2_raw == MONO_TYPE_SENTINEL {
                -1
            } else {
                def2_raw as i8
            };

            let mult = pkmn_type_chart::get_defensive_multiplier(atk as u8, def1, def2);
            if mult > worst {
                worst = mult;
            }
            if mult < best {
                best = mult;
            }
            if mult < 1.0 {
                any_resists = true;
            }

            if def1 == atk as u8 {
                offensive_covered = 1.0;
            }
            if def2_raw != MONO_TYPE_SENTINEL && def2_raw == atk as u8 {
                offensive_covered = 1.0;
            }
        }

        if !has_members {
            result.push(0.0);
            result.push(0.0);
            result.push(1.0);
            result.push(1.0);
        } else {
            let defensive_status: f64 = if any_resists {
                1.0
            } else if worst > 1.0 {
                2.0
            } else {
                0.0
            };

            result.push(defensive_status);
            result.push(offensive_covered);
            result.push(worst);
            result.push(best);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    // Type indices for readability
    const NORMAL: u8 = 0;
    const FIRE: u8 = 1;
    const WATER: u8 = 2;
    const ELECTRIC: u8 = 3;
    const GRASS: u8 = 4;
    const ICE: u8 = 5;
    const FIGHTING: u8 = 6;
    const POISON: u8 = 7;
    const GROUND: u8 = 8;
    const FLYING: u8 = 9;
    #[allow(dead_code)]
    const PSYCHIC: u8 = 10;
    const BUG: u8 = 11;
    const ROCK: u8 = 12;
    const GHOST: u8 = 13;
    const DRAGON: u8 = 14;
    const DARK: u8 = 15;
    const STEEL: u8 = 16;
    const FAIRY: u8 = 17;
    const NONE: u8 = 255;

    // Helper: extract defensive chart triple for a given attacking type index
    fn get_defensive_triple(result: &[f64], atk_type: usize) -> (f64, f64, f64) {
        let base = atk_type * 3;
        (result[base], result[base + 1], result[base + 2])
    }

    // ==================== Test 1: Empty team ====================
    #[test]
    fn test_empty_team() {
        let result = analyze_team(&[], 0);
        // All 18 triples should be (0, 0, 0)
        for atk in 0..NUM_TYPES {
            let (w, r, i) = get_defensive_triple(&result, atk);
            assert_eq!(w, 0.0, "empty team: weak count for type {} should be 0", atk);
            assert_eq!(r, 0.0, "empty team: resist count for type {} should be 0", atk);
            assert_eq!(i, 0.0, "empty team: immune count for type {} should be 0", atk);
        }
        // Threat score should be 0 (no weaknesses, but gaps exist)
        // Actually: 0 weak anywhere, but 18 offensive gaps => threat = 18
        // Wait, no team types means no offensive types collected, so all 18 are gaps => +18
        let threat = result[54];
        assert_eq!(threat, 18.0, "empty team threat from 18 gaps");

        // Uncovered weaknesses: 0
        assert_eq!(result[55], 0.0, "empty team: 0 uncovered weaknesses");
        let n = result[55] as usize;

        // Offensive coverage: 0
        assert_eq!(result[56 + n], 0.0, "empty team: 0 offensive coverage");
        let m = result[56 + n] as usize;

        // Offensive gaps: 18
        assert_eq!(result[57 + n + m], 18.0, "empty team: 18 gaps");
    }

    // ==================== Test 2: Single mono-type (Fire) ====================
    #[test]
    fn test_single_fire() {
        let team = [FIRE, NONE];
        let result = analyze_team(&team, 1);

        // Fire is weak to: Water(2), Ground(8), Rock(12) => weakCount=1 each
        let (w, _, _) = get_defensive_triple(&result, WATER as usize);
        assert_eq!(w, 1.0, "fire weak to water");
        let (w, _, _) = get_defensive_triple(&result, GROUND as usize);
        assert_eq!(w, 1.0, "fire weak to ground");
        let (w, _, _) = get_defensive_triple(&result, ROCK as usize);
        assert_eq!(w, 1.0, "fire weak to rock");

        // Fire resists: Fire(1), Grass(4), Ice(5), Bug(11), Steel(16), Fairy(17)
        let (_, r, _) = get_defensive_triple(&result, FIRE as usize);
        assert_eq!(r, 1.0, "fire resists fire");
        let (_, r, _) = get_defensive_triple(&result, GRASS as usize);
        assert_eq!(r, 1.0, "fire resists grass");
        let (_, r, _) = get_defensive_triple(&result, ICE as usize);
        assert_eq!(r, 1.0, "fire resists ice");
        let (_, r, _) = get_defensive_triple(&result, BUG as usize);
        assert_eq!(r, 1.0, "fire resists bug");
        let (_, r, _) = get_defensive_triple(&result, STEEL as usize);
        assert_eq!(r, 1.0, "fire resists steel");
        let (_, r, _) = get_defensive_triple(&result, FAIRY as usize);
        assert_eq!(r, 1.0, "fire resists fairy");

        // Fire has no immunities
        for atk in 0..NUM_TYPES {
            let (_, _, i) = get_defensive_triple(&result, atk);
            assert_eq!(i, 0.0, "fire has no immunities");
        }

        // Neutral types should have w=0, r=0
        let (w, r, _) = get_defensive_triple(&result, NORMAL as usize);
        assert_eq!(w, 0.0);
        assert_eq!(r, 0.0);
    }

    // ==================== Test 3: Single dual-type (Water/Ground) ====================
    #[test]
    fn test_single_water_ground() {
        // Water/Ground: Swampert-like
        // Weaknesses: Grass (4x)
        // Resists: Fire (0.5), Poison (0.5), Rock (0.5), Steel (0.5)
        // Immune: Electric (0x)
        let team = [WATER, GROUND];
        let result = analyze_team(&team, 1);

        // Grass: 2.0 * 2.0 = 4.0 => weak
        let (w, _, _) = get_defensive_triple(&result, GRASS as usize);
        assert_eq!(w, 1.0, "water/ground weak to grass");

        // Electric: 1.0 * 0.0 = 0.0 => immune
        let (_, _, i) = get_defensive_triple(&result, ELECTRIC as usize);
        assert_eq!(i, 1.0, "water/ground immune to electric");

        // Fire: fire vs water = 0.5, fire vs ground = 1.0 => 0.5 => resist
        let (w, r, _) = get_defensive_triple(&result, FIRE as usize);
        assert_eq!(w, 0.0, "water/ground not weak to fire");
        assert_eq!(r, 1.0, "water/ground resists fire");

        // Rock: water resists (0.5) * ground neutral to rock (1.0) = 0.5 => resist
        let (_, r, _) = get_defensive_triple(&result, ROCK as usize);
        assert_eq!(r, 1.0, "water/ground resists rock");

        // Poison: water neutral (1.0) * ground resists (0.5) = 0.5 => resist
        let (_, r, _) = get_defensive_triple(&result, POISON as usize);
        assert_eq!(r, 1.0, "water/ground resists poison");

        // Steel: water neutral (1.0) on water * ground: steel attacking ground = 1.0
        // Actually: steel vs water = 0.5, steel vs ground = 1.0 => 0.5 => resist
        let (_, r, _) = get_defensive_triple(&result, STEEL as usize);
        assert_eq!(r, 1.0, "water/ground resists steel");
    }

    // ==================== Test 4: Full team of 6 ====================
    #[test]
    fn test_full_team_six() {
        // Team: Fire, Water, Grass, Electric, Ice, Ground (all mono)
        let team = [FIRE, NONE, WATER, NONE, GRASS, NONE, ELECTRIC, NONE, ICE, NONE, GROUND, NONE];
        let result = analyze_team(&team, 6);

        // Check a specific attacking type: Rock attacks
        // Rock vs Fire: 2.0 (weak), Rock vs Water: 1.0, Rock vs Grass: 1.0,
        // Rock vs Electric: 1.0, Rock vs Ice: 2.0 (weak), Rock vs Ground: 0.5 (resist)
        let (w, r, _) = get_defensive_triple(&result, ROCK as usize);
        assert_eq!(w, 2.0, "rock: 2 team members weak");
        assert_eq!(r, 1.0, "rock: 1 team member resists");

        // Total team size should be reflected in counts
        // Fighting vs Normal would be 2x, but no normal on team
        // Fighting vs Fire: 1.0, Water: 1.0, Grass: 1.0, Electric: 1.0, Ice: 2.0, Ground: 1.0
        let (w, _, _) = get_defensive_triple(&result, FIGHTING as usize);
        assert_eq!(w, 1.0, "fighting: 1 team member weak (Ice)");
    }

    // ==================== Test 5: 3+ weak to same type => uncovered weakness ====================
    #[test]
    fn test_uncovered_weakness_detected() {
        // 3 Ice-types (all mono): all weak to Fire, Rock, Fighting, Steel
        let team = [ICE, NONE, ICE, NONE, ICE, NONE];
        let result = analyze_team(&team, 3);

        // Fire: weakCount = 3, resistCount = 0, immuneCount = 0 => uncovered
        let (w, r, i) = get_defensive_triple(&result, FIRE as usize);
        assert_eq!(w, 3.0);
        assert_eq!(r, 0.0);
        assert_eq!(i, 0.0);

        // Check that Fire appears in uncovered weakness list
        let n = result[55] as usize;
        assert!(n > 0, "should have uncovered weaknesses");
        let uncovered: Vec<f64> = result[56..56 + n].to_vec();
        assert!(
            uncovered.contains(&(FIRE as f64)),
            "fire should be uncovered weakness"
        );
        assert!(
            uncovered.contains(&(ROCK as f64)),
            "rock should be uncovered weakness"
        );
        assert!(
            uncovered.contains(&(FIGHTING as f64)),
            "fighting should be uncovered weakness"
        );
        assert!(
            uncovered.contains(&(STEEL as f64)),
            "steel should be uncovered weakness"
        );
    }

    // ==================== Test 6: Weakness covered by resist => NOT uncovered ====================
    #[test]
    fn test_weakness_covered_by_resist() {
        // 3 Ice + 1 Fire: Ice is weak to Fire (3 weak), but Fire resists Fire (1 resist)
        // So Fire attacking: weakCount=3, resistCount=1 => NOT uncovered (resistCount != 0)
        let team = [ICE, NONE, ICE, NONE, ICE, NONE, FIRE, NONE];
        let result = analyze_team(&team, 4);

        let (w, r, _) = get_defensive_triple(&result, FIRE as usize);
        assert_eq!(w, 3.0, "3 ice weak to fire");
        assert_eq!(r, 1.0, "fire resists fire");

        // Fire should NOT be in uncovered weaknesses
        let n = result[55] as usize;
        let uncovered: Vec<f64> = result[56..56 + n].to_vec();
        assert!(
            !uncovered.contains(&(FIRE as f64)),
            "fire should NOT be uncovered since we have a resist"
        );
    }

    // ==================== Test 7: Offensive coverage: Fire+Water+Grass covers many types ====================
    #[test]
    fn test_offensive_coverage_fire_water_grass() {
        let team = [FIRE, NONE, WATER, NONE, GRASS, NONE];
        let result = analyze_team(&team, 3);

        let n = result[55] as usize;
        let m_idx = 56 + n;
        let m = result[m_idx] as usize;
        let covered: Vec<f64> = result[m_idx + 1..m_idx + 1 + m].to_vec();

        // Fire is super effective against: Grass(4), Ice(5), Bug(11), Steel(16)
        // Water is super effective against: Fire(1), Ground(8), Rock(12)
        // Grass is super effective against: Water(2), Ground(8), Rock(12)
        // Combined covered: Fire(1), Water(2), Grass(4), Ice(5), Ground(8), Bug(11), Rock(12), Steel(16)
        assert!(covered.contains(&(FIRE as f64)), "covers fire");
        assert!(covered.contains(&(WATER as f64)), "covers water");
        assert!(covered.contains(&(GRASS as f64)), "covers grass");
        assert!(covered.contains(&(ICE as f64)), "covers ice");
        assert!(covered.contains(&(GROUND as f64)), "covers ground");
        assert!(covered.contains(&(BUG as f64)), "covers bug");
        assert!(covered.contains(&(ROCK as f64)), "covers rock");
        assert!(covered.contains(&(STEEL as f64)), "covers steel");
        assert!(m >= 8, "at least 8 types covered");
    }

    // ==================== Test 8: Offensive gaps: all Normal team ====================
    #[test]
    fn test_all_normal_offensive_gaps() {
        let team = [NORMAL, NONE, NORMAL, NONE, NORMAL, NONE];
        let result = analyze_team(&team, 3);

        let n = result[55] as usize;
        let m_idx = 56 + n;
        let m = result[m_idx] as usize;
        let g_idx = m_idx + 1 + m;
        let g = result[g_idx] as usize;

        // Normal is super effective against: nothing
        // Normal is not effective against: Rock (0.5), Steel (0.5), Ghost (0.0)
        // So ALL 18 types are gaps (Normal doesn't hit anything super effectively)
        assert_eq!(m, 0, "normal covers nothing super effectively");
        assert_eq!(g, 18, "all 18 types are offensive gaps for normal");
    }

    // ==================== Test 9: Threat score: vulnerable team scores high ====================
    #[test]
    fn test_high_threat_score() {
        // 4 mono-Ice: all weak to Fire, Rock, Fighting, Steel
        // Fire: 4 weak, 0 resist, 0 immune => uncovered (>=3) => +12
        // Rock: 4 weak, 0 resist, 0 immune => uncovered => +12
        // Fighting: 4 weak, 0 resist, 0 immune => uncovered => +12
        // Steel: 4 weak, 0 resist, 0 immune => uncovered => +12
        // That's already 48 from uncovered
        // Plus offensive gaps for Ice-only coverage
        let team = [ICE, NONE, ICE, NONE, ICE, NONE, ICE, NONE];
        let result = analyze_team(&team, 4);

        let threat = result[54];
        assert!(threat >= 48.0, "vulnerable team should have high threat, got {}", threat);
    }

    // ==================== Test 10: Threat score: balanced team scores low ====================
    #[test]
    fn test_low_threat_balanced_team() {
        // Well-balanced team: Water/Ground, Steel/Flying, Grass/Fairy, Fire/Fighting, Dragon/Ice, Dark/Ghost
        let team = [
            WATER, GROUND,     // Swampert
            STEEL, FLYING,     // Skarmory
            GRASS, FAIRY,      // Whimsicott-like
            FIRE, FIGHTING,    // Blaziken
            DRAGON, ICE,       // Kyurem-like
            DARK, GHOST,       // Sableye-like
        ];
        let result = analyze_team(&team, 6);

        let threat = result[54];
        // A balanced team should have a relatively low threat score
        assert!(threat < 40.0, "balanced team should have low-ish threat, got {}", threat);
    }

    // ==================== Test 11: Suggested types resist team weaknesses ====================
    #[test]
    fn test_suggested_types() {
        // 3 mono-Ice: uncovered weaknesses to Fire, Rock, Fighting, Steel
        // Suggested types should resist some of these
        let team = [ICE, NONE, ICE, NONE, ICE, NONE];
        let result = analyze_team(&team, 3);

        let n = result[55] as usize;
        let m_idx = 56 + n;
        let m = result[m_idx] as usize;
        let g_idx = m_idx + 1 + m;
        let g = result[g_idx] as usize;
        let s_idx = g_idx + 1 + g;
        let s = result[s_idx] as usize;

        assert!(s > 0, "should have at least one suggestion");

        // Each suggestion is a (type_idx, score) pair
        for i in 0..s {
            let _type_idx = result[s_idx + 1 + i * 2] as usize;
            let score = result[s_idx + 1 + i * 2 + 1];
            assert!(score > 0.0, "suggestion score should be > 0");
        }

        // Water resists: Fire(0.5), Steel(0.5) => 2 + 2 = 4
        // Fire resists: Fire(0.5), Steel(0.5) => 2 + 2 = 4
        // Fighting resists: Rock(0.5) => 2
        // Ground resists: Rock(0.5) => 2; immune to nothing of the 4 problematic types?
        // Actually: let's check what the top suggestion is. It should be a useful type.
        // Water resists Fire and Steel. Fire resists Fire and Steel. Both score 4.
        // Just verify suggestions exist and have positive scores.
    }

    // ==================== Test 12: Max 3 suggestions returned ====================
    #[test]
    fn test_max_three_suggestions() {
        // Team with many uncovered weaknesses to produce many candidate suggestions
        let team = [ICE, NONE, ICE, NONE, ICE, NONE, ICE, NONE, ICE, NONE, ICE, NONE];
        let result = analyze_team(&team, 6);

        let n = result[55] as usize;
        let m_idx = 56 + n;
        let m = result[m_idx] as usize;
        let g_idx = m_idx + 1 + m;
        let g = result[g_idx] as usize;
        let s_idx = g_idx + 1 + g;
        let s = result[s_idx] as usize;

        assert!(s <= 3, "max 3 suggestions, got {}", s);
    }

    // ==================== Test 13: analyze_defensive_coverage: single Pokemon ====================
    #[test]
    fn test_defensive_coverage_single() {
        let team = [FIRE, NONE];
        let result = analyze_defensive_coverage(&team, 1);

        assert_eq!(result.len(), 72, "should have 72 entries (18 * 4)");

        // Water attacking Fire: multiplier = 2.0 => weak (status 2)
        let water_idx = WATER as usize * 4;
        assert_eq!(result[water_idx], 2.0, "fire is weak to water");
        assert_eq!(result[water_idx + 2], 2.0, "worst multiplier = 2.0");
        assert_eq!(result[water_idx + 3], 2.0, "best multiplier = 2.0 (only one member)");

        // Grass attacking Fire: multiplier = 0.5 => resist (status 1)
        let grass_idx = GRASS as usize * 4;
        assert_eq!(result[grass_idx], 1.0, "fire resists grass");
        assert_eq!(result[grass_idx + 2], 0.5, "worst/best = 0.5");

        // Fire type STAB coverage check: Fire should be covered
        let fire_idx = FIRE as usize * 4;
        assert_eq!(result[fire_idx + 1], 1.0, "fire type has STAB coverage");

        // Normal should NOT be STAB covered
        let normal_idx = NORMAL as usize * 4;
        assert_eq!(result[normal_idx + 1], 0.0, "normal type not STAB covered");
    }

    // ==================== Test 14: analyze_defensive_coverage: team resist/weak/neutral ====================
    #[test]
    fn test_defensive_coverage_team_status() {
        // Fire + Water:
        // Ground attacking: Fire weak (2.0), Water neutral (1.0)
        // => anyResists = false, worst = 2.0 > 1 => weak (2)
        // Ice attacking: Fire resists (0.5), Water resists (0.5)
        // => anyResists = true => resist (1)
        // Normal attacking: Fire neutral (1.0), Water neutral (1.0)
        // => anyResists = false, worst = 1.0, not > 1 => neutral (0)
        let team = [FIRE, NONE, WATER, NONE];
        let result = analyze_defensive_coverage(&team, 2);

        // Ground
        let ground_idx = GROUND as usize * 4;
        assert_eq!(result[ground_idx], 2.0, "team weak to ground");
        assert_eq!(result[ground_idx + 2], 2.0, "worst mult for ground = 2.0");
        assert_eq!(result[ground_idx + 3], 1.0, "best mult for ground = 1.0");

        // Ice: Fire resists (0.5), Water resists (0.5)
        let ice_idx = ICE as usize * 4;
        assert_eq!(result[ice_idx], 1.0, "team resists ice");
        assert_eq!(result[ice_idx + 2], 0.5, "worst mult for ice = 0.5");
        assert_eq!(result[ice_idx + 3], 0.5, "best mult for ice = 0.5");

        // Normal: all neutral
        let normal_idx = NORMAL as usize * 4;
        assert_eq!(result[normal_idx], 0.0, "team neutral to normal");
    }

    // ==================== Test 15: analyze_defensive_coverage: offensive coverage detection ====================
    #[test]
    fn test_defensive_coverage_offensive() {
        // Team: Fire + Grass/Poison
        let team = [FIRE, NONE, GRASS, POISON];
        let result = analyze_defensive_coverage(&team, 2);

        // Fire type STAB: offensive_covered should be 1.0
        let fire_idx = FIRE as usize * 4;
        assert_eq!(result[fire_idx + 1], 1.0, "fire STAB covered");

        // Grass type STAB: offensive_covered should be 1.0
        let grass_idx = GRASS as usize * 4;
        assert_eq!(result[grass_idx + 1], 1.0, "grass STAB covered");

        // Poison type STAB: offensive_covered should be 1.0
        let poison_idx = POISON as usize * 4;
        assert_eq!(result[poison_idx + 1], 1.0, "poison STAB covered");

        // Water type STAB: offensive_covered should be 0.0 (no one has water)
        let water_idx = WATER as usize * 4;
        assert_eq!(result[water_idx + 1], 0.0, "water NOT STAB covered");
    }

    // ==================== Test 16: analyze_defensive_coverage: empty team ====================
    #[test]
    fn test_defensive_coverage_empty() {
        let result = analyze_defensive_coverage(&[], 0);
        assert_eq!(result.len(), 72);
        for atk in 0..NUM_TYPES {
            let base = atk * 4;
            assert_eq!(result[base], 0.0, "empty: neutral status");
            assert_eq!(result[base + 1], 0.0, "empty: no STAB coverage");
            assert_eq!(result[base + 2], 1.0, "empty: worst mult = 1.0");
            assert_eq!(result[base + 3], 1.0, "empty: best mult = 1.0");
        }
    }

    // ==================== Test 17: Ghost immunity in defensive chart ====================
    #[test]
    fn test_ghost_immunity() {
        // Normal type is immune to Ghost
        let team = [NORMAL, NONE];
        let result = analyze_team(&team, 1);

        let (w, r, i) = get_defensive_triple(&result, GHOST as usize);
        assert_eq!(i, 1.0, "normal is immune to ghost");
        assert_eq!(w, 0.0);
        assert_eq!(r, 0.0);
    }
}
