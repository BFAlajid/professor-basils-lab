//! Framebuffer storage and pixel-format conversion.
//!
//! Real 3DS framebuffers live in VRAM (`0x18000000`) at addresses programmed
//! through GSP. The PICA200 supports five distinct framebuffer formats, all
//! of which are decoded here into a flat RGBA8 buffer ready for blitting via
//! `CanvasRenderingContext2D::putImageData`.

/// PICA200-supported framebuffer pixel formats.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PixelFormat {
    /// 32 bpp, byte order R, G, B, A.
    Rgba8,
    /// 24 bpp, byte order B, G, R. The 3DS commonly stores top-screen
    /// framebuffers in this format.
    Bgr8,
    /// 16 bpp, packed R5 G6 B5 little-endian.
    Rgb565,
    /// 16 bpp, packed R5 G5 B5 A1 little-endian.
    Rgb5A1,
    /// 16 bpp, packed R4 G4 B4 A4 little-endian.
    Rgba4,
}

impl PixelFormat {
    pub fn bytes_per_pixel(self) -> u32 {
        match self {
            PixelFormat::Rgba8 => 4,
            PixelFormat::Bgr8 => 3,
            PixelFormat::Rgb565 => 2,
            PixelFormat::Rgb5A1 => 2,
            PixelFormat::Rgba4 => 2,
        }
    }
}

/// A linear framebuffer holding pixels in their native format.
#[derive(Debug, Clone)]
pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
    /// Raw pixel storage in the source format.
    pub pixels: Vec<u8>,
}

impl Framebuffer {
    pub fn new(width: u32, height: u32, format: PixelFormat) -> Self {
        let len = (width * height * format.bytes_per_pixel()) as usize;
        Self {
            width,
            height,
            format,
            pixels: vec![0u8; len],
        }
    }

    /// Decode this framebuffer into an RGBA8 byte buffer suitable for
    /// blitting into an HTML canvas via `putImageData`.
    pub fn to_rgba8(&self) -> Vec<u8> {
        let pixel_count = (self.width * self.height) as usize;
        let mut out = Vec::with_capacity(pixel_count * 4);

        match self.format {
            PixelFormat::Rgba8 => {
                // Direct copy.
                out.extend_from_slice(&self.pixels);
            }
            PixelFormat::Bgr8 => {
                for chunk in self.pixels.chunks_exact(3) {
                    out.push(chunk[2]); // R
                    out.push(chunk[1]); // G
                    out.push(chunk[0]); // B
                    out.push(0xFF);     // A
                }
            }
            PixelFormat::Rgb565 => {
                for chunk in self.pixels.chunks_exact(2) {
                    let v = u16::from_le_bytes([chunk[0], chunk[1]]);
                    let r5 = ((v >> 11) & 0x1F) as u8;
                    let g6 = ((v >> 5) & 0x3F) as u8;
                    let b5 = (v & 0x1F) as u8;
                    out.push((r5 << 3) | (r5 >> 2));
                    out.push((g6 << 2) | (g6 >> 4));
                    out.push((b5 << 3) | (b5 >> 2));
                    out.push(0xFF);
                }
            }
            PixelFormat::Rgb5A1 => {
                for chunk in self.pixels.chunks_exact(2) {
                    let v = u16::from_le_bytes([chunk[0], chunk[1]]);
                    let r5 = ((v >> 11) & 0x1F) as u8;
                    let g5 = ((v >> 6) & 0x1F) as u8;
                    let b5 = ((v >> 1) & 0x1F) as u8;
                    let a1 = (v & 0x1) as u8;
                    out.push((r5 << 3) | (r5 >> 2));
                    out.push((g5 << 3) | (g5 >> 2));
                    out.push((b5 << 3) | (b5 >> 2));
                    out.push(if a1 != 0 { 0xFF } else { 0x00 });
                }
            }
            PixelFormat::Rgba4 => {
                for chunk in self.pixels.chunks_exact(2) {
                    let v = u16::from_le_bytes([chunk[0], chunk[1]]);
                    let r4 = ((v >> 12) & 0xF) as u8;
                    let g4 = ((v >> 8) & 0xF) as u8;
                    let b4 = ((v >> 4) & 0xF) as u8;
                    let a4 = (v & 0xF) as u8;
                    out.push((r4 << 4) | r4);
                    out.push((g4 << 4) | g4);
                    out.push((b4 << 4) | b4);
                    out.push((a4 << 4) | a4);
                }
            }
        }

        out
    }

    /// Replace the contents from a flat byte slice in the framebuffer's
    /// native format. Length is checked.
    pub fn write_raw(&mut self, data: &[u8]) -> Result<(), &'static str> {
        if data.len() != self.pixels.len() {
            return Err("write_raw: source length does not match framebuffer size");
        }
        self.pixels.copy_from_slice(data);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bytes_per_pixel_matches_format() {
        assert_eq!(PixelFormat::Rgba8.bytes_per_pixel(), 4);
        assert_eq!(PixelFormat::Bgr8.bytes_per_pixel(), 3);
        assert_eq!(PixelFormat::Rgb565.bytes_per_pixel(), 2);
        assert_eq!(PixelFormat::Rgb5A1.bytes_per_pixel(), 2);
        assert_eq!(PixelFormat::Rgba4.bytes_per_pixel(), 2);
    }

