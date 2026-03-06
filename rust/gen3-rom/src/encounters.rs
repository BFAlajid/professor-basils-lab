use serde::Serialize;

use crate::rom::{read_ptr, read_u8, read_u16_le, GameVersion, RomOffsets};

/// Number of land encounter slots
const LAND_SLOTS: usize = 12;
/// Number of water/rock smash encounter slots
const WATER_SLOTS: usize = 5;
/// Number of fishing encounter slots
const FISHING_SLOTS: usize = 10;
/// Size of a single WildPokemon entry (4 bytes)
const WILD_POKEMON_SIZE: usize = 4;

/// Probability distribution for land encounter slots (out of 100)
pub const LAND_SLOT_RATES: [u8; LAND_SLOTS] = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
/// Probability distribution for water/rock smash encounter slots
pub const WATER_SLOT_RATES: [u8; WATER_SLOTS] = [60, 30, 5, 4, 1];

/// A single wild encounter slot
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WildSlot {
    pub min_level: u8,
    pub max_level: u8,
    pub species_id: u16,
    pub rate: u8,
}

/// Encounter info for one method (land, water, etc.)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncounterInfo {
    pub encounter_rate: u8,
    pub slots: Vec<WildSlot>,
}

/// All wild encounter data for a map
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WildEncounters {
    pub land: Option<EncounterInfo>,
    pub water: Option<EncounterInfo>,
    pub rock_smash: Option<EncounterInfo>,
    pub fishing: Option<EncounterInfo>,
}

/// Remap Gen 3 internal species ID to National Dex number.
/// Same logic as gen3-parser's species.rs.
fn remap_species(gen3_id: u16) -> u16 {
    match gen3_id {
        0 => 0,
        1..=251 => gen3_id,
        252..=276 => gen3_id,
        277..=411 => gen3_id - 25,
        _ => gen3_id,
    }
}

/// Parse encounter slots from ROM data
fn parse_encounter_slots(
    data: &[u8],
    info_ptr: usize,
    slot_count: usize,
    rates: &[u8],
) -> Option<EncounterInfo> {
    if info_ptr + 4 > data.len() {
        return None;
    }

    let encounter_rate = read_u8(data, info_ptr)?;
    // 3 bytes padding
    let slots_ptr = read_ptr(data, info_ptr + 4)?;

    let mut slots = Vec::with_capacity(slot_count);
    for i in 0..slot_count {
        let offset = slots_ptr + i * WILD_POKEMON_SIZE;
        if offset + WILD_POKEMON_SIZE > data.len() {
            break;
        }

        let min_level = read_u8(data, offset)?;
        let max_level = read_u8(data, offset + 1)?;
        let raw_species = read_u16_le(data, offset + 2)?;
        let species_id = remap_species(raw_species);

        let rate = if i < rates.len() { rates[i] } else { 0 };

        slots.push(WildSlot {
            min_level,
            max_level,
            species_id,
            rate,
        });
    }

    Some(EncounterInfo {
        encounter_rate,
        slots,
    })
}

