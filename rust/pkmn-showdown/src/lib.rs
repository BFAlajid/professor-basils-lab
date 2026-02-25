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

// Stat abbreviation mappings
const STAT_NAMES: [&str; 6] = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

fn to_api_name(display: &str) -> String {
    display
        .trim()
        .to_lowercase()
        .replace(['\'', '\u{2019}'], "")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-')
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}

fn to_display_name(api_name: &str) -> String {
    api_name.split('-').map(|w| capitalize(w)).collect::<Vec<_>>().join(" ")
}

#[wasm_bindgen]
pub fn parse_showdown_block(block: &str) -> String {
    if !is_authorized() { return "null".into(); }

    let lines: Vec<&str> = block.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
    if lines.is_empty() {
        return "null".into();
    }

    let mut species = String::new();
    let mut item = String::new();
    let mut ability = String::new();
    let mut nature = String::new();
    let mut tera_type = String::new();
    let mut evs: [u16; 6] = [0; 6];
    let mut ivs: [u16; 6] = [31; 6];
    let mut has_ivs = false;
    let mut moves: Vec<String> = Vec::new();

    let first = lines[0];
    let (name_part, item_part) = if let Some(at_idx) = first.find(" @ ") {
        (&first[..at_idx], Some(&first[at_idx + 3..]))
    } else {
        (first, None)
    };

    if let Some(it) = item_part {
        item = to_api_name(it);
    }

    if let Some(open) = name_part.rfind('(') {
        if let Some(close) = name_part.rfind(')') {
            if close > open {
                species = to_api_name(&name_part[open + 1..close]);
            }
        }
    }
    if species.is_empty() {
        species = to_api_name(name_part);
    }

    for line in &lines[1..] {
        if let Some(rest) = line.strip_prefix("Ability:") {
            ability = to_api_name(rest);
        } else if let Some(rest) = line.strip_prefix("Tera Type:") {
            tera_type = rest.trim().to_lowercase();
        } else if let Some(rest) = line.strip_prefix("EVs:") {
            parse_spread(rest, &mut evs);
        } else if let Some(rest) = line.strip_prefix("IVs:") {
            parse_spread(rest, &mut ivs);
            has_ivs = true;
        } else if line.ends_with("Nature") {
            nature = line.strip_suffix("Nature").unwrap_or("").trim().to_lowercase();
        } else if line.starts_with('-') || line.starts_with('\u{2013}') || line.starts_with('\u{2014}') {
            let move_name = line.trim_start_matches(|c: char| c == '-' || c == '\u{2013}' || c == '\u{2014}' || c == ' ');
            if !move_name.is_empty() {
                moves.push(to_api_name(move_name));
            }
        }
    }

    let mut json = String::with_capacity(256);
    json.push('{');
    json.push_str(&format!("\"species\":\"{}\",", escape_json(&species)));
    json.push_str(&format!("\"item\":\"{}\",", escape_json(&item)));
    json.push_str(&format!("\"ability\":\"{}\",", escape_json(&ability)));
    json.push_str(&format!("\"nature\":\"{}\",", escape_json(&nature)));
    json.push_str(&format!("\"teraType\":\"{}\",", escape_json(&tera_type)));
    json.push_str(&format!(
        "\"evs\":[{},{},{},{},{},{}],",
        evs[0], evs[1], evs[2], evs[3], evs[4], evs[5]
    ));
    if has_ivs {
        json.push_str(&format!(
            "\"ivs\":[{},{},{},{},{},{}],",
            ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5]
        ));
    } else {
        json.push_str("\"ivs\":null,");
    }
    json.push_str("\"moves\":[");
    for (i, m) in moves.iter().enumerate() {
        if i > 0 { json.push(','); }
        json.push_str(&format!("\"{}\"", escape_json(m)));
    }
    json.push_str("]}");
    json
}

