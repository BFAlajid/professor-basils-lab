/**
 * Daily Challenge generation and scoring — pure, deterministic, offline-safe.
 *
 * Variant chosen: "encounter-gauntlet" (catch a seeded set of species under
 * a ball budget) over "damage-puzzle". Reasoning: the damage-puzzle variant
 * would need real Pokemon + Move data (base stats, movepool) which only
 * exists behind a PokeAPI fetch in this codebase (no local base-stat
 * table) — that breaks the "works fully offline from the date seed"
 * requirement and drags in ability/item hook surface from `damage.ts` that
 * risks non-determinism. The encounter-gauntlet needs only a small local
 * species pool (pokemonId/name/rarity/catch-chance — the same shape
 * `data/safariZoneEncounters.ts` already uses), so it generates a complete,
 * playable challenge from nothing but the date string, zero network calls.
 *
 * Determinism guarantee: every random draw in this module goes through
 * `utils/seededRandom.ts` (mulberry32), seeded by a pure hash of the UTC
 * date string. `generateChallenge(date)` is a pure function — same date in,
 * byte-identical `DailyChallenge` out, on any client, forever. There is no
 * `Math.random` anywhere in this file.
 */

import { makeRng, int, shuffle } from "@/utils/seededRandom";
import type {
  DailyChallenge,
  DailyChallengeParams,
  DailyEncounterSlot,
  DailyPlayLog,
  DailySlotProgress,
  EncounterRarity,
} from "@/types/daily";

// ── Config ──────────────────────────────────────────────────────────────

export const DAILY_SLOT_COUNT = 5;
export const DAILY_BALL_BUDGET = 8;
export const DAILY_MAX_BALLS_PER_SLOT = 3;

const ATTEMPT_BONUS = 0.15;
const MAX_CATCH_CHANCE = 0.95;

const RARITY_BONUS: Record<EncounterRarity, number> = {
  common: 0,
  uncommon: 30,
  rare: 70,
};
const CATCH_BASE_POINTS = 100;
const EFFICIENCY_POINTS_PER_SAVED_BALL = 15;

const LEVEL_RANGE: Record<EncounterRarity, [number, number]> = {
  common: [8, 15],
  uncommon: [12, 22],
  rare: [18, 30],
};

interface EncounterDef {
  pokemonId: number;
  pokemonName: string;
  rarity: EncounterRarity;
  baseCatchChance: number;
}

// Hand-picked pool spanning early-route Pokemon across generations. Catch
// chances are flavor approximations (not pulled from live game data) — no
// PokeAPI fetch is required to build a challenge, so it works fully offline.
const ENCOUNTER_POOL: readonly EncounterDef[] = [
  // common
  { pokemonId: 16, pokemonName: "pidgey", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 19, pokemonName: "rattata", rarity: "common", baseCatchChance: 0.55 },
  { pokemonId: 21, pokemonName: "spearow", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 41, pokemonName: "zubat", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 129, pokemonName: "magikarp", rarity: "common", baseCatchChance: 0.55 },
  { pokemonId: 161, pokemonName: "sentret", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 265, pokemonName: "wurmple", rarity: "common", baseCatchChance: 0.55 },
  { pokemonId: 396, pokemonName: "starly", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 519, pokemonName: "pidove", rarity: "common", baseCatchChance: 0.5 },
  { pokemonId: 661, pokemonName: "fletchling", rarity: "common", baseCatchChance: 0.5 },
  // uncommon
  { pokemonId: 27, pokemonName: "sandshrew", rarity: "uncommon", baseCatchChance: 0.3 },
  { pokemonId: 66, pokemonName: "machop", rarity: "uncommon", baseCatchChance: 0.3 },
  { pokemonId: 74, pokemonName: "geodude", rarity: "uncommon", baseCatchChance: 0.32 },
  { pokemonId: 133, pokemonName: "eevee", rarity: "uncommon", baseCatchChance: 0.28 },
  { pokemonId: 209, pokemonName: "snubbull", rarity: "uncommon", baseCatchChance: 0.3 },
  { pokemonId: 227, pokemonName: "skarmory", rarity: "uncommon", baseCatchChance: 0.28 },
  { pokemonId: 300, pokemonName: "skitty", rarity: "uncommon", baseCatchChance: 0.32 },
  { pokemonId: 328, pokemonName: "trapinch", rarity: "uncommon", baseCatchChance: 0.28 },
  { pokemonId: 434, pokemonName: "stunky", rarity: "uncommon", baseCatchChance: 0.32 },
  { pokemonId: 570, pokemonName: "zorua", rarity: "uncommon", baseCatchChance: 0.28 },
  // rare
  { pokemonId: 147, pokemonName: "dratini", rarity: "rare", baseCatchChance: 0.15 },
  { pokemonId: 246, pokemonName: "larvitar", rarity: "rare", baseCatchChance: 0.14 },
  { pokemonId: 371, pokemonName: "bagon", rarity: "rare", baseCatchChance: 0.13 },
  { pokemonId: 443, pokemonName: "gible", rarity: "rare", baseCatchChance: 0.14 },
  { pokemonId: 610, pokemonName: "axew", rarity: "rare", baseCatchChance: 0.14 },
  { pokemonId: 704, pokemonName: "goomy", rarity: "rare", baseCatchChance: 0.13 },
];

