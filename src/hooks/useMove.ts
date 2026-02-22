import { useQuery } from "@tanstack/react-query";
import { Move } from "@/types";

async function fetchMove(nameOrId: string | number): Promise<Move> {
  const res = await fetch(
    `https://pokeapi.co/api/v2/move/${nameOrId.toString().toLowerCase()}`
  );
  if (!res.ok) throw new Error(`Move "${nameOrId}" not found`);
  return res.json();
}

export function useMove(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["move", nameOrId],
    queryFn: () => fetchMove(nameOrId!),
    enabled: !!nameOrId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
