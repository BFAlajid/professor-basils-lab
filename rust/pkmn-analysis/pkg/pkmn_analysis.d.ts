/* tslint:disable */
/* eslint-disable */

/**
 * Analyze defensive coverage for a team.
 *
 * team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
 * team_size: number of Pokemon
 *
 * Returns a flat Vec<f64> with 18 entries of 4 values each (72 total):
 * For each attacking type (0-17):
 *   [defensive_status, offensive_covered, worst_multiplier, best_multiplier]
 *   defensive_status: 0 = neutral, 1 = resist, 2 = weak
 *   offensive_covered: 1.0 if any team member has this as a type (STAB coverage), else 0.0
 *   worst_multiplier: highest defensive multiplier among team members
 *   best_multiplier: lowest defensive multiplier among team members
 */
export function analyze_defensive_coverage(team_types: Uint8Array, team_size: number): Float64Array;

/**
 * Analyze a team's defensive weaknesses, offensive coverage, and threat score.
 *
 * team_types: flat array [t1a, t1b, t2a, t2b, ...] — pairs of type indices per Pokemon
 *   Use 255 for second type if mono-type.
 * team_size: number of Pokemon on the team (team_types.len() / 2)
 *
 * Returns a flat Vec<f64> with the following layout:
 * [0..54]: Defensive chart — 18 triples of (weakCount, resistCount, immuneCount), one per attacking type
 * [54]: Threat score (0-100)
 * [55]: Number of uncovered weaknesses (N)
 * [56..56+N]: Uncovered weakness type indices
 * [56+N]: Number of offensive coverage types (M)
 * [57+N..57+N+M]: Covered type indices
 * [57+N+M]: Number of offensive gaps (G)
 * [58+N+M..58+N+M+G]: Gap type indices
 * [58+N+M+G]: Number of suggestions (S, max 3)
 * Then S pairs of (type_idx, score)
 */
export function analyze_team(team_types: Uint8Array, team_size: number): Float64Array;

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
    readonly analyze_defensive_coverage: (a: number, b: number, c: number, d: number) => void;
    readonly analyze_team: (a: number, b: number, c: number, d: number) => void;
    readonly get_defensive_multiplier: (a: number, b: number, c: number) => number;
    readonly get_effectiveness: (a: number, b: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
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
