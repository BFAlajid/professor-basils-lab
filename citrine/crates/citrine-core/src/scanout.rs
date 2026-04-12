//! GPU framebuffer scanout helper.
//!
//! The 3DS has two screens (top 400x240, bottom 320x240) whose framebuffers
//! live in VRAM at `0x18000000`. Real homebrew programs their addresses via
//! the GSP service; for the demo we let the JS frontend configure them
//! directly through [`FramebufferConfig`].
//!
//! This module reads bytes from an arbitrary [`Bus`], decodes them according
//! to the PICA pixel format, and produces a row-major RGBA8 byte buffer
//! ready to be blitted to a canvas via `putImageData`.
//!
//! The PICA200 stores native framebuffers in **column-major** order because
//! the physical screens are rotated 90 degrees in hardware. [`scan_out_to_rgba8`]
//! un-rotates on the fly so callers get the natural left-to-right,
//! top-to-bottom order JS canvases expect.

use citrine_cpu::Bus;
use citrine_gpu::{Framebuffer, FramebufferConfig, PixelFormat, Renderer, Screen};

/// Decode a single PICA pixel format integer to a [`PixelFormat`].
///
/// PICA register values: 0 = RGBA8, 1 = BGR8, 2 = RGB565, 3 = RGB5A1,
/// 4 = RGBA4. Unknown values fall back to `Rgba8` — matching
/// [`citrine_gpu::PicaRegisters::format_for`] so scanout never panics on
/// garbage register state.
pub fn decode_pica_format(raw: u32) -> PixelFormat {
    match raw {
        0 => PixelFormat::Rgba8,
        1 => PixelFormat::Bgr8,
        2 => PixelFormat::Rgb565,
        3 => PixelFormat::Rgb5A1,
        4 => PixelFormat::Rgba4,
        _ => PixelFormat::Rgba8,
    }
}

/// Read a framebuffer from `bus` according to `config`, decode it for
/// `screen`, and return a row-major RGBA8 byte buffer (4 bytes per pixel).
///
/// The 3DS stores native framebuffers in **column-major** order because the
/// physical screens are rotated 90 degrees. This function un-rotates so the
/// output is the natural left-to-right, top-to-bottom byte order JS canvases
/// expect.
///
/// If `config.address_left` is zero, returns a fully-zero buffer of the
/// correct size — this is the pre-boot state before the GSP service has
/// programmed anything.
pub fn scan_out_to_rgba8<B: Bus>(
    bus: &mut B,
    config: &FramebufferConfig,
    screen: Screen,
) -> Vec<u8> {
    let width = screen.width();
    let height = screen.height();
    let out_len = (width * height * 4) as usize;

    // Pre-boot state: no framebuffer configured yet.
    if config.address_left == 0 {
        return vec![0u8; out_len];
    }

    let format = decode_pica_format(config.format_raw);
    let bpp = format.bytes_per_pixel();

    // PICA stride is the byte gap between adjacent columns in the
    // column-major source. A stride of zero means "tightly packed" — one
    // column occupies exactly `height * bpp` bytes.
    let stride = if config.stride == 0 {
        height * bpp
    } else {
        config.stride
    };

    let mut out = vec![0u8; out_len];

    for y in 0..height {
        for x in 0..width {
            // Column-major source: column x is at base + x*stride, and
            // pixel y within that column is at offset y*bpp.
            let src_offset = x * stride + y * bpp;
            let src_addr = config.address_left.wrapping_add(src_offset);

            let (r, g, b, a) = decode_pixel(bus, src_addr, format);

            let dst = ((y * width + x) * 4) as usize;
            out[dst] = r;
            out[dst + 1] = g;
            out[dst + 2] = b;
            out[dst + 3] = a;
        }
    }

    out
}

/// Read a framebuffer from `bus`, decode it, and present it via `renderer`
/// for the given screen. Convenience that bundles [`scan_out_to_rgba8`]
/// with a [`Renderer::present`] call.
///
/// The presented [`Framebuffer`] holds the already-decoded RGBA8 bytes so
/// the renderer sees a natural row-major image. Both `width`/`height`
/// on the framebuffer match the screen geometry, not the raw source layout.
pub fn scan_out_present<B: Bus, R: Renderer>(
    bus: &mut B,
    config: &FramebufferConfig,
    screen: Screen,
    renderer: &mut R,
) {
    let rgba = scan_out_to_rgba8(bus, config, screen);
    let fb = Framebuffer {
        width: screen.width(),
        height: screen.height(),
        format: PixelFormat::Rgba8,
        pixels: rgba,
    };
    renderer.present(screen, &fb);
}

