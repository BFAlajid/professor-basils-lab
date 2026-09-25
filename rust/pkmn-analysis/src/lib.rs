use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

const NUM_TYPES: usize = 18;
const MONO_TYPE_SENTINEL: u8 = 255;

/// Type name strings matching the JS TYPE_LIST order (indices 0-17).
const TYPE_NAMES: [&str; NUM_TYPES] = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

/// Analyze a team's defensive weaknesses, offensive coverage, and threat score.
///
/// team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
///   Use 255 for second type if mono-type.
/// team_size: number of Pokemon on the team (team_types.len() / 2)
///
/// Returns a flat Vec<f64> with the following layout:
/// [0..54]: Defensive chart — 18 triples of (weakCount, resistCount, immuneCount), one per attacking type
/// [54]: Threat score (0-100)
/// [55]: Number of uncovered weaknesses (N)
/// [56..56+N]: Uncovered weakness type indices
/// [56+N]: Number of offensive coverage types (M)
/// [57+N..57+N+M]: Covered type indices
/// [57+N+M]: Number of offensive gaps (G)
/// [58+N+M..58+N+M+G]: Gap type indices
/// [58+N+M+G]: Number of suggestions (S, max 3)
/// Then S pairs of (type_idx, score)
#[wasm_bindgen]
pub fn analyze_team(team_types: &[u8], team_size: u8) -> Vec<f64> {
    let size = team_size as usize;
    let mut result: Vec<f64> = Vec::new();

    // --- Defensive chart: 18 triples of (weakCount, resistCount, immuneCount) ---
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

    // --- Uncovered weaknesses ---
    // Types where weakCount >= 3 AND resistCount == 0 AND immuneCount == 0
    let mut uncovered: Vec<usize> = Vec::new();
    for t in 0..NUM_TYPES {
        if weak_counts[t] >= 3 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            uncovered.push(t);
        }
    }

    // --- Offensive coverage ---
    // Collect unique type indices from team (excluding 255)
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

    // --- Threat score (0-100) ---
    // Problematic types: weakCount >= 2, resistCount == 0, immuneCount == 0
    // But split into tiers based on severity
    let mut threat: f64 = 0.0;

    // Track which types fall into which category to avoid double-counting
    let mut is_uncovered = [false; NUM_TYPES];
    for &t in &uncovered {
        is_uncovered[t] = true;
    }

    let mut is_tier2 = [false; NUM_TYPES]; // weakCount >= 2 but not uncovered

    for t in 0..NUM_TYPES {
        if is_uncovered[t] {
            // Each uncovered weakness: +12 points
            threat += 12.0;
        } else if weak_counts[t] >= 2 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            // weakCount >= 2, not already uncovered: +6 points
            threat += 6.0;
            is_tier2[t] = true;
        } else if weak_counts[t] >= 1 && resist_counts[t] == 0 && immune_counts[t] == 0 {
            // weakCount >= 1, not uncovered, not tier2: +2 points
            threat += 2.0;
        }
    }

    // Each offensive gap: +1 point
    threat += gaps.len() as f64;

    // Clamp to 0-100
    if threat < 0.0 {
        threat = 0.0;
    }
    if threat > 100.0 {
        threat = 100.0;
    }

    // --- Suggested types (up to 3) ---
    // For each candidate type, score how many "problematic" types it resists/is immune to
    // Problematic = weakCount >= 2 AND resistCount == 0 AND immuneCount == 0
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
                score += 3.0; // immunity
            } else if mult < 1.0 {
                score += 2.0; // resistance
            }
        }
        if score > 0.0 {
            suggestions.push((candidate, score));
        }
    }

    // Sort by score descending
    suggestions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    suggestions.truncate(3);

    // --- Build result ---
    // [54]: Threat score
    result.push(threat);

    // [55]: Number of uncovered weaknesses (N)
    result.push(uncovered.len() as f64);
    // [56..56+N]: Uncovered weakness type indices
    for &t in &uncovered {
        result.push(t as f64);
    }

    // [56+N]: Number of offensive coverage types (M)
    result.push(covered.len() as f64);
    // [57+N..57+N+M]: Covered type indices
    for &t in &covered {
        result.push(t as f64);
    }

    // [57+N+M]: Number of offensive gaps (G)
    result.push(gaps.len() as f64);
    // [58+N+M..58+N+M+G]: Gap type indices
    for &t in &gaps {
        result.push(t as f64);
    }

    // [58+N+M+G]: Number of suggestions (S)
    result.push(suggestions.len() as f64);
    // Then S pairs of (type_idx, score)
    for &(t, s) in &suggestions {
        result.push(t as f64);
        result.push(s);
    }

    result
}

