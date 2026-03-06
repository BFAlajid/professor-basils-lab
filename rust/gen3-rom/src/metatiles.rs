use serde::Serialize;

use crate::rom::{read_u16_le, read_u32_le};
use crate::tiles::{decode_4bpp_tile, render_tile_rgba_flipped, TilesetHeader};

/// Metatile size in pixels
const METATILE_SIZE: usize = 16;
/// RGBA bytes per metatile layer
const METATILE_RGBA_BYTES: usize = METATILE_SIZE * METATILE_SIZE * 4;
/// Tile entries per metatile (2 layers × 2×2)
const TILES_PER_METATILE: usize = 8;
/// Bytes per metatile entry (8 u16 entries)
const METATILE_ENTRY_BYTES: usize = TILES_PER_METATILE * 2;
/// Bytes per 4bpp tile
const TILE_BYTES: usize = 32;

// Metatile behavior constants
pub const MB_NORMAL: u16 = 0x00;
pub const MB_TALL_GRASS: u16 = 0x02;
pub const MB_LONG_GRASS: u16 = 0x03;
pub const MB_SURF: u16 = 0x04;
pub const MB_DEEP_WATER: u16 = 0x05;
pub const MB_WATERFALL: u16 = 0x06;
pub const MB_ICE: u16 = 0x20;
pub const MB_SAND: u16 = 0x21;
pub const MB_LEDGE_SOUTH: u16 = 0x38;
pub const MB_LEDGE_NORTH: u16 = 0x39;
pub const MB_LEDGE_WEST: u16 = 0x3A;
pub const MB_LEDGE_EAST: u16 = 0x3B;
pub const MB_WARP_DOOR: u16 = 0x62;
pub const MB_WARP_ARROW: u16 = 0x63;
pub const MB_STAIRCASE: u16 = 0x64;

/// A decoded metatile ready for rendering
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodedMetatile {
    pub base_pixels: Vec<u8>,
    pub overlay_pixels: Vec<u8>,
    pub behavior: u16,
    pub passable: bool,
    pub is_grass: bool,
    pub is_water: bool,
    pub is_ledge: bool,
    pub ledge_direction: Option<String>,
}

/// A single tile entry within a metatile
#[derive(Debug, Clone, Copy)]
pub struct MetatileTileEntry {
    pub tile_index: u16,
    pub hflip: bool,
    pub vflip: bool,
    pub palette_bank: u8,
}

impl MetatileTileEntry {
    /// Parse from a u16 screen entry value
    pub fn from_u16(raw: u16) -> Self {
        MetatileTileEntry {
            tile_index: raw & 0x03FF,
            hflip: (raw >> 10) & 1 != 0,
            vflip: (raw >> 11) & 1 != 0,
            palette_bank: ((raw >> 12) & 0x0F) as u8,
        }
    }
}

/// Parse metatile behavior from attribute data.
/// FireRed uses u32 attributes (bits 0-8 = behavior).
/// Emerald uses u16 attributes (bits 0-7 = behavior).
pub fn parse_behavior(data: &[u8], attr_offset: usize, metatile_idx: usize, is_frlg: bool) -> u16 {
    if is_frlg {
        let offset = attr_offset + metatile_idx * 4;
        let raw = read_u32_le(data, offset).unwrap_or(0);
        (raw & 0x1FF) as u16
    } else {
        let offset = attr_offset + metatile_idx * 2;
        let raw = read_u16_le(data, offset).unwrap_or(0);
        raw & 0xFF
    }
}

/// Check if a behavior value indicates the tile is passable (walkable)
pub fn is_passable(behavior: u16) -> bool {
    match behavior {
        MB_NORMAL | MB_TALL_GRASS | MB_LONG_GRASS | MB_SAND => true,
        MB_ICE => true,
        // Ledges are passable in one direction
        MB_LEDGE_SOUTH | MB_LEDGE_NORTH | MB_LEDGE_WEST | MB_LEDGE_EAST => true,
        // Warps are passable (you walk onto them)
        MB_WARP_DOOR | MB_WARP_ARROW | MB_STAIRCASE => true,
        // Water requires Surf
        MB_SURF | MB_DEEP_WATER | MB_WATERFALL => false,
        // Default: impassable (walls, obstacles, etc.)
        _ => {
            // Many behaviors in range 0x01-0x0F are variants of passable terrain
            // but we default to impassable for safety; collision bits override this
            behavior == 0x01 || (behavior >= 0x08 && behavior <= 0x0F)
        }
    }
}

