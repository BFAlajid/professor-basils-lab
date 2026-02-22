import { useQuery } from "@tanstack/react-query";
import { Pokemon } from "@/types";

async function fetchPokemon(nameOrId: string | number): Promise<Pokemon> {
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${nameOrId.toString().toLowerCase()}`
  );
  if (!res.ok) throw new Error(`Pokemon "${nameOrId}" not found`);
  return res.json();
}

export function usePokemon(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["pokemon", nameOrId],
    queryFn: () => fetchPokemon(nameOrId!),
    enabled: !!nameOrId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export { fetchPokemon };
