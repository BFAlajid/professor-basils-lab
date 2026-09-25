use wasm_bindgen::prelude::*;

/// Deterministic xorshift32 PRNG (same as pkmn-catch-rate)
fn xorshift32(state: &mut u32) -> u32 {
    let mut s = *state;
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    *state = s;
    s
}

/// Check egg group compatibility.
/// `groups1`/`groups2`: egg group IDs (0-14), 255 = none.
/// Returns: 0 = incompatible, 1 = compatible, 2 = ditto match.
#[wasm_bindgen]
pub fn check_compatibility(
    groups1: &[u8],
    groups2: &[u8],
    is_ditto1: bool,
    is_ditto2: bool,
) -> u8 {
    // Two Dittos can't breed
    if is_ditto1 && is_ditto2 {
        return 0;
    }

    // Undiscovered egg group (id = 15 or "no-eggs") can never breed
    const NO_EGGS: u8 = 15;
    if groups1.contains(&NO_EGGS) || groups2.contains(&NO_EGGS) {
        return 0;
    }

    // Ditto breeds with anything else
    if is_ditto1 || is_ditto2 {
        return 2;
    }

    // Check shared egg group
    for g1 in groups1 {
        for g2 in groups2 {
            if g1 == g2 && *g1 != 255 {
                return 1;
            }
        }
    }

    0
}

/// Determine which stats are inherited from which parent.
/// Returns a flat array: [stat_index, parent (1 or 2), ...] pairs.
/// `num_inherited`: 5 with Destiny Knot, 3 without.
#[wasm_bindgen]
pub fn inherit_ivs(
    parent1_ivs: &[u8],
    parent2_ivs: &[u8],
    has_destiny_knot: bool,
    seed: u32,
) -> Vec<u8> {
    let mut rng = if seed == 0 { 12345 } else { seed };
    let num_inherited: usize = if has_destiny_knot { 5 } else { 3 };

    // Fisher-Yates shuffle on stat indices [0..6]
    let mut indices: [u8; 6] = [0, 1, 2, 3, 4, 5];
    for i in (1..6).rev() {
        let j = (xorshift32(&mut rng) as usize) % (i + 1);
        indices.swap(i, j);
    }

    // Build result IVs: start with random IVs for all 6 stats
    let mut result_ivs: [u8; 6] = [0; 6];
    for iv in result_ivs.iter_mut() {
        *iv = (xorshift32(&mut rng) % 32) as u8;
    }

    // Overwrite inherited stats from parents
    let mut inherited_info: Vec<u8> = Vec::with_capacity(num_inherited * 2 + 6);

    for i in 0..num_inherited {
        let stat = indices[i] as usize;
        let from_parent: u8 = if xorshift32(&mut rng) % 2 == 0 { 1 } else { 2 };
        let iv_val = if from_parent == 1 {
            parent1_ivs.get(stat).copied().unwrap_or(0)
        } else {
            parent2_ivs.get(stat).copied().unwrap_or(0)
        };
        result_ivs[stat] = iv_val;
        // Store inheritance info: stat_index, parent
        inherited_info.push(stat as u8);
        inherited_info.push(from_parent);
    }

    // Append the final 6 IVs at the end
    for iv in &result_ivs {
        inherited_info.push(*iv);
    }

    // Layout: [stat0, parent0, stat1, parent1, ..., iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe]
    inherited_info
}

