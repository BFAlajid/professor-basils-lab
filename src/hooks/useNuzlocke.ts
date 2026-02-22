"use client";

import { useState, useCallback, useEffect } from "react";
import { NuzlockeState, NuzlockeGravePokemon, Pokemon } from "@/types";

const NUZLOCKE_KEY = "pokemon-nuzlocke-state";

const initialState: NuzlockeState = {
  enabled: false,
  encounteredAreas: [],
  graveyard: [],
  isGameOver: false,
};

export function useNuzlocke() {
  const [state, setState] = useState<NuzlockeState>(initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NUZLOCKE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(NUZLOCKE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const enableNuzlocke = useCallback(() => {
    setState((prev) => ({ ...prev, enabled: true }));
  }, []);

  const disableNuzlocke = useCallback(() => {
    setState(initialState);
  }, []);

  const markAreaEncountered = useCallback((areaId: string) => {
    setState((prev) => ({
      ...prev,
      encounteredAreas: [...prev.encounteredAreas, areaId],
    }));
  }, []);

  const isAreaEncountered = useCallback(
    (areaId: string) => state.encounteredAreas.includes(areaId),
    [state.encounteredAreas]
  );

  const addToGraveyard = useCallback(
    (pokemon: Pokemon, nickname: string, causeOfDeath: string, area: string, level: number) => {
      const gravePokemon: NuzlockeGravePokemon = {
        pokemon,
        nickname: nickname || pokemon.name,
        causeOfDeath,
        area,
        level,
      };
      setState((prev) => {
        const newGraveyard = [...prev.graveyard, gravePokemon];
        return { ...prev, graveyard: newGraveyard };
      });
    },
    []
  );

  const checkGameOver = useCallback(
    (teamSize: number, pcBoxSize: number) => {
      // Game over when there are no Pokemon left alive (team + PC = 0)
      if (teamSize === 0 && pcBoxSize === 0) {
        setState((prev) => ({ ...prev, isGameOver: true }));
        return true;
      }
      return false;
    },
    []
  );

  const resetNuzlocke = useCallback(() => {
    setState({ ...initialState, enabled: true });
  }, []);

  return {
    state,
    enableNuzlocke,
    disableNuzlocke,
    markAreaEncountered,
    isAreaEncountered,
    addToGraveyard,
    checkGameOver,
    resetNuzlocke,
  };
}
