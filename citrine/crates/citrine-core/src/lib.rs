//! citrine-core — system wiring.
//!
//! Provides the flat-memory `Bus`, the 3DS-shaped memory bus, the 3DSX
//! homebrew loader, the HLE SVC bridge, the GPU framebuffer scanout helper,
//! and a `System` struct that owns a CPU + bus so callers can drive both
//! with a single handle.

pub mod bus;
pub mod hle_bridge;
pub mod loader;
pub mod scanout;
pub mod system;
pub mod three_ds_bus;

pub use bus::{FlatMemory, MmioLog};
pub use hle_bridge::{run_with_hle, step_with_hle, BridgedStep};
pub use loader::{load_3dsx, LoadedProgram, LoaderError};
pub use scanout::{decode_pica_format, scan_out_present, scan_out_to_rgba8};
pub use system::System;
pub use three_ds_bus::{BusAccess, ThreeDsBus};
