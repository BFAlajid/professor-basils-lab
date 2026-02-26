import {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  AltFormeData,
  BaseStats,
} from "@/types";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { getActivePokemon, updatePokemon } from "./battleHelpers";

function extractStatsFromFormeData(data: AltFormeData): BaseStats {
  const get = (name: string) =>
    data.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  return {
    hp: get("hp"),
    attack: get("attack"),
    defense: get("defense"),
    spAtk: get("special-attack"),
    spDef: get("special-defense"),
    speed: get("speed"),
  };
}

export function applyMegaEvolution(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasMegaEvolved || !active.megaFormeData) return state;
  if (team.selectedMechanic !== "mega") return state;

  const formeStats = extractStatsFromFormeData(active.megaFormeData);
  const updated: BattlePokemon = {
    ...active,
    isMegaEvolved: true,
    hasMegaEvolved: true,
    activeStatOverride: formeStats,
  };

  const megaCalc = calculateAllStats(
    formeStats,
    active.slot.ivs ?? DEFAULT_IVS,
    active.slot.evs ?? DEFAULT_EVS,
    active.slot.nature ?? null
  );
  const hpDiff = megaCalc.hp - active.maxHp;
  updated.maxHp = megaCalc.hp;
  updated.currentHp = active.currentHp + Math.max(0, hpDiff);
  updated.originalMaxHp = active.originalMaxHp;

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Mega Evolved into ${active.megaFormeData.name}!`,
    kind: "mega",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

export function applyTerastallization(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasTerastallized || !active.teraType) return state;
  if (team.selectedMechanic !== "tera") return state;

  const updated: BattlePokemon = {
    ...active,
    isTerastallized: true,
    hasTerastallized: true,
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Terastallized into the ${active.teraType} type!`,
    kind: "tera",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

export function applyDynamax(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasDynamaxed) return state;
  if (team.selectedMechanic !== "dynamax") return state;

  const updated: BattlePokemon = {
    ...active,
    isDynamaxed: true,
    hasDynamaxed: true,
    dynamaxTurnsLeft: 3,
    maxHp: active.maxHp * 2,
    currentHp: active.currentHp * 2,
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Dynamaxed!`,
    kind: "dynamax",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

export function endDynamax(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (!active.isDynamaxed) return state;

  const originalMaxHp = active.originalMaxHp;
  const newCurrentHp = Math.min(Math.floor(active.currentHp / 2), originalMaxHp);

  const updated: BattlePokemon = {
    ...active,
    isDynamaxed: false,
    dynamaxTurnsLeft: 0,
    maxHp: originalMaxHp,
    currentHp: Math.max(1, newCurrentHp),
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name}'s Dynamax ended!`,
    kind: "dynamax",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}
