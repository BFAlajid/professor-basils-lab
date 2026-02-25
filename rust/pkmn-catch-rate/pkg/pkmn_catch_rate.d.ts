/* tslint:disable */
/* eslint-disable */

/**
 * Calculate catch probability and simulate 4 shake checks.
 *
 * Parameters:
 * - `capture_rate`: The Pokemon's base capture rate (1-255)
 * - `current_hp`: Current HP of the wild Pokemon
 * - `max_hp`: Maximum HP of the wild Pokemon
 * - `status_mod`: Status modifier (1.0 = none, 1.5 = paralyze/burn/poison/toxic, 2.5 = sleep/freeze)
 * - `ball_mod`: Ball modifier (pre-resolved by TS from `getBallModifier`)
 * - `seed`: Random seed (from JS `Math.random()`, scaled to u32)
 *
 * Returns a `Vec<f64>` of 6 values:
 * `[is_caught (0 or 1), num_shakes, shake1, shake2, shake3, shake4]`
 *
 * Each shake is 0 (fail) or 1 (pass). `num_shakes` is 1-4.
 *
 * Special case: if `ball_mod >= 255` (Master Ball), always caught.
 */
export function calculate_catch_probability(capture_rate: number, current_hp: number, max_hp: number, status_mod: number, ball_mod: number, seed: number): Float64Array;

/**
 * Determine if a wild Pokemon should flee.
 *
 * Parameters:
 * - `capture_rate`: The Pokemon's base capture rate (1-255)
 * - `turn`: Current battle turn number
 * - `seed`: Random seed
 *
 * Returns `1.0` if the Pokemon flees, `0.0` otherwise.
 */
export function should_wild_flee(capture_rate: number, turn: number, seed: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_catch_probability: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly should_wild_flee: (a: number, b: number, c: number) => number;
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