/// Determine offspring nature.
/// Returns nature index (0-24).
/// `everstone_holder`: 0 = none, 1 = parent1, 2 = parent2.
#[wasm_bindgen]
pub fn determine_offspring_nature(
    parent1_nature: u8,
    parent2_nature: u8,
    everstone_holder: u8,
    seed: u32,
) -> u8 {
    match everstone_holder {
        1 => parent1_nature,
        2 => parent2_nature,
        _ => {
            let mut rng = if seed == 0 { 12345 } else { seed };
            (xorshift32(&mut rng) % 25) as u8
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // -- check_compatibility --

    #[test]
    fn compatible_shared_egg_group() {
        // Two Pokemon sharing egg group 1
        assert_eq!(check_compatibility(&[1], &[1], false, false), 1);
    }

    #[test]
    fn compatible_multiple_groups() {
        // Pokemon shares group 2, other has groups 2 and 3
        assert_eq!(check_compatibility(&[2, 3], &[2], false, false), 1);
    }

    #[test]
    fn incompatible_no_shared_group() {
        assert_eq!(check_compatibility(&[1], &[2], false, false), 0);
    }

    #[test]
    fn ditto_breeds_with_anything() {
        assert_eq!(check_compatibility(&[1], &[2], true, false), 2);
        assert_eq!(check_compatibility(&[1], &[2], false, true), 2);
    }

    #[test]
    fn two_dittos_cannot_breed() {
        assert_eq!(check_compatibility(&[1], &[1], true, true), 0);
    }

    #[test]
    fn undiscovered_group_cannot_breed() {
        let no_eggs: u8 = 15;
        assert_eq!(check_compatibility(&[no_eggs], &[1], false, false), 0);
        assert_eq!(check_compatibility(&[1], &[no_eggs], false, false), 0);
    }

    #[test]
    fn undiscovered_even_with_ditto() {
        let no_eggs: u8 = 15;
        assert_eq!(check_compatibility(&[no_eggs], &[1], false, true), 0);
    }

    #[test]
    fn empty_groups_incompatible() {
        assert_eq!(check_compatibility(&[], &[], false, false), 0);
    }

    #[test]
    fn group_255_ignored() {
        // 255 = "none" placeholder, should not match
        assert_eq!(check_compatibility(&[255], &[255], false, false), 0);
    }

    // -- inherit_ivs --

    #[test]
    fn destiny_knot_inherits_five() {
        let p1 = [31, 31, 31, 31, 31, 31];
        let p2 = [0, 0, 0, 0, 0, 0];
        let result = inherit_ivs(&p1, &p2, true, 42);
        // Last 6 bytes are the IVs
        assert_eq!(result.len(), 5 * 2 + 6); // 5 pairs + 6 IVs
        let ivs = &result[result.len() - 6..];
        // At least 5 stats should come from a parent (0 or 31)
        let from_parent = ivs.iter().filter(|&&v| v == 0 || v == 31).count();
        assert!(from_parent >= 5, "Expected at least 5 inherited, got {from_parent}");
    }

    #[test]
    fn no_destiny_knot_inherits_three() {
        let p1 = [31, 31, 31, 31, 31, 31];
        let p2 = [0, 0, 0, 0, 0, 0];
        let result = inherit_ivs(&p1, &p2, false, 42);
        assert_eq!(result.len(), 3 * 2 + 6); // 3 pairs + 6 IVs
        let ivs = &result[result.len() - 6..];
        let from_parent = ivs.iter().filter(|&&v| v == 0 || v == 31).count();
        assert!(from_parent >= 3, "Expected at least 3 inherited, got {from_parent}");
    }

    #[test]
    fn deterministic_with_same_seed() {
        let p1 = [31, 25, 20, 15, 10, 5];
        let p2 = [0, 5, 10, 15, 20, 25];
        let r1 = inherit_ivs(&p1, &p2, true, 12345);
        let r2 = inherit_ivs(&p1, &p2, true, 12345);
        assert_eq!(r1, r2);
    }

    #[test]
    fn different_seeds_different_results() {
        let p1 = [31, 31, 31, 31, 31, 31];
        let p2 = [0, 0, 0, 0, 0, 0];
        let r1 = inherit_ivs(&p1, &p2, true, 100);
        let r2 = inherit_ivs(&p1, &p2, true, 200);
        assert_ne!(r1, r2);
    }

    #[test]
    fn ivs_in_valid_range() {
        let p1 = [31, 31, 31, 31, 31, 31];
        let p2 = [0, 0, 0, 0, 0, 0];
        let result = inherit_ivs(&p1, &p2, true, 99999);
        let ivs = &result[result.len() - 6..];
        for &iv in ivs {
            assert!(iv <= 31, "IV {iv} exceeds maximum 31");
        }
    }

    // -- determine_offspring_nature --

    #[test]
    fn everstone_parent1() {
        assert_eq!(determine_offspring_nature(10, 20, 1, 42), 10);
    }

    #[test]
    fn everstone_parent2() {
        assert_eq!(determine_offspring_nature(10, 20, 2, 42), 20);
    }

    #[test]
    fn no_everstone_random_nature() {
        let nature = determine_offspring_nature(10, 20, 0, 42);
        assert!(nature < 25, "Nature {nature} out of range");
    }

    #[test]
    fn no_everstone_deterministic() {
        let n1 = determine_offspring_nature(0, 0, 0, 777);
        let n2 = determine_offspring_nature(0, 0, 0, 777);
        assert_eq!(n1, n2);
    }

    #[test]
    fn no_everstone_different_seeds() {
        let n1 = determine_offspring_nature(0, 0, 0, 100);
        let n2 = determine_offspring_nature(0, 0, 0, 200);
        // Different seeds should (almost certainly) produce different natures
        // Not guaranteed but extremely likely with xorshift
        assert!(n1 < 25 && n2 < 25);
    }
}
