use wasm_bindgen::prelude::*;

/// The 18 Pokemon types in order:
///  0 = Normal,  1 = Fire,     2 = Water,    3 = Electric,
///  4 = Grass,   5 = Ice,      6 = Fighting, 7 = Poison,
///  8 = Ground,  9 = Flying,  10 = Psychic, 11 = Bug,
/// 12 = Rock,   13 = Ghost,   14 = Dragon,  15 = Dark,
/// 16 = Steel,  17 = Fairy

const NUM_TYPES: usize = 18;

/// Flat 18x18 effectiveness matrix.
/// MATRIX[atk * 18 + def] = multiplier (0.0, 0.5, 1.0, or 2.0).
#[rustfmt::skip]
const MATRIX: [f64; NUM_TYPES * NUM_TYPES] = [
    // Normal attacking
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 1.0,
    // Fire attacking
    1.0, 0.5, 0.5, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 2.0, 1.0,
    // Water attacking
    1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0, 1.0,
    // Electric attacking
    1.0, 1.0, 2.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0,
    // Grass attacking
    1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 1.0, 0.5, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 0.5, 1.0,
    // Ice attacking
    1.0, 0.5, 0.5, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0,
    // Fighting attacking
    2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 0.5, 0.5, 0.5, 2.0, 0.0, 1.0, 2.0, 2.0, 0.5,
    // Poison attacking
    1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 0.0, 2.0,
    // Ground attacking
    1.0, 2.0, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.0, 1.0, 0.5, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0,
    // Flying attacking
    1.0, 1.0, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 0.5, 1.0,
    // Psychic attacking
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 0.0, 0.5, 1.0,
    // Bug attacking
    1.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.5, 0.5, 1.0, 0.5, 2.0, 1.0, 1.0, 0.5, 1.0, 2.0, 0.5, 0.5,
    // Rock attacking
    1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0,
    // Ghost attacking
    0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0,
    // Dragon attacking
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 0.0,
    // Dark attacking
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 0.5, 0.5,
    // Steel attacking
    1.0, 0.5, 0.5, 0.5, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 0.5, 2.0,
    // Fairy attacking
    1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 0.5, 1.0,
];

/// Get effectiveness multiplier of attack type vs defend type.
/// Types are passed as u8 indices (0 = Normal through 17 = Fairy).
/// Returns 1.0 (neutral) for out-of-range indices.
#[wasm_bindgen]
pub fn get_effectiveness(atk_type: u8, def_type: u8) -> f64 {
    let a = atk_type as usize;
    let d = def_type as usize;
    if a >= NUM_TYPES || d >= NUM_TYPES {
        return 1.0;
    }
    MATRIX[a * NUM_TYPES + d]
}

/// Get the combined defensive multiplier of an attack type vs a dual-type defender.
/// `def_type1` is the primary type index (0-17).
/// `def_type2` is the secondary type index, or -1 for single-type Pokemon.
/// Returns the product of individual effectiveness values.
#[wasm_bindgen]
pub fn get_defensive_multiplier(atk_type: u8, def_type1: u8, def_type2: i8) -> f64 {
    let mut mult = get_effectiveness(atk_type, def_type1);
    if def_type2 >= 0 {
        mult *= get_effectiveness(atk_type, def_type2 as u8);
    }
    mult
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fire_vs_grass() {
        assert_eq!(get_effectiveness(1, 4), 2.0); // fire vs grass = 2x
    }

    #[test]
    fn test_normal_vs_ghost() {
        assert_eq!(get_effectiveness(0, 13), 0.0); // normal vs ghost = 0x (immune)
    }

    #[test]
    fn test_fire_vs_water() {
        assert_eq!(get_effectiveness(1, 2), 0.5); // fire vs water = 0.5x
    }

    #[test]
    fn test_neutral() {
        assert_eq!(get_effectiveness(0, 1), 1.0); // normal vs fire = 1x
    }

    #[test]
    fn test_defensive_dual_type() {
        // fire vs grass/poison = 2.0 * 1.0 = 2.0
        assert_eq!(get_defensive_multiplier(1, 4, 7), 2.0);
    }

    #[test]
    fn test_defensive_single_type() {
        // fire vs grass (single) = 2.0
        assert_eq!(get_defensive_multiplier(1, 4, -1), 2.0);
    }

    #[test]
    fn test_ground_vs_fire_steel() {
        // ground vs fire/steel = 2.0 * 2.0 = 4.0
        assert_eq!(get_defensive_multiplier(8, 1, 16), 4.0);
    }

    #[test]
    fn test_out_of_range() {
        assert_eq!(get_effectiveness(99, 0), 1.0); // invalid type defaults to 1.0
    }
}
