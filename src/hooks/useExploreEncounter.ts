import { useReducer, useCallback, useRef, useEffect } from "react";
import type {
  Pokemon,
  TeamSlot,
  BattlePokemon,
  StatusCondition,
  BallType,
  CatchContext,
} from "@/types";
import type { PendingEncounter } from "@/types/explore";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import {
  createWildBattlePokemon,
  preloadWildMoves,
  fetchCaptureRate,
  executeWildTurn,
  type WildTurnResult,
} from "@/utils/wildBattle";
import { initBattlePokemon, initStatStages } from "@/utils/battle";
import { calculateCatchProbability, shouldWildFlee } from "@/utils/catchRateWasm";

// --- State ---

export interface ExploreEncounterState {
  phase: "idle" | "loading" | "battle" | "catching" | "caught" | "fled" | "fainted";
  wildPokemon: Pokemon | null;
  wildLevel: number;
  wildCaptureRate: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  wildStatus: StatusCondition;
  playerCurrentHp: number;
  playerMaxHp: number;
  playerStatus: StatusCondition;
  encounterTurn: number;
  shakeCount: number;
  isCaught: boolean;
  isShiny: boolean;
  selectedBall: BallType | null;
  battleLog: string[];
}

const initialState: ExploreEncounterState = {
  phase: "idle",
  wildPokemon: null,
  wildLevel: 1,
  wildCaptureRate: 45,
  wildCurrentHp: 0,
  wildMaxHp: 0,
  wildStatus: null,
  playerCurrentHp: 0,
  playerMaxHp: 0,
  playerStatus: null,
  encounterTurn: 0,
  shakeCount: 0,
  isCaught: false,
  isShiny: false,
  selectedBall: null,
  battleLog: [],
};

// --- Actions ---

type Action =
  | { type: "START_LOADING" }
  | {
      type: "ENCOUNTER_READY";
      pokemon: Pokemon;
      level: number;
      captureRate: number;
      wildHp: number;
      playerHp: number;
      isShiny: boolean;
    }
  | {
      type: "TURN_RESULT";
      result: WildTurnResult;
    }
  | {
      type: "THROW_BALL";
      ball: BallType;
      shakeCount: number;
      isCaught: boolean;
    }
  | { type: "CATCH_ANIMATION_DONE" }
  | { type: "CONTINUE_AFTER_CATCH" }
  | { type: "WILD_FLED" }
  | { type: "PLAYER_RUN" }
  | { type: "RESET" };

