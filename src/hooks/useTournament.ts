"use client";

import { useReducer, useCallback, useState } from "react";
import { TournamentState, TournamentAction, TournamentTrainer } from "@/types";
import { generateTournamentBracket } from "@/utils/tournament";

const initialState: TournamentState = {
  phase: "bracket",
  round: 0,
  trainers: [],
  currentOpponentIndex: -1,
  playerWins: 0,
  isChampion: false,
};

function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case "START_TOURNAMENT":
      return {
        ...initialState,
        phase: "bracket",
        trainers: action.trainers,
      };
    case "BEGIN_MATCH":
      return {
        ...state,
        phase: "battling",
        currentOpponentIndex: action.opponentIndex,
      };
    case "MATCH_WON": {
      const updatedTrainers = state.trainers.map((t, i) =>
        i === state.currentOpponentIndex ? { ...t, defeated: true } : t
      );
      const newWins = state.playerWins + 1;
      // 3 wins = champion (quarterfinal, semifinal, final)
      const isChampion = newWins >= 3;
      return {
        ...state,
        phase: isChampion ? "completed" : "post_match",
        trainers: updatedTrainers,
        playerWins: newWins,
        isChampion,
      };
    }
    case "MATCH_LOST":
      return {
        ...state,
        phase: "completed",
        isChampion: false,
      };
    case "NEXT_ROUND":
      return {
        ...state,
        phase: "bracket",
        round: state.round + 1,
        currentOpponentIndex: -1,
      };
    case "RESET_TOURNAMENT":
      return initialState;
    default:
      return state;
  }
}

export function useTournament() {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);
  const [isGenerating, setIsGenerating] = useState(false);

  const startTournament = useCallback(async () => {
    setIsGenerating(true);
    try {
      const trainers = await generateTournamentBracket();
      dispatch({ type: "START_TOURNAMENT", trainers });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const beginMatch = useCallback((opponentIndex: number) => {
    dispatch({ type: "BEGIN_MATCH", opponentIndex });
  }, []);

  const reportWin = useCallback(() => {
    dispatch({ type: "MATCH_WON" });
  }, []);

  const reportLoss = useCallback(() => {
    dispatch({ type: "MATCH_LOST" });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: "NEXT_ROUND" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET_TOURNAMENT" });
  }, []);

  // Get the current round's opponent based on bracket position
  const getCurrentRoundOpponents = useCallback((): TournamentTrainer[] => {
    if (state.trainers.length === 0) return [];
    const { round, trainers } = state;

    if (round === 0) {
      // Quarterfinals: opponents at indices 0, 2, 4, 6 (player faces first undefeated)
      return trainers.filter((_, i) => i % 2 === 0 && !trainers[i].defeated);
    }
    if (round === 1) {
      // Semifinals: first two undefeated
      return trainers.filter((t) => !t.defeated).slice(0, 2);
    }
    // Finals: last undefeated
    return trainers.filter((t) => !t.defeated).slice(0, 1);
  }, [state]);

  return {
    state,
    isGenerating,
    startTournament,
    beginMatch,
    reportWin,
    reportLoss,
    nextRound,
    reset,
    getCurrentRoundOpponents,
  };
}
