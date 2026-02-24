/* tslint:disable */
/* eslint-disable */
export function calculate_damage(
  effective_atk: number,
  effective_def: number,
  move_power: number,
  move_type: number,
  def_type1: number,
  def_type2: number,
  stab: number,
  is_critical: boolean,
  weather: number,
  move_is_fire: boolean,
  move_is_water: boolean,
  item_damage_mult: number,
  ability_atk_mult: number,
  is_burned_physical: boolean,
  atk_stage: number,
  def_stage: number,
  def_item_spdef_mult: number,
  is_physical: boolean,
): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export default function __wbg_init(module_or_path?: InitInput | Promise<InitInput>): Promise<any>;
