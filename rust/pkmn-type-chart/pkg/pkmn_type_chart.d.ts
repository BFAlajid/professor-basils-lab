/* tslint:disable */
/* eslint-disable */

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
    readonly get_defensive_multiplier: (a: number, b: number, c: number) => number;
    readonly get_effectiveness: (a: number, b: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
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
