import type { Pokemon, Move, Nature, EVSpread, IVSpread, FieldState } from "@/types";

/** A single Pokemon's competitive spec as presented in a quiz question. */
export interface QuizMonSpec {
  pokemon: Pokemon;
  level: number;
  nature: Nature | null;
  evs: EVSpread;
  ivs: IVSpread;
  item: string | null;
  ability: string | null;
  /** Max HP at `level` with the given IVs/EVs — used for damage-% calculations. */
  maxHp: number;
}

export interface DamageQuizQuestion {
  attacker: QuizMonSpec;
  defender: QuizMonSpec;
  move: Move;
  field: FieldState;
  /** [min, max] damage as a percent of the defender's max HP, rounded and clamped to 0-100. */
  actualPercent: [number, number];
  /** Multiple-choice damage-% ranges, e.g. "15-29%". Exactly one contains the true range midpoint. */
  buckets: string[];
  correctIndex: number;
}

export type DamageQuizStatus = "loading" | "ready" | "error";

export interface DamageQuizState {
  status: DamageQuizStatus;
  question: DamageQuizQuestion | null;
  score: number;
  streak: number;
  bestStreak: number;
  answered: boolean;
  guessIndex: number | null;
  correct: boolean | null;
  error: string | null;
}
