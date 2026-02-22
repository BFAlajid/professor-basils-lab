/// Gen 3 internal species index → National Pokedex number
///
/// Pokemon 1-251 map 1:1. Gen 3 internal indices 277-411 map to National Dex 252-386.
/// Indices 252-276 are used for Unown forms and other internal entries in the game engine.
pub fn gen3_species_to_national(gen3_id: u16) -> u16 {
    match gen3_id {
        0 => 0,
        1..=251 => gen3_id,
        // Treecko line and other Hoenn starters that share index
        252..=260 => gen3_id,
        // Unown forms and internal entries — skip
        261..=276 => gen3_id, // pass through; validity check is done by caller
        // Gen 3 internal 277+ → National 252+
        277..=411 => gen3_id - 25, // 277-25=252, 411-25=386
        _ => gen3_id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_maps_to_zero() {
        assert_eq!(gen3_species_to_national(0), 0);
    }

    #[test]
    fn gen1_pokemon_pass_through() {
        assert_eq!(gen3_species_to_national(1), 1);     // Bulbasaur
        assert_eq!(gen3_species_to_national(25), 25);   // Pikachu
        assert_eq!(gen3_species_to_national(151), 151); // Mew
    }

    #[test]
    fn gen2_pokemon_pass_through() {
        assert_eq!(gen3_species_to_national(152), 152); // Chikorita
        assert_eq!(gen3_species_to_national(251), 251); // Celebi
    }

    #[test]
    fn hoenn_starters_pass_through() {
        assert_eq!(gen3_species_to_national(252), 252); // Treecko
        assert_eq!(gen3_species_to_national(255), 255); // Torchic
        assert_eq!(gen3_species_to_national(258), 258); // Mudkip
        assert_eq!(gen3_species_to_national(260), 260); // Swampert
    }

    #[test]
    fn unown_range_passes_through() {
        assert_eq!(gen3_species_to_national(261), 261);
        assert_eq!(gen3_species_to_national(276), 276);
    }

    #[test]
    fn gen3_internal_277_plus_maps_correctly() {
        assert_eq!(gen3_species_to_national(277), 252); // 277-25=252
        assert_eq!(gen3_species_to_national(300), 275); // 300-25=275
        assert_eq!(gen3_species_to_national(411), 386); // Deoxys
    }

    #[test]
    fn boundary_values() {
        assert_eq!(gen3_species_to_national(276), 276); // last in pass-through range
        assert_eq!(gen3_species_to_national(277), 252); // first in mapped range
        assert_eq!(gen3_species_to_national(411), 386); // last in mapped range
        assert_eq!(gen3_species_to_national(412), 412); // past mapped range, pass-through
    }

    #[test]
    fn high_ids_pass_through() {
        assert_eq!(gen3_species_to_national(500), 500);
        assert_eq!(gen3_species_to_national(u16::MAX), u16::MAX);
    }
}
