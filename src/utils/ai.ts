import { BattleState, BattleTurnAction, TeamSlot, Pokemon, BattlePokemon, BattleTeam, GenerationalMechanic, TypeName, DifficultyLevel } from "@/types";
import { extractBaseStats, calculateDamage } from "./damage";
import { getActivePokemon, getCachedMoves, getEffectiveTypes } from "./battle";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { getAbilityHooks } from "@/data/abilities";
import { NATURES } from "@/data/natures";
import { DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { isMegaStone, MEGA_STONES } from "@/data/megaStones";

// Curated list of competitive Pokemon IDs (mix of OU/UU staples)
const COMPETITIVE_POKEMON_IDS = [
  6, 9, 25, 34, 38, 59, 65, 68, 76, 94,     // Gen 1
  130, 131, 143, 149, 150,                     // Gen 1
  196, 197, 212, 214, 230, 232, 248,           // Gen 2
  254, 257, 260, 282, 289, 306, 330, 373, 376, // Gen 3
  445, 448, 462, 466, 467, 472, 473, 479,      // Gen 4
  530, 553, 560, 571, 579, 598, 609, 612, 635, // Gen 5
  658, 663, 681, 700, 706, 715,                // Gen 6
  778, 785, 786, 788,                           // Gen 7
  812, 815, 818, 823, 849, 858, 876, 887,      // Gen 8
];

// Common competitive EV spreads
const EV_SPREADS = [
  { hp: 252, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 0 },    // Physical Bulky Attacker
  { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 },    // Physical Sweeper
  { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },    // Special Sweeper
  { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },    // Physical Wall
  { hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 },    // Special Wall
  { hp: 252, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 0 },    // Special Bulky Attacker
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a team scaled to the given floor/difficulty for Battle Tower
export async function generateScaledTeam(floor: number): Promise<TeamSlot[]> {
  // Scale team size and difficulty by floor
  const teamSize = floor < 8 ? Math.min(3 + Math.floor(floor / 2), 6) : 6;
  const difficulty: DifficultyLevel = floor < 8 ? "easy" : floor < 15 ? "normal" : "hard";

  // Higher floors pick from better Pokemon (bias toward end of list = stronger)
  const pool = floor >= 15
    ? COMPETITIVE_POKEMON_IDS
    : floor >= 8
      ? COMPETITIVE_POKEMON_IDS.slice(0, Math.floor(COMPETITIVE_POKEMON_IDS.length * 0.75))
      : COMPETITIVE_POKEMON_IDS.slice(0, Math.floor(COMPETITIVE_POKEMON_IDS.length * 0.5));

  const selectedIds = shuffleArray(pool).slice(0, teamSize);

  const pokemonList = await Promise.all(
    selectedIds.map(async (id) => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) return null;
        return (await res.json()) as Pokemon;
      } catch {
        return null;
      }
    })
  );

  return pokemonList
    .filter((p): p is Pokemon => p !== null)
    .map((pokemon, i) => {
      const baseStats = extractBaseStats(pokemon);
      const isPhysical = baseStats.attack > baseStats.spAtk;

      // Harder floors get better natures
      const naturePool = difficulty === "easy"
        ? NATURES.filter(n => !n.increased && !n.decreased) // Neutral natures for easy
        : isPhysical
          ? NATURES.filter(n => n.name === "adamant" || n.name === "jolly")
          : NATURES.filter(n => n.name === "modest" || n.name === "timid");
      const nature = randomChoice(naturePool.length > 0 ? naturePool : NATURES);

      // EVs scale with difficulty
      const evs = difficulty === "easy"
        ? { hp: 128, attack: 128, defense: 64, spAtk: 64, spDef: 64, speed: 64 }
        : isPhysical
          ? randomChoice(EV_SPREADS.slice(0, 2))
          : randomChoice(EV_SPREADS.slice(2, 4));

      // IVs scale with difficulty
      const ivBase = difficulty === "easy" ? 15 : difficulty === "normal" ? 25 : 31;
      const ivs = {
        hp: ivBase, attack: ivBase, defense: ivBase,
        spAtk: ivBase, spDef: ivBase, speed: ivBase,
      };

      const allMoves = pokemon.moves.map(m => m.move.name);
      const shuffledMoves = shuffleArray(allMoves);
      const selectedMoves = shuffledMoves.slice(0, Math.min(4, shuffledMoves.length));

      const pokemonTypes = pokemon.types.map((t: any) => t.type.name) as TypeName[];
      const teraType = randomChoice(pokemonTypes);

      const megaStone = MEGA_STONES.find(s => s.megaTarget === pokemon.name);
      const heldItem = megaStone ? megaStone.name : null;

      return {
        pokemon,
        position: i,
        nature,
        evs,
        ivs,
        ability: pokemon.abilities?.[0]?.ability.name ?? null,
        heldItem,
        selectedMoves,
        teraConfig: { teraType },
      };
    });
}

