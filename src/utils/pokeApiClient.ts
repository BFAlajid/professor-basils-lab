import type { Pokemon, Move, PokemonListItem } from "@/types";
import type { AbilityData } from "@/hooks/useAbility";

const BASE = "https://pokeapi.co/api/v2";

export interface PokemonSpeciesData {
  id: number;
  name: string;
  egg_groups: { name: string; url: string }[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
}

const cache = {
  pokemon: new Map<string, Pokemon>(),
  move: new Map<string, Move>(),
  species: new Map<string, PokemonSpeciesData>(),
  ability: new Map<string, AbilityData>(),
  pokemonList: null as PokemonListItem[] | null,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokeAPI: ${res.status} for ${url}`);
  return res.json();
}

export async function fetchPokemonData(nameOrId: string | number): Promise<Pokemon> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.pokemon.get(key);
  if (cached) return cached;
  const data = await fetchJson<Pokemon>(`${BASE}/pokemon/${key}`);
  cache.pokemon.set(key, data);
  if (data.id) cache.pokemon.set(String(data.id), data);
  return data;
}

export async function fetchMoveData(nameOrId: string | number): Promise<Move> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.move.get(key);
  if (cached) return cached;
  const data = await fetchJson<Move>(`${BASE}/move/${key}`);
  cache.move.set(key, data);
  return data;
}

export async function fetchSpeciesData(nameOrId: string | number): Promise<PokemonSpeciesData> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.species.get(key);
  if (cached) return cached;
  const data = await fetchJson<PokemonSpeciesData>(`${BASE}/pokemon-species/${key}`);
  cache.species.set(key, data);
  return data;
}

export async function fetchAbilityData(nameOrId: string | number): Promise<AbilityData> {
  const key = String(nameOrId).toLowerCase();
  const cached = cache.ability.get(key);
  if (cached) return cached;
  const data = await fetchJson<AbilityData>(`${BASE}/ability/${key}`);
  cache.ability.set(key, data);
  return data;
}

export async function fetchPokemonListData(): Promise<PokemonListItem[]> {
  if (cache.pokemonList) return cache.pokemonList;
  const res = await fetch(`${BASE}/pokemon?limit=1025`);
  if (!res.ok) throw new Error("Failed to fetch Pokemon list");
  const data: { results: PokemonListItem[] } = await res.json();
  cache.pokemonList = data.results;
  return data.results;
}
