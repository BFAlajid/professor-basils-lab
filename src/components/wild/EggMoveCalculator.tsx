"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchEggMoves, EggMoveChain } from "@/utils/eggMoves";

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSpriteUrl(idOrName: string | number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${idOrName}.png`;
}

function extractId(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return parseInt(parts[parts.length - 1], 10);
}

export default function EggMoveCalculator() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [eggMoves, setEggMoves] = useState<EggMoveChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: pokemonList } = usePokemonList();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    if (!pokemonList || !debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    return pokemonList.filter((p) => p.name.includes(q)).slice(0, 15);
  }, [pokemonList, debouncedQuery]);

  const handleSelect = useCallback(async (name: string, url: string) => {
    const id = extractId(url);
    setSelectedId(id);
    setSelectedName(name);
    setQuery("");
    setDebouncedQuery("");
    setShowDropdown(false);
    setLoading(true);
    try {
      const moves = await fetchEggMoves(id);
      setEggMoves(moves);
    } catch {
      setEggMoves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Egg Move Calculator</h3>

      {/* Search */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search Pokemon..."
          aria-label="Search Pokemon for egg moves"
          className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f] transition-colors"
        />

        <AnimatePresence>
          {showDropdown && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-10 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] max-h-48 overflow-y-auto shadow-xl"
            >
              {filtered.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelect(p.name, p.url)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#3a4466] transition-colors"
                  aria-label={`Select ${formatName(p.name)}`}
                >
                  <Image
                    src={getSpriteUrl(extractId(p.url))}
                    alt={p.name}
                    width={28}
                    height={28}
                    unoptimized
                  />
                  <span className="capitalize text-xs font-pixel text-[#f0f0e8]">
                    {p.name}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Pokemon header */}
      {selectedId && (
        <div className="flex items-center gap-3 bg-[#1a1c2c] rounded-lg p-2 border border-[#3a4466]">
          <Image
            src={getSpriteUrl(selectedId)}
            alt={selectedName}
            width={40}
            height={40}
            unoptimized
          />
          <div>
            <p className="text-[#f0f0e8] text-xs font-pixel capitalize">{selectedName}</p>
            <p className="text-[#8b9bb4] text-[10px]">#{selectedId}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-2 py-4">
          <p className="text-[#8b9bb4] font-pixel text-xs text-center">Fetching egg moves...</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-[#3a4466] rounded w-full" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && selectedId && eggMoves.length === 0 && (
        <p className="text-[#8b9bb4] text-xs font-pixel text-center py-4">
          No egg moves found for {formatName(selectedName)}.
        </p>
      )}

      {!loading && eggMoves.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {eggMoves.map((em) => (
            <motion.div
              key={em.moveName}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg bg-[#1a1c2c] border border-[#3a4466] p-3"
            >
              <p className="text-[#f0f0e8] text-xs font-pixel mb-1.5">
                {formatName(em.moveName)}
              </p>

              {em.parents.length === 0 ? (
                <p className="text-[#8b9bb4] text-[10px]">
                  No compatible parents found in sample.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {em.parents.map((parent) => (
                    <div
                      key={`${parent.speciesName}-${em.moveName}`}
                      className="flex items-center gap-1 bg-[#262b44] rounded px-2 py-1 border border-[#3a4466]"
                    >
                      <span className="text-[#f0f0e8] text-[10px] capitalize">
                        {parent.speciesName}
                      </span>
                      <span className="text-[#8b9bb4] text-[9px]">
                        ({parent.learnMethod})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!selectedId && !loading && (
        <p className="text-[#8b9bb4] text-xs text-center py-6">
          Select a Pokemon to view its egg moves and breeding chains.
        </p>
      )}
    </div>
  );
}