/// Analyze defensive coverage for a team.
///
/// team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
/// team_size: number of Pokemon
///
/// Returns a flat Vec<f64> with 18 entries of 4 values each (72 total):
/// For each attacking type (0-17):
///   [defensive_status, offensive_covered, worst_multiplier, best_multiplier]
///   defensive_status: 0 = neutral, 1 = resist, 2 = weak
///   offensive_covered: 1.0 if any team member has this as a type (STAB coverage), else 0.0
///   worst_multiplier: highest defensive multiplier among team members
///   best_multiplier: lowest defensive multiplier among team members
#[wasm_bindgen]
pub fn analyze_defensive_coverage(team_types: &[u8], team_size: u8) -> Vec<f64> {
    let size = team_size as usize;
    let mut result: Vec<f64> = Vec::with_capacity(NUM_TYPES * 4);

    for atk in 0..NUM_TYPES {
        let mut worst: f64 = 0.0;
        let mut best: f64 = f64::MAX;
        let mut any_resists = false;
        let mut has_members = false;

        // Check if any team member HAS this type as one of their types (STAB coverage)
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

            // STAB coverage: does this team member have the attacking type as one of its types?
            if def1 == atk as u8 {
                offensive_covered = 1.0;
            }
            if def2_raw != MONO_TYPE_SENTINEL && def2_raw == atk as u8 {
                offensive_covered = 1.0;
            }
        }

        if !has_members {
            // Empty team: neutral, no coverage, multipliers 1.0
            result.push(0.0); // defensive_status: neutral
            result.push(0.0); // offensive_covered
            result.push(1.0); // worst_multiplier
            result.push(1.0); // best_multiplier
        } else {
            let defensive_status: f64 = if any_resists {
                1.0 // resist
            } else if worst > 1.0 {
                2.0 // weak
            } else {
                0.0 // neutral
            };

            result.push(defensive_status);
            result.push(offensive_covered);
            result.push(worst);
            result.push(best);
        }
    }

    result
}

fn type_name_to_index(name: &str) -> Option<u8> {
    let lower = name.to_ascii_lowercase();
    TYPE_NAMES.iter().position(|&n| n == lower).map(|i| i as u8)
}

#[derive(Deserialize)]
struct CandidateInput {
    id: u32,
    types: Vec<String>,
    name: String,
}

#[derive(Serialize, Deserialize)]
struct ScoredResult {
    id: u32,
    name: String,
    score: i32,
    #[serde(rename = "resistsWeaknesses")]
    resists_weaknesses: Vec<String>,
    #[serde(rename = "addsOffensiveCoverage")]
    adds_offensive_coverage: Vec<String>,
}

