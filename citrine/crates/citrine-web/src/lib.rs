//! citrine-web — wasm-bindgen entrypoint for the Phase 1 browser frontend.
//!
//! Wires together the ARM11 CPU, the 3DS bus, and the HLE kernel so the
//! JS side can load a `.3dsx` homebrew and step it through the SVC
//! dispatcher. The legacy flat-binary path is preserved so the original
//! Phase 0 demo still works.

use citrine_core::hle_bridge::{run_with_hle, step_with_hle};
use citrine_core::loader::load_3dsx;
use citrine_core::scanout::scan_out_to_rgba8;
use citrine_core::three_ds_bus::ThreeDsBus;
use citrine_cpu::{decoder::decode, Bus, Cpu};
use citrine_gpu::{
    PicaRegisters, Screen, SoftwareRenderer, BOTTOM_HEIGHT, BOTTOM_WIDTH, TOP_HEIGHT, TOP_WIDTH,
};
use citrine_kernel::{DefaultSvcDispatcher, Kernel};
use wasm_bindgen::prelude::*;

/// Emulator handle usable from JS.
///
/// Owns a full 3DS-layout bus, the ARM11 CPU, the HLE kernel and an SVC
/// dispatcher. The kernel's debug log accumulates across runs and is
/// readable via `debugLog()`. Also owns the PICA200 register model and a
/// software renderer placeholder; the cached RGBA8 buffers are refreshed by
/// `vsync()` and handed to JS via `renderTop()` / `renderBottom()`.
#[wasm_bindgen]
pub struct Emulator {
    cpu: Cpu,
    bus: ThreeDsBus,
    kernel: Kernel,
    dispatcher: DefaultSvcDispatcher,
    pica: PicaRegisters,
    #[allow(dead_code)]
    renderer: SoftwareRenderer,
    /// Decoded RGBA8 buffer for the top screen, ready for putImageData.
    top_rgba: Vec<u8>,
    /// Decoded RGBA8 buffer for the bottom screen.
    bot_rgba: Vec<u8>,
}

