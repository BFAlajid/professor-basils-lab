import { ROUTE_AREAS } from "@/data/routes";

export interface HabitatEntry {
  areaId: string;
  areaName: string;
  region: string;
  encounterRate: number;
  minLevel: number;
  maxLevel: number;
}

let habitatIndex: Map<number, HabitatEntry[]> | null = null;

export function buildHabitatIndex(): Map<number, HabitatEntry[]> {
  if (habitatIndex) return habitatIndex;
  habitatIndex = new Map();
  for (const area of ROUTE_AREAS) {
    for (const enc of area.encounterPool) {
      const entries = habitatIndex.get(enc.pokemonId) || [];
      entries.push({
        areaId: area.id,
        areaName: area.name,
        region: area.region,
        encounterRate: enc.encounterRate,
        minLevel: enc.minLevel,
        maxLevel: enc.maxLevel,
      });
      habitatIndex.set(enc.pokemonId, entries);
    }
  }
  // Sort entries by encounter rate descending
  for (const [, entries] of habitatIndex) {
    entries.sort((a, b) => b.encounterRate - a.encounterRate);
  }
  return habitatIndex;
}

export function searchHabitat(pokemonId: number): HabitatEntry[] {
  const index = buildHabitatIndex();
  return index.get(pokemonId) || [];
}
