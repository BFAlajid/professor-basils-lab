"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistedState } from "./usePersistedState";
import { STORAGE_KEYS } from "@/utils/persistence";
import { silentWarn } from "@/utils/silentWarn";
import { getDeviceKey, getTrainerId, getTrainerName, regenerateTrainerId } from "@/utils/trainerIdentity";
import {
  generateChallenge,
  getUtcDateString,
  msUntilNextUtcReset,
  scorePlay,
  ballsUsed,
  isChallengeComplete,
  getSlotProgress,
  maxPossibleScore,
  catchChanceForAttempt,
} from "@/utils/dailyChallenge";
import type {
  DailyChallenge,
  DailyDescriptorResponse,
  DailyLastRecord,
  DailyLeaderboardEntry,
  DailyThrow,
} from "@/types/daily";

interface DailySubmitResponse {
  rank?: number;
  error?: string;
}

function freshRecord(date: string): DailyLastRecord {
  return { date, status: "idle", playLog: { throws: [] }, score: 0, submitted: false };
}

function isDailyThrow(v: unknown): v is DailyThrow {
  if (v == null || typeof v !== "object") return false;
  const t = v as Partial<DailyThrow>;
  return typeof t.slot === "number" && typeof t.attemptIndex === "number";
}

function validateDailyLastRecord(raw: unknown): DailyLastRecord | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<DailyLastRecord>;
  if (typeof r.date !== "string") return null;
  if (r.status !== "idle" && r.status !== "playing" && r.status !== "complete") return null;
  const rawThrows = r.playLog?.throws;
  const throws = Array.isArray(rawThrows) ? rawThrows.filter(isDailyThrow) : [];
  return {
    date: r.date,
    status: r.status,
    playLog: { throws },
    score: typeof r.score === "number" && r.score >= 0 ? r.score : 0,
    submitted: r.submitted === true,
  };
}

/**
 * Daily Challenge (F4): a seeded "encounter gauntlet" that's byte-identical
 * for every player on a given UTC day. The challenge itself is generated
 * fully offline from the date (`utils/dailyChallenge.ts`); the network is
 * only used for the optional leaderboard.
 */
export function useDailyChallenge() {
  const [today, setToday] = useState(getUtcDateString);
  const challenge: DailyChallenge = useMemo(() => generateChallenge(today), [today]);

  const [record, setRecord] = usePersistedState<DailyLastRecord>(
    STORAGE_KEYS.dailyLast,
    freshRecord(today),
    validateDailyLastRecord
  );

  // Roll over to a fresh record when the persisted one is from a previous
  // UTC day (either a returning visit, or the tick below crossing midnight).
  useEffect(() => {
    if (record.date !== today) {
      setRecord(freshRecord(today));
    }
  }, [today, record.date, setRecord]);

  // Countdown to the next UTC reset, ticking every second; also flips
  // `today` the moment the boundary is crossed for a tab left open.
  const [msUntilReset, setMsUntilReset] = useState(msUntilNextUtcReset);
  useEffect(() => {
    const id = setInterval(() => {
      setMsUntilReset(msUntilNextUtcReset());
      setToday((prev) => {
        const now = getUtcDateString();
        return prev === now ? prev : now;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const trainerId = getTrainerId();
      const res = await fetch(`/api/daily?trainerId=${trainerId}`);
      if (!res.ok) throw new Error(`Daily fetch failed: ${res.status}`);
      const data: DailyDescriptorResponse = await res.json();
      setLeaderboard(data.leaderboard?.entries ?? []);
      setPlayerRank(data.leaderboard?.playerRank ?? null);
    } catch (e) {
      silentWarn("useDailyChallenge:refreshLeaderboard", e);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLeaderboard();
    // Re-fetch when the day rolls over so the leaderboard matches `today`.
  }, [today, refreshLeaderboard]);

  const slotProgress = useMemo(
    () => getSlotProgress(challenge, record.playLog),
    [challenge, record.playLog]
  );
  const ballsRemaining = challenge.params.ballBudget - ballsUsed(challenge, record.playLog);
  const complete = record.status === "complete";

  const start = useCallback(() => {
    setRecord((prev) => (prev.status === "idle" ? { ...prev, status: "playing" } : prev));
  }, [setRecord]);

  /** Throws one ball at a slot. No-op if the slot is resolved or the budget's spent. */
  const throwBall = useCallback(
    (slot: number) => {
      setRecord((prev) => {
        if (prev.date !== today || prev.status === "complete") return prev;
        if (ballsUsed(challenge, prev.playLog) >= challenge.params.ballBudget) return prev;

        const progress = getSlotProgress(challenge, prev.playLog);
        const slotState = progress.find((p) => p.slot === slot);
        if (!slotState || slotState.caught || slotState.exhausted) return prev;

        const nextThrow: DailyThrow = { slot, attemptIndex: slotState.attemptsUsed };
        const nextLog = { throws: [...prev.playLog.throws, nextThrow] };
        const nowComplete = isChallengeComplete(challenge, nextLog);
        return {
          ...prev,
          status: nowComplete ? "complete" : "playing",
          playLog: nextLog,
          score: scorePlay(challenge, nextLog),
        };
      });
    },
    [challenge, today, setRecord]
  );

  const submit = useCallback(async (): Promise<number | null> => {
    if (record.status !== "complete" || record.submitted) return null;
    setSubmitError(null);
    try {
      const completedAt = new Date().toISOString();
      const post = (trainerId: string) =>
        fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: record.date,
            trainerId,
            trainerName: getTrainerName(),
            score: record.score,
            deviceKey: getDeviceKey(),
            completedAt,
          }),
        });

      let res = await post(getTrainerId());

      // 403 means this trainerId is already claimed by a different device (an
      // id collision) — regenerate and retry once, same recovery as
      // useLeaderboard.submitScore. See regenerateTrainerId's doc comment for
      // the global-identity-reset tradeoff this accepts.
      if (res.status === 403) {
        res = await post(regenerateTrainerId());
      }

      const data: DailySubmitResponse = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setRecord((prev) => (prev.date === record.date ? { ...prev, submitted: true } : prev));
      await refreshLeaderboard();
      return typeof data.rank === "number" ? data.rank : null;
    } catch (e) {
      silentWarn("useDailyChallenge:submit", e);
      setSubmitError(e instanceof Error ? e.message : "Submit failed");
      return null;
    }
  }, [record, setRecord, refreshLeaderboard]);

  return {
    today,
    challenge,
    record,
    slotProgress,
    ballsRemaining,
    complete,
    maxScore: maxPossibleScore(challenge),
    msUntilReset,
    start,
    throwBall,
    submit,
    submitError,
    leaderboard,
    playerRank,
    leaderboardLoading,
    catchChanceForAttempt,
  };
}