    #[test]
    fn new_allocates_correct_size() {
        let fb = Framebuffer::new(4, 2, PixelFormat::Rgba8);
        assert_eq!(fb.pixels.len(), 4 * 2 * 4);
        assert_eq!(fb.width, 4);
        assert_eq!(fb.height, 2);

        let fb16 = Framebuffer::new(4, 2, PixelFormat::Rgb565);
        assert_eq!(fb16.pixels.len(), 4 * 2 * 2);

        let fb24 = Framebuffer::new(4, 2, PixelFormat::Bgr8);
        assert_eq!(fb24.pixels.len(), 4 * 2 * 3);
    }

    #[test]
    fn rgba8_passthrough() {
        let mut fb = Framebuffer::new(2, 1, PixelFormat::Rgba8);
        fb.pixels = vec![10, 20, 30, 40, 50, 60, 70, 80];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![10, 20, 30, 40, 50, 60, 70, 80]);
    }

    #[test]
    fn bgr8_swaps_channels() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Bgr8);
        // Source order: B, G, R = (0x10, 0x20, 0x30)
        fb.pixels = vec![0x10, 0x20, 0x30];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x30, 0x20, 0x10, 0xFF]);
    }

    #[test]
    fn bgr8_multipixel() {
        let mut fb = Framebuffer::new(2, 1, PixelFormat::Bgr8);
        fb.pixels = vec![0x10, 0x20, 0x30, 0x40, 0x50, 0x60];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x30, 0x20, 0x10, 0xFF, 0x60, 0x50, 0x40, 0xFF]);
    }

    #[test]
    fn rgb565_decode_pure_red() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgb565);
        // 5 bits red set: 0xF800
        fb.pixels = vec![0x00, 0xF8];
        let out = fb.to_rgba8();
        // 0x1F << 3 | 0x1F >> 2 = 0xF8 | 0x07 = 0xFF
        assert_eq!(out, vec![0xFF, 0x00, 0x00, 0xFF]);
    }

    #[test]
    fn rgb565_decode_pure_green() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgb565);
        // 6 bits green set: 0x07E0
        fb.pixels = vec![0xE0, 0x07];
        let out = fb.to_rgba8();
        // 0x3F << 2 | 0x3F >> 4 = 0xFC | 0x03 = 0xFF
        assert_eq!(out, vec![0x00, 0xFF, 0x00, 0xFF]);
    }

    #[test]
    fn rgb565_decode_pure_blue() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgb565);
        // 5 bits blue set: 0x001F
        fb.pixels = vec![0x1F, 0x00];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x00, 0x00, 0xFF, 0xFF]);
    }

    #[test]
    fn rgb565_decode_zero_is_black() {
        let fb = Framebuffer::new(1, 1, PixelFormat::Rgb565);
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x00, 0x00, 0x00, 0xFF]);
    }

    #[test]
    fn rgb5a1_decodes_alpha() {
        let mut fb = Framebuffer::new(2, 1, PixelFormat::Rgb5A1);
        // Pixel 0: red = 0x1F, alpha bit set: bits 15..11 = 11111, a = 1
        // = (0x1F << 11) | 0x1 = 0xF801
        // Pixel 1: red = 0x1F, alpha bit clear: 0xF800
        fb.pixels = vec![0x01, 0xF8, 0x00, 0xF8];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![
            0xFF, 0x00, 0x00, 0xFF, // pixel 0: red, opaque
            0xFF, 0x00, 0x00, 0x00, // pixel 1: red, transparent
        ]);
    }

    #[test]
    fn rgb5a1_decode_pure_blue() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgb5A1);
        // bits 5..1 = blue = 0x1F, alpha = 1: (0x1F << 1) | 1 = 0x3F
        fb.pixels = vec![0x3F, 0x00];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x00, 0x00, 0xFF, 0xFF]);
    }

    #[test]
    fn rgba4_decodes_correctly() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgba4);
        // R=F G=0 B=F A=0  -> 0xF0F0
        fb.pixels = vec![0xF0, 0xF0];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0xFF, 0x00, 0xFF, 0x00]);
    }

    #[test]
    fn rgba4_full_white() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgba4);
        fb.pixels = vec![0xFF, 0xFF];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0xFF, 0xFF, 0xFF, 0xFF]);
    }

    #[test]
    fn rgba4_partial_channels() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgba4);
        // R=8 G=8 B=8 A=8 -> 0x8888 -> each channel becomes 0x88
        fb.pixels = vec![0x88, 0x88];
        let out = fb.to_rgba8();
        assert_eq!(out, vec![0x88, 0x88, 0x88, 0x88]);
    }

    #[test]
    fn write_raw_size_mismatch_errors() {
        let mut fb = Framebuffer::new(2, 2, PixelFormat::Rgba8);
        let too_small = vec![0u8; 4];
        assert!(fb.write_raw(&too_small).is_err());

        let too_big = vec![0u8; 64];
        assert!(fb.write_raw(&too_big).is_err());
    }

    #[test]
    fn write_raw_success() {
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Rgba8);
        let data = vec![0xAA, 0xBB, 0xCC, 0xDD];
        assert!(fb.write_raw(&data).is_ok());
        assert_eq!(fb.pixels, data);

        let out = fb.to_rgba8();
        assert_eq!(out, data);
    }

    #[test]
    fn rgba8_full_screen_size_matches() {
        let fb = Framebuffer::new(8, 8, PixelFormat::Rgba8);
        let out = fb.to_rgba8();
        assert_eq!(out.len(), 8 * 8 * 4);
    }
}
