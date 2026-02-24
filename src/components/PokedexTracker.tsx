"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { usePokedexContext } from "@/contexts/PokedexContext";
import HabitatDex from "./HabitatDex";
import PokedexFilters from "./PokedexFilters";
import { applyFilters, DEFAULT_FILTER_CONFIG, type PokedexFilterConfig, type PokemonBaseData } from "@/utils/pokedexFilterEngine";

// --- Constants ---

type FilterTab = "all" | "caught" | "seen" | "missing";

interface GenRange {
  label: string;
  start: number;
  end: number;
}

const TOTAL_POKEMON = 1025;

const GENERATIONS: GenRange[] = [
  { label: "Gen 1", start: 1, end: 151 },
  { label: "Gen 2", start: 152, end: 251 },
  { label: "Gen 3", start: 252, end: 386 },
  { label: "Gen 4", start: 387, end: 493 },
  { label: "Gen 5", start: 494, end: 649 },
  { label: "Gen 6", start: 650, end: 721 },
  { label: "Gen 7", start: 722, end: 809 },
  { label: "Gen 8", start: 810, end: 905 },
  { label: "Gen 9", start: 906, end: 1025 },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "caught", label: "Caught" },
  { key: "seen", label: "Seen" },
  { key: "missing", label: "Missing" },
];

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function formatDexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

// --- Circular Progress Ring ---

interface ProgressRingProps {
  percent: number;
  size: number;
  strokeWidth: number;
}

function ProgressRing({ percent, size, strokeWidth }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#3a4466"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e8433f"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
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
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold font-pixel text-[#f0f0e8] mb-3">
              Pok&eacute;dex
            </h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-[#8b9bb4]">Seen: </span>
                <span className="font-bold text-[#f0f0e8]">{totalSeen}</span>
              </div>
              <div>
                <span className="text-[#8b9bb4]">Caught: </span>
                <span className="font-bold text-[#f0f0e8]">{totalCaught}</span>
              </div>
              <div>
                <span className="text-[#8b9bb4]">Total: </span>
                <span className="font-bold text-[#f0f0e8]">{TOTAL_POKEMON}</span>
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing percent={completionPercent} size={100} strokeWidth={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-[#f0f0e8]">
                {completionPercent}%
              </span>
              <span className="text-[10px] text-[#8b9bb4]">Complete</span>
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowHabitat(!showHabitat)}
            className={`rounded px-3 py-1 text-xs font-pixel transition-colors ${
              showHabitat
                ? "bg-[#38b764] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5476] hover:text-[#f0f0e8]"
            }`}
          >
            Habitat
          </button>
          <div>
            {showResetConfirm ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8b9bb4]">Reset all data?</span>
                <button
                  onClick={handleReset}
                  className="rounded bg-[#e8433f] px-3 py-1 text-[#f0f0e8] hover:bg-[#c9362f] transition-colors font-pixel"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded bg-[#3a4466] px-3 py-1 text-[#f0f0e8] hover:bg-[#4a5476] transition-colors font-pixel"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="rounded bg-[#3a4466] px-3 py-1 text-xs text-[#8b9bb4] hover:bg-[#4a5476] hover:text-[#f0f0e8] transition-colors font-pixel"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

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
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        {/* Search bar */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or number..."
          className="mb-3 w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-4 py-2.5 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f] transition-colors"
        />

        {/* Filter tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-pixel transition-colors ${
                activeFilter === tab.key
                  ? "bg-[#e8433f] text-[#f0f0e8]"
                  : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generation filter buttons */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedGen(null)}
            className={`rounded px-2 py-1 text-[10px] font-pixel transition-colors ${
              selectedGen === null
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
            }`}
          >
            All Gens
          </button>
          {GENERATIONS.map((gen, idx) => (
            <button
              key={gen.label}
              onClick={() => setSelectedGen(idx)}
              className={`rounded px-2 py-1 text-[10px] font-pixel transition-colors ${
                selectedGen === idx
                  ? "bg-[#e8433f] text-[#f0f0e8]"
                  : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
              }`}
              title={`${gen.start}-${gen.end}`}
            >
              {gen.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Pokemon Grid */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-3">
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {filteredIds.length === 0 ? (
            <div className="py-12 text-center text-[#8b9bb4] text-sm">
              No Pok&eacute;mon match the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {filteredIds.map((id) => {
                const entry = entries[id];
                const isCaught = entry?.caught ?? false;
                const isSeen = entry?.seen ?? false;

                let bgColor: string;
                if (isCaught) {
                  bgColor = "bg-[#2a5040]";
                } else if (isSeen) {
                  bgColor = "bg-[#3a4466]";
                } else {
                  bgColor = "bg-[#1a1c2c]";
                }

                return (
                  <div
                    key={id}
                    className={`${bgColor} rounded-lg p-2 flex flex-col items-center gap-1 border border-[#3a4466] transition-colors`}
                    title={
                      isCaught
                        ? `${entry.name} - Caught`
                        : isSeen
                          ? `${entry.name} - Seen`
                          : `??? - Unknown`
                    }
                  >
                    {/* Sprite */}
                    <div className="relative h-12 w-12 flex items-center justify-center">
                      {isSeen ? (
                        <Image
                          src={getSpriteUrl(id)}
                          alt={entry?.name ?? `Pokemon #${id}`}
                          width={48}
                          height={48}
                          unoptimized
                          className={isCaught ? "" : "brightness-50 contrast-125"}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#262b44] text-[#3a4466]">
                          <span className="text-lg font-bold">?</span>
                        </div>
                      )}
                    </div>

                    {/* Dex number */}
                    <span className="text-[9px] text-[#8b9bb4] font-pixel">
                      {formatDexNumber(id)}
                    </span>

                    {/* Name */}
                    <span className="text-[8px] text-center text-[#f0f0e8] font-pixel capitalize truncate w-full">
                      {isSeen ? entry.name : "???"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
