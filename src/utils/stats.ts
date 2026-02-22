import { BaseStats, EVSpread, IVSpread, Nature, StatKey } from "@/types";
import { getNatureModifier } from "@/data/natures";

export const DEFAULT_EVS: EVSpread = { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
export const DEFAULT_IVS: IVSpread = { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
export const MAX_TOTAL_EVS = 510;
export const MAX_SINGLE_EV = 252;
export const MAX_IV = 31;

export interface CalculatedStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export function calculateHP(base: number, iv: number, ev: number, level: number = 50): number {
  // Shedinja always has 1 HP
  if (base === 1) return 1;
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calculateStat(
  base: number,
  iv: number,
  ev: number,
  nature: Nature | null,
  statKey: StatKey,
  level: number = 50
): number {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  const modifier = nature ? getNatureModifier(nature, statKey) : 1.0;
  return Math.floor(raw * modifier);
}

export function calculateAllStats(
  baseStats: BaseStats,
  ivs: IVSpread,
  evs: EVSpread,
  nature: Nature | null
): CalculatedStats {
  return {
    hp: calculateHP(baseStats.hp, ivs.hp, evs.hp),
    attack: calculateStat(baseStats.attack, ivs.attack, evs.attack, nature, "attack"),
    defense: calculateStat(baseStats.defense, ivs.defense, evs.defense, nature, "defense"),
    spAtk: calculateStat(baseStats.spAtk, ivs.spAtk, evs.spAtk, nature, "spAtk"),
    spDef: calculateStat(baseStats.spDef, ivs.spDef, evs.spDef, nature, "spDef"),
    speed: calculateStat(baseStats.speed, ivs.speed, evs.speed, nature, "speed"),
  };
}

export function getTotalEVs(evs: EVSpread): number {
  return evs.hp + evs.attack + evs.defense + evs.spAtk + evs.spDef + evs.speed;
}

export function getRemainingEVs(evs: EVSpread): number {
  return MAX_TOTAL_EVS - getTotalEVs(evs);
}
