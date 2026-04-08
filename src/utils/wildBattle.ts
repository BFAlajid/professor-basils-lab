import { silentWarn } from "@/utils/silentWarn";
import {
  Pokemon,
  TeamSlot,
  BattlePokemon,
  BattleLogEntry,
  StatusCondition,
  Nature,
  IVSpread,
  Move,
  TypeName,
  BattleMoveData,
} from "@/types";
import { extractBaseStats, calculateDamage } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { initBattlePokemon, initStatStages, getStatStageMultiplier, cacheBattleMove, getCachedMoves } from "./battle";
import { getCritRate } from "./battleHelpers";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { NATURES } from "@/data/natures";
import { randomInt, randomChoice, shuffleArray } from "./random";
import { fetchWithTimeout } from "./pokeApiClient";

const WILD_CONFIG = {
  MIN_HP_SCALE: 0.2,
  MAX_LEVEL_DIVISOR: 50,
  MOVE_BATCH_SIZE: 10,
} as const;

export function generateRandomIVs(): IVSpread {
  return {
    hp: randomInt(0, 31),
    attack: randomInt(0, 31),
    defense: randomInt(0, 31),
    spAtk: randomInt(0, 31),
    spDef: randomInt(0, 31),
    speed: randomInt(0, 31),
  };
}

export function createWildTeamSlot(pokemon: Pokemon, level: number): TeamSlot {
  const nature = randomChoice(NATURES);
  const ivs = generateRandomIVs();

  // Pick 4 random moves from the Pokemon's movepool
  const allMoves = pokemon.moves.map((m) => m.move.name);
  const shuffled = shuffleArray(allMoves);
  const selectedMoves = shuffled.slice(0, Math.min(4, shuffled.length));

  const ability = pokemon.abilities?.[0]?.ability.name ?? null;

  return {
    pokemon,
    position: 0,
    nature,
    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    ivs,
    ability,
    heldItem: null,
    selectedMoves,
  };
}

export function createWildBattlePokemon(pokemon: Pokemon, level: number): BattlePokemon {
  const slot = createWildTeamSlot(pokemon, level);
  const base = initBattlePokemon(slot);

  // Scale HP based on level (wild Pokemon at lower levels should have less HP)
  // Use a simple level-based scaling factor
  const levelScale = Math.max(WILD_CONFIG.MIN_HP_SCALE, level / WILD_CONFIG.MAX_LEVEL_DIVISOR);
  const scaledHp = Math.max(10, Math.floor(base.maxHp * levelScale));

  return {
    ...base,
    isActive: true,
    currentHp: scaledHp,
    maxHp: scaledHp,
    originalMaxHp: scaledHp,
  };
}

export async function preloadWildMoves(pokemon: Pokemon): Promise<void> {
  const moves = pokemon.moves.map((m) => m.move.name);
  const cached = getCachedMoves();

  const toFetch = moves.filter((m) => !cached.has(m));
  // Only fetch first 10 uncached moves to avoid too many requests
  const batch = toFetch.slice(0, WILD_CONFIG.MOVE_BATCH_SIZE);

  await Promise.all(
    batch.map(async (moveName) => {
      try {
        const res = await fetchWithTimeout(
          `https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`
        );
        if (!res.ok) return;
        const data = await res.json();
        cacheBattleMove(moveName, {
          name: data.name,
          power: data.power,
          accuracy: data.accuracy,
          pp: data.pp,
          type: data.type,
          damage_class: data.damage_class,
          priority: data.priority ?? 0,
          meta: data.meta
            ? {
                ailment: data.meta.ailment,
                ailment_chance: data.meta.ailment_chance,
                stat_chance: data.meta.stat_chance,
                min_hits: data.meta.min_hits,
                max_hits: data.meta.max_hits,
                drain: data.meta.drain,
              }
            : undefined,
        });
      } catch (e) {
        silentWarn("fetchWildMoves", e);
      }
    })
  );
}