export async function generateRandomTeam(): Promise<TeamSlot[]> {
  const selectedIds = shuffleArray(COMPETITIVE_POKEMON_IDS).slice(0, 6);

  const pokemonList = await Promise.all(
    selectedIds.map(async (id) => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) return null;
        return (await res.json()) as Pokemon;
      } catch {
        return null;
      }
    })
  );

  return pokemonList
    .filter((p): p is Pokemon => p !== null)
    .map((pokemon, i) => {
      const baseStats = extractBaseStats(pokemon);
      const isPhysical = baseStats.attack > baseStats.spAtk;

      // Pick a reasonable nature
      const naturePool = isPhysical
        ? NATURES.filter((n) => n.name === "adamant" || n.name === "jolly")
        : NATURES.filter((n) => n.name === "modest" || n.name === "timid");
      const nature = randomChoice(naturePool);

      // Pick EVs
      const evs = isPhysical
        ? randomChoice(EV_SPREADS.slice(0, 2))
        : randomChoice(EV_SPREADS.slice(2, 4));

      // Pick 4 moves (prefer damaging moves, up to 1 status move)
      const allMoves = pokemon.moves.map((m) => m.move.name);
      const shuffledMoves = shuffleArray(allMoves);
      const selectedMoves = shuffledMoves.slice(0, Math.min(4, shuffledMoves.length));

      // Assign a tera type (usually one of the Pokemon's own types for good STAB)
      const pokemonTypes = pokemon.types.map((t: any) => t.type.name) as TypeName[];
      const teraType = randomChoice(pokemonTypes);

      // Check if this Pokemon can Mega Evolve and assign stone
      const megaStone = MEGA_STONES.find(s => s.megaTarget === pokemon.name);
      const heldItem = megaStone ? megaStone.name : null;

      return {
        pokemon,
        position: i,
        nature,
        evs,
        ivs: { ...DEFAULT_IVS },
        ability: pokemon.abilities?.[0]?.ability.name ?? null,
        heldItem,
        selectedMoves,
        teraConfig: { teraType },
      };
    });
}