#[wasm_bindgen]
pub fn parse_showdown_paste(input: &str) -> String {
    let mut blocks: Vec<String> = Vec::new();
    let mut current = String::new();

    for line in input.lines() {
        if line.trim().is_empty() {
            if !current.trim().is_empty() {
                blocks.push(current.trim().to_string());
                current = String::new();
            }
        } else {
            current.push_str(line);
            current.push('\n');
        }
    }
    if !current.trim().is_empty() {
        blocks.push(current.trim().to_string());
    }

    let mut merged: Vec<String> = Vec::new();
    for block in blocks {
        let first = block.lines().next().unwrap_or("");
        let looks_like_pokemon = first.contains(" @ ")
            || first.contains('(')
            || first.starts_with("Ability:")
            || first.starts_with("EVs:")
            || first.starts_with("IVs:")
            || first.ends_with("Nature")
            || first.starts_with("Tera Type:");

        if !looks_like_pokemon && !merged.is_empty() {
            let last = merged.last_mut().unwrap();
            last.push('\n');
            last.push_str(&block);
        } else {
            merged.push(block);
        }
    }

    let mut json = String::from("[");
    for (i, block) in merged.iter().enumerate() {
        if i > 0 { json.push(','); }
        json.push_str(&parse_showdown_block(block));
    }
    json.push(']');
    json
}

#[wasm_bindgen]
pub fn export_showdown_paste(team_json: &str) -> String {
    let mut result = String::new();
    let entries = parse_json_array(team_json);

    for (i, entry) in entries.iter().enumerate() {
        if i > 0 { result.push_str("\n\n"); }

        let species = to_display_name(entry.get("species").map(|s| s.as_str()).unwrap_or(""));
        let item = entry.get("item").map(|s| s.as_str()).unwrap_or("");
        if !item.is_empty() {
            result.push_str(&format!("{} @ {}\n", species, to_display_name(item)));
        } else {
            result.push_str(&format!("{}\n", species));
        }

        if let Some(ability) = entry.get("ability") {
            if !ability.is_empty() {
                result.push_str(&format!("Ability: {}\n", to_display_name(ability)));
            }
        }

        if let Some(tera) = entry.get("teraType") {
            if !tera.is_empty() {
                result.push_str(&format!("Tera Type: {}\n", capitalize(tera)));
            }
        }

        if let Some(evs_str) = entry.get("evs") {
            let ev_vals = parse_int_array(evs_str);
            let mut parts = Vec::new();
            for (j, val) in ev_vals.iter().enumerate() {
                if *val != 0 && j < 6 {
                    parts.push(format!("{} {}", val, STAT_NAMES[j]));
                }
            }
            if !parts.is_empty() {
                result.push_str(&format!("EVs: {}\n", parts.join(" / ")));
            }
        }

        if let Some(nature) = entry.get("nature") {
            if !nature.is_empty() {
                result.push_str(&format!("{} Nature\n", capitalize(nature)));
            }
        }

        if let Some(ivs_str) = entry.get("ivs") {
            let iv_vals = parse_int_array(ivs_str);
            let has_non_max = iv_vals.iter().any(|v| *v != 31);
            if has_non_max {
                let parts: Vec<String> = iv_vals.iter().enumerate()
                    .filter(|(j, _)| *j < 6)
                    .map(|(j, v)| format!("{} {}", v, STAT_NAMES[j]))
                    .collect();
                result.push_str(&format!("IVs: {}\n", parts.join(" / ")));
            }
        }

        if let Some(moves_str) = entry.get("moves") {
            let moves = parse_string_array(moves_str);
            for m in moves {
                result.push_str(&format!("- {}\n", to_display_name(&m)));
            }
        }
    }

    result
}

fn parse_spread(raw: &str, out: &mut [u16; 6]) {
    for part in raw.split('/') {
        let part = part.trim();
        let mut tokens = part.split_whitespace();
        if let (Some(num_str), Some(abbrev)) = (tokens.next(), tokens.next()) {
            if let Ok(val) = num_str.parse::<u16>() {
                for (i, name) in STAT_NAMES.iter().enumerate() {
                    if abbrev.eq_ignore_ascii_case(name) {
                        out[i] = val;
                        break;
                    }
                }
            }
        }
    }
}