export async function fetchCaptureRate(pokemonId: number): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`
    );
    if (!res.ok) return 45; // default capture rate
    const data = await res.json();
    return data.capture_rate ?? 45;
  } catch (e) {
    silentWarn("fetchCaptureRate", e);
    return 45;
  }
}

function getMoveData(moveName: string): Move | null {
  const cached = getCachedMoves().get(moveName);
  if (!cached) return null;
  return {
    id: 0,
    name: cached.name,
    power: cached.power,
    accuracy: cached.accuracy,
    pp: cached.pp,
    priority: cached.priority ?? 0,
    type: { name: cached.type.name as TypeName },
    damage_class: cached.damage_class,
    meta: cached.meta,
  };
}

export interface WildTurnResult {
  newWildHp: number;
  newWildStatus: StatusCondition;
  newPlayerHp: number;
  newPlayerStatus: StatusCondition;
  wildFainted: boolean;
  playerFainted: boolean;
  log: string[];
}

function getEffectiveSpeed(bp: BattlePokemon): number {
  const baseStats = extractBaseStats(bp.slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    bp.slot.ivs ?? DEFAULT_IVS,
    bp.slot.evs ?? DEFAULT_EVS,
    bp.slot.nature ?? null
  );
  return Math.floor(calc.speed * getStatStageMultiplier(bp.statStages.speed));
}

function executePlayerAttack(
  playerBp: BattlePokemon,
  wildBp: BattlePokemon,
  playerMoveIndex: number,
  log: string[],
  currentWildHp: number,
  currentWildStatus: StatusCondition,
): { hp: number; status: StatusCondition } {
  let newWildHp = currentWildHp;
  let newWildStatus = currentWildStatus;

  const playerMoves = playerBp.slot.selectedMoves ?? [];
  const playerMoveName = playerMoves[playerMoveIndex] ?? playerMoves[0];

  if (playerMoveName) {
    const moveData = getMoveData(playerMoveName);
    if (moveData) {
      const accuracy = moveData.accuracy ?? 100;
      const accRoll = Math.random() * 100;

      if (accRoll < accuracy) {
        if (moveData.power && moveData.damage_class.name !== "status") {
          const isCritical = Math.random() < getCritRate(playerBp, playerMoveName);

          const result = calculateDamage(
            playerBp.slot.pokemon,
            wildBp.slot.pokemon,
            moveData,
            {
              attackerEvs: playerBp.slot.evs,
              attackerIvs: playerBp.slot.ivs,
              attackerNature: playerBp.slot.nature,
              attackerItem: playerBp.slot.heldItem,
              attackerStatus: playerBp.status,
              defenderEvs: wildBp.slot.evs,
              defenderIvs: wildBp.slot.ivs,
              defenderNature: wildBp.slot.nature,
              isCritical,
              attackerStatStage: playerBp.statStages[moveData.damage_class.name === "physical" ? "attack" : "spAtk"],
              defenderStatStage: wildBp.statStages[moveData.damage_class.name === "physical" ? "defense" : "spDef"],
            }
          );

          const damage = randomInt(result.min, result.max);
          newWildHp = Math.max(0, newWildHp - damage);

          const displayName = playerMoveName.replace(/-/g, " ");
          log.push(`Your Pokemon used ${displayName}! Dealt ${damage} damage.`);
          if (isCritical) log.push("A critical hit!");
          if (result.effectiveness > 1) log.push("It's super effective!");
          if (result.effectiveness < 1 && result.effectiveness > 0) log.push("It's not very effective...");
          if (result.effectiveness === 0) log.push("It had no effect!");

          // Status effect from move
          if (moveData.meta?.ailment?.name && moveData.meta.ailment.name !== "none" && !newWildStatus) {
            const chance = moveData.meta.ailment_chance ?? 0;
            if (chance > 0 && Math.random() * 100 < chance) {
              const ailment = moveData.meta.ailment.name;
              if (ailment === "paralysis") newWildStatus = "paralyze";
              else if (ailment === "burn") newWildStatus = "burn";
              else if (ailment === "poison") newWildStatus = "poison";
              else if (ailment === "sleep") newWildStatus = "sleep";
              else if (ailment === "freeze") newWildStatus = "freeze";
              if (newWildStatus) {
                log.push(`The wild Pokemon was ${newWildStatus === "paralyze" ? "paralyzed" : newWildStatus === "burn" ? "burned" : newWildStatus === "poison" ? "poisoned" : newWildStatus === "sleep" ? "put to sleep" : "frozen"}!`);
              }
            }
          }
        } else {
          const displayName = playerMoveName.replace(/-/g, " ");
          log.push(`Your Pokemon used ${displayName}!`);
        }
      } else {
        const displayName = playerMoveName.replace(/-/g, " ");
        log.push(`Your Pokemon used ${displayName} but it missed!`);
      }
    }
  }

  return { hp: newWildHp, status: newWildStatus };
}

function executeWildAttack(
  wildBp: BattlePokemon,
  playerBp: BattlePokemon,
  log: string[],
  currentPlayerHp: number,
  currentPlayerStatus: StatusCondition,
): { hp: number; status: StatusCondition } {
  let newPlayerHp = currentPlayerHp;
  let newPlayerStatus = currentPlayerStatus;

  const wildMoves = wildBp.slot.selectedMoves ?? [];
  if (wildMoves.length > 0) {
    const wildMoveName = randomChoice(wildMoves);
    const wildMoveData = getMoveData(wildMoveName);

    if (wildMoveData) {
      const accuracy = wildMoveData.accuracy ?? 100;
      const accRoll = Math.random() * 100;

      if (accRoll < accuracy) {
        if (wildMoveData.power && wildMoveData.damage_class.name !== "status") {
          const isCritical = Math.random() < getCritRate(wildBp, wildMoveName);

          const result = calculateDamage(
            wildBp.slot.pokemon,
            playerBp.slot.pokemon,
            wildMoveData,
            {
              attackerEvs: wildBp.slot.evs,
              attackerIvs: wildBp.slot.ivs,
              attackerNature: wildBp.slot.nature,
              defenderEvs: playerBp.slot.evs,
              defenderIvs: playerBp.slot.ivs,
              defenderNature: playerBp.slot.nature,
              defenderItem: playerBp.slot.heldItem,
              isCritical,
            }
          );

          const damage = randomInt(result.min, result.max);
          newPlayerHp = Math.max(0, newPlayerHp - damage);

          const displayName = wildMoveName.replace(/-/g, " ");
          log.push(`Wild Pokemon used ${displayName}! Dealt ${damage} damage.`);
          if (isCritical) log.push("A critical hit!");
          if (result.effectiveness > 1) log.push("It's super effective!");
          if (result.effectiveness < 1 && result.effectiveness > 0) log.push("It's not very effective...");

          // Status effect from wild move
          if (wildMoveData.meta?.ailment?.name && wildMoveData.meta.ailment.name !== "none" && !newPlayerStatus) {
            const chance = wildMoveData.meta.ailment_chance ?? 0;
            if (chance > 0 && Math.random() * 100 < chance) {
              const ailment = wildMoveData.meta.ailment.name;
              if (ailment === "paralysis") newPlayerStatus = "paralyze";
              else if (ailment === "burn") newPlayerStatus = "burn";
              else if (ailment === "poison") newPlayerStatus = "poison";
              else if (ailment === "sleep") newPlayerStatus = "sleep";
              else if (ailment === "freeze") newPlayerStatus = "freeze";
              if (newPlayerStatus) {
                log.push(`Your Pokemon was ${newPlayerStatus === "paralyze" ? "paralyzed" : newPlayerStatus === "burn" ? "burned" : newPlayerStatus === "poison" ? "poisoned" : newPlayerStatus === "sleep" ? "put to sleep" : "frozen"}!`);
              }
            }
          }
        } else {
          const displayName = wildMoveName.replace(/-/g, " ");
          log.push(`Wild Pokemon used ${displayName}!`);
        }
      } else {
        const displayName = wildMoveName.replace(/-/g, " ");
        log.push(`Wild Pokemon used ${displayName} but it missed!`);
      }
    }
  }

  return { hp: newPlayerHp, status: newPlayerStatus };
}

export function executeWildTurn(
  playerBp: BattlePokemon,
  wildBp: BattlePokemon,
  playerMoveIndex: number
): WildTurnResult {
  const log: string[] = [];
  let newWildHp = wildBp.currentHp;
  let newWildStatus = wildBp.status;
  let newPlayerHp = playerBp.currentHp;
  let newPlayerStatus = playerBp.status;

  // Determine turn order by speed (ties: player goes first)
  const playerSpeed = getEffectiveSpeed(playerBp);
  const wildSpeed = getEffectiveSpeed(wildBp);
  const playerGoesFirst = playerSpeed >= wildSpeed;

  if (playerGoesFirst) {
    // Player attacks first
    const pResult = executePlayerAttack(playerBp, wildBp, playerMoveIndex, log, newWildHp, newWildStatus);
    newWildHp = pResult.hp;
    newWildStatus = pResult.status;

    if (newWildHp <= 0) {
      log.push("The wild Pokemon fainted!");
      return { newWildHp: 0, newWildStatus, newPlayerHp, newPlayerStatus, wildFainted: true, playerFainted: false, log };
    }

    // Wild attacks second
    const wResult = executeWildAttack(wildBp, playerBp, log, newPlayerHp, newPlayerStatus);
    newPlayerHp = wResult.hp;
    newPlayerStatus = wResult.status;
  } else {
    // Wild attacks first (it's faster)
    const wResult = executeWildAttack(wildBp, playerBp, log, newPlayerHp, newPlayerStatus);
    newPlayerHp = wResult.hp;
    newPlayerStatus = wResult.status;

    if (newPlayerHp <= 0) {
      log.push("Your Pokemon fainted!");
      return { newWildHp, newWildStatus, newPlayerHp: 0, newPlayerStatus, wildFainted: false, playerFainted: true, log };
    }

    // Player attacks second
    const pResult = executePlayerAttack(playerBp, wildBp, playerMoveIndex, log, newWildHp, newWildStatus);
    newWildHp = pResult.hp;
    newWildStatus = pResult.status;

    if (newWildHp <= 0) {
      log.push("The wild Pokemon fainted!");
      return { newWildHp: 0, newWildStatus, newPlayerHp, newPlayerStatus, wildFainted: true, playerFainted: false, log };
    }
  }

  // End of turn status damage (burn, poison, toxic all deal 1/8 in wild battles)
  if (newWildStatus === "burn" || newWildStatus === "poison" || newWildStatus === "toxic") {
    const statusDmg = Math.max(1, Math.floor(wildBp.maxHp / 8));
    newWildHp = Math.max(0, newWildHp - statusDmg);
    const statusLabel = newWildStatus === "toxic" ? "poison" : newWildStatus;
    log.push(`The wild Pokemon took ${statusDmg} damage from ${statusLabel}!`);
  }
  if (newPlayerStatus === "burn" || newPlayerStatus === "poison" || newPlayerStatus === "toxic") {
    const statusDmg = Math.max(1, Math.floor(playerBp.maxHp / 8));
    newPlayerHp = Math.max(0, newPlayerHp - statusDmg);
    const statusLabel = newPlayerStatus === "toxic" ? "poison" : newPlayerStatus;
    log.push(`Your Pokemon took ${statusDmg} damage from ${statusLabel}!`);
  }

  return {
    newWildHp,
    newWildStatus,
    newPlayerHp,
    newPlayerStatus,
    wildFainted: newWildHp <= 0,
    playerFainted: newPlayerHp <= 0,
    log,
  };
}
