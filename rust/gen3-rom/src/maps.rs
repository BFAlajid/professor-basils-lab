use serde::Serialize;

use crate::rom::{read_ptr, read_u8, read_u16_le, read_u32_le, GameVersion, RomOffsets, is_frlg};

/// Map header size in ROM (28 bytes for all Gen 3 games)
const MAP_HEADER_SIZE: usize = 0x1C;
/// MapLayout size for FireRed/LeafGreen (26 bytes)
const MAP_LAYOUT_SIZE_FRLG: usize = 0x1A;
/// MapLayout size for Ruby/Sapphire/Emerald (24 bytes)
const MAP_LAYOUT_SIZE_RSE: usize = 0x18;

/// A parsed map cell from the map grid
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapCell {
    pub metatile_id: u16,
    pub collision: u8,
    pub elevation: u8,
}

impl MapCell {
    /// Parse from a raw u16 map grid entry
    pub fn from_u16(raw: u16) -> Self {
        MapCell {
            metatile_id: raw & 0x03FF,
            collision: ((raw >> 10) & 0x03) as u8,
            elevation: ((raw >> 12) & 0x0F) as u8,
        }
    }
}

/// Map connection between adjacent maps
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub direction: u8,
    pub offset: i32,
    pub dest_group: u8,
    pub dest_num: u8,
}

/// Parsed map header
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapHeader {
    pub layout_ptr: usize,
    pub events_ptr: usize,
    pub connections_ptr: Option<usize>,
    pub music_id: u16,
    pub layout_id: u16,
    pub region_section_id: u8,
    pub is_cave: bool,
    pub weather: u8,
    pub map_type: u8,
    pub biking_allowed: bool,
    pub running_allowed: bool,
    pub show_map_name: bool,
    pub floor_num: i8,
    pub battle_type: u8,
}

/// Parsed map layout
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapLayout {
    pub width: u32,
    pub height: u32,
    pub border_ptr: usize,
    pub grid_ptr: usize,
    pub primary_tileset_ptr: usize,
    pub secondary_tileset_ptr: usize,
    pub border_width: u8,
    pub border_height: u8,
}

/// A fully parsed map with all its data
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedMap {
    pub group: u8,
    pub num: u8,
    pub width: u32,
    pub height: u32,
    pub grid: Vec<MapCell>,
    pub connections: Vec<Connection>,
    pub primary_tileset_ptr: u32,
    pub secondary_tileset_ptr: u32,
    pub music_id: u16,
    pub weather: u8,
    pub is_indoor: bool,
    pub is_cave: bool,
    pub running_allowed: bool,
    pub show_map_name: bool,
}

/// Map table entry for listing all maps
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapTableEntry {
    pub group: u8,
    pub num: u8,
    pub width: u32,
    pub height: u32,
    pub is_indoor: bool,
}

/// Parse a map header from ROM data at the given offset
pub fn parse_map_header(data: &[u8], offset: usize) -> Option<MapHeader> {
    if offset + MAP_HEADER_SIZE > data.len() {
        return None;
    }

    let layout_ptr = read_ptr(data, offset)?;
    let events_ptr = read_ptr(data, offset + 4)?;
    // scripts_ptr at offset + 8 — we skip this
    let connections_ptr = read_ptr(data, offset + 0x0C);

    let music_id = read_u16_le(data, offset + 0x10)?;
    let layout_id = read_u16_le(data, offset + 0x12)?;
    let region_section_id = read_u8(data, offset + 0x14)?;
    let cave = read_u8(data, offset + 0x15)?;
    let weather = read_u8(data, offset + 0x16)?;
    let map_type = read_u8(data, offset + 0x17)?;
    let biking = read_u8(data, offset + 0x18)?;
    let allow_flags = read_u8(data, offset + 0x19)?;
    let floor_num = read_u8(data, offset + 0x1A)? as i8;
    let battle_type = read_u8(data, offset + 0x1B)?;

    Some(MapHeader {
        layout_ptr,
        events_ptr,
        connections_ptr,
        music_id,
        layout_id,
        region_section_id,
        is_cave: cave != 0,
        weather,
        map_type,
        biking_allowed: biking != 0,
        running_allowed: (allow_flags & 0x02) != 0,
        show_map_name: (allow_flags & 0x04) != 0,
        floor_num,
        battle_type,
    })
}

/// Parse a map layout from ROM data
pub fn parse_map_layout(data: &[u8], offset: usize, version: GameVersion) -> Option<MapLayout> {
    let layout_size = if is_frlg(version) { MAP_LAYOUT_SIZE_FRLG } else { MAP_LAYOUT_SIZE_RSE };
    if offset + layout_size > data.len() {
        return None;
    }

    let width = read_u32_le(data, offset)? as u32;
    let height = read_u32_le(data, offset + 4)? as u32;

    // Sanity check dimensions (maps shouldn't be unreasonably large)
    if width == 0 || height == 0 || width > 1024 || height > 1024 {
        return None;
    }

    let border_ptr = read_ptr(data, offset + 8)?;
    let grid_ptr = read_ptr(data, offset + 0x0C)?;
    let primary_tileset_ptr = read_ptr(data, offset + 0x10)?;
    let secondary_tileset_ptr = read_ptr(data, offset + 0x14)?;

    let (border_width, border_height) = if is_frlg(version) {
        let bw = read_u8(data, offset + 0x18).unwrap_or(2);
        let bh = read_u8(data, offset + 0x19).unwrap_or(2);
        (bw, bh)
    } else {
        (2, 2) // RSE always uses 2×2 border
    };

    Some(MapLayout {
        width,
        height,
        border_ptr,
        grid_ptr,
        primary_tileset_ptr,
        secondary_tileset_ptr,
        border_width,
        border_height,
    })
}