/// Get the ledge jump direction for a behavior, if applicable
pub fn ledge_direction(behavior: u16) -> Option<&'static str> {
    match behavior {
        MB_LEDGE_SOUTH => Some("down"),
        MB_LEDGE_NORTH => Some("up"),
        MB_LEDGE_WEST => Some("left"),
        MB_LEDGE_EAST => Some("right"),
        _ => None,
    }
}

/// Compose a single metatile from tile data and palettes.
///
/// `metatile_data` points to 8 u16 entries (16 bytes) for this metatile.
/// `all_tile_data` is the combined primary + secondary tileset pixel data.
/// `all_palettes` is the combined palette array (up to 13 palettes).
///
/// Returns RGBA pixels for base (bottom) and overlay (top) layers.
pub fn compose_metatile(
    metatile_data: &[u8],
    metatile_offset: usize,
    all_tile_data: &[u8],
    all_palettes: &[[[u8; 4]; 16]],
) -> Option<(Vec<u8>, Vec<u8>)> {
    if metatile_offset + METATILE_ENTRY_BYTES > metatile_data.len() {
        return None;
    }

    let mut base = vec![0u8; METATILE_RGBA_BYTES];
    let mut overlay = vec![0u8; METATILE_RGBA_BYTES];

    // 8 entries: first 4 = bottom layer, last 4 = top layer
    // Layout per layer: [top-left, top-right, bottom-left, bottom-right]
    for entry_idx in 0..8 {
        let entry_offset = metatile_offset + entry_idx * 2;
        let raw = read_u16_le(metatile_data, entry_offset)?;
        let entry = MetatileTileEntry::from_u16(raw);

        // Determine palette (clamp to available palettes)
        let pal_idx = entry.palette_bank as usize;
        let palette = all_palettes.get(pal_idx)?;

        // Get the tile pixel data
        let tile_data_offset = entry.tile_index as usize * TILE_BYTES;
        if tile_data_offset + TILE_BYTES > all_tile_data.len() {
            continue; // Skip invalid tile references
        }
        let tile_bytes = &all_tile_data[tile_data_offset..tile_data_offset + TILE_BYTES];
        let tile_indices = decode_4bpp_tile(tile_bytes)?;

        // Render with flips
        let tile_rgba = render_tile_rgba_flipped(&tile_indices, palette, entry.hflip, entry.vflip);

        // Determine position within the 16×16 metatile
        let layer_idx = entry_idx / 4; // 0 = bottom, 1 = top
        let pos_idx = entry_idx % 4;   // 0=TL, 1=TR, 2=BL, 3=BR
        let (tile_x, tile_y) = match pos_idx {
            0 => (0, 0),     // top-left
            1 => (8, 0),     // top-right
            2 => (0, 8),     // bottom-left
            3 => (8, 8),     // bottom-right
            _ => unreachable!(),
        };

        // Blit 8×8 tile onto 16×16 metatile layer
        let target = if layer_idx == 0 { &mut base } else { &mut overlay };
        for row in 0..8 {
            for col in 0..8 {
                let src = (row * 8 + col) * 4;
                let dst_x = tile_x + col;
                let dst_y = tile_y + row;
                let dst = (dst_y * METATILE_SIZE + dst_x) * 4;

                // Only write non-transparent pixels (alpha > 0)
                if tile_rgba[src + 3] > 0 {
                    target[dst] = tile_rgba[src];
                    target[dst + 1] = tile_rgba[src + 1];
                    target[dst + 2] = tile_rgba[src + 2];
                    target[dst + 3] = tile_rgba[src + 3];
                }
            }
        }
    }

    Some((base, overlay))
}

