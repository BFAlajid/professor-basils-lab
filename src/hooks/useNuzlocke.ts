"use client";

import { useCallback } from "react";
import { NuzlockeState, NuzlockeGravePokemon, Pokemon } from "@/types";
import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/utils/persistence";

const initialState: NuzlockeState = {
  enabled: false,
  encounteredAreas: [],
  graveyard: [],
  isGameOver: false,
};

function validateNuzlockeState(raw: unknown): NuzlockeState | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<NuzlockeState>;
  return {
    enabled: !!r.enabled,
    encounteredAreas: Array.isArray(r.encounteredAreas) ? r.encounteredAreas : [],
    graveyard: Array.isArray(r.graveyard) ? r.graveyard : [],
    isGameOver: !!r.isGameOver,
  };
}

export function useNuzlocke() {
  const [state, setState] = usePersistedState<NuzlockeState>(
    STORAGE_KEYS.nuzlocke,
    initialState,
    validateNuzlockeState,
  );

  const enableNuzlocke = useCallback(() => {
    setState((prev) => ({ ...prev, enabled: true }));
  }, [setState]);

  const disableNuzlocke = useCallback(() => {
    setState(initialState);
  }, [setState]);

  const markAreaEncountered = useCallback((areaId: string) => {
    setState((prev) => {
      if (prev.encounteredAreas.includes(areaId)) return prev;
      return {
        ...prev,
        encounteredAreas: [...prev.encounteredAreas, areaId],
      };
    });
  }, [setState]);

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
    [setState]
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
    [setState]
  );

  const resetNuzlocke = useCallback(() => {
    setState({ ...initialState, enabled: true });
  }, [setState]);

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
