/* tslint:disable */
/* eslint-disable */
export function calculate_catch_probability(
  capture_rate: number,
  current_hp: number,
  max_hp: number,
  status_mod: number,
  ball_mod: number,
  seed: number,
): Float64Array;
export function should_wild_flee(capture_rate: number, turn: number, seed: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<any>;
