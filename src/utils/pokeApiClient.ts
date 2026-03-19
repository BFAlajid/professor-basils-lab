import type { Pokemon, Move, PokemonListItem } from "@/types";
import type { AbilityData } from "@/hooks/useAbility";

// Route through Vercel Edge proxy for CDN caching; fall back to direct PokeAPI in dev
function getBase(): string {
  if (process.env.NODE_ENV !== "production") return "https://pokeapi.co/api/v2";
  if (typeof window === "undefined") {
    // Server-side: need absolute URL (Node.js fetch requires it)
    const host = process.env.NEXT_PUBLIC_APP_URL || "https://pokemon-team-builder.vercel.app";
    return `${host.replace(/\/$/, "")}/api/pokeapi`;
  }
  return "/api/pokeapi";
}
const FETCH_TIMEOUT_MS = 8000;

export function fetchWithTimeout(url: string, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export interface PokemonSpeciesData {
  id: number;
  name: string;
  egg_groups: { name: string; url: string }[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
}

interface TypePokemonEntry {
  pokemon: { name: string; url: string };
  slot: number;
}

interface TypeEndpointResponse {
  pokemon: TypePokemonEntry[];
}

const cache = {
  pokemon: new Map<string, Pokemon>(),
  move: new Map<string, Move>(),
  species: new Map<string, PokemonSpeciesData>(),
  ability: new Map<string, AbilityData>(),
  typePokemon: new Map<string, Set<string>>(),
  pokemonList: null as PokemonListItem[] | null,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`PokeAPI: ${res.status} for ${url}`);
  return res.json();
}

export async function fetchPokemonData(nameOrId: string | number): Promise<Pokemon> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.pokemon.get(key);
  if (cached) return cached;
  const data = await fetchJson<Pokemon>(`${getBase()}/pokemon/${key}`);
  cache.pokemon.set(key, data);
  if (data.id) cache.pokemon.set(String(data.id), data);
  return data;
}

export async function fetchMoveData(nameOrId: string | number): Promise<Move> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.move.get(key);
  if (cached) return cached;
  const data = await fetchJson<Move>(`${getBase()}/move/${key}`);
  cache.move.set(key, data);
  return data;
}

export async function fetchSpeciesData(nameOrId: string | number): Promise<PokemonSpeciesData> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.species.get(key);
  if (cached) return cached;
  const data = await fetchJson<PokemonSpeciesData>(`${getBase()}/pokemon-species/${key}`);
  cache.species.set(key, data);
  return data;
}

export async function fetchAbilityData(nameOrId: string | number): Promise<AbilityData> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.ability.get(key);
  if (cached) return cached;
  const data = await fetchJson<AbilityData>(`${getBase()}/ability/${key}`);
  cache.ability.set(key, data);
  return data;
}

/**
 * Fetch all Pokemon names that have a given type. Returns a Set of lowercase names.
 * Used by the search filter to narrow results by type.
 */
export async function fetchTypePokemonNames(typeName: string): Promise<Set<string>> {
  const key = typeName.toLowerCase();
  const cached = cache.typePokemon.get(key);
  if (cached) return cached;
  const data = await fetchJson<TypeEndpointResponse>(`${getBase()}/type/${key}`);
  const names = new Set(data.pokemon.map((e) => e.pokemon.name));
  cache.typePokemon.set(key, names);
  return names;
}

/**
 * Synchronously retrieve a cached Move by name (returns undefined if not yet fetched).
 * Used by team analysis to include move types in offensive coverage without async calls.
 */
export function getCachedMove(name: string): Move | undefined {
  return cache.move.get(name.toLowerCase());
}

export async function fetchPokemonListData(): Promise<PokemonListItem[]> {
  if (cache.pokemonList) return cache.pokemonList;
  const res = await fetchWithTimeout(`${getBase()}/pokemon?limit=1025`);
  if (!res.ok) throw new Error("Failed to fetch Pokemon list");
  const data: { results: PokemonListItem[] } = await res.json();
  cache.pokemonList = data.results;
  return data.results;
}
