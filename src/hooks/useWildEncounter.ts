"use client";

import { useReducer, useCallback, useRef } from "react";
import { SHINY_RATE } from "@/data/constants";
import {
  WildEncounterState,
  WildEncounterAction,
  RouteArea,
  WildPokemonData,
  Pokemon,
  BallType,
  BattlePokemon,
  TeamSlot,
  StatusCondition,
} from "@/types";
import { initBattlePokemon, initStatStages } from "@/utils/battle";
import { createWildBattlePokemon, preloadWildMoves, fetchCaptureRate, executeWildTurn } from "@/utils/wildBattle";
import { randomInt } from "@/utils/random";
import { calculateCatchProbability, shouldWildFlee } from "@/utils/catchRateWasm";
import { fetchAndCacheMove } from "@/utils/moveCache";
import { fetchPokemonData } from "@/utils/pokeApiClient";

const initialState: WildEncounterState = {
  phase: "map",
  currentArea: null,
  wildPokemon: null,
  wildLevel: 1,
  wildCaptureRate: 45,
  wildCurrentHp: 0,
  wildMaxHp: 0,
  wildStatus: null,
  wildStatStages: initStatStages(),
  playerCurrentHp: 0,
  playerMaxHp: 0,
  playerStatus: null,
  playerStatStages: initStatStages(),
  encounterTurn: 0,
  shakeCount: 0,
  isCaught: false,
  isShiny: false,
  selectedBall: null,
};

