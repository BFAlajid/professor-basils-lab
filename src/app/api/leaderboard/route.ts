import { NextResponse } from "next/server";
import { submitScore, getLeaderboard, getPlayerRank, checkRateLimit } from "@/lib/kv";
import {
  LEADERBOARD_MAX_NAME_LENGTH,
  LEADERBOARD_MAX_ELO,
  LEADERBOARD_MAX_STREAK,
  LEADERBOARD_RATE_LIMIT_PER_HOUR,
} from "@/data/constants";
import type {
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardResponse,
} from "@/types/leaderboard";

export const runtime = "nodejs";

const VALID_TYPES = new Set<LeaderboardType>([
  "battle-tower",
  "elo-rating",
  "hall-of-fame",
  "safari-catches",
  "pokedex-completion",
]);

const SCORE_CAPS: Record<LeaderboardType, number> = {
  "battle-tower": LEADERBOARD_MAX_STREAK,
  "elo-rating": LEADERBOARD_MAX_ELO,
  "hall-of-fame": LEADERBOARD_MAX_STREAK,
  "safari-catches": LEADERBOARD_MAX_STREAK,
  "pokedex-completion": LEADERBOARD_MAX_STREAK,
};

const TRAINER_ID_PATTERN = /^\d{5}$/;

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

function isValidType(value: unknown): value is LeaderboardType {
  return typeof value === "string" && VALID_TYPES.has(value as LeaderboardType);
}

function validateEntry(
  type: LeaderboardType,
  entry: unknown
): { valid: true; cleaned: LeaderboardEntry } | { valid: false; error: string } {
  if (typeof entry !== "object" || entry === null) {
    return { valid: false, error: "Invalid entry object" };
  }

  const e = entry as Record<string, unknown>;

  // trainerName
  if (typeof e.trainerName !== "string" || e.trainerName.length === 0) {
    return { valid: false, error: "trainerName is required" };
  }
  const cleanName = stripHtml(e.trainerName).trim();
  if (cleanName.length === 0 || cleanName.length > LEADERBOARD_MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `trainerName must be 1-${LEADERBOARD_MAX_NAME_LENGTH} characters`,
    };
  }

  // trainerId
  if (typeof e.trainerId !== "string" || !TRAINER_ID_PATTERN.test(e.trainerId)) {
    return { valid: false, error: "trainerId must be exactly 5 digits" };
  }

  // score
  if (typeof e.score !== "number" || !Number.isFinite(e.score) || e.score < 0) {
    return { valid: false, error: "score must be a non-negative number" };
  }
  const clampedScore = Math.min(Math.floor(e.score), SCORE_CAPS[type]);

  // teamPokemon
  if (!Array.isArray(e.teamPokemon)) {
    return { valid: false, error: "teamPokemon must be an array" };
  }
  if (e.teamPokemon.length > 6) {
    return { valid: false, error: "teamPokemon must have at most 6 entries" };
  }
  for (const name of e.teamPokemon) {
    if (typeof name !== "string") {
      return { valid: false, error: "teamPokemon entries must be strings" };
    }
  }

  // Sanitize teamPokemon — strip HTML and enforce length limits
  const sanitizedTeam = (e.teamPokemon as string[]).map((name: string) =>
    stripHtml(String(name)).trim().slice(0, 30)
  );
  if (sanitizedTeam.some((p: string) => p.length === 0)) {
    return { valid: false, error: "Invalid Pokemon names" };
  }

  // timestamp
  const timestamp =
    typeof e.timestamp === "string" && !isNaN(Date.parse(e.timestamp))
      ? e.timestamp
      : new Date().toISOString();

  return {
    valid: true,
    cleaned: {
      trainerName: cleanName,
      trainerId: e.trainerId,
      score: clampedScore,
      teamPokemon: sanitizedTeam,
      timestamp,
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const trainerId = url.searchParams.get("trainerId");

  if (!isValidType(type)) {
    return NextResponse.json(
      { error: "Invalid leaderboard type" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);
  const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

  try {
    const entries = await getLeaderboard(type, limit, offset);
    let playerRank: number | null = null;
    if (trainerId && TRAINER_ID_PATTERN.test(trainerId)) {
      playerRank = await getPlayerRank(type, trainerId);
    }

    const response: LeaderboardResponse = { entries, playerRank };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("Leaderboard GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  try {
    const allowed = await checkRateLimit(ip, LEADERBOARD_RATE_LIMIT_PER_HOUR);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (!isValidType(b.type)) {
    return NextResponse.json(
      { error: "Invalid leaderboard type" },
      { status: 400 }
    );
  }

  const validation = validateEntry(b.type, b.entry);
  if (validation.valid === false) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const { rank } = await submitScore(b.type, validation.cleaned);
    return NextResponse.json({ rank }, { status: 201 });
  } catch (err) {
    console.error("Leaderboard POST failed:", err);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 }
    );
  }
}
