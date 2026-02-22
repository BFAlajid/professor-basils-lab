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
} from "@/types";
import { extractBaseStats, calculateDamage } from "./damage";
import { calculateAllStats, DEFAULT_EVS } from "./stats";
import { BattleMoveData } from "@/types";
import { initBattlePokemon, initStatStages, getStatStageMultiplier, cacheBattleMove, getCachedMoves } from "./battle";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { NATURES } from "@/data/natures";

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  const shuffled = [...allMoves].sort(() => Math.random() - 0.5);
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
  const bp = initBattlePokemon(slot);
  bp.isActive = true;

  // Scale HP based on level (wild Pokemon at lower levels should have less HP)
  // Use a simple level-based scaling factor
  const levelScale = Math.max(0.2, level / 50);
  const scaledHp = Math.max(10, Math.floor(bp.maxHp * levelScale));
  bp.currentHp = scaledHp;
  bp.maxHp = scaledHp;
  bp.originalMaxHp = scaledHp;

  return bp;
}

export async function preloadWildMoves(pokemon: Pokemon): Promise<void> {
  const moves = pokemon.moves.map((m) => m.move.name);
  const cached = getCachedMoves();

  const toFetch = moves.filter((m) => !cached.has(m));
  // Only fetch first 10 uncached moves to avoid too many requests
  const batch = toFetch.slice(0, 10);

  await Promise.all(
    batch.map(async (moveName) => {
      try {
        const res = await fetch(
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
      } catch {
        // skip
      }
    })
  );
}

export async function fetchCaptureRate(pokemonId: number): Promise<number> {
  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`
    );
    if (!res.ok) return 45; // default capture rate
    const data = await res.json();
    return data.capture_rate ?? 45;
  } catch {
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

  // --- Player attacks first (simplified: always goes first) ---
  const playerMoves = playerBp.slot.selectedMoves ?? [];
  const playerMoveName = playerMoves[playerMoveIndex] ?? playerMoves[0];

  if (playerMoveName) {
    const moveData = getMoveData(playerMoveName);
    if (moveData) {
      // Accuracy check
      const accuracy = moveData.accuracy ?? 100;
      const accRoll = Math.random() * 100;

      if (accRoll < accuracy) {
        if (moveData.power && moveData.damage_class.name !== "status") {
          const isCritical = Math.random() < 0.0625;
          const attackerTypes = playerBp.slot.pokemon.types.map((t) => t.type.name);
          const defenderTypes = wildBp.slot.pokemon.types.map((t) => t.type.name);

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

  // Check if wild fainted
  if (newWildHp <= 0) {
    log.push("The wild Pokemon fainted!");
    return {
      newWildHp: 0,
      newWildStatus,
      newPlayerHp,
      newPlayerStatus,
      wildFainted: true,
      playerFainted: false,
      log,
    };
  }

  // --- Wild Pokemon attacks ---
  const wildMoves = wildBp.slot.selectedMoves ?? [];
  if (wildMoves.length > 0) {
    const wildMoveName = randomChoice(wildMoves);
    const wildMoveData = getMoveData(wildMoveName);

    if (wildMoveData) {
      const accuracy = wildMoveData.accuracy ?? 100;
      const accRoll = Math.random() * 100;

      if (accRoll < accuracy) {
        if (wildMoveData.power && wildMoveData.damage_class.name !== "status") {
          const isCritical = Math.random() < 0.0625;

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

  // End of turn status damage
  if (newWildStatus === "burn" || newWildStatus === "poison") {
    const statusDmg = Math.max(1, Math.floor(wildBp.maxHp / 8));
    newWildHp = Math.max(0, newWildHp - statusDmg);
    log.push(`The wild Pokemon took ${statusDmg} damage from ${newWildStatus}!`);
  }
  if (newPlayerStatus === "burn" || newPlayerStatus === "poison") {
    const statusDmg = Math.max(1, Math.floor(playerBp.maxHp / 8));
    newPlayerHp = Math.max(0, newPlayerHp - statusDmg);
    log.push(`Your Pokemon took ${statusDmg} damage from ${newPlayerStatus}!`);
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