/// Suggest team fillers that best patch a team's defensive weaknesses and offensive gaps.
///
/// `team_types_json`: JSON array of arrays, e.g. `[["fire","flying"],["water"]]`
/// `candidates_json`: JSON array of `{id, types: [...], name}` objects
/// `max_results`: max number of results to return
///
/// Returns JSON array of `{id, name, score, resistsWeaknesses, addsOffensiveCoverage}`.
///
/// Scoring (matches the JS implementation):
///   +3 per team weakness the candidate is immune to
///   +2 per team weakness the candidate resists
///   +1 per offensive gap the candidate's STAB covers super-effectively
///   -1 per type weakness the candidate shares with existing team members
#[wasm_bindgen]
pub fn suggest_team_fillers(
    team_types_json: &str,
    candidates_json: &str,
    max_results: usize,
) -> String {
    let team_types: Vec<Vec<String>> = match serde_json::from_str(team_types_json) {
        Ok(v) => v,
        Err(_) => return "[]".to_string(),
    };
    let candidates: Vec<CandidateInput> = match serde_json::from_str(candidates_json) {
        Ok(v) => v,
        Err(_) => return "[]".to_string(),
    };

    // Convert team types to index pairs (type1, type2) where type2 = -1 for mono
    let team_indices: Vec<(u8, i8)> = team_types
        .iter()
        .filter_map(|types| {
            let t1 = type_name_to_index(types.first()?)?;
            let t2 = if types.len() > 1 {
                type_name_to_index(&types[1]).map(|v| v as i8).unwrap_or(-1)
            } else {
                -1
            };
            Some((t1, t2))
        })
        .collect();

    // 1. Compute team defensive weaknesses (unresisted)
    //    A type qualifies if any team member is weak AND no member resists/is immune
    let mut team_weaknesses: Vec<u8> = Vec::new();
    for atk in 0..NUM_TYPES as u8 {
        let mut weak_count = 0u32;
        let mut resist_or_immune = false;
        for &(def1, def2) in &team_indices {
            let mult = pkmn_type_chart::get_defensive_multiplier(atk, def1, def2);
            if mult > 1.0 {
                weak_count += 1;
            }
            if mult < 1.0 {
                resist_or_immune = true;
            }
        }
        if weak_count >= 1 && !resist_or_immune {
            team_weaknesses.push(atk);
        }
    }
    // Empty team: all types are "weaknesses" (matches JS: returns [...TYPE_LIST])
    if team_indices.is_empty() {
        for t in 0..NUM_TYPES as u8 {
            team_weaknesses.push(t);
        }
    }

    // 2. Compute offensive gaps (types team can't hit super-effectively via STAB)
    let mut team_atk_types: Vec<u8> = Vec::new();
    for &(t1, t2) in &team_indices {
        if !team_atk_types.contains(&t1) {
            team_atk_types.push(t1);
        }
        if t2 >= 0 {
            let t2u = t2 as u8;
            if !team_atk_types.contains(&t2u) {
                team_atk_types.push(t2u);
            }
        }
    }

    let mut offensive_gaps: Vec<u8> = Vec::new();
    for def in 0..NUM_TYPES as u8 {
        let mut covered = false;
        for &atk in &team_atk_types {
            if pkmn_type_chart::get_effectiveness(atk, def) > 1.0 {
                covered = true;
                break;
            }
        }
        if !covered {
            offensive_gaps.push(def);
        }
    }

    // 3. Collect types the team is already weak to (for shared-weakness penalty)
    let mut existing_weak_types = [false; NUM_TYPES];
    for &(def1, def2) in &team_indices {
        for atk in 0..NUM_TYPES as u8 {
            let mult = pkmn_type_chart::get_defensive_multiplier(atk, def1, def2);
            if mult > 1.0 {
                existing_weak_types[atk as usize] = true;
            }
        }
    }

    // 4. Collect team IDs to exclude
    // Note: team ID filtering is handled on the JS side before calling this function.

    // 5. Score each candidate
    let mut scored: Vec<ScoredResult> = Vec::with_capacity(candidates.len());

    for cand in &candidates {
        let cand_indices: Vec<u8> = cand
            .types
            .iter()
            .filter_map(|t| type_name_to_index(t))
            .collect();
        if cand_indices.is_empty() {
            continue;
        }

        let def1 = cand_indices[0];
        let def2: i8 = if cand_indices.len() > 1 {
            cand_indices[1] as i8
        } else {
            -1
        };

        let mut score: i32 = 0;
        let mut resists_weaknesses: Vec<String> = Vec::new();
        let mut adds_offensive_coverage: Vec<String> = Vec::new();

        // Defensive value: how many team weaknesses does this candidate handle?
        for &weakness in &team_weaknesses {
            let mult = pkmn_type_chart::get_defensive_multiplier(weakness, def1, def2);
            if mult == 0.0 {
                score += 3;
                resists_weaknesses.push(TYPE_NAMES[weakness as usize].to_string());
            } else if mult < 1.0 {
                score += 2;
                resists_weaknesses.push(TYPE_NAMES[weakness as usize].to_string());
            }
        }

        // Offensive value: what gaps does its STAB close?
        for &gap in &offensive_gaps {
            let mut covers = false;
            for &atk in &cand_indices {
                if pkmn_type_chart::get_effectiveness(atk, gap) > 1.0 {
                    covers = true;
                    break;
                }
            }
            if covers {
                score += 1;
                adds_offensive_coverage.push(TYPE_NAMES[gap as usize].to_string());
            }
        }

        // Penalty: shared weaknesses with existing team
        for atk in 0..NUM_TYPES as u8 {
            let mult = pkmn_type_chart::get_defensive_multiplier(atk, def1, def2);
            if mult > 1.0 && existing_weak_types[atk as usize] {
                score -= 1;
            }
        }

        if score > 0 {
            scored.push(ScoredResult {
                id: cand.id,
                name: cand.name.clone(),
                score,
                resists_weaknesses,
                adds_offensive_coverage,
            });
        }
    }

    // Sort: score desc, then resists count desc, then name asc
    scored.sort_by(|a, b| {
        b.score
            .cmp(&a.score)
            .then_with(|| {
                b.resists_weaknesses
                    .len()
                    .cmp(&a.resists_weaknesses.len())
            })
            .then_with(|| a.name.cmp(&b.name))
    });

    scored.truncate(max_results);

    serde_json::to_string(&scored).unwrap_or_else(|_| "[]".to_string())
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

    // ==================== suggest_team_fillers tests ====================

    fn parse_results(json: &str) -> Vec<ScoredResult> {
        serde_json::from_str(json).unwrap()
    }

    // Test 18: Empty team returns all candidates scored
    #[test]
    fn test_suggest_empty_team() {
        let team = "[]";
        let candidates = r#"[
            {"id":6,"types":["fire","flying"],"name":"charizard"},
            {"id":9,"types":["water"],"name":"blastoise"},
            {"id":3,"types":["grass","poison"],"name":"venusaur"}
        ]"#;
        let result = suggest_team_fillers(team, candidates, 10);
        let scored = parse_results(&result);
        // Empty team means all 18 types are "weaknesses" (no resists), so candidates
        // that resist/are immune to more types score higher. All should appear (score > 0).
        assert_eq!(scored.len(), 3, "all 3 candidates should have score > 0");
        for s in &scored {
            assert!(s.score > 0, "{} should have positive score", s.name);
        }
    }

    // Test 19: Single-type team favoring resistors
    #[test]
    fn test_suggest_single_fire_team() {
        // Fire is weak to Water, Ground, Rock (unresisted since nobody else resists)
        let team = r#"[["fire"]]"#;
        let candidates = r#"[
            {"id":9,"types":["water"],"name":"blastoise"},
            {"id":76,"types":["rock","ground"],"name":"golem"},
            {"id":3,"types":["grass","poison"],"name":"venusaur"}
        ]"#;
        let result = suggest_team_fillers(team, candidates, 10);
        let scored = parse_results(&result);

        // Water resists Water(+2) => doesn't resist Ground or Rock
        // Rock/Ground: Ground immune to Electric(not a weakness)... let's check what Water resists:
        // Team weaknesses for mono-Fire: Water, Ground, Rock (no team member resists any)
        // Blastoise (Water): vs Water=0.5(+2), vs Ground=1.0, vs Rock=1.0 => defensive +2
        //   STAB covers: fire(+1) ground(+1) rock(+1) => offensive +3
        //   Shared weaknesses: Water is weak to Electric, Grass. Fire is also weak to... none of those
        //   existing_weak_types = {water, ground, rock}
        //   Water is weak to: Electric(no), Grass(no) => 0 penalty
        //   Total = 2+3 = 5

        // Golem (Rock/Ground): vs Water: rock/ground vs water = 4x => weak, not resist
        //   vs Ground: rock/ground vs ground = ground resists? ground vs rock=2.0, ground vs ground=1.0 => 2.0 weak
        //   vs Rock: rock/ground vs rock = rock vs rock=1.0, rock vs ground=0.5 => 0.5 resist => +2
        //   Defensive: resists Rock(+2)
        //   STAB: rock SE against fire(+1), ice(+1), flying(+1), bug(+1); ground SE against fire(covered), electric(+1), poison(+1)
        //   But offensive gaps are types Fire can't hit SE. Fire hits: Grass, Ice, Bug, Steel
        //   Gaps: Normal, Fire, Water, Electric, Fighting, Poison, Ground, Flying, Psychic, Rock, Ghost, Dragon, Dark, Fairy (14 types)
        //   Rock SE: Fire(already covered by fire STAB), Ice(already covered), Flying, Bug(already covered) => Flying(+1)
        //   Ground SE: Fire(covered), Electric(+1), Poison(+1), Rock(+1), Steel(covered) => Electric, Poison, Rock (+3)
        //   So offensive = Flying + Electric + Poison + Rock = 4
        //   Shared weakness: Golem weak to Water, Grass, Fighting, Ground, Steel, Ice
        //   existing_weak = {water, ground, rock}; Golem weak to Water(-1), Ground(-1) => -2
        //   Total = 2 + 4 - 2 = 4

        // All candidates should score > 0
        assert!(!scored.is_empty(), "should have suggestions");

        // Blastoise should appear and have decent score
        let blastoise = scored.iter().find(|s| s.name == "blastoise");
        assert!(blastoise.is_some(), "blastoise should be suggested");
        assert!(blastoise.unwrap().score >= 3, "blastoise should score well against fire team");
    }

    // Test 20: Score calculation matches expected values
    #[test]
    fn test_suggest_score_values() {
        // Team: 3x Ice (mono). Weaknesses: Fire, Rock, Fighting, Steel (all unresisted)
        let team = r#"[["ice"],["ice"],["ice"]]"#;
        // Candidate: Water (mono)
        // vs Fire: water vs fire = 0.5 => resist => +2
        // vs Rock: water vs rock = 1.0 => neutral
        // vs Fighting: water vs fighting = 1.0 => neutral
        // vs Steel: water vs steel = 1.0 => neutral
        // Defensive total: +2
        // Offensive gaps for ice-only team: Ice hits Grass, Ground, Flying, Dragon SE.
        // Gaps: Normal, Fire, Water, Electric, Fighting, Poison, Psychic, Bug, Rock, Ghost, Dark, Steel, Fairy (13 types)
        // Water SE: Fire, Ground, Rock => Fire(+1), Ground(already covered by Ice? Ice vs Ground=1.0, not SE)
        // Wait: Ice SE against: Grass(2.0), Ground(2.0), Flying(2.0), Dragon(2.0)
        // So covered: Grass, Ground, Flying, Dragon. Gaps = everything else (14 types).
        // Water SE: Fire(+1), Ground(covered already), Rock(+1) => +2
        // Shared weakness: Water weak to Electric, Grass. existing_weak = Fire, Rock, Fighting, Steel.
        // Water weak to Electric(no), Grass(no) => 0 penalty
        // Total: 2 + 2 = 4
        let candidates = r#"[{"id":9,"types":["water"],"name":"blastoise"}]"#;
        let result = suggest_team_fillers(team, candidates, 5);
        let scored = parse_results(&result);
        assert_eq!(scored.len(), 1);
        assert_eq!(scored[0].name, "blastoise");
        // Water resists Fire(+2), Steel(+2) = 4 defensive
        // Offensive gaps: Ice covers Grass,Ground,Flying,Dragon. Water SE: Fire,Ground,Rock.
        // Ground already covered by Ice. So Water adds: Fire(+1), Rock(+1) = 2 offensive
        // Shared weakness: Water weak to Electric,Grass. Existing weak = Fire,Rock,Fighting,Steel. No overlap => 0
        // Total = 4 + 2 = 6
        assert_eq!(scored[0].score, 6, "water vs 3x ice team should score 6");
        assert!(scored[0].resists_weaknesses.contains(&"fire".to_string()));
    }

    // Test 21: Candidates with score <= 0 are excluded
    #[test]
    fn test_suggest_excludes_negative_scores() {
        // Team: Water + Ground covers most things well
        // Candidate: another Water mon shares all weaknesses
        let team = r#"[["water"],["ground"]]"#;
        // Team weaknesses:
        //   Water weak to: Electric, Grass. Ground resists neither => both unresisted
        //   Ground weak to: Water, Grass, Ice. Water resists Water, not Grass or Ice
        //     Water: Ground resists Electric but Water doesn't => Electric unresisted? No:
        //     Electric vs Water = 2.0 (weak), Electric vs Ground = 0.0 (immune) => immune present => NOT unresisted
        //   So: Grass is unresisted (Water weak, Ground weak, nobody resists)
        //   Ice: Water resists (0.5) => resisted
        // Unresisted weaknesses: Grass only
        // A Grass/Poison candidate would be immune/resist to Grass (+2 or +3)
        // but also weak to Ice, Psychic, etc. which overlap with existing weaknesses
        let candidates = r#"[
            {"id":45,"types":["grass","poison"],"name":"vileplume"},
            {"id":6,"types":["fire","flying"],"name":"charizard"}
        ]"#;
        let result = suggest_team_fillers(team, candidates, 10);
        let scored = parse_results(&result);
        // All returned results should have score > 0
        for s in &scored {
            assert!(s.score > 0, "{} should not appear with score <= 0", s.name);
        }
    }

    // Test 22: max_results limits output
    #[test]
    fn test_suggest_max_results() {
        let team = r#"[["ice"]]"#;
        let candidates = r#"[
            {"id":1,"types":["water"],"name":"a"},
            {"id":2,"types":["fire"],"name":"b"},
            {"id":3,"types":["ground"],"name":"c"},
            {"id":4,"types":["steel"],"name":"d"},
            {"id":5,"types":["fighting"],"name":"e"}
        ]"#;
        let result = suggest_team_fillers(team, candidates, 2);
        let scored = parse_results(&result);
        assert!(scored.len() <= 2, "should return at most 2 results");
    }

    // Test 23: Invalid JSON returns empty array
    #[test]
    fn test_suggest_invalid_json() {
        assert_eq!(suggest_team_fillers("not json", "[]", 5), "[]");
        assert_eq!(suggest_team_fillers("[]", "not json", 5), "[]");
    }
}
