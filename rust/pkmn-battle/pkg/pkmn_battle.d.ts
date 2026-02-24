/* tslint:disable */
/* eslint-disable */
export function score_move(power: number, move_type: number, atk_type1: number, atk_type2: number, def_type1: number, def_type2: number, accuracy: number, is_status: boolean): number;
export function score_matchup(sw_t1: number, sw_t2: number, opp_t1: number, opp_t2: number, hp_ratio: number): number;
export function select_ai_action(move_scores: Float64Array, num_moves: number, switch_scores: Float64Array, num_switches: number, difficulty: number, seed: number, is_fainted: boolean, can_mega: boolean, can_tera: boolean, should_tera: boolean, can_dmax: boolean, should_dmax: boolean): Float64Array;
export function determine_turn_order(p1_pri: number, p2_pri: number, p1_spd: number, p2_spd: number, seed: number): number;
export function should_terastallize(ai_t1: number, ai_t2: number, opp_t1: number, opp_t2: number, tera_type: number, hp_ratio: number, difficulty: number, seed: number): number;
export function should_dynamax(hp_ratio: number, alive_count: number, difficulty: number, seed: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<any>;
