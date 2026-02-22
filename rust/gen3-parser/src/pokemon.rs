use serde::Serialize;

use crate::charset::decode_gen3_string;
use crate::species::gen3_species_to_national;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Gen3Pokemon {
    pub pid: u32,
    pub ot_id: u32,
    pub species: u16,
    pub nickname: String,
    pub level: u8,
    pub experience: u32,
    pub held_item: u16,
    pub moves: Vec<u16>,
    pub ivs: IVSpread,
    pub evs: EVSpread,
    pub ability_slot: u8,
    pub pokeball: u8,
    pub is_egg: bool,
    pub is_shiny: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IVSpread {
    pub hp: u8,
    pub attack: u8,
    pub defense: u8,
    pub sp_atk: u8,
    pub sp_def: u8,
    pub speed: u8,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EVSpread {
    pub hp: u8,
    pub attack: u8,
    pub defense: u8,
    pub sp_atk: u8,
    pub sp_def: u8,
    pub speed: u8,
}

/// Substructure order permutations based on PID % 24.
/// G = Growth (0), A = Attacks (1), E = EVs (2), M = Misc (3)
const SUBSTRUCTURE_ORDERS: [[u8; 4]; 24] = [
    [0, 1, 2, 3], // 0:  GAEM
    [0, 1, 3, 2], // 1:  GAME
    [0, 2, 1, 3], // 2:  GEAM
    [0, 2, 3, 1], // 3:  GEMA
    [0, 3, 1, 2], // 4:  GMAE
    [0, 3, 2, 1], // 5:  GMEA
    [1, 0, 2, 3], // 6:  AGEM
    [1, 0, 3, 2], // 7:  AGME
    [1, 2, 0, 3], // 8:  AEGM
    [1, 2, 3, 0], // 9:  AEMG
    [1, 3, 0, 2], // 10: AMGE
    [1, 3, 2, 0], // 11: AMEG
    [2, 0, 1, 3], // 12: EAGM
    [2, 0, 3, 1], // 13: EAMG
    [2, 1, 0, 3], // 14: EAGM
    [2, 1, 3, 0], // 15: EAMG
    [2, 3, 0, 1], // 16: EMGA
    [2, 3, 1, 0], // 17: EMAG
    [3, 0, 1, 2], // 18: MGAE
    [3, 0, 2, 1], // 19: MGEA
    [3, 1, 0, 2], // 20: MAGE
    [3, 1, 2, 0], // 21: MAEG
    [3, 2, 0, 1], // 22: MEGA
    [3, 2, 1, 0], // 23: MEAG
];

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

/// Decrypt the 48-byte encrypted substructure block.
/// XOR key = PID ^ OTID, applied per 4-byte chunk.
fn decrypt_substructures(encrypted: &[u8], pid: u32, ot_id: u32) -> [u8; 48] {
    let key = pid ^ ot_id;
    let mut decrypted = [0u8; 48];

    for i in (0..48).step_by(4) {
        let chunk = read_u32_le(encrypted, i);
        let dec = chunk ^ key;
        decrypted[i..i + 4].copy_from_slice(&dec.to_le_bytes());
    }

    decrypted
}

/// Convert experience to level using medium-fast growth rate (n^3) as approximation.
fn exp_to_level(exp: u32) -> u8 {
    for level in 1u32..=100 {
        if exp < level * level * level {
            return level.saturating_sub(1).max(1) as u8;
        }
    }
    100
}

/// Decrypt and parse a single Pokemon data block.
/// `is_party`: true for party Pokemon (100 bytes), false for PC Pokemon (80 bytes).
pub fn decrypt_pokemon_data(data: &[u8], is_party: bool) -> Option<Gen3Pokemon> {
    if data.len() < 80 {
        return None;
    }

    let pid = read_u32_le(data, 0);
    let ot_id = read_u32_le(data, 4);

    // All zeros = empty slot
    if pid == 0 && ot_id == 0 {
        return None;
    }

    let nickname = decode_gen3_string(data, 8, 10);

    // Decrypt substructure data (bytes 32-79)
    let decrypted = decrypt_substructures(&data[32..80], pid, ot_id);

    // Determine substructure order
    let order_index = (pid % 24) as usize;
    let order = &SUBSTRUCTURE_ORDERS[order_index];

    // Find position of each substructure type
    // order[i] = what substructure type is at position i
    // positions[type] = which position has that type
    let mut positions = [0usize; 4];
    for (i, &sub_type) in order.iter().enumerate() {
        positions[sub_type as usize] = i;
    }

    // Growth substructure (type 0)
    let growth_off = positions[0] * 12;
    let raw_species = read_u16_le(&decrypted, growth_off);
    let species = gen3_species_to_national(raw_species);
    let held_item = read_u16_le(&decrypted, growth_off + 2);
    let experience = read_u32_le(&decrypted, growth_off + 4);

    if species == 0 || species > 440 {
        return None;
    }

    // Attacks substructure (type 1)
    let attack_off = positions[1] * 12;
    let moves: Vec<u16> = [
        read_u16_le(&decrypted, attack_off),
        read_u16_le(&decrypted, attack_off + 2),
        read_u16_le(&decrypted, attack_off + 4),
        read_u16_le(&decrypted, attack_off + 6),
    ]
    .iter()
    .copied()
    .filter(|&m| m > 0)
    .collect();

    // EVs substructure (type 2)
    let ev_off = positions[2] * 12;
    let evs = EVSpread {
        hp: decrypted[ev_off],
        attack: decrypted[ev_off + 1],
        defense: decrypted[ev_off + 2],
        speed: decrypted[ev_off + 3],
        sp_atk: decrypted[ev_off + 4],
        sp_def: decrypted[ev_off + 5],
    };

    // Misc substructure (type 3)
    let misc_off = positions[3] * 12;
    let origins_info = read_u16_le(&decrypted, misc_off + 2);
    let ball_caught = ((origins_info >> 11) & 0xF) as u8;

    // IV data (32-bit packed field)
    let iv_data = read_u32_le(&decrypted, misc_off + 4);
    let ivs = IVSpread {
        hp: (iv_data & 0x1F) as u8,
        attack: ((iv_data >> 5) & 0x1F) as u8,
        defense: ((iv_data >> 10) & 0x1F) as u8,
        speed: ((iv_data >> 15) & 0x1F) as u8,
        sp_atk: ((iv_data >> 20) & 0x1F) as u8,
        sp_def: ((iv_data >> 25) & 0x1F) as u8,
    };
    let is_egg = (iv_data >> 30) & 1 == 1;
    let ability_bit = ((iv_data >> 31) & 1) as u8;

    // Shiny check
    let tid = (ot_id & 0xFFFF) as u16;
    let sid = ((ot_id >> 16) & 0xFFFF) as u16;
    let is_shiny = (tid ^ sid ^ ((pid >> 16) as u16) ^ (pid as u16)) < 8;

    // Level
    let level = if is_party && data.len() >= 100 {
        data[84]
    } else {
        exp_to_level(experience)
    };

    Some(Gen3Pokemon {
        pid,
        ot_id,
        species,
        nickname,
        level,
        experience,
        held_item,
        moves,
        ivs,
        evs,
        ability_slot: ability_bit,
        pokeball: ball_caught,
        is_egg,
        is_shiny,
    })
}

/// Test helper module — accessible from other modules' tests via `crate::pokemon::test_helpers`.
#[cfg(test)]
pub(crate) mod test_helpers {
    use super::*;

    fn write_u16_le(buf: &mut [u8], offset: usize, val: u16) {
        buf[offset..offset + 2].copy_from_slice(&val.to_le_bytes());
    }

    fn write_u32_le(buf: &mut [u8], offset: usize, val: u32) {
        buf[offset..offset + 4].copy_from_slice(&val.to_le_bytes());
    }

    /// Build a synthetic Pokemon data block with known values.
    /// Returns 100-byte party data (or 80-byte PC data if `party` is false).
    pub fn build_pokemon_data(
        pid: u32,
        ot_id: u32,
        species: u16,
        held_item: u16,
        experience: u32,
        moves: [u16; 4],
        evs: [u8; 6], // hp, atk, def, spd, spa, spd
        iv_data: u32,  // packed IV field (includes egg+ability bits)
        origins_info: u16, // contains ball caught in bits 11-14
        party: bool,
        party_level: u8,
    ) -> Vec<u8> {
        let size = if party { 100 } else { 80 };
        let mut data = vec![0u8; size];

        // Header (bytes 0-31)
        write_u32_le(&mut data, 0, pid);
        write_u32_le(&mut data, 4, ot_id);
        // Nickname at bytes 8-17: "ABCDE" + terminators
        data[8] = 0xBB;  // A
        data[9] = 0xBC;  // B
        data[10] = 0xBD; // C
        data[11] = 0xBE; // D
        data[12] = 0xBF; // E
        data[13] = 0xFF; // terminator
        // Bytes 14-31: padding/unused

        // Build 4 plaintext substructures (12 bytes each)
        let mut growth = [0u8; 12];
        write_u16_le(&mut growth, 0, species);
        write_u16_le(&mut growth, 2, held_item);
        write_u32_le(&mut growth, 4, experience);

        let mut attacks = [0u8; 12];
        write_u16_le(&mut attacks, 0, moves[0]);
        write_u16_le(&mut attacks, 2, moves[1]);
        write_u16_le(&mut attacks, 4, moves[2]);
        write_u16_le(&mut attacks, 6, moves[3]);

        let mut ev_block = [0u8; 12];
        ev_block[0..6].copy_from_slice(&evs);

        let mut misc = [0u8; 12];
        write_u16_le(&mut misc, 2, origins_info);
        write_u32_le(&mut misc, 4, iv_data);

        // Arrange substructures according to PID % 24
        let order_index = (pid % 24) as usize;
        let order = &SUBSTRUCTURE_ORDERS[order_index];

        // order[position] = which substructure type is at that position
        // We need to place: G=0, A=1, E=2, M=3
        let subs = [&growth, &attacks, &ev_block, &misc];
        let mut plaintext = [0u8; 48];
        for pos in 0..4 {
            let sub_type = order[pos] as usize;
            plaintext[pos * 12..(pos + 1) * 12].copy_from_slice(subs[sub_type]);
        }

        // Encrypt: XOR each 4-byte chunk with key = PID ^ OTID
        let key = pid ^ ot_id;
        let mut encrypted = [0u8; 48];
        for i in (0..48).step_by(4) {
            let chunk = u32::from_le_bytes([
                plaintext[i], plaintext[i + 1], plaintext[i + 2], plaintext[i + 3],
            ]);
            let enc = chunk ^ key;
            encrypted[i..i + 4].copy_from_slice(&enc.to_le_bytes());
        }

        data[32..80].copy_from_slice(&encrypted);

        if party {
            data[84] = party_level;
        }

        data
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::test_helpers::build_pokemon_data;

    // --- Rejection tests ---

    #[test]
    fn rejects_data_too_small() {
        let data = vec![0u8; 79]; // needs at least 80
        assert!(decrypt_pokemon_data(&data, false).is_none());
    }

    #[test]
    fn rejects_empty_slot() {
        let data = vec![0u8; 80]; // PID=0, OTID=0
        assert!(decrypt_pokemon_data(&data, false).is_none());
    }

    #[test]
    fn rejects_species_zero() {
        let data = build_pokemon_data(
            1, 1,        // PID=1, OTID=1 (not empty slot)
            0, 0, 1000,  // species=0 (invalid)
            [1, 0, 0, 0], [0; 6], 0, 0, false, 0,
        );
        assert!(decrypt_pokemon_data(&data, false).is_none());
    }

    #[test]
    fn rejects_species_over_440() {
        let data = build_pokemon_data(
            1, 1, 441, 0, 1000,
            [1, 0, 0, 0], [0; 6], 0, 0, false, 0,
        );
        assert!(decrypt_pokemon_data(&data, false).is_none());
    }

    // --- Successful parsing tests ---

    #[test]
    fn parse_basic_pc_pokemon() {
        // Bulbasaur (species=1), PID=24 (order index 0 = GAEM)
        let data = build_pokemon_data(
            24, 100,     // PID=24, OTID=100
            1, 0, 8000,  // species=1 (Bulbasaur), no item, 8000 exp
            [33, 45, 0, 0], // moves: Tackle(33), Growl(45)
            [10, 20, 30, 40, 50, 60], // EVs
            0b00000000_00000000_00000000_00011111, // all IVs: hp=31, rest=0
            0, false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.species, 1);
        assert_eq!(pokemon.pid, 24);
        assert_eq!(pokemon.ot_id, 100);
        assert_eq!(pokemon.nickname, "ABCDE");
        assert_eq!(pokemon.experience, 8000);
        assert_eq!(pokemon.held_item, 0);
        assert_eq!(pokemon.moves, vec![33, 45]); // zeros filtered out
        assert_eq!(pokemon.evs.hp, 10);
        assert_eq!(pokemon.evs.attack, 20);
        assert_eq!(pokemon.evs.defense, 30);
        assert_eq!(pokemon.evs.speed, 40);
        assert_eq!(pokemon.evs.sp_atk, 50);
        assert_eq!(pokemon.evs.sp_def, 60);
        assert_eq!(pokemon.ivs.hp, 31);
        assert_eq!(pokemon.ivs.attack, 0);
        assert!(!pokemon.is_egg);
        assert_eq!(pokemon.ability_slot, 0);
    }

    #[test]
    fn parse_party_pokemon_uses_level_from_data() {
        let data = build_pokemon_data(
            24, 100, 25, 0, 125000, // Pikachu, 125000 exp
            [84, 85, 86, 87], [0; 6], 0, 0,
            true, 50, // party with level=50 at byte 84
        );
        let pokemon = decrypt_pokemon_data(&data, true).expect("should parse");
        assert_eq!(pokemon.level, 50); // reads from byte 84, not exp
    }

    #[test]
    fn pc_pokemon_derives_level_from_experience() {
        // exp=8000 → medium-fast: level = floor(cbrt(8000)) = 20
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [84, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.level, 20); // 20^3 = 8000, so level 20
    }

    #[test]
    fn exp_to_level_edge_cases() {
        assert_eq!(exp_to_level(0), 1);         // minimum
        assert_eq!(exp_to_level(1), 1);         // below level 2 (8)
        assert_eq!(exp_to_level(7), 1);         // just under 2^3=8
        assert_eq!(exp_to_level(8), 2);         // exactly 2^3
        assert_eq!(exp_to_level(27), 3);        // exactly 3^3
        assert_eq!(exp_to_level(1000000), 100); // cap at 100
        assert_eq!(exp_to_level(999999), 99);   // 99^3=970299 < 999999 < 100^3=1000000
        assert_eq!(exp_to_level(u32::MAX), 100); // huge exp
    }

    // --- IV bit-packing tests ---

    #[test]
    fn all_perfect_ivs() {
        // All IVs = 31, no egg, ability slot 0
        let iv_data: u32 = 0x3FFFFFFF; // bits 0-29 all set
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], iv_data, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.ivs.hp, 31);
        assert_eq!(pokemon.ivs.attack, 31);
        assert_eq!(pokemon.ivs.defense, 31);
        assert_eq!(pokemon.ivs.speed, 31);
        assert_eq!(pokemon.ivs.sp_atk, 31);
        assert_eq!(pokemon.ivs.sp_def, 31);
        assert!(!pokemon.is_egg);
        assert_eq!(pokemon.ability_slot, 0);
    }

    #[test]
    fn all_zero_ivs() {
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.ivs.hp, 0);
        assert_eq!(pokemon.ivs.attack, 0);
        assert_eq!(pokemon.ivs.defense, 0);
        assert_eq!(pokemon.ivs.speed, 0);
        assert_eq!(pokemon.ivs.sp_atk, 0);
        assert_eq!(pokemon.ivs.sp_def, 0);
    }

    #[test]
    fn specific_iv_spread() {
        // hp=15, atk=31, def=0, spd=20, spa=10, spd=5
        let iv_data: u32 = 15
            | (31 << 5)
            | (0 << 10)
            | (20 << 15)
            | (10 << 20)
            | (5 << 25);
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], iv_data, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.ivs.hp, 15);
        assert_eq!(pokemon.ivs.attack, 31);
        assert_eq!(pokemon.ivs.defense, 0);
        assert_eq!(pokemon.ivs.speed, 20);
        assert_eq!(pokemon.ivs.sp_atk, 10);
        assert_eq!(pokemon.ivs.sp_def, 5);
    }

    #[test]
    fn egg_flag_set() {
        let iv_data: u32 = 1 << 30; // bit 30 = is_egg
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], iv_data, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert!(pokemon.is_egg);
        assert_eq!(pokemon.ability_slot, 0);
    }

    #[test]
    fn ability_slot_1() {
        let iv_data: u32 = 1 << 31; // bit 31 = ability slot
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], iv_data, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.ability_slot, 1);
        assert!(!pokemon.is_egg);
    }

    #[test]
    fn egg_and_ability_both_set() {
        let iv_data: u32 = (1 << 30) | (1 << 31);
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], iv_data, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert!(pokemon.is_egg);
        assert_eq!(pokemon.ability_slot, 1);
    }

    // --- Shiny detection tests ---

    #[test]
    fn shiny_when_xor_is_zero() {
        // For shiny: (TID ^ SID ^ PID_high ^ PID_low) < 8
        // TID=0, SID=0, PID=0x00000001 → XOR = 0 ^ 0 ^ 0 ^ 1 = 1 < 8 → shiny
        // But PID=1, OTID=0 → both not zero, so not empty slot
        let data = build_pokemon_data(
            1, 0x00000000, // PID=1, OTID=0 → TID=0, SID=0
            25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        // Wait: PID=1, OTID=0 → empty slot check: pid==0 && ot_id==0, this is pid=1 so OK
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        // XOR = 0 ^ 0 ^ 0 ^ 1 = 1 < 8 → shiny
        assert!(pokemon.is_shiny);
    }

    #[test]
    fn shiny_boundary_xor_equals_7() {
        // Need (TID ^ SID ^ PID_high ^ PID_low) = 7 → shiny
        // Let TID=7, SID=0 → OTID = 7
        // PID = 0x00000000 but PID=0 and OTID=7 is not empty (both must be 0)
        // XOR = 7 ^ 0 ^ 0 ^ 0 = 7 < 8 → shiny
        let data = build_pokemon_data(
            0, 7,  // PID=0, OTID=7 → not empty (ot_id != 0)
            25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert!(pokemon.is_shiny);
    }

    #[test]
    fn not_shiny_boundary_xor_equals_8() {
        // (TID ^ SID ^ PID_high ^ PID_low) = 8 → NOT shiny
        // TID=8, SID=0 → OTID=8, PID=0
        let data = build_pokemon_data(
            0, 8,  // PID=0, OTID=8
            25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert!(!pokemon.is_shiny);
    }

    #[test]
    fn not_shiny_high_xor() {
        // TID=12345, SID=54321, PID=0xABCD1234
        // TID ^ SID = 12345 ^ 54321 = 58520
        // PID_high = 0xABCD = 43981, PID_low = 0x1234 = 4660
        // XOR = 58520 ^ 43981 ^ 4660 = ... definitely > 8
        let ot_id: u32 = 12345 | (54321 << 16);
        let data = build_pokemon_data(
            0xABCD1234, ot_id,
            25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert!(!pokemon.is_shiny);
    }

    // --- Substructure permutation tests ---

    #[test]
    fn all_24_permutations_parse_correctly() {
        // Test that every PID % 24 value produces a valid parse
        // with the same known data
        for perm in 0u32..24 {
            let pid = perm; // PID % 24 = perm
            let data = build_pokemon_data(
                pid, 100,
                25, 42, 27000, // Pikachu, item=42, exp=27000 (level 30)
                [84, 85, 86, 87], // 4 moves
                [10, 20, 30, 40, 50, 60],
                31 | (31 << 5) | (31 << 10) | (31 << 15) | (31 << 20) | (31 << 25), // all 31 IVs
                0,
                false, 0,
            );
            let pokemon = decrypt_pokemon_data(&data, false)
                .unwrap_or_else(|| panic!("permutation {} failed to parse", perm));

            assert_eq!(pokemon.species, 25, "perm {}: species", perm);
            assert_eq!(pokemon.held_item, 42, "perm {}: held_item", perm);
            assert_eq!(pokemon.experience, 27000, "perm {}: experience", perm);
            assert_eq!(pokemon.moves, vec![84, 85, 86, 87], "perm {}: moves", perm);
            assert_eq!(pokemon.evs.hp, 10, "perm {}: ev hp", perm);
            assert_eq!(pokemon.evs.sp_def, 60, "perm {}: ev spdef", perm);
            assert_eq!(pokemon.ivs.hp, 31, "perm {}: iv hp", perm);
            assert_eq!(pokemon.ivs.sp_def, 31, "perm {}: iv spdef", perm);
        }
    }

    // --- Ball caught extraction ---

    #[test]
    fn ball_caught_from_origins_info() {
        // Ball caught is in bits 11-14 of origins_info
        // Ultra Ball = 2, so origins_info = 2 << 11 = 0x1000
        let origins = 2u16 << 11;
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, origins,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.pokeball, 2); // Ultra Ball
    }

    #[test]
    fn ball_caught_master_ball() {
        let origins = 1u16 << 11; // Master Ball = 1
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, origins,
            false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.pokeball, 1);
    }

    // --- Move filtering ---

    #[test]
    fn moves_with_zeros_filtered() {
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [84, 0, 86, 0], // 2 real moves, 2 zeros
            [0; 6], 0, 0, false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.moves, vec![84, 86]);
    }

    #[test]
    fn single_move() {
        let data = build_pokemon_data(
            24, 100, 25, 0, 8000,
            [33, 0, 0, 0], [0; 6], 0, 0, false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.moves, vec![33]);
    }

    // --- Species mapping through parser ---

    #[test]
    fn gen3_internal_species_remapped() {
        // Internal ID 277 should map to National Dex 252 (Treecko)
        let data = build_pokemon_data(
            24, 100, 277, 0, 8000,
            [1, 0, 0, 0], [0; 6], 0, 0, false, 0,
        );
        let pokemon = decrypt_pokemon_data(&data, false).expect("should parse");
        assert_eq!(pokemon.species, 252);
    }

    // --- Encryption correctness ---

    #[test]
    fn decryption_is_inverse_of_encryption() {
        let pid: u32 = 0xDEADBEEF;
        let ot_id: u32 = 0xCAFEBABE;
        let key = pid ^ ot_id;

        // Create known plaintext
        let mut plaintext = [0u8; 48];
        for (i, byte) in plaintext.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(7);
        }

        // Encrypt
        let mut encrypted = [0u8; 48];
        for i in (0..48).step_by(4) {
            let chunk = u32::from_le_bytes([
                plaintext[i], plaintext[i + 1], plaintext[i + 2], plaintext[i + 3],
            ]);
            let enc = chunk ^ key;
            encrypted[i..i + 4].copy_from_slice(&enc.to_le_bytes());
        }

        // Decrypt
        let decrypted = decrypt_substructures(&encrypted, pid, ot_id);
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn xor_with_zero_key_is_identity() {
        // PID ^ OTID = 0 means encryption does nothing
        let pid: u32 = 0x12345678;
        let ot_id: u32 = 0x12345678; // same as PID → key = 0

        let mut plaintext = [0u8; 48];
        for (i, byte) in plaintext.iter_mut().enumerate() {
            *byte = i as u8;
        }

        let decrypted = decrypt_substructures(&plaintext, pid, ot_id);
        assert_eq!(plaintext, decrypted);
    }
}
