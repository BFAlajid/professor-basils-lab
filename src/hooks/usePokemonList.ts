import { useQuery } from "@tanstack/react-query";
import { PokemonListItem } from "@/types";
import { fetchPokemonListCached } from "@/utils/pokeApiCache";

async function fetchPokemonList(): Promise<PokemonListItem[]> {
  const data = await fetchPokemonListCached(1025, 0);
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
