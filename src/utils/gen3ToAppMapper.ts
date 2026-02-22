/**
 * Maps Gen 3 Pokemon data to the app's PCBoxPokemon interface
 */

import type { Nature, BallType, PCBoxPokemon } from "@/types";
import type { Gen3Pokemon } from "./gen3PokemonDecryptor";
import { fetchPokemon } from "@/hooks/usePokemon";

/**
 * Gen 3 Nature order (PID % 25)
 * This is the official order from the games
 */
const NATURE_ORDER: Nature[] = [
  { name: "hardy", increased: null, decreased: null },           // 0
  { name: "lonely", increased: "attack", decreased: "defense" }, // 1
  { name: "brave", increased: "attack", decreased: "speed" },    // 2
  { name: "adamant", increased: "attack", decreased: "spAtk" },  // 3
  { name: "naughty", increased: "attack", decreased: "spDef" },  // 4
  { name: "bold", increased: "defense", decreased: "attack" },   // 5
  { name: "docile", increased: null, decreased: null },          // 6
  { name: "relaxed", increased: "defense", decreased: "speed" }, // 7
  { name: "impish", increased: "defense", decreased: "spAtk" },  // 8
  { name: "lax", increased: "defense", decreased: "spDef" },     // 9
  { name: "timid", increased: "speed", decreased: "attack" },    // 10
  { name: "hasty", increased: "speed", decreased: "defense" },   // 11
  { name: "serious", increased: null, decreased: null },         // 12
  { name: "jolly", increased: "speed", decreased: "spAtk" },     // 13
  { name: "naive", increased: "speed", decreased: "spDef" },     // 14
  { name: "modest", increased: "spAtk", decreased: "attack" },   // 15
  { name: "mild", increased: "spAtk", decreased: "defense" },    // 16
  { name: "quiet", increased: "spAtk", decreased: "speed" },     // 17
  { name: "bashful", increased: null, decreased: null },         // 18
  { name: "rash", increased: "spAtk", decreased: "spDef" },      // 19
  { name: "calm", increased: "spDef", decreased: "attack" },     // 20
  { name: "gentle", increased: "spDef", decreased: "defense" },  // 21
  { name: "sassy", increased: "spDef", decreased: "speed" },     // 22
  { name: "careful", increased: "spDef", decreased: "spAtk" },   // 23
  { name: "quirky", increased: null, decreased: null },          // 24
];

/**
 * Gen 3 ball ID → app BallType mapping
 */
const GEN3_BALL_MAP: Record<number, BallType> = {
  1: "master-ball",
  2: "ultra-ball",
  3: "great-ball",
  4: "poke-ball",
  5: "poke-ball",    // Safari Ball → fallback
  6: "net-ball",
  7: "dive-ball",
  8: "nest-ball",
  9: "repeat-ball",
  10: "timer-ball",
  11: "luxury-ball",
  12: "premier-ball",
};

function mapBallType(gen3BallId: number): BallType {
  return GEN3_BALL_MAP[gen3BallId] ?? "poke-ball";
}

function getNatureFromPID(pid: number): Nature {
  return NATURE_ORDER[pid % 25];
}

/**
 * Map a single Gen 3 Pokemon to the app's PCBoxPokemon format
 * Fetches data from PokeAPI for the sprite and ability info
 */
export async function mapGen3ToAppPokemon(gen3: Gen3Pokemon): Promise<PCBoxPokemon> {
  const pokemon = await fetchPokemon(gen3.species);
  const nature = getNatureFromPID(gen3.pid);

  // Determine ability from ability slot
  const abilityName = pokemon.abilities?.[gen3.abilitySlot]?.ability.name ?? "unknown";

  return {
    pokemon,
    nickname: gen3.nickname || undefined,
    caughtWith: mapBallType(gen3.pokeball),
    caughtInArea: "GBA Import",
    caughtDate: new Date().toISOString(),
    level: gen3.level,
    nature,
    ability: abilityName,
    ivs: {
      hp: gen3.ivs.hp,
      attack: gen3.ivs.attack,
      defense: gen3.ivs.defense,
      spAtk: gen3.ivs.spAtk,
      spDef: gen3.ivs.spDef,
      speed: gen3.ivs.speed,
    },
  };
}

/**
 * Map multiple Gen 3 Pokemon, with progress callback
 */
export async function mapGen3PokemonBatch(
  gen3Pokemon: Gen3Pokemon[],
  onProgress?: (completed: number, total: number) => void
): Promise<PCBoxPokemon[]> {
  const results: PCBoxPokemon[] = [];

  for (let i = 0; i < gen3Pokemon.length; i++) {
    try {
      const mapped = await mapGen3ToAppPokemon(gen3Pokemon[i]);
      results.push(mapped);
    } catch {
      // Skip Pokemon that fail to fetch from PokeAPI (e.g., out of range)
    }
    onProgress?.(i + 1, gen3Pokemon.length);
  }

  return results;
}
