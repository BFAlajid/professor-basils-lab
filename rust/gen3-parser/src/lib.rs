mod charset;
mod pokemon;
mod save;
mod species;

use wasm_bindgen::prelude::*;

/// Parse a Gen 3 save file and return the result as a JS value.
/// Accepts a Uint8Array from JavaScript, returns the parsed save data or null.
#[wasm_bindgen(js_name = "parseGen3Save")]
pub fn parse_gen3_save_wasm(buffer: &[u8]) -> JsValue {
    match save::parse_gen3_save(buffer) {
        Some(data) => serde_wasm_bindgen::to_value(&data).unwrap_or(JsValue::NULL),
        None => JsValue::NULL,
    }
}

/// Decode a Gen 3 encoded string from raw bytes.
/// Useful for standalone string decoding if needed from JS.
#[wasm_bindgen(js_name = "decodeGen3String")]
pub fn decode_gen3_string_wasm(data: &[u8], offset: usize, max_len: usize) -> String {
    charset::decode_gen3_string(data, offset, max_len)
}
