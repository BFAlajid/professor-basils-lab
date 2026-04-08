/**
 * Unified persistence layer for all localStorage operations.
 *
 * Provides: central key registry, type-safe read/write with error handling,
 * quota monitoring, full-data export/import, and a persisted reducer hook.
 *
 * Existing hooks are NOT modified — this is new infrastructure for
 * incremental migration.
 */

import { silentWarn } from "@/utils/silentWarn";

// ── Key Registry ───────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // Team
  team: "pokemon-team-builder-team",

  // Collection
  pcBox: "pokemon-team-builder-pc-box",
  ballInventory: "pokemon-team-builder-ball-inventory",
  pokedex: "pokemon-pokedex",

  // Trainer
  trainerName: "pokemon-trainer-name",
  trainerId: "pokemon-trainer-id",
  trainerFirstSave: "pokemon-trainer-first-save",

  // Achievements & Stats
  achievements: "pokemon-achievements",

  // Battle facilities
  gymBadges: "pokemon-gym-badges",
  battleTowerStreak: "pokemon-battle-tower-streak",
  battleFactoryBest: "pokemon-battle-factory-best",
  battleReplays: "pokemon-battle-replays",
  hallOfFame: "pokemon-hall-of-fame",

  // Wild / Overworld
  nuzlocke: "pokemon-nuzlocke-state",
  wonderTrade: "pokemon-wonder-trade",
  mysteryGift: "pokemon-mystery-gift",
  fossilInventory: "pokemon-fossil-inventory",
  ownedItems: "pokemon-owned-items",
  battleItems: "pokemon-battle-items",

  // Breeding & Farming
  dayCare: "pokemon-daycare",
  berryFarm: "pokemon-berry-farm",

  // Mini-games
  slotCoins: "pokemon-slot-coins",
  gameCornerCoins: "pokemon-game-corner-coins",
  typeQuizBest: "pokemon-type-quiz-best",

  // Emulator
  keybinds: "emulator-keybinds",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** All registered key values for enumeration. */
const ALL_KEYS: StorageKey[] = Object.values(STORAGE_KEYS);

// ── Type-Safe Read / Write ─────────────────────────────────────────────

/**
 * Read a value from localStorage, returning `fallback` on any failure
 * (missing key, invalid JSON, SSR).
 */
export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    silentWarn(`readStorage("${key}")`, e);
    return fallback;
  }
}

/**
 * Read with an optional validator. If the validator returns `null`,
 * the fallback is used instead.
 */
export function readStorageValidated<T>(
  key: string,
  fallback: T,
  validate: (data: unknown) => T | null,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    const validated = validate(parsed);
    return validated !== null ? validated : fallback;
  } catch (e) {
    silentWarn(`readStorageValidated("${key}")`, e);
    return fallback;
  }
}

/**
 * Write a value to localStorage. Silently handles quota errors and SSR.
 * Returns `true` on success, `false` on failure.
 */
export function writeStorage<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    silentWarn(`writeStorage("${key}")`, e);
    return false;
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    silentWarn(`removeStorage("${key}")`, e);
  }
}

// ── Quota Monitoring ───────────────────────────────────────────────────

export interface StorageUsage {
  /** Approximate bytes used across all registered keys. */
  used: number;
  /** Browser storage limit estimate in bytes (5 MB default). */
  limit: number;
  /** Percentage of limit used (0–100). */
  percent: number;
}

/**
 * Estimate storage usage for all registered keys.
 *
 * Uses `navigator.storage.estimate()` when available, falling back to a
 * 5 MB default limit. The `used` count is always measured directly from
 * our registered keys (not the browser estimate) so it reflects only
 * this app's data.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  if (typeof window === "undefined") {
    return { used: 0, limit: 5 * 1024 * 1024, percent: 0 };
  }

  let used = 0;
  for (const key of ALL_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        // Each char in JS is 2 bytes (UTF-16), but localStorage usually
        // counts 1 byte per code unit in most browsers.
        used += key.length + val.length;
      }
    } catch {
      // key inaccessible, skip
    }
  }

  let limit = 5 * 1024 * 1024; // 5 MB conservative default
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota && est.quota > 0) {
        limit = est.quota;
      }
    }
  } catch {
    // estimate unavailable, keep default
  }

  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return { used, limit, percent: Math.round(percent * 100) / 100 };
}

/**
 * Synchronous usage estimate — measures only our registered keys.
 * Assumes a 5 MB quota (suitable for display without awaiting).
 */
export function getStorageUsageSync(): StorageUsage {
  if (typeof window === "undefined") {
    return { used: 0, limit: 5 * 1024 * 1024, percent: 0 };
  }

  let used = 0;
  for (const key of ALL_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        used += key.length + val.length;
      }
    } catch {
      // skip
    }
  }

  const limit = 5 * 1024 * 1024;
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return { used, limit, percent: Math.round(percent * 100) / 100 };
}

// ── Export / Import ────────────────────────────────────────────────────

interface ExportPayload {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

/**
 * Export all registered storage keys as a single JSON string.
 * Keys with no stored value are omitted.
 */
export function exportAllData(): string {
  const data: Record<string, unknown> = {};

  for (const key of ALL_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        // Store the parsed value so import can write it back faithfully
        try {
          data[key] = JSON.parse(raw);
        } catch {
          // Raw strings (e.g. trainer name) that aren't JSON
          data[key] = raw;
        }
      }
    } catch {
      // skip inaccessible keys
    }
  }

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Import data from a JSON blob produced by `exportAllData()`.
 * Only writes keys that exist in the registry — ignores unknown keys.
 * Returns the count of keys successfully imported.
 *
 * Throws on invalid JSON or missing version field.
 */
export function importAllData(json: string): number {
  const parsed: unknown = JSON.parse(json); // let caller handle parse errors

  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    !("data" in parsed)
  ) {
    throw new Error("Invalid save data format: missing version or data field");
  }

  const payload = parsed as ExportPayload;
  if (payload.version !== 1) {
    throw new Error(`Unsupported save data version: ${payload.version}`);
  }

  if (
    payload.data == null ||
    typeof payload.data !== "object" ||
    Array.isArray(payload.data)
  ) {
    throw new Error("Invalid save data format: data must be an object");
  }

  const registeredKeySet = new Set<string>(ALL_KEYS);
  let count = 0;

  for (const [key, value] of Object.entries(payload.data)) {
    if (!registeredKeySet.has(key)) continue; // skip unknown keys
    try {
      if (typeof value === "string") {
        // Raw string values (e.g. "Trainer")
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      count++;
    } catch (e) {
      silentWarn(`importAllData("${key}")`, e);
    }
  }

  return count;
}

/**
 * Clear all registered storage keys. Use with caution.
 */
export function clearAllData(): void {
  for (const key of ALL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // skip
    }
  }
}