/// Find and parse wild encounters for a specific map.
/// Scans the wild encounter header table for a matching (group, num).
pub fn get_wild_encounters(
    data: &[u8],
    version: GameVersion,
    group: u8,
    num: u8,
) -> Option<WildEncounters> {
    let offsets = RomOffsets::for_game(version);
    let table_start = offsets.wild_encounter_table;

    if table_start >= data.len() {
        return None;
    }

    // Scan the header table — entries are variable-size structs terminated by 0xFF/0xFF
    // Structure per entry:
    //   byte 0: mapGroup
    //   byte 1: mapNum
    //   bytes 2-3: padding
    //   bytes 4-7: landMonsInfo pointer (or 0)
    //   bytes 8-11: waterMonsInfo pointer (or 0)
    //   bytes 12-15: rockSmashMonsInfo pointer (or 0)
    //   bytes 16-19: fishingMonsInfo pointer (or 0)
    let entry_size = 20;
    let mut offset = table_start;

    loop {
        if offset + entry_size > data.len() {
            break;
        }

        let entry_group = read_u8(data, offset)?;
        let entry_num = read_u8(data, offset + 1)?;

        // Terminator
        if entry_group == 0xFF && entry_num == 0xFF {
            break;
        }

        if entry_group == group && entry_num == num {
            // Found matching entry
            let land = read_ptr(data, offset + 4)
                .and_then(|ptr| parse_encounter_slots(data, ptr, LAND_SLOTS, &LAND_SLOT_RATES));

            let water = read_ptr(data, offset + 8)
                .and_then(|ptr| parse_encounter_slots(data, ptr, WATER_SLOTS, &WATER_SLOT_RATES));

            let rock_smash = read_ptr(data, offset + 12)
                .and_then(|ptr| parse_encounter_slots(data, ptr, WATER_SLOTS, &WATER_SLOT_RATES));

            let fishing = read_ptr(data, offset + 16)
                .and_then(|ptr| parse_encounter_slots(data, ptr, FISHING_SLOTS, &[]));

            return Some(WildEncounters {
                land,
                water,
                rock_smash,
                fishing,
            });
        }

        offset += entry_size;
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remap_species_gen1() {
        assert_eq!(remap_species(1), 1);     // Bulbasaur
        assert_eq!(remap_species(25), 25);   // Pikachu
        assert_eq!(remap_species(151), 151); // Mew
    }

    #[test]
    fn remap_species_gen2() {
        assert_eq!(remap_species(152), 152); // Chikorita
        assert_eq!(remap_species(251), 251); // Celebi
    }

    #[test]
    fn remap_species_hoenn() {
        assert_eq!(remap_species(277), 252); // Treecko
        assert_eq!(remap_species(411), 386); // Deoxys
    }

    #[test]
    fn remap_species_zero() {
        assert_eq!(remap_species(0), 0);
    }

    #[test]
    fn slot_rates_sum_to_100() {
        let land_sum: u16 = LAND_SLOT_RATES.iter().map(|&r| r as u16).sum();
        assert_eq!(land_sum, 100);

        let water_sum: u16 = WATER_SLOT_RATES.iter().map(|&r| r as u16).sum();
        assert_eq!(water_sum, 100);
    }

    #[test]
    fn parse_encounter_slots_basic() {
        let mut data = vec![0u8; 256];

        // EncounterInfo at offset 0: rate=25, padding, slots_ptr
        data[0] = 25; // encounter_rate
        // slots pointer at offset 4 → 0x80
        data[4] = 0x80;
        data[7] = 0x08;

        // 2 wild Pokemon at offset 0x80
        // Slot 0: level 3-5, species 1 (Bulbasaur)
        data[0x80] = 3;  // min_level
        data[0x81] = 5;  // max_level
        data[0x82] = 1;  // species low
        data[0x83] = 0;  // species high
        // Slot 1: level 4-6, species 25 (Pikachu)
        data[0x84] = 4;
        data[0x85] = 6;
        data[0x86] = 25;
        data[0x87] = 0;

        let info = parse_encounter_slots(&data, 0, 2, &LAND_SLOT_RATES).unwrap();
        assert_eq!(info.encounter_rate, 25);
        assert_eq!(info.slots.len(), 2);
        assert_eq!(info.slots[0].min_level, 3);
        assert_eq!(info.slots[0].max_level, 5);
        assert_eq!(info.slots[0].species_id, 1);
        assert_eq!(info.slots[0].rate, 20); // first land slot = 20%
        assert_eq!(info.slots[1].species_id, 25);
        assert_eq!(info.slots[1].rate, 20); // second land slot = 20%
    }

    #[test]
    fn wild_encounters_no_match() {
        // Empty table terminated immediately
        let mut data = vec![0u8; 1024 * 1024 * 16]; // min ROM size
        let offsets = RomOffsets::for_game(GameVersion::FireRed);
        // Write terminator at table start
        data[offsets.wild_encounter_table] = 0xFF;
        data[offsets.wild_encounter_table + 1] = 0xFF;

        let result = get_wild_encounters(&data, GameVersion::FireRed, 3, 19);
        assert!(result.is_none());
    }
}