fn escape_json(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn parse_json_array(json: &str) -> Vec<std::collections::HashMap<String, String>> {
    let json = json.trim();
    let json = json.strip_prefix('[').unwrap_or(json);
    let json = json.strip_suffix(']').unwrap_or(json);

    let mut result = Vec::new();
    let mut depth = 0i32;
    let mut start = 0;

    // Split by commas at depth 0 (between objects)
    let chars: Vec<char> = json.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        match chars[i] {
            '{' => {
                if depth == 0 { start = i; }
                depth += 1;
            }
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let obj_str: String = chars[start..=i].iter().collect();
                    result.push(parse_json_object(&obj_str));
                }
            }
            _ => {}
        }
        i += 1;
    }

    result
}

fn parse_json_object(json: &str) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let json = json.trim();
    let json = json.strip_prefix('{').unwrap_or(json);
    let json = json.strip_suffix('}').unwrap_or(json);

    let mut i = 0;
    let chars: Vec<char> = json.chars().collect();

    while i < chars.len() {
        // Find key
        if chars[i] == '"' {
            i += 1;
            let key_start = i;
            while i < chars.len() && chars[i] != '"' { i += 1; }
            let key: String = chars[key_start..i].iter().collect();
            i += 1; // skip closing quote

            // Skip colon
            while i < chars.len() && chars[i] != ':' { i += 1; }
            i += 1; // skip colon

            // Skip whitespace
            while i < chars.len() && chars[i].is_whitespace() { i += 1; }

            // Read value
            if i < chars.len() {
                if chars[i] == '"' {
                    // String value
                    i += 1;
                    let val_start = i;
                    while i < chars.len() && chars[i] != '"' {
                        if chars[i] == '\\' { i += 1; } // skip escaped char
                        i += 1;
                    }
                    let val: String = chars[val_start..i].iter().collect();
                    map.insert(key, val);
                    i += 1;
                } else if chars[i] == '[' {
                    // Array value — capture raw
                    let arr_start = i;
                    let mut depth = 1;
                    i += 1;
                    while i < chars.len() && depth > 0 {
                        if chars[i] == '[' { depth += 1; }
                        if chars[i] == ']' { depth -= 1; }
                        i += 1;
                    }
                    let val: String = chars[arr_start..i].iter().collect();
                    map.insert(key, val);
                } else if chars[i] == 'n' {
                    // null
                    i += 4; // skip "null"
                } else {
                    // Number or other
                    let val_start = i;
                    while i < chars.len() && chars[i] != ',' && chars[i] != '}' { i += 1; }
                    let val: String = chars[val_start..i].iter().collect();
                    map.insert(key, val.trim().to_string());
                }
            }
        }
        i += 1;
    }

    map
}

fn parse_int_array(raw: &str) -> Vec<u16> {
    let raw = raw.trim();
    let raw = raw.strip_prefix('[').unwrap_or(raw);
    let raw = raw.strip_suffix(']').unwrap_or(raw);
    raw.split(',').filter_map(|s| s.trim().parse().ok()).collect()
}

