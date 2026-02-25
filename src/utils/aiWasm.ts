/**
 * WASM-powered AI action selection with JS fallback.
 *
 * Follows the gen3ParserWasm.ts pattern: lazy init, JS fallback, ensureWasmReady().
 * The TS wrapper extracts type indices and numeric values from BattlePokemon objects,
 * then calls Rust for the pure-math scoring. Complex JS-specific lookups (ability hooks,
 * move cache) are resolved in TS before passing to WASM.
 */

import type { BattleState, BattleTurnAction, BattlePokemon, BattleTeam, DifficultyLevel, TypeName } from "@/types";
import { getAbilityHooks } from "@/data/abilities";
import { randomSeed } from "./random";
import { typeToIndex } from "./typeChartWasm";
import { selectAIAction as selectAIAction_JS, getBestSwitchIn as getBestSwitchIn_JS } from "./ai";
import { getActivePokemon, getCachedMoves, getEffectiveTypes } from "./battle";

let wasmModule: {
  score_move: (power: number, move_type: number, atk_type1: number, atk_type2: number, def_type1: number, def_type2: number, accuracy: number, is_status: boolean) => number;
  score_matchup: (sw_t1: number, sw_t2: number, opp_t1: number, opp_t2: number, hp_ratio: number) => number;
  select_ai_action: (move_scores: Float64Array, num_moves: number, switch_scores: Float64Array, num_switches: number, difficulty: number, seed: number, is_fainted: boolean, can_mega: boolean, can_tera: boolean, should_tera: boolean, can_dmax: boolean, should_dmax: boolean) => Float64Array;
  determine_turn_order: (p1_pri: number, p2_pri: number, p1_spd: number, p2_spd: number, seed: number) => number;
  should_terastallize: (ai_t1: number, ai_t2: number, opp_t1: number, opp_t2: number, tera_type: number, hp_ratio: number, difficulty: number, seed: number) => number;
  should_dynamax: (hp_ratio: number, alive_count: number, difficulty: number, seed: number) => number;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // @ts-ignore — WASM pkg only exists locally after wasm-pack build
    const mod = await import("../../rust/pkmn-battle/pkg/pkmn_battle.js");
    await mod.default("/wasm/pkmn_battle_bg.wasm");
    wasmModule = {
      score_move: mod.score_move,
      score_matchup: mod.score_matchup,
      select_ai_action: mod.select_ai_action,
      determine_turn_order: mod.determine_turn_order,
      should_terastallize: mod.should_terastallize,
      should_dynamax: mod.should_dynamax,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-battle] WASM init failed, using JS fallback:", e);
    wasmFailed = true;
    return false;
  }
}

export async function ensureWasmReady(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm();
  }
  return wasmInitPromise;
}

export function isWasmActive(): boolean {
  return wasmModule !== null;
}

function getTypePair(bp: BattlePokemon): [number, number] {
  const types = bp.slot.pokemon.types;
  return [
    typeToIndex(types[0].type.name),
    types.length > 1 ? typeToIndex(types[1].type.name) : 255,
  ];
}

function difficultyToNum(d: DifficultyLevel | undefined): number {
  if (d === "easy") return 0;
  if (d === "hard") return 2;
  return 1; // normal
}

/**
 * Select AI action using WASM scoring if available, otherwise JS fallback.
 * Same signature as the original from ai.ts.
 */
