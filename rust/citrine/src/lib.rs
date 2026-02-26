pub mod cpu;
pub mod memory;
pub mod kernel;
pub mod services;
pub mod loader;
pub mod hw;
pub mod emulator;

use wasm_bindgen::prelude::*;
use emulator::Emulator;

static mut EMULATOR: Option<Emulator> = None;

#[cfg(target_arch = "wasm32")]
fn is_authorized() -> bool {
    use std::sync::atomic::{AtomicU8, Ordering};
    static AUTH: AtomicU8 = AtomicU8::new(2);
    let v = AUTH.load(Ordering::Relaxed);
    if v != 2 { return v == 1; }
    let ok = js_sys::eval("window.location.hostname")
        .ok()
        .and_then(|v| v.as_string())
        .map(|h| {
            h == "professor-basils-lab.vercel.app"
                || h.ends_with(".vercel.app")
                || h == "localhost"
                || h == "127.0.0.1"
        })
        .unwrap_or(false);
    AUTH.store(if ok { 1 } else { 0 }, Ordering::Relaxed);
    ok
}

#[cfg(not(target_arch = "wasm32"))]
fn is_authorized() -> bool { true }
#[wasm_bindgen]
pub fn citrine_create() -> bool {
    if !is_authorized() { return false; }
    unsafe {
        EMULATOR = Some(Emulator::new());
    }
    true
}

#[wasm_bindgen]
pub fn citrine_destroy() {
    unsafe {
        EMULATOR = None;
    }
}

#[wasm_bindgen]
pub fn citrine_load_3dsx(data: &[u8]) -> bool {
    if !is_authorized() { return false; }
    unsafe {
        if let Some(emu) = EMULATOR.as_mut() {
            emu.load_3dsx(data)
        } else {
            false
        }
    }
}

#[wasm_bindgen]
pub fn citrine_run_frame() {
    if !is_authorized() { return; }
    unsafe {
        if let Some(emu) = EMULATOR.as_mut() {
            emu.run_frame();
        }
    }
}

#[wasm_bindgen]
pub fn citrine_set_buttons(buttons: u32) {
    unsafe {
        if let Some(emu) = EMULATOR.as_mut() {
            emu.set_buttons(buttons);
        }
    }
}

#[wasm_bindgen]
pub fn citrine_get_fb_top() -> Vec<u8> {
    if !is_authorized() { return Vec::new(); }
    unsafe {
        if let Some(emu) = EMULATOR.as_ref() {
            emu.get_fb_top()
        } else {
            Vec::new()
        }
    }
}

#[wasm_bindgen]
pub fn citrine_get_fb_bottom() -> Vec<u8> {
    if !is_authorized() { return Vec::new(); }
    unsafe {
        if let Some(emu) = EMULATOR.as_ref() {
            emu.get_fb_bottom()
        } else {
            Vec::new()
        }
    }
}

#[wasm_bindgen]
pub fn citrine_reset() {
    unsafe {
        if let Some(emu) = EMULATOR.as_mut() {
            emu.reset();
        }
    }
}

#[wasm_bindgen]
pub fn citrine_get_debug_info() -> String {
    if !is_authorized() { return String::new(); }
    unsafe {
        if let Some(emu) = EMULATOR.as_ref() {
            emu.debug_info()
        } else {
            String::from("no emulator")
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_non_wasm() {
        assert!(is_authorized());
    }

    #[test]
    fn create_and_destroy() {
        assert!(citrine_create());
        unsafe { assert!(EMULATOR.is_some()); }
        citrine_destroy();
        unsafe { assert!(EMULATOR.is_none()); }
    }

    #[test]
    fn debug_info_without_emulator() {
        citrine_destroy();
        let info = citrine_get_debug_info();
        assert_eq!(info, "no emulator");
    }

    #[test]
    fn framebuffer_empty_without_emulator() {
        citrine_destroy();
        assert!(citrine_get_fb_top().is_empty());
        assert!(citrine_get_fb_bottom().is_empty());
    }
}