/// Decode all metatiles for a tileset pair.
///
/// `primary_tiles` / `secondary_tiles` — raw 4bpp tile bytes
/// `primary_palettes` / `secondary_palettes` — decoded palette arrays
/// `metatile_data_primary` / `metatile_data_secondary` — raw metatile composition data
/// `attr_data_primary` / `attr_data_secondary` — raw attribute data
///
/// Returns a vector of DecodedMetatile for all metatiles (primary 0-511, secondary 512+).
pub fn decode_all_metatiles(
    primary_header: &TilesetHeader,
    secondary_header: &TilesetHeader,
    rom_data: &[u8],
    primary_tiles: &[u8],
    secondary_tiles: &[u8],
    primary_palettes: &[[[u8; 4]; 16]],
    secondary_palettes: &[[[u8; 4]; 16]],
    is_frlg: bool,
) -> Vec<DecodedMetatile> {
    // Combine tile data: primary tiles (0-511) + secondary tiles (512+)
    let mut all_tile_data = Vec::with_capacity(primary_tiles.len() + secondary_tiles.len());
    all_tile_data.extend_from_slice(primary_tiles);
    all_tile_data.extend_from_slice(secondary_tiles);

    // Combine palettes: primary (0-6) + secondary (7-12)
    let mut all_palettes: Vec<[[u8; 4]; 16]> = Vec::new();
    let primary_pal_count = primary_palettes.len().min(7);
    for i in 0..7 {
        if i < primary_pal_count {
            all_palettes.push(primary_palettes[i]);
        } else {
            all_palettes.push([[0u8; 4]; 16]);
        }
    }
    for pal in secondary_palettes.iter() {
        all_palettes.push(*pal);
    }

    let mut metatiles = Vec::new();

    // Primary metatiles (0 to ~511)
    let primary_count = count_metatiles(rom_data, primary_header.metatiles_ptr, 512);
    for i in 0..primary_count {
        let offset = i * METATILE_ENTRY_BYTES;
        let behavior = parse_behavior(rom_data, primary_header.metatile_attrs_ptr, i, is_frlg);

        if let Some((base, overlay)) =
            compose_metatile(rom_data, primary_header.metatiles_ptr + offset, &all_tile_data, &all_palettes)
        {
            let dir = ledge_direction(behavior);
            metatiles.push(DecodedMetatile {
                base_pixels: base,
                overlay_pixels: overlay,
                behavior,
                passable: is_passable(behavior),
                is_grass: behavior == MB_TALL_GRASS || behavior == MB_LONG_GRASS,
                is_water: behavior == MB_SURF || behavior == MB_DEEP_WATER,
                is_ledge: dir.is_some(),
                ledge_direction: dir.map(String::from),
            });
        }
    }

    // Secondary metatiles (512+)
    let secondary_count = count_metatiles(rom_data, secondary_header.metatiles_ptr, 512);
    for i in 0..secondary_count {
        let offset = i * METATILE_ENTRY_BYTES;
        let behavior = parse_behavior(rom_data, secondary_header.metatile_attrs_ptr, i, is_frlg);

        if let Some((base, overlay)) =
            compose_metatile(rom_data, secondary_header.metatiles_ptr + offset, &all_tile_data, &all_palettes)
        {
            let dir = ledge_direction(behavior);
            metatiles.push(DecodedMetatile {
                base_pixels: base,
                overlay_pixels: overlay,
                behavior,
                passable: is_passable(behavior),
                is_grass: behavior == MB_TALL_GRASS || behavior == MB_LONG_GRASS,
                is_water: behavior == MB_SURF || behavior == MB_DEEP_WATER,
                is_ledge: dir.is_some(),
                ledge_direction: dir.map(String::from),
            });
        }
    }

    metatiles
}

