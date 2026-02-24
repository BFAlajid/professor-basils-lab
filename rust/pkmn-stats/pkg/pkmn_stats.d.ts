/* tslint:disable */
/* eslint-disable */
export function calculate_hp(base: number, iv: number, ev: number, level: number): number;
export function calculate_stat(base: number, iv: number, ev: number, nature_modifier: number, level: number): number;
export function calculate_all_stats(
  hp_base: number, atk_base: number, def_base: number, spa_base: number, spd_base: number, spe_base: number,
  hp_iv: number, atk_iv: number, def_iv: number, spa_iv: number, spd_iv: number, spe_iv: number,
  hp_ev: number, atk_ev: number, def_ev: number, spa_ev: number, spd_ev: number, spe_ev: number,
  atk_nature: number, def_nature: number, spa_nature: number, spd_nature: number, spe_nature: number,
): Uint32Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<any>;
