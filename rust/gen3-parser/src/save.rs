use serde::Serialize;

use crate::charset::decode_gen3_string;
use crate::pokemon::{decrypt_pokemon_data, Gen3Pokemon};

const SECTION_SIZE: usize = 4096;
const SECTION_DATA_SIZE: usize = 3968;
const SECTIONS_PER_SLOT: usize = 14;
const SLOT_SIZE: usize = SECTION_SIZE * SECTIONS_PER_SLOT; // 57344

const SECTION_ID_OFFSET: usize = 0xFF4;
const SAVE_INDEX_OFFSET: usize = 0xFFC;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Gen3SaveData {
    pub game_code: String,
    pub trainer_name: String,
    pub trainer_id: u16,
    pub secret_id: u16,
    pub party_pokemon: Vec<Gen3Pokemon>,
    pub pc_box_pokemon: Vec<Vec<Gen3Pokemon>>,
    pub active_slot: u8,
}

/// Read a little-endian u16 from a byte slice.
#[inline]
fn read_u16_le(data: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([data[offset], data[offset + 1]])
}

/// Read a little-endian u32 from a byte slice.
#[inline]
fn read_u32_le(data: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        data[offset],
        data[offset + 1],
        data[offset + 2],
        data[offset + 3],
    ])
}

/// Determine which save slot is active (higher save index wins).
fn get_active_save_slot(buffer: &[u8]) -> u8 {
    let slot0_index = read_u32_le(buffer, SAVE_INDEX_OFFSET);
    let slot1_index = read_u32_le(buffer, SLOT_SIZE + SAVE_INDEX_OFFSET);
    if slot1_index > slot0_index {
        1
    } else {
        0
    }
}

/// Get ordered section data for the given save slot.
/// Returns array indexed by section ID (0-13) with raw section data (3968 bytes each).
fn get_section_data(buffer: &[u8], slot: u8) -> Vec<Option<Vec<u8>>> {
    let mut sections: Vec<Option<Vec<u8>>> = (0..SECTIONS_PER_SLOT).map(|_| None).collect();
    let slot_offset = (slot as usize) * SLOT_SIZE;

    for i in 0..SECTIONS_PER_SLOT {
        let section_start = slot_offset + i * SECTION_SIZE;
        if section_start + SECTION_SIZE > buffer.len() {
            continue;
        }
        let section_id = read_u16_le(buffer, section_start + SECTION_ID_OFFSET) as usize;
        if section_id < SECTIONS_PER_SLOT {
            sections[section_id] = Some(buffer[section_start..section_start + SECTION_DATA_SIZE].to_vec());
        }
    }

    sections
}

/// Parse trainer info from section 0.
fn parse_trainer_info(section0: &[u8]) -> (String, u16, u16) {
    let trainer_name = decode_gen3_string(section0, 0x00, 7);
    let trainer_id = read_u16_le(section0, 0x0A);
    let secret_id = read_u16_le(section0, 0x0C);
    (trainer_name, trainer_id, secret_id)
}

/// Parse party Pokemon from section 1.
/// Party count at offset 0x0234, party data starts at 0x0238.
/// Each party Pokemon is 100 bytes.
fn parse_party_pokemon(section1: &[u8]) -> Vec<Gen3Pokemon> {
    let party_count = read_u32_le(section1, 0x0234) as usize;
    let count = party_count.min(6);
    let mut pokemon = Vec::with_capacity(count);

    for i in 0..count {
        let offset = 0x0238 + i * 100;
        if offset + 100 > section1.len() {
            break;
        }
        let data = &section1[offset..offset + 100];
        if let Some(parsed) = decrypt_pokemon_data(data, true) {
            if parsed.species > 0 && parsed.species <= 440 {
                pokemon.push(parsed);
            }
        }
    }

    pokemon
}

