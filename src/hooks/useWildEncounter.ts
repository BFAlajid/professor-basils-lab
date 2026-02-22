"use client";

import { useReducer, useCallback, useRef } from "react";
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
import { calculateCatchProbability, shouldWildFlee } from "@/utils/catchRate";
import { DEFAULT_BALL_INVENTORY } from "@/data/pokeBalls";

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
  playerBallInventory: { ...DEFAULT_BALL_INVENTORY },
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
        isShiny: Math.random() < 1 / 4096, // 1/4096 shiny chance
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

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useWildEncounter(playerTeam: TeamSlot[]) {
  const [state, dispatch] = useReducer(wildEncounterReducer, initialState);
  const wildBpRef = useRef<BattlePokemon | null>(null);
  const playerBpRef = useRef<BattlePokemon | null>(null);
  const battleLogRef = useRef<string[]>([]);

  const selectArea = useCallback((area: RouteArea) => {
    dispatch({ type: "SELECT_AREA", area });
  }, []);

  const startEncounter = useCallback(async () => {
    if (!state.currentArea || playerTeam.length === 0) return;

    const encounter = pickWeightedRandom(state.currentArea.encounterPool);
    const level = randomInt(encounter.minLevel, encounter.maxLevel);

    // Fetch Pokemon data
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encounter.pokemonId}`);
    if (!res.ok) return;
    const pokemon: Pokemon = await res.json();

    // Fetch capture rate and preload moves in parallel
    const [captureRate] = await Promise.all([
      fetchCaptureRate(encounter.pokemonId),
      preloadWildMoves(pokemon),
    ]);

    // Also preload player's moves
    const playerSlot = playerTeam[0];
    if (playerSlot) {
      const playerMoveNames = playerSlot.selectedMoves ?? [];
      const cached = (await import("@/utils/battle")).getCachedMoves();
      const toFetch = playerMoveNames.filter((m) => !cached.has(m));
      await Promise.all(
        toFetch.map(async (moveName) => {
          try {
            const moveRes = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`);
            if (!moveRes.ok) return;
            const data = await moveRes.json();
            (await import("@/utils/battle")).cacheBattleMove(moveName, {
              name: data.name,
              power: data.power,
              accuracy: data.accuracy,
              pp: data.pp,
              type: data.type,
              damage_class: data.damage_class,
              meta: data.meta ? { ailment: data.meta.ailment, ailment_chance: data.meta.ailment_chance } : undefined,
            });
          } catch { /* skip */ }
        })
      );
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
  }, [state.currentArea, playerTeam]);

  const enterBattle = useCallback(() => {
    // Transition from encounter_intro to battle phase
    // We dispatch a no-change attack to move to battle phase
    dispatch({
      type: "PLAYER_ATTACK",
      newWildHp: state.wildCurrentHp,
      newWildStatus: state.wildStatus,
      newPlayerHp: state.playerCurrentHp,
      newPlayerStatus: state.playerStatus,
      logMessages: [],
    });
  }, [state]);

  const playerAttack = useCallback((moveIndex: number) => {
    if (!wildBpRef.current || !playerBpRef.current) return;

    // Update refs with current state
    wildBpRef.current.currentHp = state.wildCurrentHp;
    wildBpRef.current.status = state.wildStatus;
    playerBpRef.current.currentHp = state.playerCurrentHp;
    playerBpRef.current.status = state.playerStatus;

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
      if (shouldWildFlee(state.wildCaptureRate, state.encounterTurn)) {
        setTimeout(() => {
          dispatch({ type: "WILD_FLED" });
        }, 500);
      }
    }
  }, [state]);

  const throwBall = useCallback((ball: BallType) => {
    if (!state.wildPokemon) return;

    const area = state.currentArea;
    const context = {
      turn: state.encounterTurn,
      isNight: new Date().getHours() >= 20 || new Date().getHours() < 6,
      isCave: area?.theme === "cave",
      isWater: area?.theme === "water",
      wildPokemonTypes: state.wildPokemon.types.map((t) => t.type.name),
      wildPokemonLevel: state.wildLevel,
      playerPokemonLevel: 50, // default
      wildHpPercent: state.wildCurrentHp / state.wildMaxHp,
      wildStatus: state.wildStatus,
      isRepeatCatch: false, // will be set by caller
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
      shakeChecks: result.shakeChecks,
      isCaught: result.isCaught,
    });
  }, [state]);

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
    if (!state.isCaught) {
      // Failed catch — wild attacks back
      if (wildBpRef.current && playerBpRef.current) {
        wildBpRef.current.currentHp = state.wildCurrentHp;
        wildBpRef.current.status = state.wildStatus;
        playerBpRef.current.currentHp = state.playerCurrentHp;
        playerBpRef.current.status = state.playerStatus;
      }
      // Return to battle phase
      dispatch({
        type: "PLAYER_ATTACK",
        newWildHp: state.wildCurrentHp,
        newWildStatus: state.wildStatus,
        newPlayerHp: state.playerCurrentHp,
        newPlayerStatus: state.playerStatus,
        logMessages: ["The Pokemon broke free!"],
      });
    }
  }, [state]);

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
