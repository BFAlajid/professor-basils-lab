import { STORAGE_KEYS, readStorage, writeStorage, removeStorage } from "@/utils/persistence";

export interface HallOfFameEntry {
  id: string;
  date: string; // ISO
  mode: "elite_four" | "battle_tower" | "gym_challenge";
  team: {
    pokemonId: number;
    name: string;
    spriteUrl: string | null;
    level: number;
  }[];
  streak?: number; // for battle tower
  gymBadges?: number; // for gym challenge
}

const MAX_ENTRIES = 50;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function saveToHallOfFame(entry: HallOfFameEntry): void {
  const existing = loadHallOfFame();
  const entryWithId: HallOfFameEntry = {
    ...entry,
    id: entry.id || generateId(),
  };
  const updated = [entryWithId, ...existing].slice(0, MAX_ENTRIES);
  writeStorage(STORAGE_KEYS.hallOfFame, updated);
}

export function loadHallOfFame(): HallOfFameEntry[] {
  const entries = readStorage<unknown>(STORAGE_KEYS.hallOfFame, []);
  return Array.isArray(entries) ? (entries as HallOfFameEntry[]) : [];
}

export function clearHallOfFame(): void {
  removeStorage(STORAGE_KEYS.hallOfFame);
}
