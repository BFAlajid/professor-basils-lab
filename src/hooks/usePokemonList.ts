import { useQuery } from "@tanstack/react-query";
import { PokemonListItem } from "@/types";

interface PokemonListResponse {
  count: number;
  results: PokemonListItem[];
}

async function fetchPokemonList(): Promise<PokemonListItem[]> {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
  if (!res.ok) throw new Error("Failed to fetch Pokemon list");
  const data: PokemonListResponse = await res.json();
  return data.results;
}

export function usePokemonList() {
  return useQuery({
    queryKey: ["pokemon-list"],
    queryFn: fetchPokemonList,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
