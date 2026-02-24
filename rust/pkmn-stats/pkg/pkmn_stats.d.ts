/* tslint:disable */
/* eslint-disable */

/**
 * Calculate all 6 stats at once.
 *
 * Parameters are ordered: bases (hp, atk, def, spa, spd, spe),
 * IVs (hp, atk, def, spa, spd, spe), EVs (hp, atk, def, spa, spd, spe),
 * nature modifiers (atk, def, spa, spd, spe). HP has no nature modifier.
 *
 * Returns a Vec<u32> of [hp, atk, def, spa, spd, spe].
 */
export function calculate_all_stats(hp_base: number, atk_base: number, def_base: number, spa_base: number, spd_base: number, spe_base: number, hp_iv: number, atk_iv: number, def_iv: number, spa_iv: number, spd_iv: number, spe_iv: number, hp_ev: number, atk_ev: number, def_ev: number, spa_ev: number, spd_ev: number, spe_ev: number, atk_nature: number, def_nature: number, spa_nature: number, spd_nature: number, spe_nature: number): Uint32Array;

/**
 * Calculate HP stat for a Pokemon.
 *
 * HP formula: floor(((2*base + iv + floor(ev/4)) * level) / 100) + level + 10
 * Special case: if base is 1 (Shedinja), always return 1.
 */
export function calculate_hp(base: number, iv: number, ev: number, level: number): number;

/**
 * Calculate a single non-HP stat for a Pokemon.
 *
 * Stat formula: floor((floor(((2*base + iv + floor(ev/4)) * level) / 100) + 5) * nature_modifier)
 * Nature modifier: 1.1 (boosted), 0.9 (hindered), 1.0 (neutral).
 */
export function calculate_stat(base: number, iv: number, ev: number, nature_modifier: number, level: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly calculate_all_stats: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number) => [number, number];
    readonly calculate_hp: (a: number, b: number, c: number, d: number) => number;
    readonly calculate_stat: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
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
