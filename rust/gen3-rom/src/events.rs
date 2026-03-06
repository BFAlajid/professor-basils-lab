use serde::Serialize;

use crate::rom::{read_ptr, read_u8, read_u16_le};

/// Size of ObjectEventTemplate in ROM (24 bytes)
const OBJECT_EVENT_SIZE: usize = 24;
/// Size of WarpEvent in ROM (8 bytes)
const WARP_EVENT_SIZE: usize = 8;
/// Size of CoordEvent in ROM (16 bytes)
const COORD_EVENT_SIZE: usize = 16;
/// Size of BgEvent in ROM (12 bytes)
const BG_EVENT_SIZE: usize = 12;

/// A warp event — door, cave entrance, staircase, etc.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Warp {
    pub x: i16,
    pub y: i16,
    pub elevation: u8,
    pub warp_id: u8,
    pub dest_map_num: u8,
    pub dest_map_group: u8,
}

/// An NPC or object event on the map
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcData {
    pub local_id: u8,
    pub graphics_id: u8,
    pub x: i16,
    pub y: i16,
    pub elevation: u8,
    pub movement_type: u8,
    pub movement_range_x: u8,
    pub movement_range_y: u8,
    pub trainer_type: u16,
    pub sight_range: u16,
    pub flag_id: u16,
}

/// A coordinate-triggered event (step trigger)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoordEvent {
    pub x: u16,
    pub y: u16,
    pub elevation: u8,
}

/// A background event (sign, hidden item)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BgEvent {
    pub x: u16,
    pub y: u16,
    pub elevation: u8,
    pub kind: u8,
}

/// All events parsed from a map's event data
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapEvents {
    pub warps: Vec<Warp>,
    pub npcs: Vec<NpcData>,
    pub coord_events: Vec<CoordEvent>,
    pub bg_events: Vec<BgEvent>,
}

/// Parse all map events from the events pointer in a map header
pub fn parse_map_events(data: &[u8], events_ptr: usize) -> Option<MapEvents> {
    if events_ptr + 16 > data.len() {
        return None;
    }

    let npc_count = read_u8(data, events_ptr)? as usize;
    let warp_count = read_u8(data, events_ptr + 1)? as usize;
    let coord_count = read_u8(data, events_ptr + 2)? as usize;
    let bg_count = read_u8(data, events_ptr + 3)? as usize;

    // Sanity caps
    if npc_count > 128 || warp_count > 128 || coord_count > 128 || bg_count > 128 {
        return None;
    }

    let npcs_ptr = read_ptr(data, events_ptr + 4);
    let warps_ptr = read_ptr(data, events_ptr + 8);
    let coords_ptr = read_ptr(data, events_ptr + 12);
    let bgs_ptr = read_ptr(data, events_ptr + 16);

    let npcs = if let Some(ptr) = npcs_ptr {
        parse_npcs(data, ptr, npc_count)
    } else {
        Vec::new()
    };

    let warps = if let Some(ptr) = warps_ptr {
        parse_warps(data, ptr, warp_count)
    } else {
        Vec::new()
    };

    let coord_events = if let Some(ptr) = coords_ptr {
        parse_coord_events(data, ptr, coord_count)
    } else {
        Vec::new()
    };

    let bg_events = if let Some(ptr) = bgs_ptr {
        parse_bg_events(data, ptr, bg_count)
    } else {
        Vec::new()
    };

    Some(MapEvents {
        warps,
        npcs,
        coord_events,
        bg_events,
    })
}

/// Parse NPC/object events
fn parse_npcs(data: &[u8], ptr: usize, count: usize) -> Vec<NpcData> {
    let mut npcs = Vec::with_capacity(count);

    for i in 0..count {
        let offset = ptr + i * OBJECT_EVENT_SIZE;
        if offset + OBJECT_EVENT_SIZE > data.len() {
            break;
        }

        let local_id = read_u8(data, offset).unwrap_or(0);
        let graphics_id = read_u8(data, offset + 1).unwrap_or(0);
        // offset + 2: kind, offset + 3: padding
        let x = read_u16_le(data, offset + 4).unwrap_or(0) as i16;
        let y = read_u16_le(data, offset + 6).unwrap_or(0) as i16;
        let elevation = read_u8(data, offset + 8).unwrap_or(0);
        let movement_type = read_u8(data, offset + 9).unwrap_or(0);
        let range_byte = read_u8(data, offset + 10).unwrap_or(0);
        let movement_range_x = range_byte & 0x0F;
        let movement_range_y = (range_byte >> 4) & 0x0F;
        // offset + 11: padding
        let trainer_type = read_u16_le(data, offset + 0x0C).unwrap_or(0);
        let sight_range = read_u16_le(data, offset + 0x0E).unwrap_or(0);
        // offset + 0x10: script pointer (skip)
        let flag_id = read_u16_le(data, offset + 0x14).unwrap_or(0);

        npcs.push(NpcData {
            local_id,
            graphics_id,
            x,
            y,
            elevation,
            movement_type,
            movement_range_x,
            movement_range_y,
            trainer_type,
            sight_range,
            flag_id,
        });
    }

    npcs
}

