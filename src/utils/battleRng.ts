// Module-scope RNG switch for the battle engine. Local/AI battles never seed this,
// so battleRandom() behaves exactly like Math.random(). Online PvP seeds it per-turn
// from a shared seed so both clients compute identical outcomes.
import { makeRng } from "./seededRandom";

// null = unseeded (delegate to Math.random() dynamically, not a captured reference —
// callers/tests that stub Math.random must keep working when no seed is active).
let currentRng: (() => number) | null = null;

/** Drop-in replacement for Math.random() inside the battle execution path. */
export function battleRandom(): number {
  return currentRng ? currentRng() : Math.random();
}

/** Swaps in a deterministic stream derived from the given seed. */
export function seedBattleRng(seed: number): void {
  currentRng = makeRng(seed);
}

/** Restores Math.random() as the source for battleRandom(). */
export function clearBattleRng(): void {
  currentRng = null;
}

/** Derives a per-turn seed from a base seed + turn number (integer hash, mixes bits well). */
export function deriveTurnSeed(baseSeed: number, turn: number): number {
  let h = (baseSeed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ turn, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
