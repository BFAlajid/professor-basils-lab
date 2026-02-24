"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchHabitat, HabitatEntry } from "@/utils/habitatDex";

const REGION_COLORS: Record<string, string> = {
  kanto: "#e8433f",
  johto: "#f7a838",
  hoenn: "#38b764",
  sinnoh: "#60a5fa",
  unova: "#6366f1",
  kalos: "#ec4899",
  alola: "#f59e0b",
  galar: "#14b8a6",
  paldea: "#f97316",
};

interface HabitatDexProps {
  knownPokemon?: { id: number; name: string }[];
}

export default function HabitatDex({ knownPokemon = [] }: HabitatDexProps) {
  const [query, setQuery] = useState("");
  const [selectedPokemon, setSelectedPokemon] = useState<{ id: number; name: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredPokemon = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return knownPokemon
      .filter((p) => p.name.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [query, knownPokemon]);

  const habitatResults = useMemo(() => {
    if (!selectedPokemon) return [];
    return searchHabitat(selectedPokemon.id);
  }, [selectedPokemon]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (pokemon: { id: number; name: string }) => {
    setSelectedPokemon(pokemon);
    setQuery(pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1));
    setShowDropdown(false);
  };

  const maxRate = useMemo(() => {
    if (habitatResults.length === 0) return 100;
    return Math.max(...habitatResults.map((h) => h.encounterRate));
  }, [habitatResults]);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Habitat Dex</h3>
      <p className="text-[10px] text-[#8b9bb4]">Search where a Pokemon can be found in the wild.</p>

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            if (!e.target.value.trim()) setSelectedPokemon(null);
          }}
          onFocus={() => {
            if (query.trim()) setShowDropdown(true);
          }}
          placeholder="Type a Pokemon name..."
          className="w-full bg-[#1a1c2c] border border-[#3a4466] rounded-lg px-3 py-2 text-xs font-pixel text-[#f0f0e8] placeholder-[#3a4466] outline-none focus:border-[#60a5fa] transition-colors"
        />

        {/* Dropdown */}
        <AnimatePresence>
          {showDropdown && filteredPokemon.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden shadow-lg"
            >
              {filteredPokemon.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] hover:bg-[#262b44] transition-colors flex items-center gap-2"
                >
                  <span className="text-[#8b9bb4] text-[9px] w-8">#{p.id}</span>
                  <span>{p.name.charAt(0).toUpperCase() + p.name.slice(1)}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {selectedPokemon && (
          <motion.div
            key={selectedPokemon.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-pixel text-[#8b9bb4]">
              Locations for{" "}
              <span className="text-[#f7a838]">
                {selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1)}
              </span>
            </p>

            {habitatResults.length === 0 ? (
              <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-lg p-4 text-center">
                <p className="text-xs font-pixel text-[#8b9bb4]">No wild encounters found</p>
                <p className="text-[9px] text-[#3a4466] mt-1">
                  This Pokemon may only be available through other methods.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {habitatResults.map((entry) => (
                  <HabitatRow key={entry.areaId} entry={entry} maxRate={maxRate} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HabitatRow({ entry, maxRate }: { entry: HabitatEntry; maxRate: number }) {
  const regionColor = REGION_COLORS[entry.region] || "#8b9bb4";
  const barWidth = Math.max((entry.encounterRate / maxRate) * 100, 4);

  return (
    <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-lg px-3 py-2 flex items-center gap-2">
      {/* Region badge */}
      <span
        className="text-[8px] font-pixel px-1.5 py-0.5 rounded shrink-0"
        style={{ backgroundColor: regionColor + "22", color: regionColor, border: `1px solid ${regionColor}44` }}
      >
        {entry.region.charAt(0).toUpperCase() + entry.region.slice(1)}
      </span>

      {/* Area name */}
      <span className="text-[10px] font-pixel text-[#f0f0e8] shrink-0 min-w-[80px]">
        {entry.areaName}
      </span>

      {/* Encounter rate bar */}
      <div className="flex-1 flex items-center gap-1.5">
        <div className="flex-1 h-2 bg-[#262b44] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${barWidth}%`,
              backgroundColor: regionColor,
            }}
          />
        </div>
        <span className="text-[8px] font-pixel text-[#8b9bb4] w-7 text-right shrink-0">
          {entry.encounterRate}%
        </span>
      </div>

      {/* Level range */}
      <span className="text-[9px] font-pixel text-[#8b9bb4] shrink-0">
        Lv. {entry.minLevel}-{entry.maxLevel}
      </span>
    </div>
  );
}
