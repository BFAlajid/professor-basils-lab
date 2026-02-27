import { useQuery } from "@tanstack/react-query";
import { fetchAbilityData } from "@/utils/pokeApiClient";

export interface AbilityData {
  id: number;
  name: string;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: { name: string };
  }[];
}

export function useAbility(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["ability", nameOrId],
    queryFn: () => fetchAbilityData(nameOrId!),
    enabled: !!nameOrId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function getAbilityShortEffect(ability: AbilityData): string {
  const en = ability.effect_entries.find((e) => e.language.name === "en");
  return en?.short_effect ?? ability.name;
}
