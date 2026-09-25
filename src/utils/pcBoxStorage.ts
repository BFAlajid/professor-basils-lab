/**
 * Slim, storage-only representation of a PC box entry.
 *
 * `PCBoxPokemon.pokemon` is the full PokeAPI response (20-100KB with
 * sprites/stats/moves) — persisting it per box entry re-serializes that
 * whole payload on every catch. Only `pokemonId` needs to survive a reload;
 * the full object is rehydrated via `fetchPokemonData`'s in-memory cache.
 */

import type { PCBoxPokemon, Nature, IVSpread, EVSpread, BallType, Pokemon } from "@/types";

export interface SlimBoxEntry {
  pokemonId: number;
  nickname?: string;
  caughtWith: BallType;
  caughtInArea: string;
  caughtDate: string;
  level: number;
  nature: Nature;
  ivs: IVSpread;
  ability: string;
  isShiny?: boolean;
  gender?: "male" | "female" | "genderless";
  friendship?: number;
  evs?: EVSpread;
  isHyperTrained?: Partial<Record<keyof IVSpread, boolean>>;
}

/** Convert an in-memory box entry to its slim, storage-ready form. */
export function toSlimBoxEntry(p: PCBoxPokemon): SlimBoxEntry {
  return {
    pokemonId: p.pokemon.id,
    nickname: p.nickname,
    caughtWith: p.caughtWith,
    caughtInArea: p.caughtInArea,
    caughtDate: p.caughtDate,
    level: p.level,
    nature: p.nature,
    ivs: p.ivs,
    ability: p.ability,
    isShiny: p.isShiny,
    gender: p.gender,
    friendship: p.friendship,
    evs: p.evs,
    isHyperTrained: p.isHyperTrained,
  };
}

/** Rehydrate a slim entry back into a full box entry once its Pokemon data is fetched. */
export function fromSlimBoxEntry(entry: SlimBoxEntry, pokemon: Pokemon): PCBoxPokemon {
  return {
    pokemon,
    nickname: entry.nickname,
    caughtWith: entry.caughtWith,
    caughtInArea: entry.caughtInArea,
    caughtDate: entry.caughtDate,
    level: entry.level,
    nature: entry.nature,
    ivs: entry.ivs,
    ability: entry.ability,
    isShiny: entry.isShiny,
    gender: entry.gender,
    friendship: entry.friendship,
    evs: entry.evs,
    isHyperTrained: entry.isHyperTrained,
  };
}

/** Old (pre-migration) entries embedded the full Pokemon object under `pokemon`. */
export function isLegacyBoxEntry(raw: unknown): raw is PCBoxPokemon {
  return (
    !!raw &&
    typeof raw === "object" &&
    "pokemon" in raw &&
    !!(raw as { pokemon?: unknown }).pokemon &&
    typeof (raw as { pokemon: unknown }).pokemon === "object"
  );
}

/** New (post-migration) entries store only the species id. */
function isSlimBoxEntry(raw: unknown): raw is SlimBoxEntry {
  return (
    !!raw &&
    typeof raw === "object" &&
    typeof (raw as { pokemonId?: unknown }).pokemonId === "number"
  );
}

/**
 * Normalize one raw stored box entry (either format) into slim shape.
 * Returns `null` for unrecognized/corrupt entries so callers can drop them.
 */
export function normalizeStoredBoxEntry(raw: unknown): SlimBoxEntry | null {
  if (isLegacyBoxEntry(raw)) return toSlimBoxEntry(raw);
  if (isSlimBoxEntry(raw)) return raw;
  return null;
}