/// Decode one pixel from `bus` starting at `addr`, according to `format`,
/// and return it as `(r, g, b, a)`.
fn decode_pixel<B: Bus>(bus: &mut B, addr: u32, format: PixelFormat) -> (u8, u8, u8, u8) {
    match format {
        PixelFormat::Rgba8 => {
            let r = bus.read8(addr);
            let g = bus.read8(addr.wrapping_add(1));
            let b = bus.read8(addr.wrapping_add(2));
            let a = bus.read8(addr.wrapping_add(3));
            (r, g, b, a)
        }
        PixelFormat::Bgr8 => {
            let b = bus.read8(addr);
            let g = bus.read8(addr.wrapping_add(1));
            let r = bus.read8(addr.wrapping_add(2));
            (r, g, b, 0xFF)
        }
        PixelFormat::Rgb565 => {
            let lo = bus.read8(addr);
            let hi = bus.read8(addr.wrapping_add(1));
            let v = u16::from_le_bytes([lo, hi]);
            let r5 = ((v >> 11) & 0x1F) as u8;
            let g6 = ((v >> 5) & 0x3F) as u8;
            let b5 = (v & 0x1F) as u8;
            (
                (r5 << 3) | (r5 >> 2),
                (g6 << 2) | (g6 >> 4),
                (b5 << 3) | (b5 >> 2),
                0xFF,
            )
        }
        PixelFormat::Rgb5A1 => {
            let lo = bus.read8(addr);
            let hi = bus.read8(addr.wrapping_add(1));
            let v = u16::from_le_bytes([lo, hi]);
            let r5 = ((v >> 11) & 0x1F) as u8;
            let g5 = ((v >> 6) & 0x1F) as u8;
            let b5 = ((v >> 1) & 0x1F) as u8;
            let a1 = (v & 0x1) as u8;
            (
                (r5 << 3) | (r5 >> 2),
                (g5 << 3) | (g5 >> 2),
                (b5 << 3) | (b5 >> 2),
                if a1 != 0 { 0xFF } else { 0x00 },
            )
        }
        PixelFormat::Rgba4 => {
            let lo = bus.read8(addr);
            let hi = bus.read8(addr.wrapping_add(1));
            let v = u16::from_le_bytes([lo, hi]);
            let r4 = ((v >> 12) & 0xF) as u8;
            let g4 = ((v >> 8) & 0xF) as u8;
            let b4 = ((v >> 4) & 0xF) as u8;
            let a4 = (v & 0xF) as u8;
            (
                (r4 << 4) | r4,
                (g4 << 4) | g4,
                (b4 << 4) | b4,
                (a4 << 4) | a4,
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal in-test bus: a flat byte region at an arbitrary base.
    /// Reads outside the region return 0; writes outside are silently
    /// dropped. Keeps the tests independent of `ThreeDsBus`.
    struct TestBus {
        ram: Vec<u8>,
        base: u32,
    }

    impl TestBus {
        fn new(base: u32, size: usize) -> Self {
            Self {
                ram: vec![0; size],
                base,
            }
        }

        fn write_at(&mut self, addr: u32, bytes: &[u8]) {
            let off = (addr - self.base) as usize;
            self.ram[off..off + bytes.len()].copy_from_slice(bytes);
        }

        fn offset(&self, addr: u32) -> Option<usize> {
            if addr < self.base {
                return None;
            }
            let off = (addr - self.base) as usize;
            if off >= self.ram.len() {
                return None;
            }
            Some(off)
        }
    }

    impl Bus for TestBus {
        fn read8(&mut self, addr: u32) -> u8 {
            match self.offset(addr) {
                Some(off) => self.ram[off],
                None => 0,
            }
        }

        fn read16(&mut self, addr: u32) -> u16 {
            let lo = self.read8(addr);
            let hi = self.read8(addr.wrapping_add(1));
            u16::from_le_bytes([lo, hi])
        }

        fn read32(&mut self, addr: u32) -> u32 {
            let b0 = self.read8(addr);
            let b1 = self.read8(addr.wrapping_add(1));
            let b2 = self.read8(addr.wrapping_add(2));
            let b3 = self.read8(addr.wrapping_add(3));
            u32::from_le_bytes([b0, b1, b2, b3])
        }

        fn write8(&mut self, addr: u32, value: u8) {
            if let Some(off) = self.offset(addr) {
                self.ram[off] = value;
            }
        }

        fn write16(&mut self, addr: u32, value: u16) {
            let [b0, b1] = value.to_le_bytes();
            self.write8(addr, b0);
            self.write8(addr.wrapping_add(1), b1);
        }

        fn write32(&mut self, addr: u32, value: u32) {
            let [b0, b1, b2, b3] = value.to_le_bytes();
            self.write8(addr, b0);
            self.write8(addr.wrapping_add(1), b1);
            self.write8(addr.wrapping_add(2), b2);
            self.write8(addr.wrapping_add(3), b3);
        }
    }

    /// Recording renderer used to verify `scan_out_present`.
    struct CapturingRenderer {
        last_top: Option<Framebuffer>,
        last_bottom: Option<Framebuffer>,
    }

    impl CapturingRenderer {
        fn new() -> Self {
            Self {
                last_top: None,
                last_bottom: None,
            }
        }
    }

    impl Renderer for CapturingRenderer {
        fn present(&mut self, screen: Screen, framebuffer: &Framebuffer) {
            let clone = framebuffer.clone();
            match screen {
                Screen::Top => self.last_top = Some(clone),
                Screen::Bottom => self.last_bottom = Some(clone),
            }
        }

        fn reset(&mut self) {
            self.last_top = None;
            self.last_bottom = None;
        }
    }

    // A convenient base address inside VRAM; tests don't depend on this
    // being exactly the real VRAM base, just that it's non-zero.
    const FB_BASE: u32 = 0x1800_0000;

    #[test]
    fn decode_pica_format_each_value() {
        assert_eq!(decode_pica_format(0), PixelFormat::Rgba8);
        assert_eq!(decode_pica_format(1), PixelFormat::Bgr8);
        assert_eq!(decode_pica_format(2), PixelFormat::Rgb565);
        assert_eq!(decode_pica_format(3), PixelFormat::Rgb5A1);
        assert_eq!(decode_pica_format(4), PixelFormat::Rgba4);
        // Unknown values fall back to Rgba8.
        assert_eq!(decode_pica_format(5), PixelFormat::Rgba8);
        assert_eq!(decode_pica_format(99), PixelFormat::Rgba8);
        assert_eq!(decode_pica_format(u32::MAX), PixelFormat::Rgba8);
    }

    #[test]
    fn null_address_returns_zero_buffer() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        let config = FramebufferConfig {
            address_left: 0,
            address_right: 0,
            stride: 0,
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(out.len(), (400 * 240 * 4) as usize);
        assert!(out.iter().all(|&b| b == 0));
    }

    #[test]
    fn output_size_top_screen() {
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0, // Rgba8
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(out.len(), 400 * 240 * 4);
        assert_eq!(out.len(), 384_000);
    }

    #[test]
    fn output_size_bottom_screen() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0, // Rgba8
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Bottom);
        assert_eq!(out.len(), 320 * 240 * 4);
        assert_eq!(out.len(), 307_200);
    }

    #[test]
    fn rgba8_passthrough_top_left_pixel() {
        // For top-left pixel (x=0, y=0), source offset is 0*stride + 0*4 = 0.
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        bus.write_at(FB_BASE, &[0x11, 0x22, 0x33, 0x44]);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        // Output (0,0) lives at the very start of the row-major buffer.
        assert_eq!(&out[0..4], &[0x11, 0x22, 0x33, 0x44]);
    }

    #[test]
    fn rgba8_pixel_at_corner_xn_yn() {
        // Column-major: last column (x = width-1) at y = 0.
        // Source offset: (width-1)*stride + 0*bpp.
        let mut bus = TestBus::new(FB_BASE, 0x40_0000);
        let width = 400u32;
        let height = 240u32;
        let bpp = 4u32;
        let stride = height * bpp;
        let last_col_addr = FB_BASE + (width - 1) * stride;
        bus.write_at(last_col_addr, &[0xAA, 0xBB, 0xCC, 0xDD]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0, // default column-major stride
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);

        // Output pixel (x = width-1, y = 0): offset (0*width + (width-1))*4.
        let dst = ((0 * width + (width - 1)) * 4) as usize;
        assert_eq!(&out[dst..dst + 4], &[0xAA, 0xBB, 0xCC, 0xDD]);
    }

    #[test]
    fn rgba8_un_rotates_columns_to_rows() {
        // Build a tiny custom screen by using a short column-major buffer and
        // a test that runs scan_out_to_rgba8 via a fabricated config. Since
        // we're constrained to the real Screen geometries, we verify the
        // un-rotation by placing a known pattern at four source positions on
        // a full screen and checking they land at the expected (x,y).
        //
        // Pattern: four pixels at source column,row = (0,0) (1,0) (0,1) (1,1).
        // Expected output rows:
        //   row 0 begins [P(0,0), P(1,0), ...]
        //   row 1 begins [P(0,1), P(1,1), ...]
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        let width = 320u32;
        let height = 240u32;
        let bpp = 4u32;
        let stride = height * bpp; // default column-major stride

        // Source column 0 = pixels at addresses FB_BASE + 0 (y=0) and FB_BASE + 4 (y=1).
        // Source column 1 = FB_BASE + stride (y=0), FB_BASE + stride + 4 (y=1).
        bus.write_at(FB_BASE + 0 * stride + 0 * bpp, &[0x01, 0x02, 0x03, 0x04]); // col 0, row 0
        bus.write_at(FB_BASE + 0 * stride + 1 * bpp, &[0x05, 0x06, 0x07, 0x08]); // col 0, row 1
        bus.write_at(FB_BASE + 1 * stride + 0 * bpp, &[0x09, 0x0A, 0x0B, 0x0C]); // col 1, row 0
        bus.write_at(FB_BASE + 1 * stride + 1 * bpp, &[0x0D, 0x0E, 0x0F, 0x10]); // col 1, row 1

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Bottom);

        // Row 0, column 0:
        let p00 = ((0 * width + 0) * 4) as usize;
        assert_eq!(&out[p00..p00 + 4], &[0x01, 0x02, 0x03, 0x04]);
        // Row 0, column 1:
        let p10 = ((0 * width + 1) * 4) as usize;
        assert_eq!(&out[p10..p10 + 4], &[0x09, 0x0A, 0x0B, 0x0C]);
        // Row 1, column 0:
        let p01 = ((1 * width + 0) * 4) as usize;
        assert_eq!(&out[p01..p01 + 4], &[0x05, 0x06, 0x07, 0x08]);
        // Row 1, column 1:
        let p11 = ((1 * width + 1) * 4) as usize;
        assert_eq!(&out[p11..p11 + 4], &[0x0D, 0x0E, 0x0F, 0x10]);
    }

    #[test]
    fn bgr8_swaps_channels_and_sets_alpha() {
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        // BGR8: 3 bytes per pixel, source order (B, G, R).
        bus.write_at(FB_BASE, &[0x10, 0x20, 0x30]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 1, // Bgr8
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        // Output pixel (0,0) should be R=0x30, G=0x20, B=0x10, A=0xFF.
        assert_eq!(&out[0..4], &[0x30, 0x20, 0x10, 0xFF]);
    }

    #[test]
    fn rgb565_pure_red_decodes_to_ff_00_00() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // 0xF800 little-endian -> [0x00, 0xF8]
        bus.write_at(FB_BASE, &[0x00, 0xF8]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 2, // Rgb565
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0xFF, 0x00, 0x00, 0xFF]);
    }

    #[test]
    fn rgb565_pure_green_decodes_to_00_ff_00() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // 0x07E0 little-endian -> [0xE0, 0x07]
        bus.write_at(FB_BASE, &[0xE0, 0x07]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 2,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0x00, 0xFF, 0x00, 0xFF]);
    }

    #[test]
    fn rgb565_pure_blue_decodes_to_00_00_ff() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // 0x001F little-endian -> [0x1F, 0x00]
        bus.write_at(FB_BASE, &[0x1F, 0x00]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 2,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0x00, 0x00, 0xFF, 0xFF]);
    }

    #[test]
    fn rgb5a1_alpha_set() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // Red = 0x1F, alpha bit set: (0x1F << 11) | 1 = 0xF801 -> LE [0x01, 0xF8]
        bus.write_at(FB_BASE, &[0x01, 0xF8]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 3, // Rgb5A1
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0xFF, 0x00, 0x00, 0xFF]);
    }

    #[test]
    fn rgb5a1_alpha_clear() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // Red = 0x1F, alpha bit clear: 0xF800 -> LE [0x00, 0xF8]
        bus.write_at(FB_BASE, &[0x00, 0xF8]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 3,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0xFF, 0x00, 0x00, 0x00]);
    }

    #[test]
    fn rgba4_decodes_white() {
        let mut bus = TestBus::new(FB_BASE, 0x10_0000);
        // 0xFFFF -> all four nibbles = 0xF; each channel scales to 0xFF.
        bus.write_at(FB_BASE, &[0xFF, 0xFF]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 4, // Rgba4
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0xFF, 0xFF, 0xFF, 0xFF]);
    }

    #[test]
    fn stride_zero_falls_back_to_column_height() {
        // With explicit stride=0, columns should be packed: column 1 starts
        // immediately after column 0 (at byte offset height*bpp).
        let mut bus = TestBus::new(FB_BASE, 0x40_0000);
        let height = 240u32;
        let bpp = 4u32;
        let packed_stride = height * bpp; // 960
        // Put a marker at column 1, row 0, assuming packed stride.
        bus.write_at(FB_BASE + packed_stride, &[0xDE, 0xAD, 0xBE, 0xEF]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0, // must fall back to height*bpp
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        // Output (x=1, y=0) -> offset (0*400 + 1)*4 = 4.
        assert_eq!(&out[4..8], &[0xDE, 0xAD, 0xBE, 0xEF]);
    }

    #[test]
    fn non_default_stride_skips_pad_bytes() {
        // Explicit stride larger than packed: padding bytes at end of each
        // column must be skipped.
        let mut bus = TestBus::new(FB_BASE, 0x80_0000);
        let height = 240u32;
        let bpp = 4u32;
        let packed = height * bpp; // 960
        let stride = packed + 64;  // 64 bytes of padding per column

        // Column 0, row 0: marker A.
        bus.write_at(FB_BASE, &[0x01, 0x02, 0x03, 0x04]);
        // Column 1, row 0: marker B at column-1 offset.
        bus.write_at(FB_BASE + stride, &[0x05, 0x06, 0x07, 0x08]);
        // Column 0, row 1: marker C (y=1 within col 0).
        bus.write_at(FB_BASE + bpp, &[0x09, 0x0A, 0x0B, 0x0C]);

        // Deliberately write garbage into the padding region to prove it's
        // not accidentally consumed.
        bus.write_at(FB_BASE + packed, &[0xFF; 64]);

        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride,
            format_raw: 0,
        };
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);

        // (x=0, y=0)
        assert_eq!(&out[0..4], &[0x01, 0x02, 0x03, 0x04]);
        // (x=1, y=0) -> offset (0*400 + 1)*4 = 4
        assert_eq!(&out[4..8], &[0x05, 0x06, 0x07, 0x08]);
        // (x=0, y=1) -> offset (1*400 + 0)*4 = 1600
        assert_eq!(&out[1600..1604], &[0x09, 0x0A, 0x0B, 0x0C]);
    }

    #[test]
    fn unknown_pixel_format_falls_back_to_rgba8() {
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        bus.write_at(FB_BASE, &[0x11, 0x22, 0x33, 0x44]);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 99, // unknown
        };
        // Must not panic; should treat as Rgba8 and read 4 bytes.
        let out = scan_out_to_rgba8(&mut bus, &config, Screen::Top);
        assert_eq!(&out[0..4], &[0x11, 0x22, 0x33, 0x44]);
    }

    #[test]
    fn scan_out_present_calls_renderer() {
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        bus.write_at(FB_BASE, &[0xCA, 0xFE, 0xBA, 0xBE]);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0,
        };

        let mut renderer = CapturingRenderer::new();
        scan_out_present(&mut bus, &config, Screen::Top, &mut renderer);

        let captured = renderer.last_top.as_ref().expect("top framebuffer must be present");
        assert_eq!(captured.width, 400);
        assert_eq!(captured.height, 240);
        assert_eq!(captured.format, PixelFormat::Rgba8);
        assert_eq!(captured.pixels.len(), 400 * 240 * 4);
        // Top-left pixel made it through.
        assert_eq!(&captured.pixels[0..4], &[0xCA, 0xFE, 0xBA, 0xBE]);
        // Other screen stays empty.
        assert!(renderer.last_bottom.is_none());
    }

    #[test]
    fn scan_out_present_routes_bottom_screen() {
        // Extra guard: make sure the bottom path is wired too.
        let mut bus = TestBus::new(FB_BASE, 0x20_0000);
        bus.write_at(FB_BASE, &[0xDE, 0xAD, 0xBE, 0xEF]);
        let config = FramebufferConfig {
            address_left: FB_BASE,
            address_right: 0,
            stride: 0,
            format_raw: 0,
        };

        let mut renderer = CapturingRenderer::new();
        scan_out_present(&mut bus, &config, Screen::Bottom, &mut renderer);

        let captured = renderer
            .last_bottom
            .as_ref()
            .expect("bottom framebuffer must be present");
        assert_eq!(captured.width, 320);
        assert_eq!(captured.height, 240);
        assert!(renderer.last_top.is_none());
    }
}
