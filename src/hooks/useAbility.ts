import { useQuery } from "@tanstack/react-query";

export interface AbilityData {
  id: number;
  name: string;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: { name: string };
  }[];
}

async function fetchAbility(nameOrId: string | number): Promise<AbilityData> {
  const res = await fetch(
    `https://pokeapi.co/api/v2/ability/${nameOrId.toString().toLowerCase()}`
  );
  if (!res.ok) throw new Error(`Ability "${nameOrId}" not found`);
  return res.json();
}

export function useAbility(nameOrId: string | number | null) {
  return useQuery({
    queryKey: ["ability", nameOrId],
    queryFn: () => fetchAbility(nameOrId!),
    enabled: !!nameOrId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function getAbilityShortEffect(ability: AbilityData): string {
  const en = ability.effect_entries.find((e) => e.language.name === "en");
  return en?.short_effect ?? ability.name;
}