/// Count how many valid metatiles exist at the given pointer (up to max_count)
fn count_metatiles(data: &[u8], metatile_ptr: usize, max_count: usize) -> usize {
    let available_bytes = data.len().saturating_sub(metatile_ptr);
    let max_from_data = available_bytes / METATILE_ENTRY_BYTES;
    max_from_data.min(max_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metatile_entry_from_u16() {
        // tile_index = 0x123, hflip = true, vflip = false, palette = 5
        // bits: 0101_0_1_00_0100100011 = palette(5) | vflip(0) | hflip(1) | tile(0x123)
        let raw: u16 = 0x123 | (1 << 10) | (5 << 12);
        let entry = MetatileTileEntry::from_u16(raw);
        assert_eq!(entry.tile_index, 0x123);
        assert!(entry.hflip);
        assert!(!entry.vflip);
        assert_eq!(entry.palette_bank, 5);
    }

    #[test]
    fn metatile_entry_no_flags() {
        let raw: u16 = 42;
        let entry = MetatileTileEntry::from_u16(raw);
        assert_eq!(entry.tile_index, 42);
        assert!(!entry.hflip);
        assert!(!entry.vflip);
        assert_eq!(entry.palette_bank, 0);
    }

    #[test]
    fn metatile_entry_vflip() {
        let raw: u16 = 0 | (1 << 11);
        let entry = MetatileTileEntry::from_u16(raw);
        assert!(entry.vflip);
        assert!(!entry.hflip);
    }

    #[test]
    fn behavior_passable() {
        assert!(is_passable(MB_NORMAL));
        assert!(is_passable(MB_TALL_GRASS));
        assert!(is_passable(MB_SAND));
        assert!(is_passable(MB_ICE));
        assert!(is_passable(MB_LEDGE_SOUTH));
        assert!(is_passable(MB_WARP_DOOR));
    }

    #[test]
    fn behavior_impassable() {
        assert!(!is_passable(MB_SURF));
        assert!(!is_passable(MB_DEEP_WATER));
        assert!(!is_passable(MB_WATERFALL));
    }

    #[test]
    fn ledge_directions() {
        assert_eq!(ledge_direction(MB_LEDGE_SOUTH), Some("down"));
        assert_eq!(ledge_direction(MB_LEDGE_NORTH), Some("up"));
        assert_eq!(ledge_direction(MB_LEDGE_WEST), Some("left"));
        assert_eq!(ledge_direction(MB_LEDGE_EAST), Some("right"));
        assert_eq!(ledge_direction(MB_NORMAL), None);
    }

    #[test]
    fn parse_behavior_frlg() {
        // FireRed: u32 per metatile, bits 0-8 = behavior
        let mut data = vec![0u8; 64];
        // Metatile 0: behavior = 0x02 (tall grass)
        data[0] = 0x02;
        // Metatile 1: behavior = 0x38 (ledge south)
        data[4] = 0x38;

        assert_eq!(parse_behavior(&data, 0, 0, true), 0x02);
        assert_eq!(parse_behavior(&data, 0, 1, true), 0x38);
    }

    #[test]
    fn parse_behavior_emerald() {
        // Emerald: u16 per metatile, bits 0-7 = behavior
        let mut data = vec![0u8; 64];
        data[0] = 0x04; // surf
        data[2] = 0x62; // warp door

        assert_eq!(parse_behavior(&data, 0, 0, false), 0x04);
        assert_eq!(parse_behavior(&data, 0, 1, false), 0x62);
    }

    #[test]
    fn count_metatiles_limited() {
        let data = vec![0u8; 1024]; // 1024 bytes = 64 metatiles worth
        assert_eq!(count_metatiles(&data, 0, 512), 64);
        assert_eq!(count_metatiles(&data, 0, 32), 32);
    }

    #[test]
    fn compose_metatile_basic() {
        // Create minimal data for a single metatile
        // 8 tile entries all pointing to tile 0 with palette 0
        let metatile_data = vec![0u8; 16]; // 8 × 2 bytes = all zeros → tile 0, no flip, palette 0

        // Create tile data: one 8×8 tile of all index 1
        let mut tile_data = vec![0u8; TILE_BYTES];
        for i in 0..TILE_BYTES {
            tile_data[i] = 0x11; // both pixels = index 1
        }

        // Create palette: index 0 = transparent, index 1 = red
        let palette: [[u8; 4]; 16] = {
            let mut p = [[0u8; 4]; 16];
            p[0] = [0, 0, 0, 0];
            p[1] = [255, 0, 0, 255];
            p
        };
        let palettes = vec![palette];

        let result = compose_metatile(&metatile_data, 0, &tile_data, &palettes);
        assert!(result.is_some());

        let (base, overlay) = result.unwrap();
        assert_eq!(base.len(), METATILE_RGBA_BYTES);
        assert_eq!(overlay.len(), METATILE_RGBA_BYTES);

        // Base layer should have red pixels (from tile 0, palette index 1)
        assert_eq!(base[0], 255); // R
        assert_eq!(base[1], 0);   // G
        assert_eq!(base[2], 0);   // B
        assert_eq!(base[3], 255); // A
    }
}