function reducer(state: ExploreEncounterState, action: Action): ExploreEncounterState {
  switch (action.type) {
    case "START_LOADING":
      return { ...initialState, phase: "loading" };

    case "ENCOUNTER_READY":
      return {
        ...state,
        phase: "battle",
        wildPokemon: action.pokemon,
        wildLevel: action.level,
        wildCaptureRate: action.captureRate,
        wildCurrentHp: action.wildHp,
        wildMaxHp: action.wildHp,
        playerCurrentHp: action.playerHp,
        playerMaxHp: action.playerHp,
        isShiny: action.isShiny,
        battleLog: [`A wild ${action.pokemon.name} appeared!`],
      };

    case "TURN_RESULT": {
      const { result } = action;
      const newPhase = result.playerFainted
        ? "fainted" as const
        : result.wildFainted
          ? "fled" as const
          : "battle" as const;
      return {
        ...state,
        phase: newPhase,
        wildCurrentHp: result.newWildHp,
        wildStatus: result.newWildStatus,
        playerCurrentHp: result.newPlayerHp,
        playerStatus: result.newPlayerStatus,
        encounterTurn: state.encounterTurn + 1,
        battleLog: [...state.battleLog, ...result.log],
      };
    }

    case "THROW_BALL":
      return {
        ...state,
        phase: "catching",
        selectedBall: action.ball,
        shakeCount: action.shakeCount,
        isCaught: action.isCaught,
        encounterTurn: state.encounterTurn + 1,
      };

    case "CATCH_ANIMATION_DONE":
      return {
        ...state,
        phase: state.isCaught ? "caught" : "battle",
        battleLog: state.isCaught
          ? [...state.battleLog, `Gotcha! ${state.wildPokemon?.name ?? "Pokemon"} was caught!`]
          : [...state.battleLog, `Oh no! It broke free!`],
      };

    case "CONTINUE_AFTER_CATCH":
      return { ...state, phase: "battle" };

    case "WILD_FLED":
      return {
        ...state,
        phase: "fled",
        battleLog: [...state.battleLog, "The wild Pokemon fled!"],
      };

    case "PLAYER_RUN":
      return {
        ...state,
        phase: "fled",
        battleLog: [...state.battleLog, "Got away safely!"],
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// --- Hook ---

export function useExploreEncounter(
  pendingEncounter: PendingEncounter | null,
  team: TeamSlot[]
) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wildBpRef = useRef<BattlePokemon | null>(null);
  const playerBpRef = useRef<BattlePokemon | null>(null);
  const initRef = useRef(false);

  // When a new encounter is set, fetch data and initialize
  useEffect(() => {
    if (!pendingEncounter || initRef.current) return;
    if (team.length === 0) return;

    initRef.current = true;
    dispatch({ type: "START_LOADING" });

    const { speciesId, level } = pendingEncounter;

    // Guard invalid species
    if (speciesId <= 0 || speciesId > 898) {
      dispatch({ type: "RESET" });
      initRef.current = false;
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const [pokemon, captureRate] = await Promise.all([
          fetchPokemonData(speciesId),
          fetchCaptureRate(speciesId),
        ]);

        if (cancelled) return;

        await preloadWildMoves(pokemon);
        if (cancelled) return;

        const wildBp = createWildBattlePokemon(pokemon, level);
        const playerBp = initBattlePokemon(team[0]);
        playerBp.isActive = true;

        wildBpRef.current = wildBp;
        playerBpRef.current = playerBp;

        dispatch({
          type: "ENCOUNTER_READY",
          pokemon,
          level,
          captureRate,
          wildHp: wildBp.maxHp,
          playerHp: playerBp.maxHp,
          isShiny: Math.random() < 1 / 4096,
        });
      } catch (err) {
        console.error("[ExploreEncounter] init failed:", err);
        if (!cancelled) dispatch({ type: "RESET" });
      }
    }

    init();
    return () => { cancelled = true; };
  }, [pendingEncounter, team]);

  // Reset when encounter clears
  useEffect(() => {
    if (!pendingEncounter && state.phase !== "idle") {
      dispatch({ type: "RESET" });
      wildBpRef.current = null;
      playerBpRef.current = null;
      initRef.current = false;
    }
  }, [pendingEncounter, state.phase]);

  const playerAttack = useCallback(
    (moveIndex: number) => {
      if (state.phase !== "battle" || !wildBpRef.current || !playerBpRef.current) return;

      // Sync HP/status into battle pokemon refs
      wildBpRef.current.currentHp = state.wildCurrentHp;
      wildBpRef.current.status = state.wildStatus;
      playerBpRef.current.currentHp = state.playerCurrentHp;
      playerBpRef.current.status = state.playerStatus;

      const result = executeWildTurn(playerBpRef.current, wildBpRef.current, moveIndex);
      dispatch({ type: "TURN_RESULT", result });

      // Check if wild should flee after this turn
      if (!result.wildFainted && !result.playerFainted) {
        if (shouldWildFlee(state.wildCaptureRate, state.encounterTurn + 1)) {
          dispatch({ type: "WILD_FLED" });
        }
      }
    },
    [state.phase, state.wildCurrentHp, state.wildStatus, state.playerCurrentHp, state.playerStatus, state.wildCaptureRate, state.encounterTurn]
  );

  const throwBall = useCallback(
    (ball: BallType, isRepeatCatch = false) => {
      if (state.phase !== "battle" || !state.wildPokemon) return;

      const hour = new Date().getHours();
      const context: CatchContext = {
        turn: state.encounterTurn,
        isNight: hour >= 20 || hour < 6,
        isCave: false,
        isWater: false,
        wildPokemonTypes: state.wildPokemon.types.map((t) => t.type.name),
        wildPokemonLevel: state.wildLevel,
        playerPokemonLevel: team[0]?.pokemon?.id ? 50 : 50,
        wildHpPercent: state.wildCurrentHp / state.wildMaxHp,
        wildStatus: state.wildStatus,
        isRepeatCatch,
      };

      const result = calculateCatchProbability(
        state.wildCaptureRate,
        state.wildCurrentHp,
        state.wildMaxHp,
        state.wildStatus,
        ball,
        context
      );

      dispatch({
        type: "THROW_BALL",
        ball,
        shakeCount: result.shakeChecks.filter(Boolean).length,
        isCaught: result.isCaught,
      });
    },
    [state, team]
  );

  const run = useCallback(() => {
    if (state.phase !== "battle") return;
    dispatch({ type: "PLAYER_RUN" });
  }, [state.phase]);

  const catchAnimationDone = useCallback(() => {
    dispatch({ type: "CATCH_ANIMATION_DONE" });
  }, []);

  const continueAfterCatch = useCallback(() => {
    dispatch({ type: "CONTINUE_AFTER_CATCH" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    wildBpRef.current = null;
    playerBpRef.current = null;
    initRef.current = false;
  }, []);

  return {
    state,
    playerAttack,
    throwBall,
    run,
    catchAnimationDone,
    continueAfterCatch,
    reset,
  };
}