/// Parse the map grid into MapCell entries
pub fn parse_map_grid(data: &[u8], layout: &MapLayout) -> Option<Vec<MapCell>> {
    let total = (layout.width * layout.height) as usize;
    let grid_end = layout.grid_ptr + total * 2;
    if grid_end > data.len() {
        return None;
    }

    let mut cells = Vec::with_capacity(total);
    for i in 0..total {
        let offset = layout.grid_ptr + i * 2;
        let raw = read_u16_le(data, offset)?;
        cells.push(MapCell::from_u16(raw));
    }
    Some(cells)
}

/// Parse map connections from a connections pointer
pub fn parse_connections(data: &[u8], connections_ptr: usize) -> Vec<Connection> {
    let mut connections = Vec::new();

    let count = match read_u32_le(data, connections_ptr) {
        Some(c) if c > 0 && c < 64 => c as usize, // sanity cap
        _ => return connections,
    };

    let array_ptr = match read_ptr(data, connections_ptr + 4) {
        Some(p) => p,
        None => return connections,
    };

    for i in 0..count {
        let offset = array_ptr + i * 12;
        if offset + 12 > data.len() {
            break;
        }

        let direction = read_u8(data, offset).unwrap_or(0);
        let map_offset = read_u32_le(data, offset + 4).unwrap_or(0) as i32;
        let dest_group = read_u8(data, offset + 8).unwrap_or(0);
        let dest_num = read_u8(data, offset + 9).unwrap_or(0);

        connections.push(Connection {
            direction,
            offset: map_offset,
            dest_group,
            dest_num,
        });
    }

    connections
}

/// Get the pointer to a specific map header by (group, num)
pub fn get_map_header_ptr(data: &[u8], offsets: &RomOffsets, group: u8, num: u8) -> Option<usize> {
    // Read the map bank table pointer
    let bank_table_ptr = read_ptr(data, offsets.map_bank_table)?;

    // Read the bank pointer for this group
    let bank_ptr = read_ptr(data, bank_table_ptr + (group as usize) * 4)?;

    // Read the map header pointer within this bank
    read_ptr(data, bank_ptr + (num as usize) * 4)
}

/// Parse a complete map by (group, num)
pub fn parse_map(data: &[u8], version: GameVersion, group: u8, num: u8) -> Option<ParsedMap> {
    let offsets = RomOffsets::for_game(version);
    let header_ptr = get_map_header_ptr(data, &offsets, group, num)?;
    let header = parse_map_header(data, header_ptr)?;
    let layout = parse_map_layout(data, header.layout_ptr, version)?;
    let grid = parse_map_grid(data, &layout)?;

    let connections = if let Some(conn_ptr) = header.connections_ptr {
        parse_connections(data, conn_ptr)
    } else {
        Vec::new()
    };

    // Indoor maps: type 1, 8, or 9 typically
    let is_indoor = matches!(header.map_type, 1 | 8 | 9);

    Some(ParsedMap {
        group,
        num,
        width: layout.width,
        height: layout.height,
        grid,
        connections,
        primary_tileset_ptr: layout.primary_tileset_ptr as u32,
        secondary_tileset_ptr: layout.secondary_tileset_ptr as u32,
        music_id: header.music_id,
        weather: header.weather,
        is_indoor,
        is_cave: header.is_cave,
        running_allowed: header.running_allowed,
        show_map_name: header.show_map_name,
    })
}