// ── Date / seed ─────────────────────────────────────────────────────────

/** UTC "YYYY-MM-DD" for a given instant (defaults to now). */
export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Milliseconds until the next UTC-midnight reset. */
export function msUntilNextUtcReset(date: Date = new Date()): number {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  );
  return next.getTime() - date.getTime();
}

/**
 * Deterministic FNV-1a hash of the date string, used as the daily RNG seed.
 * Every client computes the identical seed — and therefore challenge —
 * from the same UTC date with zero network round-trip.
 */
export function seedForDate(dateUTC: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateUTC.length; i++) {
    hash ^= dateUTC.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// ── Generation ──────────────────────────────────────────────────────────

/**
 * Builds today's challenge purely from the UTC date string. Deterministic:
 * the same date always yields byte-identical output, and all randomness
 * routes through seededRandom (no Math.random anywhere in this path).
 */
export function generateChallenge(dateUTC: string): DailyChallenge {
  const seed = seedForDate(dateUTC);
  const rng = makeRng(seed);

  const params: DailyChallengeParams = {
    ballBudget: DAILY_BALL_BUDGET,
    slotCount: DAILY_SLOT_COUNT,
    maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT,
  };

  const picks = shuffle(rng, ENCOUNTER_POOL).slice(0, params.slotCount);

  const encounters: DailyEncounterSlot[] = picks.map((def, slot) => {
    const [minLevel, maxLevel] = LEVEL_RANGE[def.rarity];
    const level = int(rng, minLevel, maxLevel);
    const rolls: number[] = [];
    for (let i = 0; i < params.maxBallsPerSlot; i++) {
      rolls.push(rng());
    }
    return {
      slot,
      pokemonId: def.pokemonId,
      pokemonName: def.pokemonName,
      rarity: def.rarity,
      level,
      baseCatchChance: def.baseCatchChance,
      rolls,
    };
  });

  return { date: dateUTC, seed, type: "encounter-gauntlet", params, encounters };
}

// ── Catch resolution ────────────────────────────────────────────────────

/** Catch chance for the Nth throw at a slot — each consecutive throw at the
 * same target improves the odds, capped well below certainty. */
export function catchChanceForAttempt(baseCatchChance: number, attemptIndex: number): number {
  return Math.min(MAX_CATCH_CHANCE, baseCatchChance + attemptIndex * ATTEMPT_BONUS);
}

/** Resolves whether a specific throw succeeds, purely from the challenge's
 * precomputed rolls — never re-rolls, so replays are always identical. */
export function resolveThrow(
  challenge: DailyChallenge,
  slot: number,
  attemptIndex: number
): boolean {
  const encounter = challenge.encounters.find((e) => e.slot === slot);
  if (!encounter) return false;
  if (attemptIndex < 0 || attemptIndex >= encounter.rolls.length) return false;
  const chance = catchChanceForAttempt(encounter.baseCatchChance, attemptIndex);
  return encounter.rolls[attemptIndex] < chance;
}

// ── Scoring ─────────────────────────────────────────────────────────────

interface ReplayResult {
  ballsUsed: number;
  slotResults: Map<number, { attemptsUsed: number; caught: boolean }>;
  score: number;
}

/**
 * Single source of truth for interpreting a play log against a challenge:
 * replays the throws in order, ignoring malformed/out-of-order/over-budget
 * entries defensively, and recomputes each catch outcome from the
 * challenge's precomputed rolls rather than trusting a claimed result.
 */
function replay(challenge: DailyChallenge, playLog: DailyPlayLog): ReplayResult {
  const { maxBallsPerSlot, ballBudget } = challenge.params;
  const slotResults = new Map<number, { attemptsUsed: number; caught: boolean }>();
  let ballsUsedTotal = 0;
  let score = 0;

  for (const t of playLog.throws) {
    if (ballsUsedTotal >= ballBudget) break;

    const current = slotResults.get(t.slot) ?? { attemptsUsed: 0, caught: false };
    if (current.caught) continue;
    if (current.attemptsUsed >= maxBallsPerSlot) continue;
    if (t.attemptIndex !== current.attemptsUsed) continue; // out-of-order/duplicate, ignore

    const encounter = challenge.encounters.find((e) => e.slot === t.slot);
    if (!encounter) continue;

    const nextAttempts = current.attemptsUsed + 1;
    ballsUsedTotal += 1;
    const caught = resolveThrow(challenge, t.slot, t.attemptIndex);
    slotResults.set(t.slot, { attemptsUsed: nextAttempts, caught });

    if (caught) {
      const efficiencyBonus = (maxBallsPerSlot - nextAttempts) * EFFICIENCY_POINTS_PER_SAVED_BALL;
      score += CATCH_BASE_POINTS + RARITY_BONUS[encounter.rarity] + efficiencyBonus;
    }
  }

  return { ballsUsed: ballsUsedTotal, slotResults, score };
}

/**
 * Deterministic score for a completed (or partial) play log: given the same
 * challenge and the same ordered sequence of throws, always returns the
 * same score.
 */
export function scorePlay(challenge: DailyChallenge, playLog: DailyPlayLog): number {
  return replay(challenge, playLog).score;
}

/** Total ball throws already spent, given a play log. */
export function ballsUsed(challenge: DailyChallenge, playLog: DailyPlayLog): number {
  return replay(challenge, playLog).ballsUsed;
}

/** Whether the gauntlet is over: every slot resolved (caught or exhausted
 * attempts) or the ball budget is fully spent. */
export function isChallengeComplete(challenge: DailyChallenge, playLog: DailyPlayLog): boolean {
  const result = replay(challenge, playLog);
  if (result.ballsUsed >= challenge.params.ballBudget) return true;
  return challenge.encounters.every((e) => {
    const r = result.slotResults.get(e.slot);
    if (!r) return false;
    return r.caught || r.attemptsUsed >= challenge.params.maxBallsPerSlot;
  });
}

/** Per-slot progress derived from the play log — lets the UI (and the hook)
 * render catch/fail/pending state without re-deriving replay logic itself. */
export function getSlotProgress(
  challenge: DailyChallenge,
  playLog: DailyPlayLog
): DailySlotProgress[] {
  const result = replay(challenge, playLog);
  return challenge.encounters.map((e) => {
    const r = result.slotResults.get(e.slot) ?? { attemptsUsed: 0, caught: false };
    return {
      slot: e.slot,
      attemptsUsed: r.attemptsUsed,
      caught: r.caught,
      exhausted: !r.caught && r.attemptsUsed >= challenge.params.maxBallsPerSlot,
    };
  });
}

/**
 * Generous upper bound on the score reachable for a given challenge (every
 * slot caught on the first throw). Used as a server-side validation
 * ceiling — not necessarily reachable under the ball budget, so it's not
 * an "optimal play" target, just a sanity bound that rejects impossible
 * submitted scores.
 */
export function maxPossibleScore(challenge: DailyChallenge): number {
  const bestEfficiency = (challenge.params.maxBallsPerSlot - 1) * EFFICIENCY_POINTS_PER_SAVED_BALL;
  return challenge.encounters.reduce(
    (sum, e) => sum + CATCH_BASE_POINTS + RARITY_BONUS[e.rarity] + bestEfficiency,
    0
  );
}
