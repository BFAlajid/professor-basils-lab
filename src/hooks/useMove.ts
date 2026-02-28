import { useQuery } from "@tanstack/react-query";
import { Move } from "@/types";
import { fetchMoveData } from "@/utils/pokeApiClient";

export function useMove(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["move", nameOrId],
    queryFn: () => fetchMoveData(nameOrId!),
    enabled: !!nameOrId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
