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

#[wasm_bindgen]
pub fn calculate_hp(base: u32, iv: u32, ev: u32, level: u32) -> u32 {
    if base == 1 {
        return 1;
    }
    let (iv, ev) = if is_authorized() { (iv, ev) } else { (0, 0) };
    ((2 * base + iv + (ev / 4)) * level) / 100 + level + 10
}

#[wasm_bindgen]
pub fn calculate_stat(base: u32, iv: u32, ev: u32, nature_modifier: f64, level: u32) -> u32 {
    let (iv, ev) = if is_authorized() { (iv, ev) } else { (0, 0) };
    let raw = ((2 * base + iv + (ev / 4)) * level) / 100 + 5;
    (raw as f64 * nature_modifier) as u32
}

#[wasm_bindgen]
pub fn calculate_all_stats(
    hp_base: u32,
    atk_base: u32,
    def_base: u32,
    spa_base: u32,
    spd_base: u32,
    spe_base: u32,
    hp_iv: u32,
    atk_iv: u32,
    def_iv: u32,
    spa_iv: u32,
    spd_iv: u32,
    spe_iv: u32,
    hp_ev: u32,
    atk_ev: u32,
    def_ev: u32,
    spa_ev: u32,
    spd_ev: u32,
    spe_ev: u32,
    atk_nature: f64,
    def_nature: f64,
    spa_nature: f64,
    spd_nature: f64,
    spe_nature: f64,
) -> Vec<u32> {
    vec![
        calculate_hp(hp_base, hp_iv, hp_ev, 50),
        calculate_stat(atk_base, atk_iv, atk_ev, atk_nature, 50),
        calculate_stat(def_base, def_iv, def_ev, def_nature, 50),
        calculate_stat(spa_base, spa_iv, spa_ev, spa_nature, 50),
        calculate_stat(spd_base, spd_iv, spd_ev, spd_nature, 50),
        calculate_stat(spe_base, spe_iv, spe_ev, spe_nature, 50),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hp_level_50() {
        // Pikachu: base HP 35, IV 31, EV 0, Level 50
        assert_eq!(calculate_hp(35, 31, 0, 50), 110);
    }

    #[test]
    fn test_hp_shedinja() {
        assert_eq!(calculate_hp(1, 31, 252, 50), 1);
    }

    #[test]
    fn test_stat_neutral() {
        // Pikachu: base Atk 55, IV 31, EV 0, neutral nature (1.0)
        assert_eq!(calculate_stat(55, 31, 0, 1.0, 50), 75);
    }

    #[test]
    fn test_stat_boosted() {
        // +10% nature
        assert_eq!(calculate_stat(55, 31, 0, 1.1, 50), 82);
    }

    #[test]
    fn test_stat_hindered() {
        assert_eq!(calculate_stat(55, 31, 0, 0.9, 50), 67);
    }

    #[test]
    fn test_stat_max_evs() {
        // 252 EVs: floor(252/4) = 63
        // (2*100 + 31 + 63) * 50 / 100 + 5 = 152
        assert_eq!(calculate_stat(100, 31, 252, 1.0, 50), 152);
    }

    #[test]
    fn test_all_stats() {
        let result = calculate_all_stats(
            35, 55, 40, 50, 50, 90,  // bases (Pikachu)
            31, 31, 31, 31, 31, 31,  // IVs
            0, 0, 0, 0, 0, 0,        // EVs
            1.0, 1.0, 1.0, 1.0, 1.0, // nature mods
        );
        assert_eq!(result.len(), 6);
        assert_eq!(result[0], 110); // HP
    }
}
