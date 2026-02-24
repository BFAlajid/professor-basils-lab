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

const STORAGE_KEY = "pokemon-hall-of-fame";
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadHallOfFame(): HallOfFameEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HallOfFameEntry[];
  } catch {
    return [];
  }
}

export function clearHallOfFame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