/// Parse warp events
fn parse_warps(data: &[u8], ptr: usize, count: usize) -> Vec<Warp> {
    let mut warps = Vec::with_capacity(count);

    for i in 0..count {
        let offset = ptr + i * WARP_EVENT_SIZE;
        if offset + WARP_EVENT_SIZE > data.len() {
            break;
        }

        let x = read_u16_le(data, offset).unwrap_or(0) as i16;
        let y = read_u16_le(data, offset + 2).unwrap_or(0) as i16;
        let elevation = read_u8(data, offset + 4).unwrap_or(0);
        let warp_id = read_u8(data, offset + 5).unwrap_or(0);
        let dest_map_num = read_u8(data, offset + 6).unwrap_or(0);
        let dest_map_group = read_u8(data, offset + 7).unwrap_or(0);

        warps.push(Warp {
            x,
            y,
            elevation,
            warp_id,
            dest_map_num,
            dest_map_group,
        });
    }

    warps
}

/// Parse coordinate-triggered events
fn parse_coord_events(data: &[u8], ptr: usize, count: usize) -> Vec<CoordEvent> {
    let mut events = Vec::with_capacity(count);

    for i in 0..count {
        let offset = ptr + i * COORD_EVENT_SIZE;
        if offset + COORD_EVENT_SIZE > data.len() {
            break;
        }

        let x = read_u16_le(data, offset).unwrap_or(0);
        let y = read_u16_le(data, offset + 2).unwrap_or(0);
        let elevation = read_u8(data, offset + 4).unwrap_or(0);

        events.push(CoordEvent { x, y, elevation });
    }

    events
}

/// Parse background events (signs, hidden items)
fn parse_bg_events(data: &[u8], ptr: usize, count: usize) -> Vec<BgEvent> {
    let mut events = Vec::with_capacity(count);

    for i in 0..count {
        let offset = ptr + i * BG_EVENT_SIZE;
        if offset + BG_EVENT_SIZE > data.len() {
            break;
        }

        let x = read_u16_le(data, offset).unwrap_or(0);
        let y = read_u16_le(data, offset + 2).unwrap_or(0);
        let elevation = read_u8(data, offset + 4).unwrap_or(0);
        let kind = read_u8(data, offset + 5).unwrap_or(0);

        events.push(BgEvent {
            x,
            y,
            elevation,
            kind,
        });
    }

    events
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_warp_basic() {
        let mut data = vec![0u8; 16];
        // x = 5, y = 10
        data[0] = 5; data[1] = 0;
        data[2] = 10; data[3] = 0;
        // elevation = 0, warp_id = 1, dest_map_num = 3, dest_map_group = 2
        data[4] = 0;
        data[5] = 1;
        data[6] = 3;
        data[7] = 2;

        let warps = parse_warps(&data, 0, 1);
        assert_eq!(warps.len(), 1);
        assert_eq!(warps[0].x, 5);
        assert_eq!(warps[0].y, 10);
        assert_eq!(warps[0].warp_id, 1);
        assert_eq!(warps[0].dest_map_num, 3);
        assert_eq!(warps[0].dest_map_group, 2);
    }

    #[test]
    fn parse_npc_basic() {
        let mut data = vec![0u8; 32];
        data[0] = 1;  // local_id
        data[1] = 42; // graphics_id
        data[4] = 7;  // x
        data[6] = 3;  // y
        data[8] = 0;  // elevation
        data[9] = 8;  // movement_type (face left)
        data[10] = 0x32; // range: x=2, y=3
        data[0x0C] = 1; // trainer_type
        data[0x0E] = 4; // sight_range

        let npcs = parse_npcs(&data, 0, 1);
        assert_eq!(npcs.len(), 1);
        assert_eq!(npcs[0].local_id, 1);
        assert_eq!(npcs[0].graphics_id, 42);
        assert_eq!(npcs[0].x, 7);
        assert_eq!(npcs[0].y, 3);
        assert_eq!(npcs[0].movement_type, 8);
        assert_eq!(npcs[0].movement_range_x, 2);
        assert_eq!(npcs[0].movement_range_y, 3);
        assert_eq!(npcs[0].trainer_type, 1);
        assert_eq!(npcs[0].sight_range, 4);
    }

    #[test]
    fn parse_multiple_warps() {
        let mut data = vec![0u8; 24]; // 3 warps × 8 bytes
        for i in 0..3 {
            let offset = i * 8;
            data[offset] = i as u8; // x
            data[offset + 2] = (i * 2) as u8; // y
            data[offset + 5] = i as u8; // warp_id
            data[offset + 6] = 0; // dest_map_num
            data[offset + 7] = 0; // dest_map_group
        }

        let warps = parse_warps(&data, 0, 3);
        assert_eq!(warps.len(), 3);
        assert_eq!(warps[0].x, 0);
        assert_eq!(warps[1].x, 1);
        assert_eq!(warps[2].x, 2);
    }

    #[test]
    fn parse_coord_event() {
        let mut data = vec![0u8; 16];
        data[0] = 15; // x
        data[2] = 20; // y
        data[4] = 3;  // elevation

        let events = parse_coord_events(&data, 0, 1);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].x, 15);
        assert_eq!(events[0].y, 20);
        assert_eq!(events[0].elevation, 3);
    }

    #[test]
    fn parse_bg_event() {
        let mut data = vec![0u8; 12];
        data[0] = 8; // x
        data[2] = 4; // y
        data[4] = 0; // elevation
        data[5] = 1; // kind (sign)

        let events = parse_bg_events(&data, 0, 1);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].x, 8);
        assert_eq!(events[0].y, 4);
        assert_eq!(events[0].kind, 1);
    }

    #[test]
    fn parse_empty_events() {
        let warps = parse_warps(&[], 0, 0);
        assert!(warps.is_empty());
        let npcs = parse_npcs(&[], 0, 0);
        assert!(npcs.is_empty());
    }
}
