import { useQuery } from "@tanstack/react-query";
import { fetchAbilityData, type AbilityData } from "@/utils/pokeApiClient";

export type { AbilityData };

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
