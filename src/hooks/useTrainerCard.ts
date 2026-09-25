"use client";

import { useState, useCallback, useEffect } from "react";
import { silentWarn } from "@/utils/silentWarn";
import type { PlayerStats } from "@/hooks/useAchievements";
import { STORAGE_KEYS, readStorage, readStorageString, writeStorageString } from "@/utils/persistence";

// ── Types ───────────────────────────────────────────────────────────────

export interface TrainerCardData {
  name: string;
  trainerId: string;
  badges: string[];
  totalCaught: number;
  totalBattlesWon: number;
  bestTowerStreak: number;
  hallOfFameEntries: number;
  playTime: string;
  eloRating: number;
  rankTier: string;
  money: number;
}

function getRankTier(elo: number): string {
  if (elo >= 2000) return "Master";
  if (elo >= 1800) return "Ultra";
  if (elo >= 1600) return "Hyper";
  if (elo >= 1400) return "Great";
  if (elo >= 1200) return "Poke";
  return "Beginner";
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateTrainerId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function loadOrCreateTrainerId(): string {
  const saved = readStorageString(STORAGE_KEYS.trainerId, "");
  if (saved) return saved;
  const id = generateTrainerId();
  writeStorageString(STORAGE_KEYS.trainerId, id);
  return id;
}

function loadBadges(): string[] {
  const badges = readStorage<unknown>(STORAGE_KEYS.gymBadges, []);
  return Array.isArray(badges) ? (badges as string[]) : [];
}

function calculatePlayTime(): string {
  if (typeof window === "undefined") return "0:00";
  try {
    let firstSave = readStorageString(STORAGE_KEYS.trainerFirstSave, "");
    if (!firstSave) {
      firstSave = new Date().toISOString();
      writeStorageString(STORAGE_KEYS.trainerFirstSave, firstSave);
    }
    const start = new Date(firstSave).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  } catch (e) {
    silentWarn("calculatePlayTime", e);
    return "0:00";
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useTrainerCard(stats: PlayerStats) {
  // Lazy initializers read storage synchronously on first render (no
  // load-then-setState effect, no flash-of-default, no cascading render).
  const [name, setName] = useState(() => readStorageString(STORAGE_KEYS.trainerName, "") || "Trainer");
  const [trainerId] = useState(loadOrCreateTrainerId);
  const [badges, setBadges] = useState<string[]>(loadBadges);
  const [playTime, setPlayTime] = useState(calculatePlayTime);

  // Refresh badges/play time periodically (they can change from gym battles
  // and elapsed real time, sources this hook doesn't otherwise observe).
  useEffect(() => {
    const interval = setInterval(() => {
      setBadges(loadBadges());
      setPlayTime(calculatePlayTime());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set trainer name and persist
  const setTrainerName = useCallback((newName: string) => {
    const trimmed = newName.trim().slice(0, 16) || "Trainer";
    setName(trimmed);
    writeStorageString(STORAGE_KEYS.trainerName, trimmed);
  }, []);

  // Export card as PNG
  const exportAsImage = useCallback(
    (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `trainer-card-${trainerId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        silentWarn("exportTrainerCardImage", e);
      }
    },
    [trainerId]
  );

  // Build card data
  const cardData: TrainerCardData = {
    name: name || "Trainer",
    trainerId,
    badges,
    totalCaught: stats.totalCaught,
    totalBattlesWon: stats.totalBattlesWon,
    bestTowerStreak: stats.battleTowerBestStreak,
    hallOfFameEntries: stats.hallOfFameEntries,
    playTime,
    eloRating: stats.eloRating,
    rankTier: getRankTier(stats.eloRating),
    money: stats.money,
  };

  return { cardData, setTrainerName, exportAsImage };
}
