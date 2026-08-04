import { NextResponse } from "next/server";
import {
  submitDailyResult,
  getDailyLeaderboard,
  getDailyPlayerRank,
  checkDailyRateLimit,
  DailyOwnershipError,
} from "@/lib/kv";
import { getTrustedClientIp } from "@/lib/ip";
import { generateChallenge, getUtcDateString, maxPossibleScore } from "@/utils/dailyChallenge";
import type { DailyResultEntry } from "@/types/daily";

export const runtime = "nodejs";

// deviceKey is a client-generated random secret (see trainerIdentity.ts);
// bounds mirror api/leaderboard/route.ts.
const MIN_DEVICE_KEY_LENGTH = 16;
const MAX_DEVICE_KEY_LENGTH = 128;

const MAX_NAME_LENGTH = 20;
const RATE_LIMIT_PER_HOUR = 10;
const LEADERBOARD_LIMIT = 10;

// A run started just before UTC midnight can still be completed and
// submitted just after — allow submissions for "today" or "yesterday"
// (from the server's clock) but nothing further out, which would only
// ever come from a tampered request.
const MAX_DATE_SKEW_DAYS = 1;

// Mirrors api/leaderboard/route.ts — accepts both the legacy 5-digit id and
// the wider 9-digit id issued by newer clients; trainerId is shared storage
// between the leaderboard and daily challenge flows, so both must agree.
const TRAINER_ID_PATTERN = /^\d{5,10}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeName(str: string): string {
  // Allowlist: alphanumeric, spaces, hyphens, periods, apostrophes — same
  // policy as api/leaderboard/route.ts.
  return str.replace(/[^a-zA-Z0-9\s\-.']/g, "").trim();
}

function isValidDateFormat(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function isWithinAllowedRange(date: string): boolean {
  const today = getUtcDateString();
  const submittedMs = Date.parse(`${date}T00:00:00.000Z`);
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  if (Number.isNaN(submittedMs)) return false;
  const diffDays = Math.abs(todayMs - submittedMs) / (24 * 60 * 60 * 1000);
  return diffDays <= MAX_DATE_SKEW_DAYS;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trainerId = url.searchParams.get("trainerId");

  // The challenge is a pure function of the UTC date — no storage needed
  // to "generate" it, and any client can derive the identical descriptor
  // offline with `generateChallenge(getUtcDateString())`. The API's real
  // job here is serving today's leaderboard.
  const date = getUtcDateString();
  const challenge = generateChallenge(date);
  const descriptor = {
    date: challenge.date,
    seed: challenge.seed,
    type: challenge.type,
    params: challenge.params,
  };

  try {
    const entries = await getDailyLeaderboard(date, LEADERBOARD_LIMIT);
    let playerRank: number | null = null;
    if (trainerId && TRAINER_ID_PATTERN.test(trainerId)) {
      playerRank = await getDailyPlayerRank(date, trainerId);
    }

    const headers = trainerId
      ? { "Cache-Control": "private, max-age=0, no-store" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" };

    return NextResponse.json(
      { ...descriptor, leaderboard: { entries, playerRank } },
      { headers }
    );
  } catch (err) {
    console.error("Daily GET failed:", err instanceof Error ? err.message : "Unknown error");
    // Degrade gracefully: the puzzle itself never depends on KV, only the
    // leaderboard does — a KV outage should never block gameplay.
    return NextResponse.json({
      ...descriptor,
      leaderboard: { entries: [], playerRank: null },
    });
  }
}

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);

  try {
    const allowed = await checkDailyRateLimit(ip, RATE_LIMIT_PER_HOUR);
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

  if (!isValidDateFormat(b.date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!isWithinAllowedRange(b.date)) {
    return NextResponse.json(
      { error: "date is outside the allowed submission window" },
      { status: 400 }
    );
  }

  if (typeof b.trainerName !== "string" || b.trainerName.length === 0) {
    return NextResponse.json({ error: "trainerName is required" }, { status: 400 });
  }
  const trainerName = sanitizeName(b.trainerName).trim();
  if (trainerName.length === 0 || trainerName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `trainerName must be 1-${MAX_NAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (typeof b.trainerId !== "string" || !TRAINER_ID_PATTERN.test(b.trainerId)) {
    return NextResponse.json({ error: "trainerId must be 5-10 digits" }, { status: 400 });
  }

  if (typeof b.score !== "number" || !Number.isFinite(b.score) || b.score < 0) {
    return NextResponse.json({ error: "score must be a non-negative number" }, { status: 400 });
  }

  // The challenge is deterministic from the date, so — unlike the generic
  // leaderboard's static per-type cap — we can regenerate the exact day's
  // challenge server-side and validate against its real score ceiling.
  const challenge = generateChallenge(b.date);
  const cap = maxPossibleScore(challenge);
  if (b.score > cap) {
    return NextResponse.json(
      { error: `score exceeds maximum possible (${cap})` },
      { status: 400 }
    );
  }
  const score = Math.floor(b.score);

  const completedAt =
    typeof b.completedAt === "string" && !isNaN(Date.parse(b.completedAt))
      ? b.completedAt
      : new Date().toISOString();

  // deviceKey binds this write to the submitting device, same as the main
  // leaderboard — prevents an anonymous client from overwriting someone
  // else's daily entry.
  const deviceKey = b.deviceKey;
  if (
    typeof deviceKey !== "string" ||
    deviceKey.length < MIN_DEVICE_KEY_LENGTH ||
    deviceKey.length > MAX_DEVICE_KEY_LENGTH
  ) {
    return NextResponse.json({ error: "Invalid device key" }, { status: 400 });
  }

  const entry: DailyResultEntry = {
    trainerId: b.trainerId,
    trainerName,
    score,
    completedAt,
  };

  try {
    const { rank } = await submitDailyResult(b.date, entry, deviceKey);
    return NextResponse.json({ rank }, { status: 201 });
  } catch (err) {
    if (err instanceof DailyOwnershipError) {
      return NextResponse.json(
        { error: "This trainer ID already submitted today from a different device" },
        { status: 403 }
      );
    }
    console.error("Daily POST failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}
