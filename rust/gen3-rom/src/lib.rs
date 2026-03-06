pub mod encounters;
pub mod events;
pub mod lz77;
pub mod maps;
pub mod metatiles;
pub mod rom;
pub mod sprites;
pub mod tiles;

use wasm_bindgen::prelude::*;

use rom::{validate_rom, RomOffsets, is_frlg};
use tiles::{parse_tileset_header, load_tile_data, decode_palettes};
use metatiles::decode_all_metatiles;

/// Detect the ROM game version and return info as JSON.
#[wasm_bindgen(js_name = "detectRom")]
pub fn detect_rom(buffer: &[u8]) -> JsValue {
    let info = rom::get_rom_info(buffer);
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}

/// Parse a map by (group, num). Returns map data including grid, warps, NPCs, connections.
#[wasm_bindgen(js_name = "parseMap")]
pub fn parse_map(buffer: &[u8], group: u8, num: u8) -> JsValue {
    let version = match validate_rom(buffer) {
        Some(v) => v,
        None => return JsValue::NULL,
    };

    // Parse the base map data (grid, connections)
    let parsed = match maps::parse_map(buffer, version, group, num) {
        Some(m) => m,
        None => return JsValue::NULL,
    };

    // Parse events (warps, NPCs) from the map header
    let offsets = RomOffsets::for_game(version);
    if let Some(header_ptr) = maps::get_map_header_ptr(buffer, &offsets, group, num) {
        if let Some(header) = maps::parse_map_header(buffer, header_ptr) {
            if let Some(map_events) = events::parse_map_events(buffer, header.events_ptr) {
                // Merge events into the ParsedMap
                // We need to return events alongside the map — use a combined struct
                let result = FullMapData {
                    map: parsed,
                    warps: map_events.warps,
                    npcs: map_events.npcs,
                    encounters: encounters::get_wild_encounters(buffer, version, group, num),
                };
                return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
            }
        }
    }

    // Fallback: return map without events
    let result = FullMapData {
        map: parsed,
        warps: Vec::new(),
        npcs: Vec::new(),
        encounters: None,
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// Decode tileset pair (primary + secondary) into metatile RGBA data.
#[wasm_bindgen(js_name = "decodeTilesetPair")]
pub fn decode_tileset_pair(buffer: &[u8], primary_ptr: u32, secondary_ptr: u32) -> JsValue {
    let version = match validate_rom(buffer) {
        Some(v) => v,
        None => return JsValue::NULL,
    };

    let is_emerald = !is_frlg(version);
    let primary_header = match parse_tileset_header(buffer, primary_ptr as usize, is_emerald) {
        Some(h) => h,
        None => return JsValue::NULL,
    };
    let secondary_header = match parse_tileset_header(buffer, secondary_ptr as usize, is_emerald) {
        Some(h) => h,
        None => return JsValue::NULL,
    };

    // Load tile pixel data
    let primary_tiles = match load_tile_data(buffer, &primary_header) {
        Some(t) => t,
        None => return JsValue::NULL,
    };
    let secondary_tiles = match load_tile_data(buffer, &secondary_header) {
        Some(t) => t,
        None => return JsValue::NULL,
    };

    // Decode palettes: primary uses palettes 0-6, secondary uses 7-12
    let primary_palettes = match decode_palettes(buffer, primary_header.palettes_ptr, 7) {
        Some(p) => p,
        None => return JsValue::NULL,
    };
    let secondary_palettes = match decode_palettes(buffer, secondary_header.palettes_ptr, 6) {
        Some(p) => p,
        None => return JsValue::NULL,
    };

    let metatiles = decode_all_metatiles(
        &primary_header,
        &secondary_header,
        buffer,
        &primary_tiles,
        &secondary_tiles,
        &primary_palettes,
        &secondary_palettes,
        is_frlg(version),
    );

    serde_wasm_bindgen::to_value(&metatiles).unwrap_or(JsValue::NULL)
}

/// Decode an overworld sprite by graphics ID.
#[wasm_bindgen(js_name = "decodeOverworldSprite")]
pub fn decode_overworld_sprite(buffer: &[u8], graphics_id: u16) -> JsValue {
    let version = match validate_rom(buffer) {
        Some(v) => v,
        None => return JsValue::NULL,
    };

    match sprites::decode_overworld_sprite(buffer, version, graphics_id) {
        Some(sprite) => serde_wasm_bindgen::to_value(&sprite).unwrap_or(JsValue::NULL),
        None => JsValue::NULL,
    }
}

/// Get a table of all maps in the ROM (group, num, dimensions).
#[wasm_bindgen(js_name = "getMapTable")]
pub fn get_map_table(buffer: &[u8]) -> JsValue {
    let version = match validate_rom(buffer) {
        Some(v) => v,
        None => return JsValue::NULL,
    };

    let table = maps::get_map_table(buffer, version);
    serde_wasm_bindgen::to_value(&table).unwrap_or(JsValue::NULL)
}

/// Get wild encounter data for a specific map.
#[wasm_bindgen(js_name = "getWildEncounters")]
pub fn get_wild_encounters(buffer: &[u8], group: u8, num: u8) -> JsValue {
    let version = match validate_rom(buffer) {
        Some(v) => v,
        None => return JsValue::NULL,
    };

    match encounters::get_wild_encounters(buffer, version, group, num) {
        Some(enc) => serde_wasm_bindgen::to_value(&enc).unwrap_or(JsValue::NULL),
        None => JsValue::NULL,
    }
}

/// Combined map data returned by parseMap
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FullMapData {
    map: maps::ParsedMap,
    warps: Vec<events::Warp>,
    npcs: Vec<events::NpcData>,
    encounters: Option<encounters::WildEncounters>,
}
