"use client";

import { useState, useEffect, useCallback } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { getDeviceKey, regenerateTrainerId } from "@/utils/trainerIdentity";
import { STORAGE_KEYS, readStorageString } from "@/utils/persistence";
import type {
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardResponse,
} from "@/types/leaderboard";

export function useLeaderboard(type: LeaderboardType) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const trainerId = readStorageString(STORAGE_KEYS.trainerId, "");
        const params = new URLSearchParams({ type, limit: "50" });
        if (trainerId) params.set("trainerId", trainerId);

        const res = await fetch(`/api/leaderboard?${params}`);
        if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
        const data: LeaderboardResponse = await res.json();
        if (!cancelled) {
          setEntries(data.entries);
          setPlayerRank(data.playerRank);
          setIsLoading(false);
        }
      } catch (e) {
        silentWarn("useLeaderboard", e);
        if (!cancelled) {
          setError("Failed to load leaderboard");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type]);

  const submitScore = useCallback(
    async (entry: LeaderboardEntry): Promise<number | null> => {
      const post = (e: LeaderboardEntry) =>
        fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, entry: e, deviceKey: getDeviceKey() }),
        });

      try {
        let res = await post(entry);

        // 403 means this trainerId is already claimed by a different device
        // (an id collision) — regenerate and retry once instead of leaving
        // the player permanently locked out of this leaderboard.
        if (res.status === 403) {
          const retryEntry = { ...entry, trainerId: regenerateTrainerId() };
          res = await post(retryEntry);
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Submit failed");
        }
        const { rank } = await res.json();
        setPlayerRank(rank);

        // Refresh the leaderboard after submission
        const trainerId = readStorageString(STORAGE_KEYS.trainerId, "");
        const params = new URLSearchParams({ type, limit: "50" });
        if (trainerId) params.set("trainerId", trainerId);
        const refreshRes = await fetch(`/api/leaderboard?${params}`);
        if (refreshRes.ok) {
          const data: LeaderboardResponse = await refreshRes.json();
          setEntries(data.entries);
          setPlayerRank(data.playerRank);
        }
        return rank;
      } catch (e) {
        silentWarn("submitScore", e);
        setError(e instanceof Error ? e.message : "Submit failed");
        return null;
      }
    },
    [type]
  );

  return { entries, playerRank, isLoading, error, submitScore };
}
