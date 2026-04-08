import { kv } from "@vercel/kv";
import { LEADERBOARD_MAX_ENTRIES } from "@/data/constants";
import type { LeaderboardEntry, LeaderboardType } from "@/types/leaderboard";

function leaderboardKey(type: LeaderboardType): string {
  return `leaderboard:${type}`;
}

function rateLimitKey(ip: string): string {
  return `rate:${ip}:leaderboard`;
}

export async function submitScore(
  type: LeaderboardType,
  entry: LeaderboardEntry
): Promise<{ rank: number }> {
  const key = leaderboardKey(type);
  // Use trainerId as member for uniqueness (one entry per player)
  const member = entry.trainerId;

  await kv.zadd(key, { score: entry.score, member });

  // Store metadata in a parallel hash keyed by trainerId
  await kv.hset(`${key}:data`, {
    [entry.trainerId]: JSON.stringify({
      trainerName: entry.trainerName,
      teamPokemon: entry.teamPokemon,
      timestamp: entry.timestamp,
    }),
  });

  // Trim to top N — remove lowest-scoring entries beyond the cap
  const count = await kv.zcard(key);
  if (count > LEADERBOARD_MAX_ENTRIES) {
    // Get members being removed so we can clean up their metadata
    const removed = await kv.zrange<string[]>(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    await kv.zremrangebyrank(key, 0, count - LEADERBOARD_MAX_ENTRIES - 1);
    if (removed.length > 0) {
      await kv.hdel(`${key}:data`, ...removed);
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

export async function checkRateLimit(
  ip: string,
  maxPerHour: number
): Promise<boolean> {
  const key = rateLimitKey(ip);
  const current = await kv.incr(key);
  await kv.expire(key, 3600);
  return current <= maxPerHour;
}
