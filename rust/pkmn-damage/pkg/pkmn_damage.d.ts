/* tslint:disable */
/* eslint-disable */

/**
 * Calculate damage given pre-resolved numeric inputs.
 * The TS wrapper handles extracting stats, looking up items/abilities, etc.
 *
 * Parameters:
 * - `effective_atk`: The attacker's calculated atk or spAtk stat (nature/EVs/IVs applied)
 * - `effective_def`: The defender's calculated def or spDef stat (nature/EVs/IVs applied)
 * - `move_power`: The move's base power
 * - `move_type`: Type index (0-17) for the move
 * - `def_type1`: Defender's first type index (0-17)
 * - `def_type2`: Defender's second type index, or 255 for mono-type
 * - `stab`: STAB multiplier (1.0, 1.5, or 2.0 for Tera), pre-calculated by TS
 * - `is_critical`: Whether this is a critical hit
 * - `weather`: 0=none, 1=sun, 2=rain, 3=sandstorm, 4=hail
 * - `move_is_fire`: Whether the move is Fire type (for weather interaction)
 * - `move_is_water`: Whether the move is Water type (for weather interaction)
 * - `item_damage_mult`: Pre-resolved item damage multiplier (1.0 if no item applies)
 * - `ability_atk_mult`: Pre-resolved ability attack multiplier (1.0 if no ability applies)
 * - `is_burned_physical`: Whether attacker is burned AND move is physical AND no Guts
 * - `atk_stage`: Attack stat stage (-6 to +6)
 * - `def_stage`: Defense stat stage (-6 to +6)
 * - `def_item_spdef_mult`: Defender's special defense item multiplier (e.g. Assault Vest)
 * - `is_physical`: Whether the move is physical
 *
 * Returns a `Vec<f64>` of 5 values:
 * `[min_damage, max_damage, effectiveness, stab_was_applied, is_critical]`
 */
export function calculate_damage(effective_atk: number, effective_def: number, move_power: number, move_type: number, def_type1: number, def_type2: number, stab: number, is_critical: boolean, weather: number, move_is_fire: boolean, move_is_water: boolean, item_damage_mult: number, ability_atk_mult: number, is_burned_physical: boolean, atk_stage: number, def_stage: number, def_item_spdef_mult: number, is_physical: boolean): Float64Array;

/**
 * Get the combined defensive multiplier of an attack type vs a dual-type defender.
 * `def_type1` is the primary type index (0-17).
 * `def_type2` is the secondary type index, or -1 for single-type Pokemon.
 * Returns the product of individual effectiveness values.
 */
export function get_defensive_multiplier(atk_type: number, def_type1: number, def_type2: number): number;

/**
 * Get effectiveness multiplier of attack type vs defend type.
 * Types are passed as u8 indices (0 = Normal through 17 = Fairy).
 * Returns 1.0 (neutral) for out-of-range indices.
 */
export function get_effectiveness(atk_type: number, def_type: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_damage: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number) => void;
    readonly get_defensive_multiplier: (a: number, b: number, c: number) => number;
    readonly get_effectiveness: (a: number, b: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
