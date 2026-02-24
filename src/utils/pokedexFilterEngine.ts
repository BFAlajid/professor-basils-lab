// ── Pokedex Filter Engine ──────────────────────────────────────────
// Pure function that applies filters and sorting to a Pokedex list.

export interface PokemonBaseData {
  id: number;
  name: string;
  types: string[];
  abilities: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  bst: number;
}

export interface PokedexFilterConfig {
  typeFilter: string | null;
  dualTypeFilter: string | null;
  generationRange: { start: number; end: number } | null;
  minBST: number | null;
  maxBST: number | null;
  statThresholds: Partial<
    Record<"hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed", number>
  >;
  abilitySearch: string;
  sortBy: "dex" | "name" | "bst";
  sortDirection: "asc" | "desc";
}

export const DEFAULT_FILTER_CONFIG: PokedexFilterConfig = {
  typeFilter: null,
  dualTypeFilter: null,
  generationRange: null,
  minBST: null,
  maxBST: null,
  statThresholds: {},
  abilitySearch: "",
  sortBy: "dex",
  sortDirection: "asc",
};

// ── Stat key lookup helper ─────────────────────────────────────────

type StatKey = "hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed";

function getStatValue(stats: PokemonBaseData["stats"], key: StatKey): number {
  return stats[key];
}

// ── Main filter + sort function ────────────────────────────────────

export function applyFilters(
  ids: number[],
  config: PokedexFilterConfig,
  dataMap: Map<number, PokemonBaseData>,
): number[] {
  let result = ids.filter((id) => {
    const data = dataMap.get(id);
    if (!data) return false;

    // 1. Primary type filter
    if (config.typeFilter !== null) {
      if (!data.types.includes(config.typeFilter)) return false;
    }

    // 2. Dual type filter (requires BOTH primary AND secondary)
    if (config.dualTypeFilter !== null) {
      if (
        config.typeFilter === null ||
        !data.types.includes(config.typeFilter) ||
        !data.types.includes(config.dualTypeFilter)
      ) {
        return false;
      }
    }

    // 3. Generation range (by dex ID)
    if (config.generationRange !== null) {
      if (data.id < config.generationRange.start || data.id > config.generationRange.end) {
        return false;
      }
    }

    // 4. BST range
    if (config.minBST !== null && data.bst < config.minBST) return false;
    if (config.maxBST !== null && data.bst > config.maxBST) return false;

    // 5. Stat thresholds
    for (const [key, threshold] of Object.entries(config.statThresholds)) {
      if (threshold === undefined) continue;
      const value = getStatValue(data.stats, key as StatKey);
      if (value < threshold) return false;
    }

    // 6. Ability search (case-insensitive substring)
    if (config.abilitySearch.length > 0) {
      const search = config.abilitySearch.toLowerCase();
      const match = data.abilities.some((a) => a.toLowerCase().includes(search));
      if (!match) return false;
    }

    return true;
  });

  // 7. Sort
  result.sort((a, b) => {
    const dataA = dataMap.get(a);
    const dataB = dataMap.get(b);
    if (!dataA || !dataB) return 0;

    let cmp = 0;
    switch (config.sortBy) {
      case "dex":
        cmp = dataA.id - dataB.id;
        break;
      case "name":
        cmp = dataA.name.localeCompare(dataB.name);
        break;
      case "bst":
        cmp = dataA.bst - dataB.bst;
        break;
    }

    return config.sortDirection === "desc" ? -cmp : cmp;
  });

  return result;
}
