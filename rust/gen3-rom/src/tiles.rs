use serde::Serialize;

use crate::lz77;
use crate::rom::{read_ptr, read_u8, read_u32_le};

/// Bytes per 4bpp 8x8 tile
const TILE_BYTES: usize = 32;
/// Pixels per tile dimension
const TILE_SIZE: usize = 8;
/// Colors per palette
const PALETTE_COLORS: usize = 16;
/// Bytes per palette (16 colors × 2 bytes)
const PALETTE_BYTES: usize = PALETTE_COLORS * 2;

/// Parsed tileset header from ROM
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TilesetHeader {
    pub is_compressed: bool,
    pub is_secondary: bool,
    pub tiles_ptr: usize,
    pub palettes_ptr: usize,
    pub metatiles_ptr: usize,
    pub metatile_attrs_ptr: usize,
    pub callback_ptr: u32,
}

/// Decode a single 4bpp 8×8 tile from 32 bytes into 64 palette indices.
/// Each byte stores 2 pixels: low nybble = left pixel, high nybble = right pixel.
pub fn decode_4bpp_tile(data: &[u8]) -> Option<[u8; 64]> {
    if data.len() < TILE_BYTES {
        return None;
    }
    let mut pixels = [0u8; 64];
    for row in 0..TILE_SIZE {
        let row_start = row * 4;
        for col_pair in 0..4 {
            let byte = data[row_start + col_pair];
            let left = byte & 0x0F;
            let right = (byte >> 4) & 0x0F;
            let pixel_idx = row * TILE_SIZE + col_pair * 2;
            pixels[pixel_idx] = left;
            pixels[pixel_idx + 1] = right;
        }
    }
    Some(pixels)
}

/// Convert a GBA BGR555 color to RGBA (8-bit per channel).
/// Format: bit 0-4 = red, 5-9 = green, 10-14 = blue, bit 15 = unused.
/// Palette index 0 is always treated as transparent by convention.
pub fn decode_bgr555(color: u16, is_transparent: bool) -> [u8; 4] {
    let r5 = (color & 0x1F) as u8;
    let g5 = ((color >> 5) & 0x1F) as u8;
    let b5 = ((color >> 10) & 0x1F) as u8;

    // 5-bit to 8-bit: shift left 3 and fill low bits for full range
    let r = (r5 << 3) | (r5 >> 2);
    let g = (g5 << 3) | (g5 >> 2);
    let b = (b5 << 3) | (b5 >> 2);
    let a = if is_transparent { 0 } else { 255 };

    [r, g, b, a]
}

/// Decode a 16-color palette (32 bytes) into RGBA colors.
/// Index 0 is transparent.
pub fn decode_palette(data: &[u8], offset: usize) -> Option<[[u8; 4]; PALETTE_COLORS]> {
    if offset + PALETTE_BYTES > data.len() {
        return None;
    }
    let mut colors = [[0u8; 4]; PALETTE_COLORS];
    for i in 0..PALETTE_COLORS {
        let pos = offset + i * 2;
        let raw = u16::from_le_bytes([data[pos], data[pos + 1]]);
        colors[i] = decode_bgr555(raw, i == 0);
    }
    Some(colors)
}

