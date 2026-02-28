import { useQuery } from "@tanstack/react-query";
import { Pokemon } from "@/types";
import { fetchPokemonData } from "@/utils/pokeApiClient";

export function usePokemon(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["pokemon", nameOrId],
    queryFn: () => fetchPokemonData(nameOrId!),
    enabled: !!nameOrId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export { fetchPokemonData as fetchPokemon };
