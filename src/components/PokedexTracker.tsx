"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePokedexContext } from "@/contexts/PokedexContext";
import HabitatDex from "./HabitatDex";
import PokedexFilters from "./PokedexFilters";
import PokedexEntry from "./PokedexEntry";
import PokedexHeader from "./PokedexHeader";
import PokedexSearchFilters, { GENERATIONS, type FilterTab } from "./PokedexSearchFilters";
import { applyFilters, DEFAULT_FILTER_CONFIG, type PokedexFilterConfig, type PokemonBaseData } from "@/utils/pokedexFilterEngine";

const TOTAL_POKEMON = 1025;

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// --- Virtualized Grid ---

const COLS = 6;
const ROW_HEIGHT = 110;

function VirtualPokedexGrid({ filteredIds, entries }: { filteredIds: number[]; entries: Record<number, { name: string; seen: boolean; caught: boolean }> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(filteredIds.length / COLS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  if (filteredIds.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-3">
        <div className="py-12 text-center text-[#8b9bb4] text-sm">
          No Pok&eacute;mon match the current filters.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-3">
      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto pr-1">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * COLS;
            const rowIds = filteredIds.slice(startIdx, startIdx + COLS);
            return (
              <div
                key={virtualRow.index}
                className="grid grid-cols-6 gap-2 absolute w-full"
                style={{ top: virtualRow.start, height: ROW_HEIGHT }}
              >
                {rowIds.map((id) => {
                  const entry = entries[id];
                  return (
                    <PokedexEntry
                      key={id}
                      id={id}
                      isCaught={entry?.caught ?? false}
                      isSeen={entry?.seen ?? false}
                      name={entry?.name}
                      spriteUrl={getSpriteUrl(id)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function PokedexTracker() {
  const {
    entries,
    totalSeen,
    totalCaught,
    getCompletionPercent,
    reset,
  } = usePokedexContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedGen, setSelectedGen] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHabitat, setShowHabitat] = useState(false);
  const [filterConfig, setFilterConfig] = useState<PokedexFilterConfig>(DEFAULT_FILTER_CONFIG);
  const [baseDataMap, setBaseDataMap] = useState<Map<number, PokemonBaseData>>(new Map());
  const [isLoadingBaseData, setIsLoadingBaseData] = useState(false);
  const baseDataLoaded = useRef(false);

  const completionPercent = getCompletionPercent();

  // Check if advanced filters are active (anything beyond basic search/filter/gen)
  const hasAdvancedFilters = filterConfig.typeFilter !== null ||
    filterConfig.minBST !== null || filterConfig.maxBST !== null ||
    filterConfig.abilitySearch !== "" ||
    Object.values(filterConfig.statThresholds).some((v) => v && v > 0);

  // Lazy-load base data from PokeAPI when filters first need it
  useEffect(() => {
    if (!hasAdvancedFilters || baseDataLoaded.current) return;
    baseDataLoaded.current = true;
    setIsLoadingBaseData(true);

    // Fetch basic data for all 1025 Pokemon from PokeAPI list endpoint
    (async () => {
      try {
        const map = new Map<number, PokemonBaseData>();
        // Fetch in batches to avoid overwhelming the API
        for (let offset = 0; offset < TOTAL_POKEMON; offset += 100) {
          const limit = Math.min(100, TOTAL_POKEMON - offset);
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`);
          const data = await res.json();
          const details = await Promise.all(
            data.results.map(async (p: { url: string }) => {
              const r = await fetch(p.url);
              return r.json();
            })
          );
          for (const pokemon of details) {
            const stats = {
              hp: pokemon.stats[0]?.base_stat ?? 0,
              attack: pokemon.stats[1]?.base_stat ?? 0,
              defense: pokemon.stats[2]?.base_stat ?? 0,
              spAttack: pokemon.stats[3]?.base_stat ?? 0,
              spDefense: pokemon.stats[4]?.base_stat ?? 0,
              speed: pokemon.stats[5]?.base_stat ?? 0,
            };
            map.set(pokemon.id, {
              id: pokemon.id,
              name: pokemon.name,
              types: pokemon.types.map((t: { type: { name: string } }) => t.type.name),
              abilities: pokemon.abilities.map((a: { ability: { name: string } }) => a.ability.name),
              stats,
              bst: Object.values(stats).reduce((a: number, b: number) => a + b, 0),
            });
          }
        }
        setBaseDataMap(map);
      } catch {
        // silently fail — filters just won't work for stats/types
      } finally {
        setIsLoadingBaseData(false);
      }
    })();
  }, [hasAdvancedFilters]);

  // Build known Pokemon list for HabitatDex autocomplete
  const knownPokemon = useMemo(() => {
    const list: { id: number; name: string }[] = [];
    for (let id = 1; id <= TOTAL_POKEMON; id++) {
      const entry = entries[id];
      if (entry?.seen && entry.name) {
        list.push({ id, name: entry.name });
      }
    }
    return list;
  }, [entries]);

  // Build the list of all Pokemon IDs in the selected range
  const dexRange = useMemo((): { start: number; end: number } => {
    if (selectedGen !== null) {
      const gen = GENERATIONS[selectedGen];
      return { start: gen.start, end: gen.end };
    }
    return { start: 1, end: TOTAL_POKEMON };
  }, [selectedGen]);

  // Filter the Pokemon list based on search, filter tab, generation, and advanced filters
  const filteredIds = useMemo(() => {
    // Step 1: basic filters (tab + search + gen)
    const basicIds: number[] = [];
    for (let id = dexRange.start; id <= dexRange.end; id++) {
      const entry = entries[id];

      // Apply filter tab
      switch (activeFilter) {
        case "caught":
          if (!entry?.caught) continue;
          break;
        case "seen":
          if (!entry?.seen || entry?.caught) continue;
          break;
        case "missing":
          if (entry?.seen) continue;
          break;
        case "all":
        default:
          break;
      }

      // Apply search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = entry?.name ?? "";
        const idStr = String(id);
        if (!name.includes(q) && !idStr.includes(q)) continue;
      }

      basicIds.push(id);
    }

    // Step 2: apply advanced filters if base data is loaded and filters are active
    if (hasAdvancedFilters && baseDataMap.size > 0) {
      return applyFilters(basicIds, filterConfig, baseDataMap);
    }

    // Apply sort from filterConfig even without advanced filters
    if (filterConfig.sortBy !== "dex" || filterConfig.sortDirection !== "asc") {
      const sorted = [...basicIds];
      if (filterConfig.sortBy === "name") {
        sorted.sort((a, b) => {
          const nameA = entries[a]?.name ?? "";
          const nameB = entries[b]?.name ?? "";
          return nameA.localeCompare(nameB);
        });
      }
      if (filterConfig.sortDirection === "desc") sorted.reverse();
      return sorted;
    }

    return basicIds;
  }, [dexRange, entries, activeFilter, searchQuery, hasAdvancedFilters, baseDataMap, filterConfig]);

  const handleReset = useCallback(() => {
    reset();
    setShowResetConfirm(false);
  }, [reset]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PokedexHeader
        totalSeen={totalSeen}
        totalCaught={totalCaught}
        totalPokemon={TOTAL_POKEMON}
        completionPercent={completionPercent}
        showHabitat={showHabitat}
        onToggleHabitat={() => setShowHabitat(!showHabitat)}
        showResetConfirm={showResetConfirm}
        onShowResetConfirm={() => setShowResetConfirm(true)}
        onCancelReset={() => setShowResetConfirm(false)}
        onConfirmReset={handleReset}
      />

      {/* Habitat Dex */}
      <AnimatePresence>
        {showHabitat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <HabitatDex knownPokemon={knownPokemon} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Filter */}
      <PokedexSearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        selectedGen={selectedGen}
        onGenChange={setSelectedGen}
      />

      {/* Advanced Filters */}
      <PokedexFilters config={filterConfig} onChange={setFilterConfig} />
      {isLoadingBaseData && (
        <div className="text-center text-[10px] text-[#f7a838] font-pixel animate-pulse">
          Loading Pokemon data for filters...
        </div>
      )}

      {/* Results count */}
      <div className="px-1 text-xs text-[#8b9bb4]">
        Showing {filteredIds.length} Pok&eacute;mon
        {selectedGen !== null && (
          <span>
            {" "}
            in {GENERATIONS[selectedGen].label} ({GENERATIONS[selectedGen].start}
            -{GENERATIONS[selectedGen].end})
          </span>
        )}
      </div>

      {/* Pokemon Grid (virtualized) */}
      <VirtualPokedexGrid filteredIds={filteredIds} entries={entries} />
    </div>
  );
}