export function selectAIAction(state: BattleState): BattleTurnAction {
  const aiTeam = state.player2;
  const aiActive = getActivePokemon(aiTeam);
  const opponentActive = getActivePokemon(state.player1);
  const difficulty: DifficultyLevel = state.difficulty ?? "normal";

  if (aiActive.isFainted) {
    // Pick best switch-in
    const bestSwitch = getBestSwitchIn(state, "player2");
    return { type: "SWITCH", pokemonIndex: bestSwitch };
  }

  const moves = aiActive.slot.selectedMoves ?? [];
  if (moves.length === 0) {
    return { type: "MOVE", moveIndex: 0 };
  }

  // Easy: 30% chance to pick a random move
  if (difficulty === "easy" && Math.random() < 0.3) {
    const randomIdx = Math.floor(Math.random() * moves.length);
    return { type: "MOVE", moveIndex: randomIdx };
  }

  // Score each move
  const moveScores = moves.map((moveName, index) => {
    let score = scoreMoveAgainstTarget(aiActive, opponentActive, moveName);

    // Hard: penalize moves that hit into immunity abilities
    if (difficulty === "hard") {
      const cachedMoves = getCachedMoves();
      const moveData = cachedMoves.get(moveName);
      if (moveData) {
        const oppAbility = getAbilityHooks(opponentActive.slot.ability);
        if (oppAbility?.modifyIncomingDamage) {
          const result = oppAbility.modifyIncomingDamage({
            defender: opponentActive,
            attacker: aiActive,
            moveType: moveData.type.name as TypeName,
            movePower: moveData.power ?? 0,
          });
          if (result && result.multiplier === 0) {
            score = 0; // Don't use moves that get absorbed/nullified
          }
        }
        // Boost priority move score when opponent is low HP
        if (moveData.priority && moveData.priority > 0 && opponentActive.currentHp / opponentActive.maxHp < 0.25) {
          score *= 1.5;
        }
      }
    }

    return { index, score };
  });

  // Consider switching: if best move score is very low, consider switch
  const bestMoveScore = Math.max(...moveScores.map((m) => m.score));

  const aliveSwitchIns = aiTeam.pokemon
    .map((p, i) => ({ pokemon: p, index: i }))
    .filter((p) => !p.pokemon.isFainted && p.index !== aiTeam.activePokemonIndex);

  // Switch threshold: harder AI is more willing to switch
  const switchThreshold = difficulty === "hard" ? 40 : 30;
  if (bestMoveScore < switchThreshold && aliveSwitchIns.length > 0) {
    const switchScores = aliveSwitchIns.map((s) => ({
      index: s.index,
      score: scoreMatchup(s.pokemon, opponentActive),
    }));
    const bestSwitch = switchScores.sort((a, b) => b.score - a.score)[0];

    const switchMultiplier = difficulty === "hard" ? 1.3 : 1.5;
    if (bestSwitch.score > bestMoveScore * switchMultiplier) {
      return { type: "SWITCH", pokemonIndex: bestSwitch.index };
    }
  }

  // Pick best move
  const bestMove = moveScores.sort((a, b) => b.score - a.score)[0];
  const bestMoveIndex = bestMove.index;

  // === MECHANIC DECISION LAYER ===
  const mechanic = aiTeam.selectedMechanic;
  const mechanicUsed = aiTeam.pokemon.some(p => {
    if (mechanic === "mega") return p.hasMegaEvolved;
    if (mechanic === "tera") return p.hasTerastallized;
    if (mechanic === "dynamax") return p.hasDynamaxed;
    return false;
  });

  if (mechanic && !mechanicUsed) {
    // Mega Evolution: always mega evolve on first opportunity
    if (mechanic === "mega" && !aiActive.hasMegaEvolved && aiActive.megaFormeData) {
      return { type: "MEGA_EVOLVE", moveIndex: bestMoveIndex };
    }

    // Terastallization: use when type matchup is bad or for offensive boost
    if (mechanic === "tera" && !aiActive.hasTerastallized && aiActive.teraType) {
      const shouldTera = shouldTerastallize(aiActive, opponentActive, difficulty);
      if (shouldTera) {
        return { type: "TERASTALLIZE", moveIndex: bestMoveIndex };
      }
    }

    // Dynamax: use when it's the last Pokemon or for big damage
    if (mechanic === "dynamax" && !aiActive.hasDynamaxed) {
      const shouldDmax = shouldDynamax(aiActive, aiTeam, difficulty);
      if (shouldDmax) {
        return { type: "DYNAMAX", moveIndex: bestMoveIndex };
      }
    }
  }

  return { type: "MOVE", moveIndex: bestMoveIndex };
}

function scoreMoveAgainstTarget(
  attacker: import("@/types").BattlePokemon,
  defender: import("@/types").BattlePokemon,
  moveName: string
): number {
  const cachedMoves = getCachedMoves();
  const moveData = cachedMoves.get(moveName);

  if (!moveData || moveData.damage_class.name === "status") {
    // Status moves get a moderate base score
    return 40;
  }

  if (!moveData.power) return 10;

  const attackerTypes = attacker.slot.pokemon.types.map((t) => t.type.name as TypeName);
  const defenderTypes = defender.slot.pokemon.types.map((t) => t.type.name as TypeName);
  const moveType = moveData.type.name as TypeName;

  const stab = attackerTypes.includes(moveType) ? 1.5 : 1;
  const typeEff = getDefensiveMultiplier(moveType, defenderTypes);
  const accuracy = (moveData.accuracy ?? 100) / 100;

  return moveData.power * stab * typeEff * accuracy;
}

