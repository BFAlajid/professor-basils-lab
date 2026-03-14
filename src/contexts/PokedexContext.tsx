"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePokedex, type PokedexEntry, type PokedexSource } from "@/hooks/usePokedex";

// --- State context (changes when entries/counts change) ---

interface PokedexStateValue {
  entries: Record<number, PokedexEntry>;
  totalSeen: number;
  totalCaught: number;
  getEntry: (id: number) => PokedexEntry | null;
  getCompletionPercent: () => number;
}

const PokedexStateContext = createContext<PokedexStateValue | null>(null);

// --- Dispatch context (stable reference, never changes) ---

interface PokedexDispatchValue {
  markSeen: (id: number, name: string, source: PokedexSource) => void;
  markCaught: (id: number, name: string, source: PokedexSource) => void;
  reset: () => void;
}

const PokedexDispatchContext = createContext<PokedexDispatchValue | null>(null);

// --- Provider ---

export function PokedexProvider({ children }: { children: ReactNode }) {
  const pokedex = usePokedex();

  const stateValue: PokedexStateValue = useMemo(
    () => ({
      entries: pokedex.entries,
      totalSeen: pokedex.totalSeen,
      totalCaught: pokedex.totalCaught,
      getEntry: pokedex.getEntry,
      getCompletionPercent: pokedex.getCompletionPercent,
    }),
    [pokedex.entries, pokedex.totalSeen, pokedex.totalCaught, pokedex.getEntry, pokedex.getCompletionPercent]
  );

  const dispatchValue: PokedexDispatchValue = useMemo(
    () => ({
      markSeen: pokedex.markSeen,
      markCaught: pokedex.markCaught,
      reset: pokedex.reset,
    }),
    [pokedex.markSeen, pokedex.markCaught, pokedex.reset]
  );

  return (
    <PokedexStateContext.Provider value={stateValue}>
      <PokedexDispatchContext.Provider value={dispatchValue}>
        {children}
      </PokedexDispatchContext.Provider>
    </PokedexStateContext.Provider>
  );
}

// --- Hooks ---

export function usePokedexState(): PokedexStateValue {
  const ctx = useContext(PokedexStateContext);
  if (!ctx) throw new Error("usePokedexState must be used within PokedexProvider");
  return ctx;
}

export function usePokedexDispatch(): PokedexDispatchValue {
  const ctx = useContext(PokedexDispatchContext);
  if (!ctx) throw new Error("usePokedexDispatch must be used within PokedexProvider");
  return ctx;
}

/** Backward-compatible hook that returns both state and dispatch. */
export function usePokedexContext(): PokedexStateValue & PokedexDispatchValue {
  const state = usePokedexState();
  const dispatch = usePokedexDispatch();
  return { ...state, ...dispatch };
}
