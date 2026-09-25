"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import type {
  Pokemon,
  Move,
  Nature,
  EVSpread,
  IVSpread,
  TeamSlot,
  FieldState,
  SideConditions,
  WeatherType,
  TerrainType,
} from "@/types";
import type { DamageQuizQuestion, DamageQuizState, QuizMonSpec } from "@/types/damageQuiz";
import { STORAGE_KEYS } from "@/utils/persistence";
import { usePersistedState } from "./usePersistedState";
import { fetchPokemonData, fetchMoveData } from "@/utils/pokeApiClient";
import { calculateDamage, extractBaseStats, type DamageCalcOptions } from "@/utils/damage";
import { calculateHP, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import { initSideConditions } from "@/utils/battleHelpers";
import { shuffle } from "@/utils/seededRandom";
import { NATURES } from "@/data/natures";
import { SMOGON_SETS, type SmogonSet } from "@/data/smogonSets";

// ── Move exclusions ────────────────────────────────────────────────────
//
// calculateDamage already returns { min: 0, max: 0 } for status moves and
// for moves with a null `power` (which covers OHKO and fixed-damage moves
// in PokeAPI data) — but that 0 is indistinguishable from a genuine "your
// move does 0%" answer, which is exactly the degenerate question we must
// not generate. Multi-hit moves resolve to a single hit's damage, not the
// total, which would mislead the "real" answer. We filter all three out.
const EXCLUDED_MOVES = new Set([
  // OHKO
  "fissure", "guillotine", "horn-drill", "sheer-cold",
  // Fixed / non-standard damage
  "seismic-toss", "night-shade", "dragon-rage", "sonic-boom",
  "super-fang", "final-gambit", "endeavor", "psywave",
  "counter", "mirror-coat", "metal-burst",
  // Multi-hit (redundant with the meta.min_hits check below, kept explicit
  // for the entries that appear in the Smogon set pool)
  "bullet-seed", "icicle-spear", "rock-blast", "bone-rush",
  "double-hit", "dual-chop", "twineedle", "tail-slap",
  "water-shuriken", "triple-kick", "population-bomb",
  "surging-strikes", "pin-missile", "fury-attack", "double-slap",
  "arm-thrust", "comet-punch", "scale-shot", "gear-grind",
  "dragon-darts", "triple-axel", "barrage", "spike-cannon",
]);

function isValidDamagingMove(move: Move): boolean {
  if (move.damage_class.name === "status") return false;
  if (move.power === null) return false;
  if (move.meta?.min_hits != null || move.meta?.max_hits != null) return false;
  if (EXCLUDED_MOVES.has(move.name)) return false;
  return true;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** "Life Orb" -> "life-orb", "Heavy-Duty Boots" -> "heavy-duty-boots". */
function toApiSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function mapSmogonEvs(evs: SmogonSet["evs"]): EVSpread {
  return { hp: evs.hp, attack: evs.atk, defense: evs.def, spAtk: evs.spa, spDef: evs.spd, speed: evs.spe };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Candidate pool ──────────────────────────────────────────────────────
//
// Two sources feed the generator: the (large, static) Smogon set pool, and
// the caller's own team when one is passed in. Both resolve to the same
// shape so the rest of the generator doesn't care where a mon came from.

interface ResolvedMon {
  pokemon: Pokemon;
  nature: Nature | null;
  evs: EVSpread;
  ivs: IVSpread;
  item: string | null;
  ability: string | null;
  movesApiSlug: string[];
}

interface SmogonCandidate {
  source: "smogon";
  pokemonSlug: string;
  set: SmogonSet;
}

interface TeamCandidate {
  source: "team";
  slot: TeamSlot;
}

type Candidate = SmogonCandidate | TeamCandidate;

const SMOGON_POOL: SmogonCandidate[] = SMOGON_SETS.flatMap((entry) =>
  entry.sets.map((set) => ({
    source: "smogon" as const,
    pokemonSlug: entry.pokemonName.toLowerCase(),
    set,
  }))
);

function buildPool(team?: TeamSlot[]): Candidate[] {
  const pool: Candidate[] = [...SMOGON_POOL];
  for (const slot of team ?? []) {
    if ((slot.selectedMoves?.length ?? 0) > 0) {
      pool.push({ source: "team", slot });
    }
  }
  return pool;
}

async function resolveCandidate(candidate: Candidate): Promise<ResolvedMon> {
  if (candidate.source === "team") {
    const { slot } = candidate;
    return {
      pokemon: slot.pokemon,
      nature: slot.nature ?? null,
      evs: slot.evs ?? { ...DEFAULT_EVS },
      ivs: slot.ivs ?? { ...DEFAULT_IVS },
      item: slot.heldItem ?? null,
      ability: slot.ability ?? null,
      movesApiSlug: slot.selectedMoves ?? [],
    };
  }

  const { pokemonSlug, set } = candidate;
  const pokemon = await fetchPokemonData(pokemonSlug);
  const nature = NATURES.find((n) => n.name === set.nature.toLowerCase()) ?? null;
  return {
    pokemon,
    nature,
    evs: mapSmogonEvs(set.evs),
    ivs: { ...DEFAULT_IVS },
    item: set.item ? toApiSlug(set.item) : null,
    ability: set.ability || null,
    movesApiSlug: set.moves.map(toApiSlug),
  };
}

function toQuizMonSpec(resolved: ResolvedMon, level: number): QuizMonSpec {
  const maxHp = calculateHP(
    extractBaseStats(resolved.pokemon).hp,
    resolved.ivs.hp,
    resolved.evs.hp,
    level
  );
  return {
    pokemon: resolved.pokemon,
    level,
    nature: resolved.nature,
    evs: resolved.evs,
    ivs: resolved.ivs,
    item: resolved.item,
    ability: resolved.ability,
    maxHp,
  };
}

async function pickDamagingMove(movesApiSlug: string[], rng: () => number): Promise<Move | null> {
  const candidates = shuffle(
    rng,
    movesApiSlug.filter((slug) => !EXCLUDED_MOVES.has(slug))
  );
  for (const slug of candidates) {
    try {
      const move = await fetchMoveData(slug);
      if (isValidDamagingMove(move)) return move;
    } catch {
      // Move fetch failed (bad slug, network) — try the next one.
    }
  }
  return null;
}

// ── Field conditions ────────────────────────────────────────────────────

const WEATHER_POOL: WeatherType[] = ["sun", "rain", "sandstorm", "hail"];
const TERRAIN_POOL: TerrainType[] = ["electric", "grassy", "misty", "psychic"];

function defaultSideConditions(): SideConditions {
  return initSideConditions();
}

/** Occasionally adds weather/terrain/screens for variety. Crits are never part of the field. */
function randomField(rng: () => number): FieldState {
  const weather = rng() < 0.15 ? WEATHER_POOL[Math.floor(rng() * WEATHER_POOL.length)] : null;
  const terrain = !weather && rng() < 0.12 ? TERRAIN_POOL[Math.floor(rng() * TERRAIN_POOL.length)] : null;

  const defenderSide = defaultSideConditions();
  if (rng() < 0.1) defenderSide.reflect = 5;
  if (rng() < 0.1) defenderSide.lightScreen = 5;

  return {
    weather,
    weatherTurnsLeft: weather ? 5 : 0,
    terrain,
    terrainTurnsLeft: terrain ? 5 : 0,
    trickRoom: 0,
    player1Side: defaultSideConditions(),
    player2Side: defenderSide,
  };
}

// ── Bucket generation ───────────────────────────────────────────────────
//
// Buckets are built from a fixed, non-overlapping grid whose cell width
// scales with the damage magnitude (finer near 0%, coarser near 100%).
// The grid guarantees every percent 0-100 maps to exactly one cell, so
// exactly one of the four displayed buckets can ever contain the true
// range's midpoint.

function pickWidth(mid: number): number {
  if (mid <= 15) return 5;
  if (mid <= 40) return 10;
  if (mid <= 70) return 15;
  return 20;
}

function buildGrid(width: number): { start: number; end: number }[] {
  const grid: { start: number; end: number }[] = [];
  for (let start = 0; start < 100; start += width) {
    const isLast = start + width >= 100;
    grid.push({ start, end: isLast ? 100 : start + width - 1 });
  }
  return grid;
}

const IMMUNE_DECOY_POOL: { start: number; end: number }[] = [
  { start: 1, end: 15 },
  { start: 16, end: 35 },
  { start: 36, end: 60 },
  { start: 61, end: 90 },
  { start: 91, end: 100 },
];

function buildImmuneBuckets(rng: () => number): { buckets: string[]; correctIndex: number } {
  const decoys = shuffle(rng, IMMUNE_DECOY_POOL).slice(0, 3);
  const entries = [
    { label: "0%", isCorrect: true },
    ...decoys.map((d) => ({ label: `${d.start}-${d.end}%`, isCorrect: false })),
  ];
  const shuffled = shuffle(rng, entries);
  return {
    buckets: shuffled.map((e) => e.label),
    correctIndex: shuffled.findIndex((e) => e.isCorrect),
  };
}

export function buildBuckets(
  minPercent: number,
  maxPercent: number,
  rng: () => number = Math.random
): { buckets: string[]; correctIndex: number } {
  if (minPercent <= 0 && maxPercent <= 0) {
    return buildImmuneBuckets(rng);
  }

  const trueMid = Math.round((minPercent + maxPercent) / 2);
  const width = pickWidth(trueMid);
  const grid = buildGrid(width);
  const correctGridIdx = Math.min(grid.length - 1, Math.floor(trueMid / width));

  const otherIndices = grid.map((_, i) => i).filter((i) => i !== correctGridIdx);
  const decoyIndices = shuffle(rng, otherIndices).slice(0, 3);

  const chosen = [correctGridIdx, ...decoyIndices]
    .map((i) => grid[i])
    .sort((a, b) => a.start - b.start);

  const correctStart = grid[correctGridIdx].start;
  return {
    buckets: chosen.map((b) => `${b.start}-${b.end}%`),
    correctIndex: chosen.findIndex((b) => b.start === correctStart),
  };
}

// ── Question generator ──────────────────────────────────────────────────

const MAX_GENERATION_ATTEMPTS = 15;
const QUIZ_LEVEL = 50;

export async function generateDamageQuizQuestion(
  team?: TeamSlot[],
  rng: () => number = Math.random
): Promise<DamageQuizQuestion> {
  const pool = buildPool(team);
  if (pool.length === 0) {
    throw new Error("No candidate Pokemon available to build a damage quiz question.");
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const attackerIdx = Math.floor(rng() * pool.length);
      let defenderIdx = Math.floor(rng() * pool.length);
      if (pool.length > 1 && defenderIdx === attackerIdx) {
        defenderIdx = (defenderIdx + 1) % pool.length;
      }

      const [attackerResolved, defenderResolved] = await Promise.all([
        resolveCandidate(pool[attackerIdx]),
        resolveCandidate(pool[defenderIdx]),
      ]);

      const move = await pickDamagingMove(attackerResolved.movesApiSlug, rng);
      if (!move) continue; // attacker has no usable damaging move — re-roll

      const attackerSpec = toQuizMonSpec(attackerResolved, QUIZ_LEVEL);
      const defenderSpec = toQuizMonSpec(defenderResolved, QUIZ_LEVEL);
      if (defenderSpec.maxHp <= 0) continue;

      const field = randomField(rng);

      const options: DamageCalcOptions = {
        attackerLevel: QUIZ_LEVEL,
        defenderLevel: QUIZ_LEVEL,
        attackerEvs: attackerResolved.evs,
        attackerIvs: attackerResolved.ivs,
        attackerNature: attackerResolved.nature,
        attackerItem: attackerResolved.item,
        attackerAbility: attackerResolved.ability,
        defenderEvs: defenderResolved.evs,
        defenderIvs: defenderResolved.ivs,
        defenderNature: defenderResolved.nature,
        defenderItem: defenderResolved.item,
        defenderAbility: defenderResolved.ability,
        // Crits are disabled in quiz mode so there's one fair answer.
        isCritical: false,
        fieldWeather: field.weather,
        fieldTerrain: field.terrain,
        defenderSideReflect: field.player2Side.reflect > 0,
        defenderSideLightScreen: field.player2Side.lightScreen > 0,
      };

      const result = calculateDamage(attackerResolved.pokemon, defenderResolved.pokemon, move, options);

      const minPercent = clampPercent((result.min / defenderSpec.maxHp) * 100);
      const maxPercent = clampPercent((result.max / defenderSpec.maxHp) * 100);
      const { buckets, correctIndex } = buildBuckets(minPercent, maxPercent, rng);

      return {
        attacker: attackerSpec,
        defender: defenderSpec,
        move,
        field,
        actualPercent: [minPercent, maxPercent],
        buckets,
        correctIndex,
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to generate a damage quiz question after several attempts.");
}

// ── State machine ───────────────────────────────────────────────────────

interface ReducerState {
  status: "loading" | "ready" | "error";
  question: DamageQuizQuestion | null;
  score: number;
  streak: number;
  answered: boolean;
  guessIndex: number | null;
  correct: boolean | null;
  error: string | null;
}

type Action =
  | { type: "LOADING" }
  | { type: "QUESTION_READY"; question: DamageQuizQuestion }
  | { type: "ERROR"; message: string }
  | { type: "ANSWER"; guessIndex: number };

const initialReducerState: ReducerState = {
  status: "loading",
  question: null,
  score: 0,
  streak: 0,
  answered: false,
  guessIndex: null,
  correct: null,
  error: null,
};

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case "LOADING":
      return { ...state, status: "loading", answered: false, guessIndex: null, correct: null, error: null };

    case "QUESTION_READY":
      return {
        ...state,
        status: "ready",
        question: action.question,
        answered: false,
        guessIndex: null,
        correct: null,
        error: null,
      };

    case "ERROR":
      return { ...state, status: "error", error: action.message };

    case "ANSWER": {
      if (state.answered || !state.question) return state;
      const isCorrect = action.guessIndex === state.question.correctIndex;
      const newStreak = isCorrect ? state.streak + 1 : 0;
      const points = isCorrect ? 10 + Math.min(newStreak - 1, 10) * 2 : 0;
      return {
        ...state,
        answered: true,
        guessIndex: action.guessIndex,
        correct: isCorrect,
        score: state.score + points,
        streak: newStreak,
      };
    }

    default:
      return state;
  }
}

/**
 * Guess-the-Damage Trainer: shows a realistic attacker/defender/move (drawn
 * from Smogon sets, or the caller's own team), asks the player to bucket the
 * true damage-% roll, then reveals the exact range computed by the same
 * `calculateDamage` engine the damage calculator uses.
 */
export function useDamageQuiz(team?: TeamSlot[]) {
  const [reducerState, dispatch] = useReducer(reducer, initialReducerState);
  const [bestStreak, setBestStreak] = usePersistedState(STORAGE_KEYS.damageQuizBest, 0);

  const requestIdRef = useRef(0);
  const teamRef = useRef(team);
  teamRef.current = team;

  const loadQuestion = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: "LOADING" });
    try {
      const question = await generateDamageQuizQuestion(teamRef.current);
      if (requestIdRef.current !== requestId) return; // superseded by a newer request
      dispatch({ type: "QUESTION_READY", question });
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      dispatch({ type: "ERROR", message: e instanceof Error ? e.message : "Failed to generate question" });
    }
  }, []);

  useEffect(() => {
    loadQuestion();
    // Only run on mount — `next`/`retry` drive subsequent loads explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reducerState.streak > bestStreak) {
      setBestStreak(reducerState.streak);
    }
  }, [reducerState.streak, bestStreak, setBestStreak]);

  const answer = useCallback((guessIndex: number) => {
    dispatch({ type: "ANSWER", guessIndex });
  }, []);

  const next = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const retry = useCallback(() => {
    loadQuestion();
  }, [loadQuestion]);

  const state: DamageQuizState = { ...reducerState, bestStreak };

  return { state, answer, next, retry };
}
