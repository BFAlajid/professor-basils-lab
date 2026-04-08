"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Pokemon, TypeName, PokemonListItem } from "@/types";
import { TYPE_LIST } from "@/data/typeChart";
import { fetchTypePokemonNames } from "@/utils/pokeApiClient";
import LoadingSpinner from "./LoadingSpinner";

// Generation ranges by national dex ID
const GEN_RANGES: { label: string; min: number; max: number }[] = [
  { label: "Gen 1", min: 1, max: 151 },
  { label: "Gen 2", min: 152, max: 251 },
  { label: "Gen 3", min: 252, max: 386 },
  { label: "Gen 4", min: 387, max: 493 },
  { label: "Gen 5", min: 494, max: 649 },
  { label: "Gen 6", min: 650, max: 721 },
  { label: "Gen 7", min: 722, max: 809 },
  { label: "Gen 8", min: 810, max: 905 },
  { label: "Gen 9", min: 906, max: 1025 },
];

function getIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

const selectClass =
  "rounded-md border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f] transition-colors cursor-pointer";

interface PokemonSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pokemon: Pokemon) => void;
}

export default function PokemonSearch({
  isOpen,
  onClose,
  onSelect,
}: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const { data: pokemonList } = usePokemonList();

  // Filter state
  const [genFilter, setGenFilter] = useState("");
  const [type1Filter, setType1Filter] = useState("");
  const [type2Filter, setType2Filter] = useState("");
  const [minBst, setMinBst] = useState("");

  // Type filter data (fetched on demand)
  const [type1Names, setType1Names] = useState<Set<string> | null>(null);
  const [type2Names, setType2Names] = useState<Set<string> | null>(null);
  const [typeLoading, setTypeLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setError(null);
      setImgErrors(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch type data when type filters change
  useEffect(() => {
    if (!type1Filter) {
      setType1Names(null);
      return;
    }
    let cancelled = false;
    setTypeLoading(true);
    fetchTypePokemonNames(type1Filter).then((names) => {
      if (!cancelled) {
        setType1Names(names);
        setTypeLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setTypeLoading(false);
    });
    return () => { cancelled = true; };
  }, [type1Filter]);

  useEffect(() => {
    if (!type2Filter) {
      setType2Names(null);
      return;
    }
    let cancelled = false;
    setTypeLoading(true);
    fetchTypePokemonNames(type2Filter).then((names) => {
      if (!cancelled) {
        setType2Names(names);
        setTypeLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setTypeLoading(false);
    });
    return () => { cancelled = true; };
  }, [type2Filter]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const hasAnyFilter = !!(genFilter || type1Filter || type2Filter || minBst);

  const filtered = useMemo(() => {
    if (!pokemonList) return [];

    // Need either a search query or at least one filter active
    if (!debouncedQuery && !hasAnyFilter) return [];

    let results: PokemonListItem[] = pokemonList;

    // Name filter
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      results = results.filter((p) => p.name.includes(q));
    }

    // Generation filter (ID-based, no fetch needed)
    if (genFilter) {
      const gen = GEN_RANGES.find((g) => g.label === genFilter);
      if (gen) {
        results = results.filter((p) => {
          const id = getIdFromUrl(p.url);
          return id >= gen.min && id <= gen.max;
        });
      }
    }

    // Type 1 filter
    if (type1Filter && type1Names) {
      results = results.filter((p) => type1Names.has(p.name));
    }

    // Type 2 filter (intersect with type 1)
    if (type2Filter && type2Names) {
      results = results.filter((p) => type2Names.has(p.name));
    }

    // Min BST filter: requires individual Pokemon data which we may not have.
    // Skip for now if minBst is set — we'll note in UI that BST filtering
    // works on fetched results only.
    // NOTE: BST filter is applied as a post-filter hint in the UI.

    return results.slice(0, 50);
  }, [pokemonList, debouncedQuery, genFilter, type1Filter, type2Filter, type1Names, type2Names, hasAnyFilter]);

  const handleSelect = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      try {
        const pokemon = await fetchPokemon(name);

        // BST filter: check after fetch if minBst is set
        if (minBst) {
          const bstValue = parseInt(minBst, 10);
          if (!isNaN(bstValue) && bstValue > 0) {
            const totalBst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
            if (totalBst < bstValue) {
              setError(`${name} has BST ${totalBst}, below minimum ${bstValue}.`);
              setLoading(false);
              return;
            }
          }
        }

        onSelect(pokemon);
        onClose();
      } catch {
        setError(`Could not load ${name}. Try again.`);
      } finally {
        setLoading(false);
      }
    },
    [onSelect, onClose, minBst]
  );

  const clearFilters = useCallback(() => {
    setGenFilter("");
    setType1Filter("");
    setType2Filter("");
    setMinBst("");
    setType1Names(null);
    setType2Names(null);
  }, []);

  const getSpriteUrl = (url: string) => {
    const id = url.split("/").filter(Boolean).pop();
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[10vh]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Search Pokemon"
          ref={focusTrapRef}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full max-w-md rounded-xl border border-[#3a4466] bg-[#262b44] p-4 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold font-pixel text-[#f0f0e8] mb-3">Search Pokemon</h2>

            {/* Search input */}
            <div className="mb-3 flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                }}
                placeholder="Search Pokemon..."
                aria-label="Search Pokemon by name or ID"
                className="flex-1 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-4 py-2.5 text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f] transition-colors"
              />
              {(loading || typeLoading) && <LoadingSpinner />}
            </div>

            {/* Filter controls */}
            <div className="mb-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#8b9bb4]">
                  Filters
                </span>
                {hasAnyFilter && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Generation */}
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#8b9bb4]">Generation</label>
                  <select
                    value={genFilter}
                    onChange={(e) => setGenFilter(e.target.value)}
                    aria-label="Filter by generation"
                    className={selectClass + " w-full"}
                  >
                    <option value="">All Gens</option>
                    {GEN_RANGES.map((g) => (
                      <option key={g.label} value={g.label}>
                        {g.label} ({g.min}-{g.max})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min BST */}
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#8b9bb4]">Min BST</label>
                  <input
                    type="number"
                    value={minBst}
                    onChange={(e) => setMinBst(e.target.value)}
                    placeholder="e.g. 500"
                    aria-label="Minimum base stat total"
                    min={0}
                    max={999}
                    className={selectClass + " w-full"}
                  />
                </div>

                {/* Type 1 */}
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#8b9bb4]">Type 1</label>
                  <select
                    value={type1Filter}
                    onChange={(e) => setType1Filter(e.target.value)}
                    aria-label="Filter by primary type"
                    className={selectClass + " w-full"}
                  >
                    <option value="">Any</option>
                    {TYPE_LIST.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type 2 */}
                <div>
                  <label className="mb-0.5 block text-[10px] text-[#8b9bb4]">Type 2</label>
                  <select
                    value={type2Filter}
                    onChange={(e) => setType2Filter(e.target.value)}
                    aria-label="Filter by secondary type"
                    className={selectClass + " w-full"}
                  >
                    <option value="">Any</option>
                    {TYPE_LIST.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {minBst && (
                <p className="mt-1.5 text-[9px] text-[#8b9bb4]">
                  BST filter is checked when you select a Pokemon
                </p>
              )}
            </div>

            <div aria-live="polite">
              {error && (
                <p className="mb-3 text-center text-xs text-[#e8433f]">{error}</p>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {(debouncedQuery || hasAnyFilter) && filtered.length === 0 && !typeLoading && (
                <p className="py-8 text-center text-[#8b9bb4]" aria-live="polite">
                  No Pokemon found
                </p>
              )}

              {filtered.map((p) => {
                const spriteUrl = getSpriteUrl(p.url);
                const hasImgError = imgErrors.has(p.name);
                const id = getIdFromUrl(p.url);

                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelect(p.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#3a4466] transition-colors"
                  >
                    {hasImgError ? (
                      <div className="w-10 h-10 flex items-center justify-center bg-[#1a1c2c] rounded border border-[#3a4466]">
                        <span className="text-lg text-[#3a4466]">?</span>
                      </div>
                    ) : (
                      <Image
                        src={spriteUrl}
                        alt={p.name}
                        width={40}
                        height={40}
                        unoptimized
                        onError={() => setImgErrors((prev) => new Set(prev).add(p.name))}
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="capitalize font-medium font-pixel text-[#f0f0e8]">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-[#8b9bb4]">#{id}</span>
                    </div>
                  </button>
                );
              })}

              {!debouncedQuery && !hasAnyFilter && (
                <p className="py-8 text-center text-[#8b9bb4]">
                  Start typing or use filters to search...
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
