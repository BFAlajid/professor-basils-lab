/**
 * Types for the Daily Challenge (F4) — a seeded "encounter gauntlet" puzzle
 * that is byte-identical for every player on a given UTC day, plus a daily
 * leaderboard. See `utils/dailyChallenge.ts` for the pure generation and
 * scoring logic that produces/consumes these shapes.
 */

export type DailyChallengeType = "encounter-gauntlet";

export type EncounterRarity = "common" | "uncommon" | "rare";

export interface DailyChallengeParams {
  /** Total ball throws available across the whole gauntlet. */
  ballBudget: number;
  /** Number of encounter slots in the gauntlet. */
  slotCount: number;
  /** Max throws allowed at a single slot before it's abandoned. */
  maxBallsPerSlot: number;
}

export interface DailyEncounterSlot {
  slot: number;
  pokemonId: number;
  pokemonName: string;
  rarity: EncounterRarity;
  level: number;
  /** Base catch chance (0..1) before the per-attempt bonus. */
  baseCatchChance: number;
  /** Precomputed deterministic rolls (0..1), one consumed per throw at this
   * slot — fixed at generation time so replays are always identical. */
  rolls: number[];
}

export interface DailyChallenge {
  /** UTC date "YYYY-MM-DD" this challenge belongs to. */
  date: string;
  seed: number;
  type: DailyChallengeType;
  params: DailyChallengeParams;
  encounters: DailyEncounterSlot[];
}

/** A single ball throw the player made, in the order it was made. */
export interface DailyThrow {
  slot: number;
  attemptIndex: number;
}

export interface DailyPlayLog {
  throws: DailyThrow[];
}

/** Per-slot resolved progress, derived from a challenge + play log. */
export interface DailySlotProgress {
  slot: number;
  attemptsUsed: number;
  caught: boolean;
  /** Out of attempts on this slot without catching it. */
  exhausted: boolean;
}

export type DailyPlayStatus = "idle" | "playing" | "complete";

/** Persisted under STORAGE_KEYS.dailyLast — the active/most-recent run. */
export interface DailyLastRecord {
  /** Date the run was started on — locks the challenge to this date even
   * across a UTC midnight rollover mid-session. */
  date: string;
  status: DailyPlayStatus;
  playLog: DailyPlayLog;
  score: number;
  submitted: boolean;
}

/** Client → server submission shape (date is a separate argument to the
 * KV helpers, matching the `type` argument pattern of the main leaderboard). */
export interface DailyResultEntry {
  trainerId: string;
  trainerName: string;
  score: number;
  completedAt: string;
}

/** Full client-facing submission, including the target date. */
export interface DailyResult extends DailyResultEntry {
  date: string;
}

export interface DailyLeaderboardEntry {
  trainerId: string;
  trainerName: string;
  score: number;
  completedAt: string;
}

export interface DailyLeaderboardResponse {
  entries: DailyLeaderboardEntry[];
  playerRank: number | null;
}

/** GET /api/daily response — the descriptor plus today's leaderboard. */
export interface DailyDescriptorResponse {
  date: string;
  seed: number;
  type: DailyChallengeType;
  params: DailyChallengeParams;
  leaderboard: DailyLeaderboardResponse;
}