/// Parse PC Box Pokemon from sections 5-13.
/// PC buffer: current box (4 bytes), then 14 boxes × 30 Pokemon × 80 bytes.
fn parse_pc_box_pokemon(sections: &[Option<Vec<u8>>]) -> Vec<Vec<Gen3Pokemon>> {
    // Assemble continuous PC buffer from sections 5-13
    let mut pc_buffer = Vec::new();
    for sec_id in 5..=13 {
        if let Some(ref data) = sections[sec_id] {
            pc_buffer.extend_from_slice(data);
        }
    }

    if pc_buffer.is_empty() {
        return Vec::new();
    }

    let data_start = 4; // skip current box index
    let pokemon_size = 80;
    let pokemon_per_box = 30;
    let num_boxes = 14;
    let mut boxes = Vec::with_capacity(num_boxes);

    for b in 0..num_boxes {
        let mut box_pokemon = Vec::new();
        for slot in 0..pokemon_per_box {
            let offset = data_start + (b * pokemon_per_box + slot) * pokemon_size;
            if offset + pokemon_size > pc_buffer.len() {
                break;
            }
            let data = &pc_buffer[offset..offset + pokemon_size];
            if let Some(parsed) = decrypt_pokemon_data(data, false) {
                if parsed.species > 0 && parsed.species <= 440 {
                    box_pokemon.push(parsed);
                }
            }
        }
        boxes.push(box_pokemon);
    }

    boxes
}