/// Decode multiple palettes from a tileset's palette pointer.
/// Auto-detects whether the pointer leads to:
///   (a) an array of GBA ROM pointers (each → 32 bytes of palette data), or
///   (b) flat contiguous palette data (count × 32 bytes)
pub fn decode_palettes(
    data: &[u8],
    palette_offset: usize,
    count: usize,
) -> Option<Vec<[[u8; 4]; PALETTE_COLORS]>> {
    // Heuristic: check if the first entry looks like a GBA ROM pointer (0x08XXXXXX)
    let first_u32 = crate::rom::read_u32_le(data, palette_offset)?;
    let is_pointer_table = (first_u32 & 0xFE00_0000) == 0x0800_0000;

    let mut palettes = Vec::with_capacity(count);

    if is_pointer_table {
        // Pointer table: each entry is a 4-byte GBA pointer → 32 bytes of palette data
        for i in 0..count {
            let ptr_offset = palette_offset + i * 4;
            let pal = match read_ptr(data, ptr_offset) {
                Some(pal_off) => decode_palette(data, pal_off).unwrap_or([[0u8; 4]; PALETTE_COLORS]),
                None => [[0u8; 4]; PALETTE_COLORS],
            };
            palettes.push(pal);
        }
    } else {
        // Flat contiguous palette data
        for i in 0..count {
            let off = palette_offset + i * PALETTE_BYTES;
            let pal = decode_palette(data, off).unwrap_or([[0u8; 4]; PALETTE_COLORS]);
            palettes.push(pal);
        }
    }

    Some(palettes)
}

/// Parse a tileset header from ROM data.
///
/// FireRed/Emerald layout (24 bytes):
/// - 0x00: isCompressed (u8)
/// - 0x01: isSecondary (u8)
/// - 0x02-0x03: padding
/// - 0x04: tiles pointer
/// - 0x08: palettes pointer
/// - 0x0C: metatiles pointer
/// - 0x10: callback pointer (FR) / metatile attrs pointer (Emerald)
/// - 0x14: metatile attrs pointer (FR) / callback pointer (Emerald)
///
/// We parse FireRed layout by default; caller can set `is_emerald` to swap 0x10/0x14.
pub fn parse_tileset_header(data: &[u8], offset: usize, is_emerald: bool) -> Option<TilesetHeader> {
    if offset + 24 > data.len() {
        return None;
    }

    let is_compressed = read_u8(data, offset)? != 0;
    let is_secondary = read_u8(data, offset + 1)? != 0;
    let tiles_ptr = read_ptr(data, offset + 4)?;
    let palettes_ptr = read_ptr(data, offset + 8)?;
    let metatiles_ptr = read_ptr(data, offset + 0x0C)?;

    let (callback_ptr, metatile_attrs_ptr) = if is_emerald {
        // Emerald: 0x10 = metatile attrs, 0x14 = callback
        let attrs = read_ptr(data, offset + 0x10)?;
        let cb = read_u32_le(data, offset + 0x14).unwrap_or(0);
        (cb, attrs)
    } else {
        // FireRed: 0x10 = callback, 0x14 = metatile attrs
        let cb = read_u32_le(data, offset + 0x10).unwrap_or(0);
        let attrs = read_ptr(data, offset + 0x14)?;
        (cb, attrs)
    };

    Some(TilesetHeader {
        is_compressed,
        is_secondary,
        tiles_ptr,
        palettes_ptr,
        metatiles_ptr,
        metatile_attrs_ptr,
        callback_ptr,
    })
}

/// Load tile pixel data from ROM, decompressing if needed.
/// Returns raw 4bpp tile bytes.
pub fn load_tile_data(data: &[u8], header: &TilesetHeader) -> Option<Vec<u8>> {
    let offset = header.tiles_ptr;
    if header.is_compressed {
        lz77::decompress(data, offset)
    } else {
        // Uncompressed: read a reasonable number of tiles
        // Primary: 512 tiles, Secondary: 512 tiles
        let tile_count = if header.is_secondary { 512 } else { 512 };
        let byte_count = tile_count * TILE_BYTES;
        if offset + byte_count > data.len() {
            // Read whatever is available
            let available = data.len().saturating_sub(offset);
            if available == 0 {
                return None;
            }
            Some(data[offset..offset + available].to_vec())
        } else {
            Some(data[offset..offset + byte_count].to_vec())
        }
    }
}

