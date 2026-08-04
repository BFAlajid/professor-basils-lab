import { kv } from "@vercel/kv";
import { createHash, timingSafeEqual } from "crypto";
import { LEADERBOARD_MAX_ENTRIES } from "@/data/constants";
import type { LeaderboardEntry, LeaderboardType } from "@/types/leaderboard";
import type { DailyResultEntry, DailyLeaderboardEntry } from "@/types/daily";
// Re-exported for existing node-runtime callers/tests — the implementation
// lives in rateLimit.ts (crypto-free) so edge routes can import it directly
// without pulling node's `crypto` into their bundle.
export { checkRateLimit, checkDailyRateLimit } from "@/lib/rateLimit";

/** Thrown when a submission's deviceKey doesn't match the entry's recorded owner. */
export class LeaderboardOwnershipError extends Error {
  constructor() {
    super("Entry is owned by a different device");
    this.name = "LeaderboardOwnershipError";
  }
}

function leaderboardKey(type: LeaderboardType): string {
  return `leaderboard:${type}`;
}

function ownerKey(type: LeaderboardType): string {
  return `leaderboard:${type}:owner`;
}

function hashDeviceKey(deviceKey: string): string {
  return createHash("sha256").update(deviceKey).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function submitScore(
  type: LeaderboardType,
  entry: LeaderboardEntry,
  deviceKey: string
): Promise<{ rank: number }> {
  const key = leaderboardKey(type);
  // Use trainerId as member for uniqueness (one entry per player)
  const member = entry.trainerId;
  const ownerHash = hashDeviceKey(deviceKey);

  // Ownership binding: the first device to submit a given trainerId claims
  // it. Later writes from a different device (different deviceKey hash) are
  // rejected so one player can't overwrite another's entry.
  const existingOwnerHash = await kv.hget<string>(ownerKey(type), member);
  if (existingOwnerHash && !constantTimeEqual(existingOwnerHash, ownerHash)) {
    throw new LeaderboardOwnershipError();
  }

  await kv.zadd(key, { score: entry.score, member });

  // Store metadata in a parallel hash keyed by trainerId
  await kv.hset(`${key}:data`, {
    [entry.trainerId]: JSON.stringify({
      trainerName: entry.trainerName,
      teamPokemon: entry.teamPokemon,
      timestamp: entry.timestamp,
    }),
  });

  if (!existingOwnerHash) {
    await kv.hset(ownerKey(type), { [member]: ownerHash });
  }

  // Trim to top N — remove lowest-scoring entries beyond the cap
  const count = await kv.zcard(key);
  if (count > LEADERBOARD_MAX_ENTRIES) {
    // Get members being removed so we can clean up their metadata
    const removed = await kv.zrange<string[]>(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    await kv.zremrangebyrank(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    if (removed.length > 0) {
      await kv.hdel(`${key}:data`, ...removed);
      await kv.hdel(ownerKey(type), ...removed);
    }
  }

  // Rank is 0-indexed from highest score; convert to 1-indexed
  const rank = await kv.zrevrank(key, member);
  return { rank: (rank ?? 0) + 1 };
}

export async function getLeaderboard(
  type: LeaderboardType,
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const key = leaderboardKey(type);
  // ZRANGE with rev returns highest scores first; withScores interleaves [member, score, ...]
  const results = await kv.zrange<string[]>(key, offset, offset + limit - 1, {
    rev: true,
    withScores: true,
  });

  // Members are trainerIds; batch-fetch metadata from the parallel hash
  const trainerIds: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < results.length; i += 2) {
    trainerIds.push(results[i] as string);
    scores.push(Number(results[i + 1]));
  }

  if (trainerIds.length === 0) return [];

  const metaMap = await kv.hmget<Record<string, string>>(`${key}:data`, ...trainerIds);

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < trainerIds.length; i++) {
    const raw = metaMap?.[trainerIds[i]];
    if (!raw) continue;
    const parsed = JSON.parse(raw);
    entries.push({
      trainerId: trainerIds[i],
      score: scores[i],
      trainerName: parsed.trainerName,
      teamPokemon: parsed.teamPokemon,
      timestamp: parsed.timestamp,
    });
  }
  return entries;
}

export async function getPlayerRank(
  type: LeaderboardType,
  trainerId: string
): Promise<number | null> {
  const key = leaderboardKey(type);
  // O(log N) lookup — trainerId is the sorted set member
  const rank = await kv.zrevrank(key, trainerId);
  return rank !== null ? rank + 1 : null;
}

// ── Daily Challenge (F4) ────────────────────────────────────────────────
//
// Append-only addition — everything above this point is the pre-existing
// leaderboard implementation and is untouched. The daily leaderboard is
// keyed per-UTC-date rather than per-type, so ownership and rate limiting
// naturally reset each day without any cross-day bookkeeping.

/** Thrown when a daily submission's deviceKey doesn't match the day's
 * recorded owner for that trainerId. */
export class DailyOwnershipError extends Error {
  constructor() {
    super("Daily result is owned by a different device");
    this.name = "DailyOwnershipError";
  }
}

// Bound how long a given day's KV keys live — the daily leaderboard has no
// use after a few days, and this keeps key count from growing forever.
const DAILY_KEY_TTL_SECONDS = 60 * 60 * 24 * 8; // 8 days

function dailyLeaderboardKey(date: string): string {
  return `daily:${date}`;
}

function dailyOwnerKey(date: string): string {
  return `daily:${date}:owner`;
}

export async function submitDailyResult(
  date: string,
  entry: DailyResultEntry,
  deviceKey: string
): Promise<{ rank: number }> {
  const key = dailyLeaderboardKey(date);
  const member = entry.trainerId;
  const ownerHash = hashDeviceKey(deviceKey);

  // Same ownership-binding scheme as the main leaderboard: first device to
  // submit a trainerId for this date claims it for the day.
  const existingOwnerHash = await kv.hget<string>(dailyOwnerKey(date), member);
  if (existingOwnerHash && !constantTimeEqual(existingOwnerHash, ownerHash)) {
    throw new DailyOwnershipError();
  }

  await kv.zadd(key, { score: entry.score, member });
  await kv.hset(`${key}:data`, {
    [member]: JSON.stringify({
      trainerName: entry.trainerName,
      completedAt: entry.completedAt,
    }),
  });

  if (!existingOwnerHash) {
    await kv.hset(dailyOwnerKey(date), { [member]: ownerHash });
  }

  await kv.expire(key, DAILY_KEY_TTL_SECONDS);
  await kv.expire(`${key}:data`, DAILY_KEY_TTL_SECONDS);
  await kv.expire(dailyOwnerKey(date), DAILY_KEY_TTL_SECONDS);

  // Trim to top N for the day — same cap as the main leaderboard.
  const count = await kv.zcard(key);
  if (count > LEADERBOARD_MAX_ENTRIES) {
    const removed = await kv.zrange<string[]>(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    await kv.zremrangebyrank(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    if (removed.length > 0) {
      await kv.hdel(`${key}:data`, ...removed);
      await kv.hdel(dailyOwnerKey(date), ...removed);
    }
  }

  const rank = await kv.zrevrank(key, member);
  return { rank: (rank ?? 0) + 1 };
}

export async function getDailyLeaderboard(
  date: string,
  limit: number = 10
): Promise<DailyLeaderboardEntry[]> {
  const key = dailyLeaderboardKey(date);
  const results = await kv.zrange<string[]>(key, 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  const trainerIds: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < results.length; i += 2) {
    trainerIds.push(results[i] as string);
    scores.push(Number(results[i + 1]));
  }

  if (trainerIds.length === 0) return [];

  const metaMap = await kv.hmget<Record<string, string>>(`${key}:data`, ...trainerIds);

  const entries: DailyLeaderboardEntry[] = [];
  for (let i = 0; i < trainerIds.length; i++) {
    const raw = metaMap?.[trainerIds[i]];
    if (!raw) continue;
    const parsed = JSON.parse(raw);
    entries.push({
      trainerId: trainerIds[i],
      score: scores[i],
      trainerName: parsed.trainerName,
      completedAt: parsed.completedAt,
    });
  }
  return entries;
}

export async function getDailyPlayerRank(
  date: string,
  trainerId: string
): Promise<number | null> {
  const key = dailyLeaderboardKey(date);
  const rank = await kv.zrevrank(key, trainerId);
  return rank !== null ? rank + 1 : null;
}