fn parse_string_array(raw: &str) -> Vec<String> {
    let raw = raw.trim();
    let raw = raw.strip_prefix('[').unwrap_or(raw);
    let raw = raw.strip_suffix(']').unwrap_or(raw);
    raw.split(',')
        .map(|s| s.trim().trim_matches('"').to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_basic_pokemon() {
        let block = "Garchomp @ Choice Scarf\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Outrage";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"species\":\"garchomp\""));
        assert!(result.contains("\"item\":\"choice-scarf\""));
        assert!(result.contains("\"ability\":\"rough-skin\""));
        assert!(result.contains("\"nature\":\"jolly\""));
        assert!(result.contains("\"earthquake\""));
        assert!(result.contains("\"outrage\""));
    }

    #[test]
    fn parse_evs() {
        let block = "Pikachu\nEVs: 252 SpA / 252 Spe / 4 HP";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"evs\":[4,0,0,252,0,252]"));
    }

    #[test]
    fn parse_ivs_present() {
        let block = "Pikachu\nIVs: 0 Atk";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"ivs\":[31,0,31,31,31,31]"));
    }

    #[test]
    fn parse_no_ivs_returns_null() {
        let block = "Pikachu";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"ivs\":null"));
    }

    #[test]
    fn parse_nickname() {
        let block = "Sparky (Pikachu) @ Light Ball";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"species\":\"pikachu\""));
    }

    #[test]
    fn parse_tera_type() {
        let block = "Pikachu\nTera Type: Fairy";
        let result = parse_showdown_block(block);
        assert!(result.contains("\"teraType\":\"fairy\""));
    }

    #[test]
    fn parse_empty_block_returns_null() {
        let result = parse_showdown_block("");
        assert_eq!(result, "null");
    }

    #[test]
    fn parse_paste_multiple_pokemon() {
        let paste = "Garchomp @ Choice Scarf\nAbility: Rough Skin\n- Earthquake\n\nPikachu @ Light Ball\nAbility: Static\n- Thunderbolt";
        let result = parse_showdown_paste(paste);
        assert!(result.starts_with('['));
        assert!(result.ends_with(']'));
        assert!(result.contains("\"garchomp\""));
        assert!(result.contains("\"pikachu\""));
    }

    #[test]
    fn export_basic_pokemon() {
        let json = r#"[{"species":"garchomp","item":"choice-scarf","ability":"rough-skin","nature":"jolly","teraType":"","evs":[0,252,0,0,4,252],"moves":["earthquake","outrage"]}]"#;
        let result = export_showdown_paste(json);
        assert!(result.contains("Garchomp @ Choice Scarf"));
        assert!(result.contains("Ability: Rough Skin"));
        assert!(result.contains("Jolly Nature"));
        assert!(result.contains("- Earthquake"));
        assert!(result.contains("- Outrage"));
    }

    #[test]
    fn export_evs_formatting() {
        let json = r#"[{"species":"pikachu","item":"","ability":"","nature":"","teraType":"","evs":[0,252,0,0,4,252],"moves":[]}]"#;
        let result = export_showdown_paste(json);
        assert!(result.contains("EVs: 252 Atk / 4 SpD / 252 Spe"));
    }

    #[test]
    fn export_omits_max_ivs() {
        let json = r#"[{"species":"pikachu","item":"","ability":"","nature":"","teraType":"","evs":[0,0,0,0,0,0],"ivs":[31,31,31,31,31,31],"moves":[]}]"#;
        let result = export_showdown_paste(json);
        assert!(!result.contains("IVs:"));
    }

    #[test]
    fn export_shows_non_max_ivs() {
        let json = r#"[{"species":"pikachu","item":"","ability":"","nature":"","teraType":"","evs":[0,0,0,0,0,0],"ivs":[31,0,31,31,31,31],"moves":[]}]"#;
        let result = export_showdown_paste(json);
        assert!(result.contains("IVs:"));
        assert!(result.contains("0 Atk"));
    }

    #[test]
    fn roundtrip_parse_export() {
        let original = "Garchomp @ Choice Scarf\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Outrage";
        let parsed = parse_showdown_paste(original);
        let exported = export_showdown_paste(&parsed);
        assert!(exported.contains("Garchomp @ Choice Scarf"));
        assert!(exported.contains("Ability: Rough Skin"));
        assert!(exported.contains("Jolly Nature"));
        assert!(exported.contains("- Earthquake"));
    }

    #[test]
    fn to_api_name_handles_special_chars() {
        assert_eq!(to_api_name("Choice Scarf"), "choice-scarf");
        assert_eq!(to_api_name("King's Rock"), "kings-rock");
    }

    #[test]
    fn to_display_name_capitalizes() {
        assert_eq!(to_display_name("choice-scarf"), "Choice Scarf");
        assert_eq!(to_display_name("rough-skin"), "Rough Skin");
    }
}