export function selectAIAction(state: BattleState): BattleTurnAction {
  if (!wasmModule) {
    return selectAIAction_JS(state);
  }

  try {
    const aiTeam = state.player2;
    const aiActive = getActivePokemon(aiTeam);
    const opponentActive = getActivePokemon(state.player1);
    const difficulty = difficultyToNum(state.difficulty);

    // If fainted, need forced switch
    if (aiActive.isFainted) {
      const bestSwitch = getBestSwitchIn_WASM(state, "player2");
      return { type: "SWITCH", pokemonIndex: bestSwitch };
    }

    const moves = aiActive.slot.selectedMoves ?? [];
    if (moves.length === 0) {
      return { type: "MOVE", moveIndex: 0 };
    }

    // Score each move using WASM
    const [atkT1, atkT2] = getTypePair(aiActive);
    const [defT1, defT2] = getTypePair(opponentActive);

    const cachedMoves = getCachedMoves();
    let moveScores = new Float64Array(moves.length);
    for (let i = 0; i < moves.length; i++) {
      const moveData = cachedMoves.get(moves[i]);
      if (!moveData) {
        moveScores[i] = 40;
        continue;
      }

      let score = wasmModule.score_move(
        moveData.power ?? 0,
        typeToIndex(moveData.type.name),
        atkT1,
        atkT2,
        defT1,
        defT2,
        moveData.accuracy ?? 100,
        moveData.damage_class.name === "status",
      );

      // Hard difficulty: penalize moves absorbed by abilities
      if (difficulty === 2 && moveData) {
        const oppAbility = getAbilityHooks(opponentActive.slot.ability);
        if (oppAbility?.modifyIncomingDamage) {
          const result = oppAbility.modifyIncomingDamage({
            defender: opponentActive,
            attacker: aiActive,
            moveType: moveData.type.name as TypeName,
            movePower: moveData.power ?? 0,
          });
          if (result && result.multiplier === 0) {
            score = 0;
          }
        }
        // Priority move bonus when opponent is low
        if (moveData.priority && moveData.priority > 0 && opponentActive.currentHp / opponentActive.maxHp < 0.25) {
          score *= 1.5;
        }
      }

      moveScores[i] = score;
    }

    // Score switch-ins using WASM
    const aliveSwitchIns = aiTeam.pokemon
      .map((p, i) => ({ pokemon: p, index: i }))
      .filter((p) => !p.pokemon.isFainted && p.index !== aiTeam.activePokemonIndex);

    const switchScoresFlat = new Float64Array(aliveSwitchIns.length * 2);
    for (let i = 0; i < aliveSwitchIns.length; i++) {
      const sw = aliveSwitchIns[i];
      const [swT1, swT2] = getTypePair(sw.pokemon);
      const hpRatio = sw.pokemon.currentHp / sw.pokemon.maxHp;
      switchScoresFlat[i * 2] = sw.index;
      switchScoresFlat[i * 2 + 1] = wasmModule.score_matchup(swT1, swT2, defT1, defT2, hpRatio);
    }

    // Determine mechanic availability
    const mechanic = aiTeam.selectedMechanic;
    const mechanicUsed = aiTeam.pokemon.some(p => {
      if (mechanic === "mega") return p.hasMegaEvolved;
      if (mechanic === "tera") return p.hasTerastallized;
      if (mechanic === "dynamax") return p.hasDynamaxed;
      return false;
    });

    const canMega = !!(mechanic === "mega" && !mechanicUsed && !aiActive.hasMegaEvolved && aiActive.megaFormeData);
    const canTera = !!(mechanic === "tera" && !mechanicUsed && !aiActive.hasTerastallized && aiActive.teraType);
    const canDmax = !!(mechanic === "dynamax" && !mechanicUsed && !aiActive.hasDynamaxed);

    let shouldTera = false;
    if (canTera && aiActive.teraType) {
      const [aiT1, aiT2] = getTypePair(aiActive);
      const teraIdx = typeToIndex(aiActive.teraType);
      const hpRatio = aiActive.currentHp / aiActive.maxHp;
      shouldTera = wasmModule.should_terastallize(aiT1, aiT2, defT1, defT2, teraIdx, hpRatio, difficulty, randomSeed()) > 0;
    }

    let shouldDmax = false;
    if (canDmax) {
      const aliveCount = aiTeam.pokemon.filter(p => !p.isFainted).length;
      const hpRatio = aiActive.currentHp / aiActive.maxHp;
      shouldDmax = wasmModule.should_dynamax(hpRatio, aliveCount, difficulty, randomSeed()) > 0;
    }

    // Select action via WASM
    const result = wasmModule.select_ai_action(
      moveScores,
      moves.length,
      switchScoresFlat,
      aliveSwitchIns.length,
      difficulty,
      randomSeed(),
      false, // not fainted (handled above)
      canMega,
      canTera,
      shouldTera,
      canDmax,
      shouldDmax,
    );

    const actionType = result[0];
    const actionValue = result[1];

    switch (actionType) {
      case 0: return { type: "MOVE", moveIndex: actionValue };
      case 1: return { type: "SWITCH", pokemonIndex: actionValue };
      case 2: return { type: "MEGA_EVOLVE", moveIndex: actionValue };
      case 3: return { type: "TERASTALLIZE", moveIndex: actionValue };
      case 4: return { type: "DYNAMAX", moveIndex: actionValue };
      default: return { type: "MOVE", moveIndex: 0 };
    }
  } catch {
    return selectAIAction_JS(state);
  }
}

/**
 * Get best switch-in using WASM scoring. Falls back to JS.
 */
function getBestSwitchIn_WASM(state: BattleState, player: "player1" | "player2"): number {
  if (!wasmModule) return getBestSwitchIn_JS(state, player);

  const team = state[player];
  const opponent = player === "player1" ? state.player2 : state.player1;
  const opponentActive = getActivePokemon(opponent);
  const [oppT1, oppT2] = getTypePair(opponentActive);

  const alive = team.pokemon
    .map((p, i) => ({ pokemon: p, index: i }))
    .filter((p) => !p.pokemon.isFainted && p.index !== team.activePokemonIndex);

  if (alive.length === 0) return team.activePokemonIndex;

  let bestIndex = alive[0].index;
  let bestScore = -Infinity;

  for (const a of alive) {
    const [swT1, swT2] = getTypePair(a.pokemon);
    const hpRatio = a.pokemon.currentHp / a.pokemon.maxHp;
    const score = wasmModule.score_matchup(swT1, swT2, oppT1, oppT2, hpRatio);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = a.index;
    }
  }

  return bestIndex;
}

/**
 * Determine turn order using WASM.
 * Returns true if player 1 goes first.
 */
export function determineTurnOrder(
  p1Priority: number,
  p2Priority: number,
  p1Speed: number,
  p2Speed: number
): boolean {
  if (wasmModule) {
    try {
      return wasmModule.determine_turn_order(p1Priority, p2Priority, p1Speed, p2Speed, randomSeed()) > 0;
    } catch {
      // fall through
    }
  }
  // JS fallback
  if (p1Priority > p2Priority) return true;
  if (p2Priority > p1Priority) return false;
  if (p1Speed > p2Speed) return true;
  if (p2Speed > p1Speed) return false;
  return Math.random() < 0.5;
}

// Re-export team generation (stays in JS, uses PokeAPI fetch)
export { generateRandomTeam, getBestSwitchIn, generateScaledTeam } from "./ai";
