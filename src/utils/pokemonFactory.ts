import { Pokemon, BallType, PCBoxPokemon } from "@/types";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";
import { determineGender } from "@/utils/gender";
import type { Gender } from "@/utils/gender";

export interface CreatePCBoxPokemonOpts {
  pokemon: Pokemon;
  nickname?: string;
  caughtWith?: BallType;
  caughtInArea: string;
  level: number;
  isShiny?: boolean;
  /** PokeAPI gender_rate from species endpoint (-1 = genderless, 0 = always male, 8 = always female). */
  genderRate?: number;
}

/** Pick an ability using weighted random: proportional split across available slots. */
function pickAbility(abilities: Pokemon["abilities"]): string {
  if (!abilities || abilities.length === 0) return "unknown";

  const normal = abilities.filter((a) => !a.is_hidden);
  const hidden = abilities.find((a) => a.is_hidden);

  // Build weighted pool based on what's available
  const pool: { name: string; weight: number }[] = [];
  if (normal[0]) pool.push({ name: normal[0].ability.name, weight: 50 });
  if (normal[1]) pool.push({ name: normal[1].ability.name, weight: 30 });
  if (hidden) pool.push({ name: hidden.ability.name, weight: 20 });

  if (pool.length === 0) return abilities[0].ability.name;

  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.name;
  }
  return pool[0].name;
}

/** Determine gender, using species genderRate when available, otherwise 50/50. */
function assignGender(genderRate?: number): Gender {
  if (genderRate !== undefined) return determineGender(genderRate);
  // Default: 50% male / 50% female (PokeAPI rate 4 = 50% female)
  return determineGender(4);
}

/** Build a PCBoxPokemon with random nature, IVs, ability, and gender. */
export function createPCBoxPokemon(opts: CreatePCBoxPokemonOpts): PCBoxPokemon {
  return {
    pokemon: opts.pokemon,
    nickname: opts.nickname,
    caughtWith: opts.caughtWith ?? "poke-ball",
    caughtInArea: opts.caughtInArea,
    caughtDate: new Date().toISOString(),
    level: opts.level,
    nature: NATURES[Math.floor(Math.random() * NATURES.length)],
    ivs: generateRandomIVs(),
    ability: pickAbility(opts.pokemon.abilities),
    isShiny: opts.isShiny,
    gender: assignGender(opts.genderRate),
  };
}