/// Get a list of all maps in the ROM.
/// Scans the bank table to find all valid map entries.
pub fn get_map_table(data: &[u8], version: GameVersion) -> Vec<MapTableEntry> {
    let offsets = RomOffsets::for_game(version);
    let mut entries = Vec::new();

    let bank_table_ptr = match read_ptr(data, offsets.map_bank_table) {
        Some(p) => p,
        None => return entries,
    };

    // Scan groups (max ~40 groups in any Gen 3 game)
    for group in 0..64u8 {
        let bank_ptr = match read_ptr(data, bank_table_ptr + (group as usize) * 4) {
            Some(p) => p,
            None => break, // No more groups
        };

        // Sanity check: bank pointer should be within ROM
        if bank_ptr >= data.len() {
            break;
        }

        // Scan maps within this group (max ~64 maps per group)
        for num in 0..64u8 {
            let map_ptr = match read_ptr(data, bank_ptr + (num as usize) * 4) {
                Some(p) => p,
                None => break,
            };

            if map_ptr >= data.len() || map_ptr + MAP_HEADER_SIZE > data.len() {
                break;
            }

            // Try to parse the header and layout to get dimensions
            if let Some(header) = parse_map_header(data, map_ptr) {
                if let Some(layout) = parse_map_layout(data, header.layout_ptr, version) {
                    let is_indoor = matches!(header.map_type, 1 | 8 | 9);
                    entries.push(MapTableEntry {
                        group,
                        num,
                        width: layout.width,
                        height: layout.height,
                        is_indoor,
                    });
                }
            }
        }
    }

    entries
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_cell_from_u16() {
        // metatile_id = 0x123, collision = 1, elevation = 3
        let raw: u16 = 0x123 | (1 << 10) | (3 << 12);
        let cell = MapCell::from_u16(raw);
        assert_eq!(cell.metatile_id, 0x123);
        assert_eq!(cell.collision, 1);
        assert_eq!(cell.elevation, 3);
    }

    #[test]
    fn map_cell_passable() {
        let raw: u16 = 42; // metatile 42, collision 0, elevation 0
        let cell = MapCell::from_u16(raw);
        assert_eq!(cell.collision, 0);
        assert_eq!(cell.elevation, 0);
    }

    #[test]
    fn map_cell_impassable() {
        let raw: u16 = 42 | (1 << 10); // collision = 1
        let cell = MapCell::from_u16(raw);
        assert_eq!(cell.collision, 1);
    }

    #[test]
    fn parse_connections_empty() {
        // count = 0
        let mut data = vec![0u8; 16];
        data[0] = 0; // count = 0
        let conns = parse_connections(&data, 0);
        assert!(conns.is_empty());
    }

    #[test]
    fn parse_map_header_basic() {
        let mut data = vec![0u8; 0x100];

        // layout_ptr at offset 0 → points to 0x50
        data[0] = 0x50;
        data[3] = 0x08;
        // events_ptr at offset 4 → points to 0x80
        data[4] = 0x80;
        data[7] = 0x08;
        // connections_ptr at offset 0x0C → null (0)
        // music_id at 0x10
        data[0x10] = 0x2A;
        data[0x11] = 0x01; // music = 0x012A
        // weather at 0x16
        data[0x16] = 3;
        // map_type at 0x17
        data[0x17] = 1; // indoor
        // allow_flags at 0x19: running (0x02) + show name (0x04)
        data[0x19] = 0x06;

        let header = parse_map_header(&data, 0).unwrap();
        assert_eq!(header.layout_ptr, 0x50);
        assert_eq!(header.events_ptr, 0x80);
        assert!(header.connections_ptr.is_none());
        assert_eq!(header.music_id, 0x012A);
        assert_eq!(header.weather, 3);
        assert_eq!(header.map_type, 1);
        assert!(header.running_allowed);
        assert!(header.show_map_name);
    }

    #[test]
    fn parse_map_layout_frlg() {
        let mut data = vec![0u8; 0x100];

        // width at 0
        data[0] = 20;
        // height at 4
        data[4] = 15;
        // border_ptr at 8
        data[8] = 0x30;
        data[11] = 0x08;
        // grid_ptr at 0x0C
        data[0x0C] = 0x40;
        data[0x0F] = 0x08;
        // primary_tileset at 0x10
        data[0x10] = 0x50;
        data[0x13] = 0x08;
        // secondary_tileset at 0x14
        data[0x14] = 0x60;
        data[0x17] = 0x08;
        // border_width at 0x18
        data[0x18] = 4;
        // border_height at 0x19
        data[0x19] = 4;

        let layout = parse_map_layout(&data, 0, GameVersion::FireRed).unwrap();
        assert_eq!(layout.width, 20);
        assert_eq!(layout.height, 15);
        assert_eq!(layout.border_width, 4);
        assert_eq!(layout.border_height, 4);
    }

    #[test]
    fn parse_map_layout_invalid_dimensions() {
        let mut data = vec![0u8; 0x100];
        data[0] = 0; // width = 0
        assert!(parse_map_layout(&data, 0, GameVersion::FireRed).is_none());
    }

    #[test]
    fn parse_map_grid_basic() {
        let mut data = vec![0u8; 0x200];
        let layout = MapLayout {
            width: 2,
            height: 2,
            border_ptr: 0,
            grid_ptr: 0x100,
            primary_tileset_ptr: 0,
            secondary_tileset_ptr: 0,
            border_width: 2,
            border_height: 2,
        };

        // 4 cells at offset 0x100
        data[0x100] = 0x01; data[0x101] = 0x00; // metatile 1
        data[0x102] = 0x02; data[0x103] = 0x00; // metatile 2
        data[0x104] = 0x03; data[0x105] = 0x00; // metatile 3
        data[0x106] = 0x04; data[0x107] = 0x04; // metatile 4 + collision

        let grid = parse_map_grid(&data, &layout).unwrap();
        assert_eq!(grid.len(), 4);
        assert_eq!(grid[0].metatile_id, 1);
        assert_eq!(grid[1].metatile_id, 2);
        assert_eq!(grid[2].metatile_id, 3);
        assert_eq!(grid[3].metatile_id, 4);
        assert_eq!(grid[3].collision, 1); // bit 10 set
    }
}
