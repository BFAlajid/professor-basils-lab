use serde::Serialize;

/// GBA ROM header game code offset
const GAME_CODE_OFFSET: usize = 0xAC;

/// GBA ROM base address mask — pointers in ROM have 0x08000000 base
const ROM_BASE_MASK: u32 = 0x01FF_FFFF;

/// Minimum expected ROM size (16 MB)
const MIN_ROM_SIZE: usize = 16 * 1024 * 1024;

/// Supported game codes
const GAME_CODE_FIRERED: &[u8; 4] = b"BPRE";
const GAME_CODE_LEAFGREEN: &[u8; 4] = b"BPGE";
const GAME_CODE_EMERALD: &[u8; 4] = b"BPEE";
const GAME_CODE_RUBY: &[u8; 4] = b"AXVE";
const GAME_CODE_SAPPHIRE: &[u8; 4] = b"AXPE";

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameVersion {
    FireRed,
    LeafGreen,
    Emerald,
    Ruby,
    Sapphire,
}

/// Key ROM offsets that vary by game version
#[derive(Debug, Clone)]
pub struct RomOffsets {
    pub map_bank_table: usize,
    pub wild_encounter_table: usize,
    pub overworld_graphics_table: usize,
    pub map_label_table: usize,
}

impl RomOffsets {
    pub fn for_game(version: GameVersion) -> Self {
        match version {
            GameVersion::FireRed | GameVersion::LeafGreen => RomOffsets {
                map_bank_table: 0x05524C,
                wild_encounter_table: 0x3C9CB8,
                overworld_graphics_table: 0x39FDB0,
                map_label_table: 0x3F1CAC,
            },
            GameVersion::Emerald => RomOffsets {
                map_bank_table: 0x084AA4,
                wild_encounter_table: 0x552D48,
                overworld_graphics_table: 0x509954,
                map_label_table: 0x5A1480,
            },
            GameVersion::Ruby | GameVersion::Sapphire => RomOffsets {
                map_bank_table: 0x053404,
                wild_encounter_table: 0x39D454,
                overworld_graphics_table: 0x3646F8,
                map_label_table: 0x3E73CC,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RomInfo {
    pub game_code: String,
    pub title: String,
    pub version: String,
    pub is_supported: bool,
}

/// Detect the game version from a ROM buffer
pub fn detect_game(data: &[u8]) -> Option<GameVersion> {
    if data.len() < GAME_CODE_OFFSET + 4 {
        return None;
    }
    let code = &data[GAME_CODE_OFFSET..GAME_CODE_OFFSET + 4];
    match code {
        c if c == GAME_CODE_FIRERED => Some(GameVersion::FireRed),
        c if c == GAME_CODE_LEAFGREEN => Some(GameVersion::LeafGreen),
        c if c == GAME_CODE_EMERALD => Some(GameVersion::Emerald),
        c if c == GAME_CODE_RUBY => Some(GameVersion::Ruby),
        c if c == GAME_CODE_SAPPHIRE => Some(GameVersion::Sapphire),
        _ => None,
    }
}

/// Get human-readable ROM info
pub fn get_rom_info(data: &[u8]) -> RomInfo {
    let game_code = if data.len() >= GAME_CODE_OFFSET + 4 {
        String::from_utf8_lossy(&data[GAME_CODE_OFFSET..GAME_CODE_OFFSET + 4]).to_string()
    } else {
        String::new()
    };

    let title = if data.len() >= 0xAC {
        String::from_utf8_lossy(&data[0xA0..0xAC])
            .trim_end_matches('\0')
            .to_string()
    } else {
        String::new()
    };

    let version = detect_game(data);
    let version_name = match version {
        Some(GameVersion::FireRed) => "FireRed",
        Some(GameVersion::LeafGreen) => "LeafGreen",
        Some(GameVersion::Emerald) => "Emerald",
        Some(GameVersion::Ruby) => "Ruby",
        Some(GameVersion::Sapphire) => "Sapphire",
        None => "Unknown",
    };

    RomInfo {
        game_code,
        title,
        version: version_name.to_string(),
        is_supported: version.is_some() && data.len() >= MIN_ROM_SIZE,
    }
}

/// Validate that a ROM is large enough and has a recognized game code
pub fn validate_rom(data: &[u8]) -> Option<GameVersion> {
    if data.len() < MIN_ROM_SIZE {
        return None;
    }
    detect_game(data)
}

/// Read a u8 from the buffer at the given offset
#[inline]
pub fn read_u8(data: &[u8], offset: usize) -> Option<u8> {
    data.get(offset).copied()
}

/// Read a little-endian u16 from the buffer
#[inline]
pub fn read_u16_le(data: &[u8], offset: usize) -> Option<u16> {
    if offset + 2 > data.len() {
        return None;
    }
    Some(u16::from_le_bytes([data[offset], data[offset + 1]]))
}

/// Read a little-endian u32 from the buffer
#[inline]
pub fn read_u32_le(data: &[u8], offset: usize) -> Option<u32> {
    if offset + 4 > data.len() {
        return None;
    }
    Some(u32::from_le_bytes([
        data[offset],
        data[offset + 1],
        data[offset + 2],
        data[offset + 3],
    ]))
}

/// Read a GBA ROM pointer and convert to file offset.
/// GBA pointers have 0x08000000 base; returns None for null pointers.
#[inline]
pub fn read_ptr(data: &[u8], offset: usize) -> Option<usize> {
    let raw = read_u32_le(data, offset)?;
    if raw == 0 {
        return None;
    }
    let file_offset = (raw & ROM_BASE_MASK) as usize;
    if file_offset >= data.len() {
        return None;
    }
    Some(file_offset)
}

/// Check if a pointer at the given offset looks like compressed data (LZ77 magic)
pub fn is_compressed_at(data: &[u8], offset: usize) -> bool {
    data.get(offset) == Some(&0x10)
}

/// Returns true if the game version uses FireRed/LeafGreen struct layouts
pub fn is_frlg(version: GameVersion) -> bool {
    matches!(version, GameVersion::FireRed | GameVersion::LeafGreen)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rom_header(game_code: &[u8; 4]) -> Vec<u8> {
        let mut data = vec![0u8; MIN_ROM_SIZE];
        // Title at 0xA0
        let title = b"POKEMON FIRE";
        data[0xA0..0xA0 + title.len()].copy_from_slice(title);
        // Game code at 0xAC
        data[GAME_CODE_OFFSET..GAME_CODE_OFFSET + 4].copy_from_slice(game_code);
        data
    }

    #[test]
    fn detect_firered() {
        let rom = make_rom_header(b"BPRE");
        assert_eq!(detect_game(&rom), Some(GameVersion::FireRed));
    }

    #[test]
    fn detect_emerald() {
        let rom = make_rom_header(b"BPEE");
        assert_eq!(detect_game(&rom), Some(GameVersion::Emerald));
    }

    #[test]
    fn detect_leafgreen() {
        let rom = make_rom_header(b"BPGE");
        assert_eq!(detect_game(&rom), Some(GameVersion::LeafGreen));
    }

    #[test]
    fn detect_unknown() {
        let rom = make_rom_header(b"XXXX");
        assert_eq!(detect_game(&rom), None);
    }

    #[test]
    fn detect_too_small() {
        let data = vec![0u8; 16];
        assert_eq!(detect_game(&data), None);
    }

    #[test]
    fn validate_rom_size_check() {
        let mut rom = make_rom_header(b"BPRE");
        assert_eq!(validate_rom(&rom), Some(GameVersion::FireRed));
        rom.truncate(1024);
        assert_eq!(validate_rom(&rom), None);
    }

    #[test]
    fn rom_info_firered() {
        let rom = make_rom_header(b"BPRE");
        let info = get_rom_info(&rom);
        assert_eq!(info.game_code, "BPRE");
        assert_eq!(info.version, "FireRed");
        assert!(info.is_supported);
    }

    #[test]
    fn read_u16_le_works() {
        let data = [0x34, 0x12];
        assert_eq!(read_u16_le(&data, 0), Some(0x1234));
    }

    #[test]
    fn read_u32_le_works() {
        let data = [0x78, 0x56, 0x34, 0x12];
        assert_eq!(read_u32_le(&data, 0), Some(0x12345678));
    }

    #[test]
    fn read_ptr_masks_base() {
        // Pointer 0x08054321 should resolve to file offset 0x054321
        let mut data = vec![0u8; MIN_ROM_SIZE];
        data[0] = 0x21;
        data[1] = 0x43;
        data[2] = 0x05;
        data[3] = 0x08;
        assert_eq!(read_ptr(&data, 0), Some(0x054321));
    }

    #[test]
    fn read_ptr_null_returns_none() {
        let data = [0x00, 0x00, 0x00, 0x00];
        assert_eq!(read_ptr(&data, 0), None);
    }

    #[test]
    fn read_ptr_out_of_bounds_returns_none() {
        // Pointer to offset larger than data
        let mut buf = vec![0u8; 4];
        buf[0] = 0xFF;
        buf[1] = 0xFF;
        buf[2] = 0xFF;
        buf[3] = 0x08;
        assert_eq!(read_ptr(&buf, 0), None);
    }

    #[test]
    fn read_out_of_bounds() {
        let data = [0x01, 0x02];
        assert_eq!(read_u16_le(&data, 0), Some(0x0201));
        assert_eq!(read_u16_le(&data, 1), None);
        assert_eq!(read_u32_le(&data, 0), None);
        assert_eq!(read_u8(&data, 2), None);
    }

    #[test]
    fn offsets_for_firered() {
        let offsets = RomOffsets::for_game(GameVersion::FireRed);
        assert_eq!(offsets.map_bank_table, 0x05524C);
    }

    #[test]
    fn is_frlg_correct() {
        assert!(is_frlg(GameVersion::FireRed));
        assert!(is_frlg(GameVersion::LeafGreen));
        assert!(!is_frlg(GameVersion::Emerald));
        assert!(!is_frlg(GameVersion::Ruby));
    }
}