function scoreMatchup(
  switchIn: import("@/types").BattlePokemon,
  opponent: import("@/types").BattlePokemon
): number {
  const switchTypes = switchIn.slot.pokemon.types.map((t) => t.type.name as TypeName);
  const opponentTypes = opponent.slot.pokemon.types.map((t) => t.type.name as TypeName);

  // Score based on defensive matchup (how well does the switch-in resist the opponent's types?)
  let score = 50;
  for (const oppType of opponentTypes) {
    const mult = getDefensiveMultiplier(oppType, switchTypes);
    if (mult < 1) score += 20; // resist
    if (mult === 0) score += 40; // immune
    if (mult > 1) score -= 20; // weak
  }

  // Bonus for offensive matchup
  for (const myType of switchTypes) {
    const mult = getDefensiveMultiplier(myType, opponentTypes);
    if (mult > 1) score += 15;
  }

  // HP factor — prefer healthy Pokemon
  score *= (switchIn.currentHp / switchIn.maxHp);

  return score;
}

export function getBestSwitchIn(state: BattleState, player: "player1" | "player2"): number {
  const team = state[player];
  const opponent = player === "player1" ? state.player2 : state.player1;
  const opponentActive = getActivePokemon(opponent);

  const alive = team.pokemon
    .map((p, i) => ({ pokemon: p, index: i }))
    .filter((p) => !p.pokemon.isFainted && p.index !== team.activePokemonIndex);

  if (alive.length === 0) return team.activePokemonIndex;

  const scored = alive.map((a) => ({
    index: a.index,
    score: scoreMatchup(a.pokemon, opponentActive),
  }));

  return scored.sort((a, b) => b.score - a.score)[0].index;
}

function shouldTerastallize(ai: BattlePokemon, opponent: BattlePokemon, difficulty: DifficultyLevel = "normal"): boolean {
  if (!ai.teraType) return false;
  const aiTypes = ai.slot.pokemon.types.map(t => t.type.name as TypeName);
  const oppTypes = opponent.slot.pokemon.types.map(t => t.type.name as TypeName);

  // Tera if we're in a bad defensive matchup
  for (const oppType of oppTypes) {
    const mult = getDefensiveMultiplier(oppType, aiTypes);
    if (mult > 1) {
      // Check if tera type would fix this
      const teraMult = getDefensiveMultiplier(oppType, [ai.teraType as TypeName]);
      if (teraMult <= 1) return true;
    }
  }

  // Hard: only Tera when it provides a clear benefit, save for key moments
  if (difficulty === "hard") {
    // Tera if it provides STAB on our best move
    if (ai.currentHp / ai.maxHp > 0.5) {
      return Math.random() < 0.25; // More conservative
    }
    return false;
  }

  // Easy: rarely Tera
  if (difficulty === "easy") {
    return Math.random() < 0.15;
  }

  // Normal: Tera if HP is above 60%
  if (ai.currentHp / ai.maxHp > 0.6) {
    return Math.random() < 0.4;
  }

  return false;
}

function shouldDynamax(ai: BattlePokemon, team: BattleTeam, difficulty: DifficultyLevel = "normal"): boolean {
  const aliveCount = team.pokemon.filter(p => !p.isFainted).length;

  // Always Dynamax if it's the last Pokemon
  if (aliveCount <= 1) return true;

  // Hard: Dynamax strategically — when HP is high and can get key KOs
  if (difficulty === "hard") {
    if (ai.currentHp / ai.maxHp > 0.8) {
      return Math.random() < 0.6;
    }
    return false;
  }

  // Easy: rarely Dynamax early
  if (difficulty === "easy") {
    if (aliveCount <= 2) return Math.random() < 0.5;
    return Math.random() < 0.15;
  }

  // Normal: Dynamax if HP is high
  if (ai.currentHp / ai.maxHp > 0.7) {
    return Math.random() < 0.5;
  }

  return false;
}
