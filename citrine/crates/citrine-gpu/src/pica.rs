//! Simplified PICA200 register model.
//!
//! The PICA200 has hundreds of registers in the `0x1EF00000` range, exposed
//! to the ARM11 via the GSP service. For Phase 1 we model only the
//! framebuffer-config registers; future phases will plumb shader uploads,
//! texture combiner state, and the lighting LUTs through the same struct.

use crate::framebuffer::PixelFormat;
use crate::screen::Screen;

/// One screen's framebuffer programming. The top screen has two addresses
/// (left and right eye) for autostereoscopic 3D; the bottom screen only ever
/// uses `address_left`.
#[derive(Debug, Clone, Copy, Default)]
pub struct FramebufferConfig {
    /// VRAM address of the active framebuffer for this screen.
    pub address_left: u32,
    /// Right-eye framebuffer address. Top-screen only; ignored for bottom.
    pub address_right: u32,
    /// Stride in bytes between rows.
    pub stride: u32,
    /// Pixel format encoded the same way the PICA registers do.
    pub format_raw: u32,
}

/// Top-level PICA200 register file as exposed by the GSP service.
#[derive(Debug, Default)]
pub struct PicaRegisters {
    pub top: FramebufferConfig,
    pub bottom: FramebufferConfig,
    /// Vsync interrupt count, incremented every emulated frame.
    pub frame_count: u64,
}

impl PicaRegisters {
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the active framebuffer for a screen.
    pub fn set_framebuffer(
        &mut self,
        screen: Screen,
        address: u32,
        stride: u32,
        format_raw: u32,
    ) {
        let cfg = match screen {
            Screen::Top => &mut self.top,
            Screen::Bottom => &mut self.bottom,
        };
        cfg.address_left = address;
        cfg.stride = stride;
        cfg.format_raw = format_raw;
    }

    /// Increment the frame counter, returning the new value.
    pub fn tick_vsync(&mut self) -> u64 {
        self.frame_count += 1;
        self.frame_count
    }

    /// Decode the raw PICA pixel format value to our PixelFormat enum.
    /// PICA values: 0 = RGBA8, 1 = BGR8, 2 = RGB565, 3 = RGB5A1, 4 = RGBA4.
    /// Unknown values fall back to RGBA8.
    pub fn format_for(&self, screen: Screen) -> PixelFormat {
        let raw = match screen {
            Screen::Top => self.top.format_raw,
            Screen::Bottom => self.bottom.format_raw,
        };
        match raw {
            0 => PixelFormat::Rgba8,
            1 => PixelFormat::Bgr8,
            2 => PixelFormat::Rgb565,
            3 => PixelFormat::Rgb5A1,
            4 => PixelFormat::Rgba4,
            _ => PixelFormat::Rgba8,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_state() {
        let regs = PicaRegisters::new();
        assert_eq!(regs.top.address_left, 0);
        assert_eq!(regs.top.address_right, 0);
        assert_eq!(regs.top.stride, 0);
        assert_eq!(regs.top.format_raw, 0);
        assert_eq!(regs.bottom.address_left, 0);
        assert_eq!(regs.bottom.stride, 0);
        assert_eq!(regs.frame_count, 0);
    }

    #[test]
    fn set_top_framebuffer() {
        let mut regs = PicaRegisters::new();
        regs.set_framebuffer(Screen::Top, 0x1804_8000, 960, 1);
        assert_eq!(regs.top.address_left, 0x1804_8000);
        assert_eq!(regs.top.stride, 960);
        assert_eq!(regs.top.format_raw, 1);
        // Bottom is unaffected.
        assert_eq!(regs.bottom.address_left, 0);
        assert_eq!(regs.bottom.stride, 0);
    }

    #[test]
    fn set_bottom_framebuffer() {
        let mut regs = PicaRegisters::new();
        regs.set_framebuffer(Screen::Bottom, 0x1806_0000, 640, 2);
        assert_eq!(regs.bottom.address_left, 0x1806_0000);
        assert_eq!(regs.bottom.stride, 640);
        assert_eq!(regs.bottom.format_raw, 2);
        // Top is unaffected.
        assert_eq!(regs.top.address_left, 0);
        assert_eq!(regs.top.format_raw, 0);
    }

    #[test]
    fn tick_vsync_increments() {
        let mut regs = PicaRegisters::new();
        assert_eq!(regs.tick_vsync(), 1);
        assert_eq!(regs.tick_vsync(), 2);
        assert_eq!(regs.tick_vsync(), 3);
        assert_eq!(regs.frame_count, 3);
    }

    #[test]
    fn format_for_each_value() {
        let mut regs = PicaRegisters::new();

        regs.set_framebuffer(Screen::Top, 0, 0, 0);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgba8);

        regs.set_framebuffer(Screen::Top, 0, 0, 1);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Bgr8);

        regs.set_framebuffer(Screen::Top, 0, 0, 2);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgb565);

        regs.set_framebuffer(Screen::Top, 0, 0, 3);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgb5A1);

        regs.set_framebuffer(Screen::Top, 0, 0, 4);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgba4);
    }

    #[test]
    fn format_for_unknown_falls_back_to_rgba8() {
        let mut regs = PicaRegisters::new();
        regs.set_framebuffer(Screen::Top, 0, 0, 99);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgba8);
    }

    #[test]
    fn format_for_each_screen_independent() {
        let mut regs = PicaRegisters::new();
        regs.set_framebuffer(Screen::Top, 0, 0, 2);
        regs.set_framebuffer(Screen::Bottom, 0, 0, 4);
        assert_eq!(regs.format_for(Screen::Top), PixelFormat::Rgb565);
        assert_eq!(regs.format_for(Screen::Bottom), PixelFormat::Rgba4);
    }

    #[test]
    fn set_framebuffer_overwrites_previous() {
        let mut regs = PicaRegisters::new();
        regs.set_framebuffer(Screen::Top, 0x1000, 100, 0);
        regs.set_framebuffer(Screen::Top, 0x2000, 200, 1);
        assert_eq!(regs.top.address_left, 0x2000);
        assert_eq!(regs.top.stride, 200);
        assert_eq!(regs.top.format_raw, 1);
    }
}
