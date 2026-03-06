import { Pokemon, BallType, PCBoxPokemon } from "@/types";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";

export interface CreatePCBoxPokemonOpts {
  pokemon: Pokemon;
  nickname?: string;
  caughtWith?: BallType;
  caughtInArea: string;
  level: number;
  isShiny?: boolean;
}

/** Build a PCBoxPokemon with random nature, IVs, and first-slot ability. */
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
    ability: opts.pokemon.abilities?.[0]?.ability.name ?? "unknown",
    isShiny: opts.isShiny,
  };
}
