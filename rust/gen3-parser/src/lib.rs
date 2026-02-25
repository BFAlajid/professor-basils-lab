mod charset;
mod pokemon;
mod save;
mod species;

use wasm_bindgen::prelude::*;

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

#[wasm_bindgen(js_name = "parseGen3Save")]
pub fn parse_gen3_save_wasm(buffer: &[u8]) -> JsValue {
    if !is_authorized() { return JsValue::NULL; }
    match save::parse_gen3_save(buffer) {
        Some(data) => serde_wasm_bindgen::to_value(&data).unwrap_or(JsValue::NULL),
        None => JsValue::NULL,
    }
}

#[wasm_bindgen(js_name = "decodeGen3String")]
pub fn decode_gen3_string_wasm(data: &[u8], offset: usize, max_len: usize) -> String {
    charset::decode_gen3_string(data, offset, max_len)
}

#[cfg(test)]
mod tests {
    #[test]
    fn decode_delegates_correctly() {
        let data = [0xBB, 0xBC, 0xBD, 0xFF];
        assert_eq!(crate::charset::decode_gen3_string(&data, 0, 4), "ABC");
    }

    #[test]
    fn decode_with_offset() {
        let data = [0x00, 0x00, 0xBB, 0xBC, 0xFF];
        assert_eq!(crate::charset::decode_gen3_string(&data, 2, 3), "AB");
    }

    #[test]
    fn parse_rejects_empty_buffer() {
        assert!(crate::save::parse_gen3_save(&[]).is_none());
    }

    #[test]
    fn parse_rejects_small_buffer() {
        assert!(crate::save::parse_gen3_save(&[0u8; 1000]).is_none());
    }
}
