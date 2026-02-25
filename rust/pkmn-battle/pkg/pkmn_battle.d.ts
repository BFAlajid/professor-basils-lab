/* tslint:disable */
/* eslint-disable */

/**
 * Determine which player goes first based on priority and speed.
 *
 * Returns 1.0 if player 1 goes first, 0.0 if player 2 goes first.
 *
 * Logic:
 * - Higher priority goes first
 * - Same priority: higher speed goes first
 * - Same speed: random (50/50 using seed)
 */
export function determine_turn_order(p1_priority: number, p2_priority: number, p1_speed: number, p2_speed: number, seed: number): number;

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

/**
 * Score how well a Pokemon matches up against an opponent.
 * Used for switch-in decisions.
 *
 * Parameters:
 * - `switch_type1`, `switch_type2`: Switch-in's types (255 for mono)
 * - `opp_type1`, `opp_type2`: Opponent's types (255 for mono)
 * - `hp_ratio`: Switch-in's current HP / max HP (0.0 - 1.0)
 *
 * Logic (matching JS `scoreMatchup`):
 * - Start at 50
 * - For each opponent type (as attacker): check defensive_multiplier vs switch's types
 *   - mult < 1 (resist): +20
 *   - mult == 0 (immune): +40
 *   - mult > 1 (weak): -20
 * - For each switch type (as attacker): check defensive_multiplier vs opponent's types
 *   - mult > 1 (super effective): +15
 * - Multiply final score by hp_ratio
 */
export function score_matchup(switch_type1: number, switch_type2: number, opp_type1: number, opp_type2: number, hp_ratio: number): number;

/**
 * Score a single move against a target.
 *
 * Returns a score representing how effective this move is.
 *
 * Parameters:
 * - `power`: Move base power (0 for status moves)
 * - `move_type`: Type index of the move (0-17)
 * - `attacker_type1`: Attacker's first type (0-17)
 * - `attacker_type2`: Attacker's second type (255 for mono)
 * - `defender_type1`: Defender's first type (0-17)
 * - `defender_type2`: Defender's second type (255 for mono)
 * - `accuracy`: Move accuracy (0-100)
 * - `is_status`: Whether this is a status move
 *
 * Logic (matching JS `scoreMoveAgainstTarget`):
 * - Status moves: return 40
 * - No power (0): return 10
 * - STAB: 1.5x if move_type matches either attacker type
 * - Type effectiveness via `get_defensive_multiplier`
 * - Score = power * stab * type_eff * (accuracy / 100)
 */
export function score_move(power: number, move_type: number, attacker_type1: number, attacker_type2: number, defender_type1: number, defender_type2: number, accuracy: number, is_status: boolean): number;

/**
 * Select the best AI action given pre-computed scores.
 *
 * Parameters:
 * - `move_scores`: flat array of f64 scores for each move (up to 4)
 * - `num_moves`: number of moves (1-4)
 * - `switch_scores`: flat array of (index, score) pairs for alive switch-ins
 * - `num_switches`: number of available switch-ins
 * - `difficulty`: 0 = easy, 1 = normal, 2 = hard
 * - `seed`: random seed for difficulty-based randomness
 * - `is_fainted`: whether AI active Pokemon is fainted (need forced switch)
 * - `can_mega`: can Mega Evolve (bool)
 * - `can_tera`: can Terastallize (bool)
 * - `should_tera`: whether terastallization is recommended (pre-computed by TS)
 * - `can_dmax`: can Dynamax (bool)
 * - `should_dmax`: whether dynamax is recommended (pre-computed by TS)
 *
 * Returns Vec<f64> of 2 values: [action_type, action_value]
 * action_type: 0 = MOVE, 1 = SWITCH, 2 = MEGA_EVOLVE, 3 = TERASTALLIZE, 4 = DYNAMAX
 * action_value: move index (0-3) or Pokemon index for switch
 */
export function select_ai_action(move_scores: Float64Array, num_moves: number, switch_scores: Float64Array, num_switches: number, difficulty: number, seed: number, is_fainted: boolean, can_mega: boolean, can_tera: boolean, should_tera: boolean, can_dmax: boolean, should_dmax: boolean): Float64Array;

/**
 * Determine if AI should Dynamax.
 *
 * Returns 1.0 = yes, 0.0 = no.
 *
 * Logic (matching JS `shouldDynamax`):
 * 1. Always Dynamax if alive_count <= 1
 * 2. Hard: if HP > 80%, 60% chance. Else return 0.0.
 * 3. Easy: if alive <= 2, 50% chance. Else 15% chance.
 * 4. Normal: if HP > 70%, 50% chance. Else return 0.0.
 */
export function should_dynamax(hp_ratio: number, alive_count: number, difficulty: number, seed: number): number;

/**
 * Determine if AI should Terastallize.
 *
 * Returns 1.0 = yes, 0.0 = no.
 *
 * Logic (matching JS `shouldTerastallize`):
 * 1. For each opponent type: check if it's super effective vs AI types.
 *    If yes, check if tera type would fix this (mult <= 1). If so, return 1.0.
 * 2. Hard: if HP > 50%, 25% chance. Else return 0.0.
 * 3. Easy: 15% chance.
 * 4. Normal: if HP > 60%, 40% chance. Else return 0.0.
 */
export function should_terastallize(ai_type1: number, ai_type2: number, opp_type1: number, opp_type2: number, tera_type: number, hp_ratio: number, difficulty: number, seed: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly determine_turn_order: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly score_matchup: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly score_move: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly select_ai_action: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => void;
    readonly should_dynamax: (a: number, b: number, c: number, d: number) => number;
    readonly should_terastallize: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
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