/// Main entry point: parse a Gen 3 save file from raw bytes.
///
/// Returns `None` for files that are too small, missing required sections,
/// or otherwise unparseable.
pub fn parse_gen3_save(buffer: &[u8]) -> Option<Gen3SaveData> {
    if buffer.len() < SLOT_SIZE {
        return None;
    }

    let active_slot = get_active_save_slot(buffer);
    let sections = get_section_data(buffer, active_slot);

    let section0 = sections[0].as_ref()?;
    let section1 = sections[1].as_ref()?;

    let (trainer_name, trainer_id, secret_id) = parse_trainer_info(section0);
    let party_pokemon = parse_party_pokemon(section1);
    let pc_box_pokemon = parse_pc_box_pokemon(&sections);

    Some(Gen3SaveData {
        game_code: "gen3".to_string(),
        trainer_name,
        trainer_id,
        secret_id,
        party_pokemon,
        pc_box_pokemon,
        active_slot,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Write a little-endian u16 into a byte buffer.
    fn write_u16_le(buf: &mut [u8], offset: usize, val: u16) {
        buf[offset..offset + 2].copy_from_slice(&val.to_le_bytes());
    }

    /// Write a little-endian u32 into a byte buffer.
    fn write_u32_le(buf: &mut [u8], offset: usize, val: u32) {
        buf[offset..offset + 4].copy_from_slice(&val.to_le_bytes());
    }

    /// Build a minimal synthetic 128KB Gen 3 save file.
    ///
    /// Creates both slots. `active_slot` determines which has the higher save index.
    /// Section ordering within a slot is sequential (section i stored at position i).
    fn build_save(
        active_slot: u8,
        trainer_name_bytes: &[u8],
        trainer_id: u16,
        secret_id: u16,
        party_pokemon_data: &[Vec<u8>], // each Vec is 100 bytes
    ) -> Vec<u8> {
        let mut buffer = vec![0u8; 128 * 1024]; // 128KB

        // Build both slots
        for slot in 0..2u8 {
            let slot_offset = (slot as usize) * SLOT_SIZE;
            let save_index = if slot == active_slot { 10u32 } else { 5u32 };

            for sec_id in 0..SECTIONS_PER_SLOT {
                let section_start = slot_offset + sec_id * SECTION_SIZE;

                // Write section ID in footer
                write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, sec_id as u16);
                // Write save index in footer
                write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, save_index);

                // Only fill section data for active slot
                if slot != active_slot {
                    continue;
                }

                match sec_id {
                    0 => {
                        // Section 0: Trainer info
                        let name_len = trainer_name_bytes.len().min(7);
                        buffer[section_start..section_start + name_len]
                            .copy_from_slice(&trainer_name_bytes[..name_len]);
                        if name_len < 7 {
                            buffer[section_start + name_len] = 0xFF; // terminator
                        }
                        // TID at 0x0A, SID at 0x0C
                        write_u16_le(&mut buffer, section_start + 0x0A, trainer_id);
                        write_u16_le(&mut buffer, section_start + 0x0C, secret_id);
                    }
                    1 => {
                        // Section 1: Party data
                        let count = party_pokemon_data.len().min(6);
                        write_u32_le(&mut buffer, section_start + 0x0234, count as u32);
                        for (i, pkmn) in party_pokemon_data.iter().take(6).enumerate() {
                            let offset = section_start + 0x0238 + i * 100;
                            let copy_len = pkmn.len().min(100);
                            buffer[offset..offset + copy_len].copy_from_slice(&pkmn[..copy_len]);
                        }
                    }
                    5..=13 => {
                        // Sections 5-13: PC Box data (leave empty / all zeros for now)
                    }
                    _ => {}
                }
            }
        }

        buffer
    }

    /// Build party Pokemon bytes that the parser can decrypt.
    fn build_simple_party_pokemon(species: u16, level: u8) -> Vec<u8> {
        crate::pokemon::test_helpers::build_pokemon_data(
            24, 100, species, 0, (level as u32).pow(3),
            [33, 0, 0, 0], [0; 6], 0, 0, true, level,
        )
    }

    // --- Save-level tests ---

    #[test]
    fn rejects_too_small_file() {
        let buffer = vec![0u8; 1000]; // way too small
        assert!(parse_gen3_save(&buffer).is_none());
    }

    #[test]
    fn rejects_file_just_under_slot_size() {
        let buffer = vec![0u8; SLOT_SIZE - 1];
        assert!(parse_gen3_save(&buffer).is_none());
    }

    #[test]
    fn parses_slot0_active() {
        let save = build_save(
            0,
            &[0xBB, 0xBC, 0xBD], // "ABC"
            12345,
            54321,
            &[build_simple_party_pokemon(25, 50)],
        );
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.active_slot, 0);
        assert_eq!(result.trainer_name, "ABC");
        assert_eq!(result.trainer_id, 12345);
        assert_eq!(result.secret_id, 54321);
        assert_eq!(result.party_pokemon.len(), 1);
        assert_eq!(result.party_pokemon[0].species, 25);
        assert_eq!(result.party_pokemon[0].level, 50);
    }

    #[test]
    fn parses_slot1_active() {
        let save = build_save(
            1,
            &[0xCA, 0xBF, 0xBF, 0xBE], // "PEED"
            100,
            200,
            &[build_simple_party_pokemon(1, 5)],
        );
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.active_slot, 1);
        assert_eq!(result.trainer_id, 100);
        assert_eq!(result.party_pokemon.len(), 1);
        assert_eq!(result.party_pokemon[0].species, 1); // Bulbasaur
    }

    #[test]
    fn empty_party() {
        let save = build_save(0, &[0xBB], 1, 2, &[]);
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.party_pokemon.len(), 0);
    }

    #[test]
    fn full_party_of_six() {
        let party: Vec<Vec<u8>> = (1..=6)
            .map(|i| build_simple_party_pokemon(i as u16, 10 * i as u8))
            .collect();
        let save = build_save(0, &[0xBB], 1, 2, &party);
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.party_pokemon.len(), 6);
        for (i, pkmn) in result.party_pokemon.iter().enumerate() {
            assert_eq!(pkmn.species, (i + 1) as u16);
            assert_eq!(pkmn.level, 10 * (i + 1) as u8);
        }
    }

    #[test]
    fn party_count_capped_at_six() {
        // Even if party count says 10, we only read 6
        let party: Vec<Vec<u8>> = (1..=6)
            .map(|i| build_simple_party_pokemon(i as u16, 50))
            .collect();
        let mut save = build_save(0, &[0xBB], 1, 2, &party);
        // Overwrite party count to 10
        let section1_start = 1 * SECTION_SIZE; // section 1 is at position 1 (sequential)
        write_u32_le(&mut save, section1_start + 0x0234, 10);
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.party_pokemon.len(), 6); // capped
    }

    #[test]
    fn scrambled_section_order() {
        // Build a save where sections are stored in reverse order within the slot
        let mut buffer = vec![0u8; 128 * 1024];

        // Slot 0: sections stored in reverse order (13, 12, 11, ..., 0)
        for sec_id in 0..SECTIONS_PER_SLOT {
            let storage_pos = SECTIONS_PER_SLOT - 1 - sec_id; // reversed
            let section_start = storage_pos * SECTION_SIZE;

            // Section ID identifies what this section actually is
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, sec_id as u16);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 10);

            if sec_id == 0 {
                // Trainer: "RED"
                buffer[section_start] = 0xCC; // R
                buffer[section_start + 1] = 0xBF; // E
                buffer[section_start + 2] = 0xBE; // D
                buffer[section_start + 3] = 0xFF; // terminator
                write_u16_le(&mut buffer, section_start + 0x0A, 999);
                write_u16_le(&mut buffer, section_start + 0x0C, 111);
            } else if sec_id == 1 {
                // 1 party Pokemon
                write_u32_le(&mut buffer, section_start + 0x0234, 1);
                let pkmn = build_simple_party_pokemon(6, 36); // Charizard
                buffer[section_start + 0x0238..section_start + 0x0238 + 100]
                    .copy_from_slice(&pkmn[..100]);
            }
        }

        // Slot 1: lower save index
        for i in 0..SECTIONS_PER_SLOT {
            let section_start = SLOT_SIZE + i * SECTION_SIZE;
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, i as u16);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 5);
        }

        let result = parse_gen3_save(&buffer).expect("should parse scrambled sections");
        assert_eq!(result.trainer_name, "RED");
        assert_eq!(result.trainer_id, 999);
        assert_eq!(result.secret_id, 111);
        assert_eq!(result.party_pokemon.len(), 1);
        assert_eq!(result.party_pokemon[0].species, 6);
    }

    #[test]
    fn missing_section0_returns_none() {
        let mut buffer = vec![0u8; 128 * 1024];
        // Set up all sections EXCEPT section 0 (use invalid ID 99)
        for i in 0..SECTIONS_PER_SLOT {
            let section_start = i * SECTION_SIZE;
            let sec_id = if i == 0 { 99u16 } else { i as u16 }; // invalid section 0
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, sec_id);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 10);
        }
        // Slot 1: lower
        for i in 0..SECTIONS_PER_SLOT {
            let section_start = SLOT_SIZE + i * SECTION_SIZE;
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, i as u16);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 5);
        }
        assert!(parse_gen3_save(&buffer).is_none());
    }

    #[test]
    fn missing_section1_returns_none() {
        let mut buffer = vec![0u8; 128 * 1024];
        for i in 0..SECTIONS_PER_SLOT {
            let section_start = i * SECTION_SIZE;
            let sec_id = if i == 1 { 99u16 } else { i as u16 }; // invalid section 1
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, sec_id);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 10);
        }
        for i in 0..SECTIONS_PER_SLOT {
            let section_start = SLOT_SIZE + i * SECTION_SIZE;
            write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, i as u16);
            write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 5);
        }
        assert!(parse_gen3_save(&buffer).is_none());
    }

    #[test]
    fn pc_boxes_empty_when_sections_empty() {
        let save = build_save(0, &[0xBB], 1, 2, &[build_simple_party_pokemon(25, 50)]);
        let result = parse_gen3_save(&save).expect("should parse");
        // PC sections exist but contain all zeros → no valid Pokemon
        assert_eq!(result.pc_box_pokemon.len(), 14); // 14 boxes
        for b in &result.pc_box_pokemon {
            assert!(b.is_empty()); // all empty
        }
    }

    #[test]
    fn game_code_always_gen3() {
        let save = build_save(0, &[0xBB], 1, 2, &[]);
        let result = parse_gen3_save(&save).expect("should parse");
        assert_eq!(result.game_code, "gen3");
    }

    #[test]
    fn save_index_tie_goes_to_slot0() {
        // Both slots have same save index → slot 0 wins (not strictly greater)
        let mut buffer = vec![0u8; 128 * 1024];
        for slot in 0..2u8 {
            let slot_offset = (slot as usize) * SLOT_SIZE;
            for i in 0..SECTIONS_PER_SLOT {
                let section_start = slot_offset + i * SECTION_SIZE;
                write_u16_le(&mut buffer, section_start + SECTION_ID_OFFSET, i as u16);
                write_u32_le(&mut buffer, section_start + SAVE_INDEX_OFFSET, 10); // tie!
            }
        }
        // Put trainer name in slot 0
        buffer[0] = 0xBB; // 'A'
        buffer[1] = 0xFF;
        write_u16_le(&mut buffer, 0x0A, 111);
        // Put different trainer name in slot 1
        buffer[SLOT_SIZE] = 0xBC; // 'B'
        buffer[SLOT_SIZE + 1] = 0xFF;
        write_u16_le(&mut buffer, SLOT_SIZE + 0x0A, 222);

        // Need section 1 with party count = 0
        let result = parse_gen3_save(&buffer).expect("should parse");
        assert_eq!(result.active_slot, 0);
        assert_eq!(result.trainer_name, "A");
        assert_eq!(result.trainer_id, 111);
    }
}

