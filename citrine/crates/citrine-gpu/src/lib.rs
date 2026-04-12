//! citrine-gpu — PICA200 model and framebuffer scanout.
//!
//! Phase 1 is software-only. The trait `Renderer` lets a future Phase 2
//! WebGPU implementation slot in without touching the CPU/kernel.

pub mod framebuffer;
pub mod pica;
pub mod renderer;
pub mod screen;

pub use framebuffer::{Framebuffer, PixelFormat};
pub use pica::{FramebufferConfig, PicaRegisters};
pub use renderer::{Renderer, SoftwareRenderer};
pub use screen::{Screen, BOTTOM_HEIGHT, BOTTOM_WIDTH, TOP_HEIGHT, TOP_WIDTH};