function wildEncounterReducer(
  state: WildEncounterState,
  action: WildEncounterAction
): WildEncounterState {
  switch (action.type) {
    case "SELECT_AREA":
      return { ...state, currentArea: action.area };

    case "START_ENCOUNTER":
      return {
        ...state,
        phase: "encounter_intro",
        wildPokemon: action.pokemon,
        wildLevel: action.level,
        wildCaptureRate: action.captureRate,
        wildCurrentHp: action.wildHp,
        wildMaxHp: action.wildMaxHp,
        wildStatus: null,
        wildStatStages: initStatStages(),
        playerCurrentHp: action.playerHp,
        playerMaxHp: action.playerMaxHp,
        playerStatus: null,
        playerStatStages: initStatStages(),
        encounterTurn: 1,
        shakeCount: 0,
        isCaught: false,
        isShiny: Math.random() < SHINY_RATE,
        selectedBall: null,
      };

    case "PLAYER_ATTACK":
      return {
        ...state,
        phase: "battle",
        wildCurrentHp: action.newWildHp,
        wildStatus: action.newWildStatus,
        playerCurrentHp: action.newPlayerHp,
        playerStatus: action.newPlayerStatus,
        encounterTurn: state.encounterTurn + 1,
      };

    case "THROW_BALL":
      return {
        ...state,
        phase: "catching",
        selectedBall: action.ball,
        shakeCount: action.shakeChecks.filter(Boolean).length,
        isCaught: action.isCaught,
        encounterTurn: state.encounterTurn + 1,
      };

    case "WILD_FLED":
      return { ...state, phase: "fled" };

    case "PLAYER_RUN":
      return { ...state, phase: "map" };

    case "PLAYER_FAINTED":
      return { ...state, phase: "fled" };

    case "RETURN_TO_MAP":
      return {
        ...state,
        phase: "map",
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
        selectedBall: null,
      };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

export function pickWeightedRandom(pool: WildPokemonData[]): WildPokemonData {
  const totalWeight = pool.reduce((sum, p) => sum + p.encounterRate, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.encounterRate;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1];
}

export function useWildEncounter(playerTeam: TeamSlot[]) {
  const [state, dispatch] = useReducer(wildEncounterReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const wildBpRef = useRef<BattlePokemon | null>(null);
  const playerBpRef = useRef<BattlePokemon | null>(null);
  const battleLogRef = useRef<string[]>([]);

  const selectArea = useCallback((area: RouteArea) => {
    dispatch({ type: "SELECT_AREA", area });
  }, []);

  const startEncounter = useCallback(async () => {
    const current = stateRef.current;
    if (!current.currentArea || playerTeam.length === 0) return;

    const encounter = pickWeightedRandom(current.currentArea.encounterPool);
    const level = randomInt(encounter.minLevel, encounter.maxLevel);

    // Fetch Pokemon data
    const pokemon: Pokemon = await fetchPokemonData(encounter.pokemonId) as Pokemon;

    // Fetch capture rate and preload moves in parallel
    const [captureRate] = await Promise.all([
      fetchCaptureRate(encounter.pokemonId),
      preloadWildMoves(pokemon),
    ]);

    // Also preload player's moves
    const playerSlot = playerTeam[0];
    if (playerSlot) {
      const playerMoveNames = playerSlot.selectedMoves ?? [];
      await Promise.all(playerMoveNames.map(fetchAndCacheMove));
    }

    // Create battle Pokemon
    const wildBp = createWildBattlePokemon(pokemon, level);
    const playerBp = playerSlot ? initBattlePokemon(playerSlot) : null;
    if (playerBp) playerBp.isActive = true;

    wildBpRef.current = wildBp;
    playerBpRef.current = playerBp;
    battleLogRef.current = [];

    dispatch({
      type: "START_ENCOUNTER",
      pokemon,
      level,
      captureRate,
      wildHp: wildBp.currentHp,
      wildMaxHp: wildBp.maxHp,
      playerHp: playerBp?.currentHp ?? 0,
      playerMaxHp: playerBp?.maxHp ?? 0,
    });
  }, [playerTeam]);

  const enterBattle = useCallback(() => {
    const current = stateRef.current;
    // Transition from encounter_intro to battle phase
    dispatch({
      type: "PLAYER_ATTACK",
      newWildHp: current.wildCurrentHp,
      newWildStatus: current.wildStatus,
      newPlayerHp: current.playerCurrentHp,
      newPlayerStatus: current.playerStatus,
      logMessages: [],
    });
  }, []);

  const playerAttack = useCallback((moveIndex: number) => {
    if (!wildBpRef.current || !playerBpRef.current) return;
    const current = stateRef.current;

    // Update refs with current state
    wildBpRef.current.currentHp = current.wildCurrentHp;
    wildBpRef.current.status = current.wildStatus;
    playerBpRef.current.currentHp = current.playerCurrentHp;
    playerBpRef.current.status = current.playerStatus;

    const result = executeWildTurn(playerBpRef.current, wildBpRef.current, moveIndex);
    battleLogRef.current = [...battleLogRef.current, ...result.log];

    if (result.playerFainted) {
      dispatch({ type: "PLAYER_FAINTED" });
      return;
    }

    dispatch({
      type: "PLAYER_ATTACK",
      newWildHp: result.newWildHp,
      newWildStatus: result.newWildStatus,
      newPlayerHp: result.newPlayerHp,
      newPlayerStatus: result.newPlayerStatus,
      logMessages: result.log,
    });

    // Check if wild should flee after turn
    if (!result.wildFainted && !result.playerFainted) {
      if (shouldWildFlee(current.wildCaptureRate, current.encounterTurn)) {
        setTimeout(() => {
          dispatch({ type: "WILD_FLED" });
        }, 500);
      }
    }
  }, []);

  const throwBall = useCallback((ball: BallType, isRepeatCatch?: boolean) => {
    const current = stateRef.current;
    if (!current.wildPokemon) return;

    const area = current.currentArea;
    const context = {
      turn: current.encounterTurn,
      isNight: new Date().getHours() >= 20 || new Date().getHours() < 6,
      isCave: area?.theme === "cave",
      isWater: area?.theme === "water",
      wildPokemonTypes: current.wildPokemon.types.map((t) => t.type.name),
      wildPokemonLevel: current.wildLevel,
      playerPokemonLevel: 50,
      wildHpPercent: current.wildCurrentHp / current.wildMaxHp,
      wildStatus: current.wildStatus,
      isRepeatCatch: isRepeatCatch ?? false,
    };

    const result = calculateCatchProbability(
      current.wildCaptureRate,
      current.wildCurrentHp,
      current.wildMaxHp,
      current.wildStatus,
      ball,
      context
    );

    dispatch({
      type: "THROW_BALL",
      ball,
      shakeChecks: result.shakeChecks,
      isCaught: result.isCaught,
    });
  }, []);

  const playerRun = useCallback(() => {
    dispatch({ type: "PLAYER_RUN" });
  }, []);

  const returnToMap = useCallback(() => {
    dispatch({ type: "RETURN_TO_MAP" });
    wildBpRef.current = null;
    playerBpRef.current = null;
    battleLogRef.current = [];
  }, []);

  const continueAfterCatch = useCallback(() => {
    const current = stateRef.current;
    if (!current.isCaught) {
      // Failed catch — wild attacks back
      if (wildBpRef.current && playerBpRef.current) {
        wildBpRef.current.currentHp = current.wildCurrentHp;
        wildBpRef.current.status = current.wildStatus;
        playerBpRef.current.currentHp = current.playerCurrentHp;
        playerBpRef.current.status = current.playerStatus;
      }
      // Return to battle phase
      dispatch({
        type: "PLAYER_ATTACK",
        newWildHp: current.wildCurrentHp,
        newWildStatus: current.wildStatus,
        newPlayerHp: current.playerCurrentHp,
        newPlayerStatus: current.playerStatus,
        logMessages: ["The Pokemon broke free!"],
      });
    }
  }, []);

  return {
    state,
    battleLog: battleLogRef.current,
    selectArea,
    startEncounter,
    enterBattle,
    playerAttack,
    throwBall,
    playerRun,
    returnToMap,
    continueAfterCatch,
    wildSlot: wildBpRef.current?.slot ?? null,
    playerBp: playerBpRef.current,
  };
}
