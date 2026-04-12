//! Renderer abstraction.
//!
//! `Renderer` is the boundary between the emulated PICA200 and whatever
//! actually puts pixels on a host display. Phase 1 ships with
//! `SoftwareRenderer`, which simply caches the latest decoded RGBA8 buffer
//! per screen so the wasm frontend can pull it out and `putImageData` it.
//! A future Phase 2 implementation will plug WebGPU in behind the same
//! trait without touching CPU/kernel code.

use crate::framebuffer::Framebuffer;
use crate::screen::Screen;

pub trait Renderer {
    /// Present a framebuffer for the given screen. The renderer is
    /// expected to copy / blit to its target before returning.
    fn present(&mut self, screen: Screen, framebuffer: &Framebuffer);

    /// Reset internal state.
    fn reset(&mut self);
}

/// Software renderer that just stores the latest RGBA8 buffer per screen.
/// Phase 1 frontend reads `last_top()` / `last_bottom()` and putImageData's it.
pub struct SoftwareRenderer {
    last_top: Option<Vec<u8>>,
    last_bottom: Option<Vec<u8>>,
}

impl SoftwareRenderer {
    pub fn new() -> Self {
        Self {
            last_top: None,
            last_bottom: None,
        }
    }

    pub fn last_top(&self) -> Option<&[u8]> {
        self.last_top.as_deref()
    }

    pub fn last_bottom(&self) -> Option<&[u8]> {
        self.last_bottom.as_deref()
    }
}

impl Default for SoftwareRenderer {
    fn default() -> Self {
        Self::new()
    }
}

impl Renderer for SoftwareRenderer {
    fn present(&mut self, screen: Screen, framebuffer: &Framebuffer) {
        let rgba = framebuffer.to_rgba8();
        match screen {
            Screen::Top => self.last_top = Some(rgba),
            Screen::Bottom => self.last_bottom = Some(rgba),
        }
    }

    fn reset(&mut self) {
        self.last_top = None;
        self.last_bottom = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::framebuffer::PixelFormat;

    #[test]
    fn software_present_top() {
        let mut renderer = SoftwareRenderer::new();
        let mut fb = Framebuffer::new(2, 1, PixelFormat::Rgba8);
        fb.pixels = vec![1, 2, 3, 4, 5, 6, 7, 8];

        assert!(renderer.last_top().is_none());
        renderer.present(Screen::Top, &fb);
        assert_eq!(renderer.last_top(), Some(&[1, 2, 3, 4, 5, 6, 7, 8][..]));
        // Bottom is untouched.
        assert!(renderer.last_bottom().is_none());
    }

    #[test]
    fn software_present_bottom() {
        let mut renderer = SoftwareRenderer::new();
        let mut fb = Framebuffer::new(1, 1, PixelFormat::Bgr8);
        fb.pixels = vec![0x10, 0x20, 0x30];

        renderer.present(Screen::Bottom, &fb);
        // Bgr8 -> Rgba8 swap with alpha 0xFF.
        assert_eq!(renderer.last_bottom(), Some(&[0x30, 0x20, 0x10, 0xFF][..]));
        assert!(renderer.last_top().is_none());
    }

    #[test]
    fn software_reset_clears_state() {
        let mut renderer = SoftwareRenderer::new();
        let fb = Framebuffer::new(1, 1, PixelFormat::Rgba8);
        renderer.present(Screen::Top, &fb);
        renderer.present(Screen::Bottom, &fb);
        assert!(renderer.last_top().is_some());
        assert!(renderer.last_bottom().is_some());

        renderer.reset();
        assert!(renderer.last_top().is_none());
        assert!(renderer.last_bottom().is_none());
    }

    #[test]
    fn software_present_overwrites() {
        let mut renderer = SoftwareRenderer::new();

        let mut fb1 = Framebuffer::new(1, 1, PixelFormat::Rgba8);
        fb1.pixels = vec![0xAA, 0xBB, 0xCC, 0xDD];
        renderer.present(Screen::Top, &fb1);
        assert_eq!(renderer.last_top(), Some(&[0xAA, 0xBB, 0xCC, 0xDD][..]));

        let mut fb2 = Framebuffer::new(1, 1, PixelFormat::Rgba8);
        fb2.pixels = vec![0x11, 0x22, 0x33, 0x44];
        renderer.present(Screen::Top, &fb2);
        assert_eq!(renderer.last_top(), Some(&[0x11, 0x22, 0x33, 0x44][..]));
    }

    #[test]
    fn software_default_is_empty() {
        let renderer = SoftwareRenderer::default();
        assert!(renderer.last_top().is_none());
        assert!(renderer.last_bottom().is_none());
    }
}
