import { useQuery } from "@tanstack/react-query";
import { fetchPokemonListData } from "@/utils/pokeApiClient";

export function usePokemonList() {
  return useQuery({
    queryKey: ["pokemon-list"],
    queryFn: fetchPokemonListData,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
