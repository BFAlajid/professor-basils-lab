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

fn xorshift32(state: &mut u32) -> u32 {
    let mut s = *state;
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    *state = s;
    s
}

#[wasm_bindgen]
pub fn check_compatibility(
    groups1: &[u8],
    groups2: &[u8],
    is_ditto1: bool,
    is_ditto2: bool,
) -> u8 {
    if !is_authorized() { return 0; }

    if is_ditto1 && is_ditto2 {
        return 0;
    }

    const NO_EGGS: u8 = 15;
    if groups1.contains(&NO_EGGS) || groups2.contains(&NO_EGGS) {
        return 0;
    }

    if is_ditto1 || is_ditto2 {
        return 2;
    }

    for g1 in groups1 {
        for g2 in groups2 {
            if g1 == g2 && *g1 != 255 {
                return 1;
            }
        }
    }

    0
}

#[wasm_bindgen]
pub fn inherit_ivs(
    parent1_ivs: &[u8],
    parent2_ivs: &[u8],
    has_destiny_knot: bool,
    seed: u32,
) -> Vec<u8> {
    let mut rng = if seed == 0 { 12345 } else { seed };
    let num_inherited: usize = if has_destiny_knot { 5 } else { 3 };

    let mut indices: [u8; 6] = [0, 1, 2, 3, 4, 5];
    for i in (1..6).rev() {
        let j = (xorshift32(&mut rng) as usize) % (i + 1);
        indices.swap(i, j);
    }

    let mut result_ivs: [u8; 6] = [0; 6];
    for iv in result_ivs.iter_mut() {
        *iv = (xorshift32(&mut rng) % 32) as u8;
    }

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
        inherited_info.push(stat as u8);
        inherited_info.push(from_parent);
    }

    for iv in &result_ivs {
        inherited_info.push(*iv);
    }

    inherited_info
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn two_dittos_cannot_breed() {
        assert_eq!(check_compatibility(&[1], &[1], true, true), 0);
    }

    #[test]
    fn ditto_breeds_with_anything() {
        assert_eq!(check_compatibility(&[1], &[2], true, false), 2);
        assert_eq!(check_compatibility(&[3], &[4], false, true), 2);
    }

    #[test]
    fn shared_egg_group_compatible() {
        assert_eq!(check_compatibility(&[1, 3], &[3, 5], false, false), 1);
    }

    #[test]
    fn no_shared_egg_group_incompatible() {
        assert_eq!(check_compatibility(&[1], &[2], false, false), 0);
    }

    #[test]
    fn undiscovered_egg_group_incompatible() {
        assert_eq!(check_compatibility(&[15], &[1], false, false), 0);
        assert_eq!(check_compatibility(&[1], &[15], false, false), 0);
    }

    #[test]
    fn sentinel_255_ignored_in_egg_groups() {
        assert_eq!(check_compatibility(&[255], &[255], false, false), 0);
    }

    #[test]
    fn destiny_knot_result_size() {
        let result = inherit_ivs(&[31; 6], &[0; 6], true, 42);
        assert_eq!(result.len(), 16); // 5 pairs + 6 IVs
    }

    #[test]
    fn no_destiny_knot_result_size() {
        let result = inherit_ivs(&[31; 6], &[0; 6], false, 42);
        assert_eq!(result.len(), 12); // 3 pairs + 6 IVs
    }

    #[test]
    fn inherit_ivs_deterministic() {
        let r1 = inherit_ivs(&[31; 6], &[0; 6], true, 42);
        let r2 = inherit_ivs(&[31; 6], &[0; 6], true, 42);
        assert_eq!(r1, r2);
    }

    #[test]
    fn inherit_ivs_parents_valid() {
        let result = inherit_ivs(&[31; 6], &[0; 6], true, 42);
        for i in 0..5 {
            let parent = result[i * 2 + 1];
            assert!(parent == 1 || parent == 2);
        }
    }

    #[test]
    fn inherit_ivs_stat_indices_valid() {
        let result = inherit_ivs(&[31; 6], &[0; 6], true, 42);
        for i in 0..5 {
            assert!(result[i * 2] < 6);
        }
    }

    #[test]
    fn inherited_stats_match_parent_values() {
        let p1 = [31, 30, 29, 28, 27, 26];
        let p2 = [0, 1, 2, 3, 4, 5];
        let result = inherit_ivs(&p1, &p2, true, 42);
        let ivs_start = 10;
        for i in 0..5 {
            let stat = result[i * 2] as usize;
            let parent = result[i * 2 + 1];
            let expected = if parent == 1 { p1[stat] } else { p2[stat] };
            assert_eq!(result[ivs_start + stat], expected);
        }
    }

    #[test]
    fn random_ivs_in_range() {
        let result = inherit_ivs(&[31; 6], &[31; 6], false, 12345);
        for i in 6..12 {
            assert!(result[i] < 32);
        }
    }

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
        assert!(nature < 25);
    }

    #[test]
    fn no_everstone_deterministic() {
        let n1 = determine_offspring_nature(10, 20, 0, 42);
        let n2 = determine_offspring_nature(10, 20, 0, 42);
        assert_eq!(n1, n2);
    }

    #[test]
    fn no_everstone_different_seeds_vary() {
        let mut found_diff = false;
        for seed in 1..=50 {
            let n1 = determine_offspring_nature(10, 20, 0, seed);
            let n2 = determine_offspring_nature(10, 20, 0, seed + 1000);
            if n1 != n2 { found_diff = true; break; }
        }
        assert!(found_diff);
    }
}

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
