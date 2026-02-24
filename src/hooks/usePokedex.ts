"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";

// --- Types ---

export type PokedexSource = "wild" | "gba-import" | "team" | "battle" | "safari" | "fossil" | "game-corner";

export interface PokedexEntry {
  id: number;
  name: string;
  seen: boolean;
  caught: boolean;
  source: PokedexSource;
  firstSeen: string; // ISO date
}

export interface PokedexState {
  entries: Record<number, PokedexEntry>;
  totalSeen: number;
  totalCaught: number;
}

type PokedexAction =
  | { type: "MARK_SEEN"; id: number; name: string; source: PokedexSource }
  | { type: "MARK_CAUGHT"; id: number; name: string; source: PokedexSource }
  | { type: "LOAD"; state: PokedexState }
  | { type: "RESET" };

// --- Constants ---

const TOTAL_POKEMON = 1025;
const STORAGE_KEY = "pokemon-pokedex";

// --- Helpers ---

function countEntries(entries: Record<number, PokedexEntry>): {
  totalSeen: number;
  totalCaught: number;
} {
  let totalSeen = 0;
  let totalCaught = 0;
  for (const key of Object.keys(entries)) {
    const entry = entries[Number(key)];
    if (entry.seen) totalSeen++;
    if (entry.caught) totalCaught++;
  }
  return { totalSeen, totalCaught };
}

function createInitialState(): PokedexState {
  return {
    entries: {},
    totalSeen: 0,
    totalCaught: 0,
  };
}

// --- Reducer ---

function pokedexReducer(state: PokedexState, action: PokedexAction): PokedexState {
  switch (action.type) {
    case "MARK_SEEN": {
      const existing = state.entries[action.id];
      // Already seen — no changes needed
      if (existing?.seen) return state;

      const now = new Date().toISOString();
      const updatedEntry: PokedexEntry = existing
        ? { ...existing, seen: true }
        : {
            id: action.id,
            name: action.name,
            seen: true,
            caught: false,
            source: action.source,
            firstSeen: now,
          };

      const newEntries = { ...state.entries, [action.id]: updatedEntry };
      const { totalSeen, totalCaught } = countEntries(newEntries);
      return { entries: newEntries, totalSeen, totalCaught };
    }

    case "MARK_CAUGHT": {
      const existing = state.entries[action.id];
      // Already caught — no changes needed
      if (existing?.caught) return state;

      const now = new Date().toISOString();
      const updatedEntry: PokedexEntry = existing
        ? { ...existing, seen: true, caught: true }
        : {
            id: action.id,
            name: action.name,
            seen: true,
            caught: true,
            source: action.source,
            firstSeen: now,
          };

      const newEntries = { ...state.entries, [action.id]: updatedEntry };
      const { totalSeen, totalCaught } = countEntries(newEntries);
      return { entries: newEntries, totalSeen, totalCaught };
    }

    case "LOAD":
      return action.state;

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

// --- Hook ---

export function usePokedex() {
  const [state, dispatch] = useReducer(pokedexReducer, createInitialState());
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: PokedexState = JSON.parse(saved);
        // Recount to ensure consistency
        const { totalSeen, totalCaught } = countEntries(parsed.entries);
        dispatch({
          type: "LOAD",
          state: {
            entries: parsed.entries,
            totalSeen,
            totalCaught,
          },
        });
      }
    } catch {
      // Corrupted data — start fresh
    }
  }, []);

  // Persist to localStorage on state changes
  useEffect(() => {
    if (!initialized.current) return;
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable
    }
  }, [state]);

  // --- Public API ---

  const markSeen = useCallback(
    (id: number, name: string, source: PokedexSource) => {
      dispatch({ type: "MARK_SEEN", id, name, source });
    },
    []
  );

  const markCaught = useCallback(
    (id: number, name: string, source: PokedexSource) => {
      dispatch({ type: "MARK_CAUGHT", id, name, source });
    },
    []
  );

  const getEntry = useCallback(
    (id: number): PokedexEntry | null => {
      return state.entries[id] ?? null;
    },
    [state.entries]
  );

  const getCompletionPercent = useCallback((): number => {
    return Math.round((state.totalCaught / TOTAL_POKEMON) * 10000) / 100;
  }, [state.totalCaught]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    entries: state.entries,
    totalSeen: state.totalSeen,
    totalCaught: state.totalCaught,
    markSeen,
    markCaught,
    getEntry,
    getCompletionPercent,
    reset,
  };
}
