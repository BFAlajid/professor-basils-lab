use wasm_bindgen::prelude::*;

/// Apply a stat stage modifier (-6 to +6) to a base stat value.
///
/// For critical hits:
/// - `favorable = true` (attacker's offensive stat): ignores negative stages
/// - `favorable = false` (defender's defensive stat): ignores positive stages
fn apply_stat_stage(stat: f64, stage: i8, is_critical: bool, favorable: bool) -> f64 {
    let effective_stage = if is_critical {
        if favorable {
            stage.max(0)
        } else {
            stage.min(0)
        }
    } else {
        stage
    };
    if effective_stage >= 0 {
        (stat * (2.0 + effective_stage as f64) / 2.0).floor()
    } else {
        (stat * 2.0 / (2.0 - effective_stage as f64)).floor()
    }
}

/// Calculate damage given pre-resolved numeric inputs.
/// The TS wrapper handles extracting stats, looking up items/abilities, etc.
///
/// Parameters:
/// - `effective_atk`: The attacker's calculated atk or spAtk stat (nature/EVs/IVs applied)
/// - `effective_def`: The defender's calculated def or spDef stat (nature/EVs/IVs applied)
/// - `move_power`: The move's base power
/// - `move_type`: Type index (0-17) for the move
/// - `def_type1`: Defender's first type index (0-17)
/// - `def_type2`: Defender's second type index, or 255 for mono-type
/// - `stab`: STAB multiplier (1.0, 1.5, or 2.0 for Tera), pre-calculated by TS
/// - `is_critical`: Whether this is a critical hit
/// - `weather`: 0=none, 1=sun, 2=rain, 3=sandstorm, 4=hail
/// - `move_is_fire`: Whether the move is Fire type (for weather interaction)
/// - `move_is_water`: Whether the move is Water type (for weather interaction)
/// - `item_damage_mult`: Pre-resolved item damage multiplier (1.0 if no item applies)
/// - `ability_atk_mult`: Pre-resolved ability attack multiplier (1.0 if no ability applies)
/// - `is_burned_physical`: Whether attacker is burned AND move is physical AND no Guts
/// - `atk_stage`: Attack stat stage (-6 to +6)
/// - `def_stage`: Defense stat stage (-6 to +6)
/// - `def_item_spdef_mult`: Defender's special defense item multiplier (e.g. Assault Vest)
/// - `is_physical`: Whether the move is physical
///
/// Returns a `Vec<f64>` of 5 values:
/// `[min_damage, max_damage, effectiveness, stab_was_applied, is_critical]`
#[wasm_bindgen]
pub fn calculate_damage(
    effective_atk: u16,
    effective_def: u16,
    move_power: u16,
    move_type: u8,
    def_type1: u8,
    def_type2: u8,
    stab: f64,
    is_critical: bool,
    weather: u8,
    move_is_fire: bool,
    move_is_water: bool,
    item_damage_mult: f64,
    ability_atk_mult: f64,
    is_burned_physical: bool,
    atk_stage: i8,
    def_stage: i8,
    def_item_spdef_mult: f64,
    is_physical: bool,
) -> Vec<f64> {
    // 1. Apply stat stages
    let mut atk =
        apply_stat_stage(effective_atk as f64, atk_stage, is_critical, true);
    let mut def =
        apply_stat_stage(effective_def as f64, def_stage, is_critical, false);

    // 2. Apply Assault Vest (special defense item multiplier) for special moves
    if !is_physical && def_item_spdef_mult > 1.0 {
        def = (def * def_item_spdef_mult).floor();
    }

    // 3. Apply burn penalty
    if is_burned_physical {
        atk = (atk * 0.5).floor();
    }

    // 4. Apply ability attack modifier
    atk = (atk * ability_atk_mult).floor();

    // 5. Type effectiveness via pkmn-type-chart
    let def_type2_signed: i8 = if def_type2 == 255 { -1 } else { def_type2 as i8 };
    let type_eff =
        pkmn_type_chart::get_defensive_multiplier(move_type, def_type1, def_type2_signed);

    // 6. Base damage formula (level 50)
    let power = move_power as f64;
    // Avoid division by zero
    let def_safe = if def < 1.0 { 1.0 } else { def };
    let base = ((22.0 * power * atk / def_safe) / 50.0 + 2.0).floor();

    // 7. Apply STAB and type effectiveness
    let mut modified = (base * stab * type_eff).floor();

    // 8. Weather modifier
    let weather_mult = match weather {
        1 => {
            // Sun
            if move_is_fire {
                1.5
            } else if move_is_water {
                0.5
            } else {
                1.0
            }
        }
        2 => {
            // Rain
            if move_is_water {
                1.5
            } else if move_is_fire {
                0.5
            } else {
                1.0
            }
        }
        _ => 1.0,
    };
    modified = (modified * weather_mult).floor();

    // 9. Critical hit
    if is_critical {
        modified = (modified * 1.5).floor();
    }

    // 10. Item damage modifier
    modified = (modified * item_damage_mult).floor();

    // 11. Random factor: min = floor(modified * 0.85), max = floor(modified)
    let min_damage = (modified * 0.85).floor();
    let max_damage = modified;

    // 12. Return results (clamped to 0)
    let stab_applied = if stab > 1.0 { 1.0 } else { 0.0 };
    let crit_flag = if is_critical { 1.0 } else { 0.0 };

    vec![
        min_damage.max(0.0),
        max_damage.max(0.0),
        type_eff,
        stab_applied,
        crit_flag,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: call calculate_damage with sensible defaults, overriding only what each test needs.
    /// Returns the full 5-element result vector.
    fn calc(overrides: TestParams) -> Vec<f64> {
        calculate_damage(
            overrides.effective_atk.unwrap_or(100),
            overrides.effective_def.unwrap_or(100),
            overrides.move_power.unwrap_or(80),
            overrides.move_type.unwrap_or(0), // Normal
            overrides.def_type1.unwrap_or(0), // Normal
            overrides.def_type2.unwrap_or(255), // mono-type
            overrides.stab.unwrap_or(1.0),
            overrides.is_critical.unwrap_or(false),
            overrides.weather.unwrap_or(0),
            overrides.move_is_fire.unwrap_or(false),
            overrides.move_is_water.unwrap_or(false),
            overrides.item_damage_mult.unwrap_or(1.0),
            overrides.ability_atk_mult.unwrap_or(1.0),
            overrides.is_burned_physical.unwrap_or(false),
            overrides.atk_stage.unwrap_or(0),
            overrides.def_stage.unwrap_or(0),
            overrides.def_item_spdef_mult.unwrap_or(1.0),
            overrides.is_physical.unwrap_or(true),
        )
    }

    #[derive(Default)]
    struct TestParams {
        effective_atk: Option<u16>,
        effective_def: Option<u16>,
        move_power: Option<u16>,
        move_type: Option<u8>,
        def_type1: Option<u8>,
        def_type2: Option<u8>,
        stab: Option<f64>,
        is_critical: Option<bool>,
        weather: Option<u8>,
        move_is_fire: Option<bool>,
        move_is_water: Option<bool>,
        item_damage_mult: Option<f64>,
        ability_atk_mult: Option<f64>,
        is_burned_physical: Option<bool>,
        atk_stage: Option<i8>,
        def_stage: Option<i8>,
        def_item_spdef_mult: Option<f64>,
        is_physical: Option<bool>,
    }

    // ----------------------------------------------------------------
    // 1. Basic physical damage (no modifiers)
    // ----------------------------------------------------------------
    #[test]
    fn test_basic_physical_damage() {
        let result = calc(TestParams::default());
        // base = floor((22 * 80 * 100 / 100) / 50 + 2) = floor(35.2 + 2) = floor(37.2) = 37
        // modified = floor(37 * 1.0 * 1.0) = 37  (stab=1, type_eff=1 normal vs normal)
        // min = floor(37 * 0.85) = floor(31.45) = 31
        // max = 37
        assert_eq!(result[0], 31.0, "min damage");
        assert_eq!(result[1], 37.0, "max damage");
        assert_eq!(result[2], 1.0, "type effectiveness");
        assert_eq!(result[3], 0.0, "stab not applied");
        assert_eq!(result[4], 0.0, "not critical");
    }

    // ----------------------------------------------------------------
    // 2. STAB bonus (1.5x)
    // ----------------------------------------------------------------
    #[test]
    fn test_stab_bonus() {
        let result = calc(TestParams {
            stab: Some(1.5),
            ..Default::default()
        });
        // base = 37 (same as above)
        // modified = floor(37 * 1.5 * 1.0) = floor(55.5) = 55
        // min = floor(55 * 0.85) = floor(46.75) = 46
        assert_eq!(result[0], 46.0, "min damage with STAB");
        assert_eq!(result[1], 55.0, "max damage with STAB");
        assert_eq!(result[3], 1.0, "stab was applied");
    }

    // ----------------------------------------------------------------
    // 3. Super effective (2x type effectiveness)
    // ----------------------------------------------------------------
    #[test]
    fn test_super_effective() {
        // Fire (1) vs Grass (4) = 2x
        let result = calc(TestParams {
            move_type: Some(1),
            def_type1: Some(4),
            ..Default::default()
        });
        // base = 37
        // modified = floor(37 * 1.0 * 2.0) = 74
        // min = floor(74 * 0.85) = floor(62.9) = 62
        assert_eq!(result[0], 62.0, "min damage super effective");
        assert_eq!(result[1], 74.0, "max damage super effective");
        assert_eq!(result[2], 2.0, "type effectiveness 2x");
    }

    // ----------------------------------------------------------------
    // 4. Not very effective (0.5x)
    // ----------------------------------------------------------------
    #[test]
    fn test_not_very_effective() {
        // Fire (1) vs Water (2) = 0.5x
        let result = calc(TestParams {
            move_type: Some(1),
            def_type1: Some(2),
            ..Default::default()
        });
        // base = 37
        // modified = floor(37 * 1.0 * 0.5) = floor(18.5) = 18
        // min = floor(18 * 0.85) = floor(15.3) = 15
        assert_eq!(result[0], 15.0, "min damage NVE");
        assert_eq!(result[1], 18.0, "max damage NVE");
        assert_eq!(result[2], 0.5, "type effectiveness 0.5x");
    }

    // ----------------------------------------------------------------
    // 5. Immune (0x effectiveness)
    // ----------------------------------------------------------------
    #[test]
    fn test_immune() {
        // Normal (0) vs Ghost (13) = 0x
        let result = calc(TestParams {
            move_type: Some(0),
            def_type1: Some(13),
            ..Default::default()
        });
        assert_eq!(result[0], 0.0, "min damage immune");
        assert_eq!(result[1], 0.0, "max damage immune");
        assert_eq!(result[2], 0.0, "type effectiveness 0x");
    }

    // ----------------------------------------------------------------
    // 6. Critical hit (1.5x modifier)
    // ----------------------------------------------------------------
    #[test]
    fn test_critical_hit() {
        let result = calc(TestParams {
            is_critical: Some(true),
            ..Default::default()
        });
        // base = 37
        // modified after stab/type = 37
        // after crit = floor(37 * 1.5) = floor(55.5) = 55
        // min = floor(55 * 0.85) = floor(46.75) = 46
        assert_eq!(result[0], 46.0, "min damage crit");
        assert_eq!(result[1], 55.0, "max damage crit");
        assert_eq!(result[4], 1.0, "is_critical flag");
    }

    // ----------------------------------------------------------------
    // 7. Weather boost (sun + fire move)
    // ----------------------------------------------------------------
    #[test]
    fn test_weather_sun_fire() {
        // Fire move in sun = 1.5x weather
        let result = calc(TestParams {
            move_type: Some(1),
            move_is_fire: Some(true),
            weather: Some(1), // sun
            ..Default::default()
        });
        // base = 37 (type eff: fire vs normal = 1.0)
        // modified after stab/type = 37
        // after weather = floor(37 * 1.5) = floor(55.5) = 55
        // min = floor(55 * 0.85) = floor(46.75) = 46
        assert_eq!(result[0], 46.0, "min damage sun+fire");
        assert_eq!(result[1], 55.0, "max damage sun+fire");
    }

    // ----------------------------------------------------------------
    // 8. Weather reduction (sun + water move)
    // ----------------------------------------------------------------
    #[test]
    fn test_weather_sun_water() {
        // Water move in sun = 0.5x weather
        let result = calc(TestParams {
            move_type: Some(2),
            move_is_water: Some(true),
            weather: Some(1), // sun
            ..Default::default()
        });
        // base = 37 (type eff: water vs normal = 1.0)
        // modified after stab/type = 37
        // after weather = floor(37 * 0.5) = floor(18.5) = 18
        // min = floor(18 * 0.85) = floor(15.3) = 15
        assert_eq!(result[0], 15.0, "min damage sun+water");
        assert_eq!(result[1], 18.0, "max damage sun+water");
    }

    // ----------------------------------------------------------------
    // 9. Burn penalty (halves physical attack)
    // ----------------------------------------------------------------
    #[test]
    fn test_burn_penalty() {
        let result = calc(TestParams {
            is_burned_physical: Some(true),
            ..Default::default()
        });
        // atk after burn = floor(100 * 0.5) = 50
        // ability mult = floor(50 * 1.0) = 50
        // base = floor((22 * 80 * 50 / 100) / 50 + 2) = floor(17.6 + 2) = floor(19.6) = 19
        // modified = floor(19 * 1.0 * 1.0) = 19
        // min = floor(19 * 0.85) = floor(16.15) = 16
        assert_eq!(result[0], 16.0, "min damage burned");
        assert_eq!(result[1], 19.0, "max damage burned");
    }

    // ----------------------------------------------------------------
    // 10. Item damage boost (e.g. 1.3x Life Orb)
    // ----------------------------------------------------------------
    #[test]
    fn test_item_damage_boost() {
        let result = calc(TestParams {
            item_damage_mult: Some(1.3),
            ..Default::default()
        });
        // base = 37
        // modified after stab/type/weather/crit = 37
        // after item = floor(37 * 1.3) = floor(48.1) = 48
        // min = floor(48 * 0.85) = floor(40.8) = 40
        assert_eq!(result[0], 40.0, "min damage life orb");
        assert_eq!(result[1], 48.0, "max damage life orb");
    }

    // ----------------------------------------------------------------
    // 11. Stat stage boost (+2 attack stage)
    // ----------------------------------------------------------------
    #[test]
    fn test_stat_stage_boost() {
        let result = calc(TestParams {
            atk_stage: Some(2),
            ..Default::default()
        });
        // atk after +2 stage = floor(100 * (2+2) / 2) = floor(100 * 4/2) = floor(200) = 200
        // base = floor((22 * 80 * 200 / 100) / 50 + 2) = floor(70.4 + 2) = floor(72.4) = 72
        // modified = 72
        // min = floor(72 * 0.85) = floor(61.2) = 61
        assert_eq!(result[0], 61.0, "min damage +2 atk");
        assert_eq!(result[1], 72.0, "max damage +2 atk");
    }

    // ----------------------------------------------------------------
    // 12. Combined: STAB + super effective + critical + weather
    // ----------------------------------------------------------------
    #[test]
    fn test_combined_modifiers() {
        // Fire (1) move with STAB, vs Grass (4), crit, sun
        let result = calc(TestParams {
            move_type: Some(1),
            def_type1: Some(4),
            stab: Some(1.5),
            is_critical: Some(true),
            weather: Some(1),
            move_is_fire: Some(true),
            ..Default::default()
        });
        // base = 37
        // stab + type = floor(37 * 1.5 * 2.0) = floor(111.0) = 111
        // weather (sun+fire) = floor(111 * 1.5) = floor(166.5) = 166
        // crit = floor(166 * 1.5) = floor(249.0) = 249
        // item = floor(249 * 1.0) = 249
        // min = floor(249 * 0.85) = floor(211.65) = 211
        assert_eq!(result[0], 211.0, "min damage combined");
        assert_eq!(result[1], 249.0, "max damage combined");
        assert_eq!(result[2], 2.0, "type effectiveness");
        assert_eq!(result[3], 1.0, "stab applied");
        assert_eq!(result[4], 1.0, "is critical");
    }

    // ----------------------------------------------------------------
    // Additional edge-case tests
    // ----------------------------------------------------------------

    #[test]
    fn test_negative_atk_stage_with_crit() {
        // Critical hit should ignore negative attack stages (favorable=true)
        let result = calc(TestParams {
            atk_stage: Some(-2),
            is_critical: Some(true),
            ..Default::default()
        });
        // atk stage -2 ignored on crit (favorable), effective stage becomes max(-2, 0) = 0
        // atk = floor(100 * 2/2) = 100
        // base = 37
        // crit = floor(37 * 1.5) = 55
        // min = floor(55 * 0.85) = floor(46.75) = 46
        assert_eq!(result[0], 46.0, "min damage crit ignores -atk");
        assert_eq!(result[1], 55.0, "max damage crit ignores -atk");
    }

    #[test]
    fn test_positive_def_stage_with_crit() {
        // Critical hit should ignore positive defense stages (favorable=false)
        let result = calc(TestParams {
            def_stage: Some(2),
            is_critical: Some(true),
            ..Default::default()
        });
        // def stage +2 ignored on crit (not favorable), effective stage becomes min(2, 0) = 0
        // def = floor(100 * 2/2) = 100
        // base = 37
        // crit = floor(37 * 1.5) = 55
        assert_eq!(result[0], 46.0, "min damage crit ignores +def");
        assert_eq!(result[1], 55.0, "max damage crit ignores +def");
    }

    #[test]
    fn test_dual_type_4x_effective() {
        // Ground (8) vs Fire(1)/Steel(16) = 2.0 * 2.0 = 4x
        let result = calc(TestParams {
            move_type: Some(8),
            def_type1: Some(1),
            def_type2: Some(16),
            ..Default::default()
        });
        // base = 37
        // modified = floor(37 * 1.0 * 4.0) = 148
        // min = floor(148 * 0.85) = floor(125.8) = 125
        assert_eq!(result[0], 125.0, "min damage 4x");
        assert_eq!(result[1], 148.0, "max damage 4x");
        assert_eq!(result[2], 4.0, "type effectiveness 4x");
    }

    #[test]
    fn test_assault_vest_special() {
        // Special move vs defender with Assault Vest (1.5x SpDef)
        let result = calc(TestParams {
            is_physical: Some(false),
            def_item_spdef_mult: Some(1.5),
            ..Default::default()
        });
        // def after Assault Vest = floor(100 * 1.5) = 150
        // base = floor((22 * 80 * 100 / 150) / 50 + 2) = floor((176000/150)/50 + 2)
        //      = floor(1173.33/50 + 2) = floor(23.466 + 2) = floor(25.466) = 25
        // min = floor(25 * 0.85) = floor(21.25) = 21
        assert_eq!(result[0], 21.0, "min damage vs AV");
        assert_eq!(result[1], 25.0, "max damage vs AV");
    }

    #[test]
    fn test_ability_atk_mult() {
        // Ability that boosts attack by 1.5x (e.g., Huge Power)
        let result = calc(TestParams {
            ability_atk_mult: Some(1.5),
            ..Default::default()
        });
        // atk after ability = floor(100 * 1.5) = 150
        // base = floor((22 * 80 * 150 / 100) / 50 + 2) = floor(52.8 + 2) = floor(54.8) = 54
        // min = floor(54 * 0.85) = floor(45.9) = 45
        assert_eq!(result[0], 45.0, "min damage ability boost");
        assert_eq!(result[1], 54.0, "max damage ability boost");
    }

    #[test]
    fn test_rain_water_boost() {
        // Water move in rain = 1.5x weather
        let result = calc(TestParams {
            move_type: Some(2),
            move_is_water: Some(true),
            weather: Some(2), // rain
            ..Default::default()
        });
        // base = 37
        // after weather = floor(37 * 1.5) = floor(55.5) = 55
        // min = floor(55 * 0.85) = floor(46.75) = 46
        assert_eq!(result[0], 46.0, "min damage rain+water");
        assert_eq!(result[1], 55.0, "max damage rain+water");
    }
}
