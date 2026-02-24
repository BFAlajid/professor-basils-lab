"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PlayerStats } from "@/hooks/useAchievements";

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
}

// ── Storage Keys ────────────────────────────────────────────────────────

const NAME_KEY = "pokemon-trainer-name";
const ID_KEY = "pokemon-trainer-id";
const BADGES_KEY = "pokemon-gym-badges";
const FIRST_SAVE_KEY = "pokemon-trainer-first-save";

// ── Helpers ─────────────────────────────────────────────────────────────

function generateTrainerId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function loadString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadBadges(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function calculatePlayTime(): string {
  if (typeof window === "undefined") return "0:00";
  try {
    let firstSave = localStorage.getItem(FIRST_SAVE_KEY);
    if (!firstSave) {
      firstSave = new Date().toISOString();
      localStorage.setItem(FIRST_SAVE_KEY, firstSave);
    }
    const start = new Date(firstSave).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  } catch {
    return "0:00";
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useTrainerCard(stats: PlayerStats) {
  const [name, setName] = useState("Trainer");
  const [trainerId, setTrainerId] = useState("00000");
  const [badges, setBadges] = useState<string[]>([]);
  const [playTime, setPlayTime] = useState("0:00");
  const initialized = useRef(false);

  // Load persisted data on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Trainer name
    const savedName = loadString(NAME_KEY, "");
    if (savedName) {
      setName(savedName);
    }

    // Trainer ID — generate if missing
    let savedId = loadString(ID_KEY, "");
    if (!savedId) {
      savedId = generateTrainerId();
      try {
        localStorage.setItem(ID_KEY, savedId);
      } catch {
        // ignore
      }
    }
    setTrainerId(savedId);

    // Badges
    setBadges(loadBadges());

    // Play time
    setPlayTime(calculatePlayTime());
  }, []);

  // Refresh badges periodically (they can change from gym battles)
  useEffect(() => {
    const interval = setInterval(() => {
      setBadges(loadBadges());
      setPlayTime(calculatePlayTime());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set trainer name and persist
  const setTrainerName = useCallback((newName: string) => {
    const trimmed = newName.trim().slice(0, 16);
    setName(trimmed || "Trainer");
    try {
      localStorage.setItem(NAME_KEY, trimmed || "Trainer");
    } catch {
      // ignore
    }
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
      } catch {
        // canvas export failed
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
  };

  return { cardData, setTrainerName, exportAsImage };
}