/// Render a single 8×8 tile to RGBA pixels using a palette.
/// `tile_data` is the raw 4bpp bytes for this tile (32 bytes).
/// Returns 8×8×4 = 256 bytes of RGBA data.
pub fn render_tile_rgba(tile_indices: &[u8; 64], palette: &[[u8; 4]; 16]) -> [u8; 256] {
    let mut rgba = [0u8; 256];
    for (i, &idx) in tile_indices.iter().enumerate() {
        let color = palette[idx as usize & 0x0F];
        let out = i * 4;
        rgba[out] = color[0];
        rgba[out + 1] = color[1];
        rgba[out + 2] = color[2];
        rgba[out + 3] = color[3];
    }
    rgba
}

/// Render a tile with horizontal and/or vertical flip.
pub fn render_tile_rgba_flipped(
    tile_indices: &[u8; 64],
    palette: &[[u8; 4]; 16],
    hflip: bool,
    vflip: bool,
) -> [u8; 256] {
    let mut rgba = [0u8; 256];
    for row in 0..TILE_SIZE {
        for col in 0..TILE_SIZE {
            let src_row = if vflip { TILE_SIZE - 1 - row } else { row };
            let src_col = if hflip { TILE_SIZE - 1 - col } else { col };
            let src_idx = src_row * TILE_SIZE + src_col;
            let dst_idx = row * TILE_SIZE + col;

            let pal_idx = tile_indices[src_idx] as usize & 0x0F;
            let color = palette[pal_idx];
            let out = dst_idx * 4;
            rgba[out] = color[0];
            rgba[out + 1] = color[1];
            rgba[out + 2] = color[2];
            rgba[out + 3] = color[3];
        }
    }
    rgba
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_4bpp_basic() {
        // First byte: 0x21 → left pixel = 1, right pixel = 2
        let mut data = [0u8; 32];
        data[0] = 0x21; // pixel 0=1, pixel 1=2
        data[1] = 0x43; // pixel 2=3, pixel 3=4
        data[2] = 0x00; // pixel 4=0, pixel 5=0
        data[3] = 0x00; // pixel 6=0, pixel 7=0

        let pixels = decode_4bpp_tile(&data).unwrap();
        assert_eq!(pixels[0], 1); // low nybble of 0x21
        assert_eq!(pixels[1], 2); // high nybble of 0x21
        assert_eq!(pixels[2], 3); // low nybble of 0x43
        assert_eq!(pixels[3], 4); // high nybble of 0x43
        assert_eq!(pixels[4], 0);
    }

    #[test]
    fn decode_4bpp_too_small() {
        let data = [0u8; 16];
        assert!(decode_4bpp_tile(&data).is_none());
    }

    #[test]
    fn decode_bgr555_black() {
        let color = decode_bgr555(0x0000, false);
        assert_eq!(color, [0, 0, 0, 255]);
    }

    #[test]
    fn decode_bgr555_white() {
        // All 1s in RGB = 0x7FFF
        let color = decode_bgr555(0x7FFF, false);
        assert_eq!(color, [255, 255, 255, 255]);
    }

    #[test]
    fn decode_bgr555_pure_red() {
        // Red only: bits 0-4 = 31
        let color = decode_bgr555(0x001F, false);
        assert_eq!(color[0], 255); // red
        assert_eq!(color[1], 0);   // green
        assert_eq!(color[2], 0);   // blue
    }

    #[test]
    fn decode_bgr555_pure_green() {
        let color = decode_bgr555(0x03E0, false);
        assert_eq!(color[0], 0);
        assert_eq!(color[1], 255);
        assert_eq!(color[2], 0);
    }

    #[test]
    fn decode_bgr555_pure_blue() {
        let color = decode_bgr555(0x7C00, false);
        assert_eq!(color[0], 0);
        assert_eq!(color[1], 0);
        assert_eq!(color[2], 255);
    }

    #[test]
    fn decode_bgr555_transparent() {
        let color = decode_bgr555(0x0000, true);
        assert_eq!(color[3], 0); // alpha = 0
    }

    #[test]
    fn decode_palette_basic() {
        let mut data = vec![0u8; 64];
        // Color 0: black (transparent)
        data[0] = 0x00;
        data[1] = 0x00;
        // Color 1: white
        data[2] = 0xFF;
        data[3] = 0x7F;

        let palette = decode_palette(&data, 0).unwrap();
        assert_eq!(palette[0][3], 0);     // index 0 is transparent
        assert_eq!(palette[1][0], 255);   // white R
        assert_eq!(palette[1][3], 255);   // white alpha
    }

    #[test]
    fn decode_palette_too_small() {
        let data = vec![0u8; 16];
        assert!(decode_palette(&data, 0).is_none());
    }

    #[test]
    fn render_tile_rgba_basic() {
        let mut indices = [0u8; 64];
        indices[0] = 1; // first pixel uses palette color 1

        let mut palette = [[0u8; 4]; 16];
        palette[0] = [0, 0, 0, 0];       // transparent
        palette[1] = [255, 0, 0, 255];    // red

        let rgba = render_tile_rgba(&indices, &palette);
        // First pixel should be red
        assert_eq!(rgba[0], 255); // R
        assert_eq!(rgba[1], 0);   // G
        assert_eq!(rgba[2], 0);   // B
        assert_eq!(rgba[3], 255); // A
        // Second pixel should be transparent (index 0)
        assert_eq!(rgba[4], 0);
        assert_eq!(rgba[7], 0);
    }

    #[test]
    fn render_tile_flipped_h() {
        let mut indices = [0u8; 64];
        indices[0] = 1;  // top-left
        indices[7] = 2;  // top-right

        let mut palette = [[0u8; 4]; 16];
        palette[0] = [0, 0, 0, 0];
        palette[1] = [255, 0, 0, 255];
        palette[2] = [0, 255, 0, 255];

        let rgba = render_tile_rgba_flipped(&indices, &palette, true, false);
        // After hflip: top-left should have what was at top-right (index 2 = green)
        assert_eq!(rgba[0], 0);   // R (green)
        assert_eq!(rgba[1], 255); // G
        // top-right should have what was at top-left (index 1 = red)
        assert_eq!(rgba[7 * 4], 255); // R (red)
    }

    #[test]
    fn render_tile_flipped_v() {
        let mut indices = [0u8; 64];
        indices[0] = 1;       // top-left row 0
        indices[56] = 2;      // bottom-left row 7

        let mut palette = [[0u8; 4]; 16];
        palette[0] = [0, 0, 0, 0];
        palette[1] = [255, 0, 0, 255];
        palette[2] = [0, 255, 0, 255];

        let rgba = render_tile_rgba_flipped(&indices, &palette, false, true);
        // After vflip: top-left should have what was at bottom-left (index 2 = green)
        assert_eq!(rgba[0], 0);
        assert_eq!(rgba[1], 255);
        // bottom-left should have what was at top-left (index 1 = red)
        assert_eq!(rgba[56 * 4], 255);
    }

    #[test]
    fn decode_multiple_palettes() {
        // Build a ROM-like buffer: pointer table at offset 0, palette data after
        let mut data = vec![0u8; 1024];
        let pal_base: usize = 0x100; // palette data starts here

        // Write 4 GBA pointers at offset 0 (each points to pal_base + i*32)
        for i in 0..4 {
            let ptr = (0x0800_0000 + pal_base + i * PALETTE_BYTES) as u32;
            let bytes = ptr.to_le_bytes();
            let off = i * 4;
            data[off] = bytes[0];
            data[off + 1] = bytes[1];
            data[off + 2] = bytes[2];
            data[off + 3] = bytes[3];
        }
        // Palette data is zeros (black/transparent) — just checking count
        let palettes = decode_palettes(&data, 0, 4).unwrap();
        assert_eq!(palettes.len(), 4);
    }
}