#[wasm_bindgen]
impl Emulator {
    /// Allocate a fresh 3DS bus, CPU, kernel and dispatcher.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Emulator {
        Emulator {
            cpu: Cpu::new(),
            bus: ThreeDsBus::new(),
            kernel: Kernel::new(),
            dispatcher: DefaultSvcDispatcher::new(),
            pica: PicaRegisters::new(),
            renderer: SoftwareRenderer::new(),
            top_rgba: vec![0u8; (TOP_WIDTH * TOP_HEIGHT * 4) as usize],
            bot_rgba: vec![0u8; (BOTTOM_WIDTH * BOTTOM_HEIGHT * 4) as usize],
        }
    }

    /// Execute exactly one instruction. Returns cycles consumed.
    pub fn step(&mut self) -> u32 {
        self.cpu.step(&mut self.bus).cycles
    }

    /// Execute up to `max_steps` instructions. Returns the number executed.
    pub fn run(&mut self, max_steps: u32) -> u32 {
        self.cpu.run(&mut self.bus, max_steps)
    }

    /// Return the 17-word snapshot (R0..R15, CPSR) as a `Uint32Array`.
    #[wasm_bindgen(js_name = getRegisters)]
    pub fn get_registers(&self) -> js_sys::Uint32Array {
        let snap = self.cpu.snapshot();
        let out = js_sys::Uint32Array::new_with_length(17);
        for (i, v) in snap.iter().enumerate() {
            out.set_index(i as u32, *v);
        }
        out
    }

    /// Read a slice of bytes from the bus. Uses byte-granular reads so MMIO
    /// stubs are exercised the same way the CPU would exercise them.
    #[wasm_bindgen(js_name = getMemoryRange)]
    pub fn get_memory_range(&mut self, addr: u32, len: u32) -> js_sys::Uint8Array {
        let out = js_sys::Uint8Array::new_with_length(len);
        for i in 0..len {
            let b = self.bus.read8(addr.wrapping_add(i));
            out.set_index(i, b);
        }
        out
    }

    /// Decode a single instruction word and return its debug representation.
    #[wasm_bindgen(js_name = disassembleAt)]
    pub fn disassemble_at(&mut self, addr: u32) -> String {
        let word = self.bus.read32(addr & !3);
        let decoded = decode(word);
        format!("{:#010x}: {:08x}  {}", addr, word, decoded)
    }

    /// Total retired cycle count (as f64 for JS compat; 64-bit ints need BigInt).
    pub fn cycles(&self) -> f64 {
        self.cpu.cycles as f64
    }

    /// Write a word directly to the bus (useful for tests and the memory editor).
    #[wasm_bindgen(js_name = pokeWord)]
    pub fn poke_word(&mut self, addr: u32, value: u32) {
        self.bus.write32(addr, value);
    }

    /// Reset the CPU with a given entry PC without touching memory.
    #[wasm_bindgen(js_name = resetPc)]
    pub fn reset_pc(&mut self, pc: u32) {
        self.cpu.reset(pc);
    }

    // ── Phase 1 methods ──

    /// Load a flat binary blob at `base` (legacy demo path). Writes into
    /// FCRAM via the bus and resets the CPU to `base`.
    #[wasm_bindgen(js_name = loadFlatBinary)]
    pub fn load_flat_binary(&mut self, base: u32, bytes: &[u8]) {
        self.bus.write_fcram(base, bytes);
        self.cpu.reset(base);
    }

    /// Load a `.3dsx` homebrew file at `base`. The loader parses the header,
    /// relocates the image, and returns its entry point. On success the CPU
    /// is reset to that entry point. Returns a human-readable error on parse
    /// failure.
    #[wasm_bindgen(js_name = loadHomebrew)]
    pub fn load_homebrew(&mut self, base: u32, bytes: &[u8]) -> Result<(), String> {
        let prog = load_3dsx(bytes, base).map_err(|e| format!("{:?}", e))?;
        let mut image = vec![0u8; prog.total_size as usize];
        prog.copy_into(&mut image);
        self.bus.write_fcram(base, &image);
        self.cpu.reset(prog.entry_point);
        Ok(())
    }

    /// Step once through the HLE bridge. SVC instructions are routed to the
    /// kernel dispatcher; non-SVC instructions run as usual. Returns cycles.
    #[wasm_bindgen(js_name = stepHle)]
    pub fn step_hle(&mut self) -> u32 {
        let before = self.cpu.cycles;
        let _ = step_with_hle(
            &mut self.cpu,
            &mut self.bus,
            &mut self.kernel,
            &mut self.dispatcher,
        );
        self.cpu.cycles.wrapping_sub(before) as u32
    }

    /// Run up to `max_steps` instructions through the HLE bridge. Stops early
    /// on spin-trap or when the dispatcher signals block. Returns the number
    /// of instructions executed.
    #[wasm_bindgen(js_name = runHle)]
    pub fn run_hle(&mut self, max_steps: u32) -> u32 {
        run_with_hle(
            &mut self.cpu,
            &mut self.bus,
            &mut self.kernel,
            &mut self.dispatcher,
            max_steps,
        )
    }

    /// The kernel's debug log, joined with newlines. Accumulates across
    /// `runHle`/`stepHle` calls until `clearDebugLog()` is invoked.
    #[wasm_bindgen(js_name = debugLog)]
    pub fn debug_log(&self) -> String {
        self.dispatcher.log.join("\n")
    }

    /// Clear the kernel's debug log.
    #[wasm_bindgen(js_name = clearDebugLog)]
    pub fn clear_debug_log(&mut self) {
        self.dispatcher.log.clear();
    }

    // ── Framebuffer / scanout methods ──

    /// Configure the top screen framebuffer. `address` is the VRAM address
    /// of the first pixel; `stride` is bytes between source columns
    /// (column-major layout); `format` is the PICA pixel format code
    /// (0=RGBA8, 1=BGR8, 2=RGB565, 3=RGB5A1, 4=RGBA4).
    #[wasm_bindgen(js_name = setTopFramebuffer)]
    pub fn set_top_framebuffer(&mut self, address: u32, stride: u32, format: u32) {
        self.pica.set_framebuffer(Screen::Top, address, stride, format);
    }

    /// Configure the bottom screen framebuffer. Same arguments as
    /// `setTopFramebuffer`.
    #[wasm_bindgen(js_name = setBottomFramebuffer)]
    pub fn set_bottom_framebuffer(&mut self, address: u32, stride: u32, format: u32) {
        self.pica
            .set_framebuffer(Screen::Bottom, address, stride, format);
    }

    /// Decode both framebuffers from VRAM and update the cached RGBA8
    /// buffers. JS should call this once per frame after stepping the CPU.
    /// Returns the new vsync frame counter.
    pub fn vsync(&mut self) -> u64 {
        self.top_rgba = scan_out_to_rgba8(&mut self.bus, &self.pica.top, Screen::Top);
        self.bot_rgba = scan_out_to_rgba8(&mut self.bus, &self.pica.bottom, Screen::Bottom);
        self.pica.tick_vsync()
    }

    /// Return the cached top-screen RGBA8 buffer (400×240 = 384000 bytes).
    #[wasm_bindgen(js_name = renderTop)]
    pub fn render_top(&self) -> js_sys::Uint8Array {
        let out = js_sys::Uint8Array::new_with_length(self.top_rgba.len() as u32);
        out.copy_from(&self.top_rgba);
        out
    }

    /// Return the cached bottom-screen RGBA8 buffer (320×240 = 307200 bytes).
    #[wasm_bindgen(js_name = renderBottom)]
    pub fn render_bottom(&self) -> js_sys::Uint8Array {
        let out = js_sys::Uint8Array::new_with_length(self.bot_rgba.len() as u32);
        out.copy_from(&self.bot_rgba);
        out
    }

    /// Direct-write a slice of bytes into VRAM at `vram_offset` bytes past
    /// the VRAM base. Used by the JS test path to upload pattern bytes
    /// without going through the CPU.
    #[wasm_bindgen(js_name = pokeVram)]
    pub fn poke_vram(&mut self, vram_offset: u32, bytes: &[u8]) {
        self.bus
            .write_vram(ThreeDsBus::VRAM_BASE + vram_offset, bytes);
    }
}

impl Default for Emulator {
    fn default() -> Self {
        Self::new()
    }
}

/// Log a message to the JS console.
#[wasm_bindgen(js_name = citrineLog)]
pub fn citrine_log(msg: &str) {
    web_sys::console::log_1(&msg.into());
}
