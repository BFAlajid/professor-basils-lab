"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PokedexFilterConfig,
  DEFAULT_FILTER_CONFIG,
} from "@/utils/pokedexFilterEngine";

// ── Constants ──────────────────────────────────────────────────────

const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

const STAT_LABELS: { key: StatSliderKey; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAttack", label: "SpA" },
  { key: "spDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
];

type StatSliderKey = "hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed";

const SORT_OPTIONS: { value: PokedexFilterConfig["sortBy"]; label: string }[] = [
  { value: "dex", label: "Dex #" },
  { value: "name", label: "Name" },
  { value: "bst", label: "BST" },
];

// ── Props ──────────────────────────────────────────────────────────

interface PokedexFiltersProps {
  config: PokedexFilterConfig;
  onChange: (config: PokedexFilterConfig) => void;
}

// ── Component ──────────────────────────────────────────────────────

export default function PokedexFilters({ config, onChange }: PokedexFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helpers to patch a single field
  const patch = useCallback(
    (partial: Partial<PokedexFilterConfig>) => {
      onChange({ ...config, ...partial });
    },
    [config, onChange],
  );

  const setStatThreshold = useCallback(
    (key: StatSliderKey, value: number) => {
      const next = { ...config.statThresholds };
      if (value === 0) {
        delete next[key];
      } else {
        next[key] = value;
      }
      patch({ statThresholds: next });
    },
    [config.statThresholds, patch],
  );

  const clearFilters = useCallback(() => {
    onChange({ ...DEFAULT_FILTER_CONFIG });
  }, [onChange]);

  const toggleDirection = useCallback(() => {
    patch({ sortDirection: config.sortDirection === "asc" ? "desc" : "asc" });
  }, [config.sortDirection, patch]);

  // Check if any filters are active (for indicator dot)
  const hasActiveFilters =
    config.typeFilter !== null ||
    config.dualTypeFilter !== null ||
    config.generationRange !== null ||
    config.minBST !== null ||
    config.maxBST !== null ||
    Object.keys(config.statThresholds).length > 0 ||
    config.abilitySearch.length > 0;

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-[#3a4466] bg-[#262b44] px-4 py-2.5 text-sm font-pixel text-[#f0f0e8] transition-colors hover:bg-[#3a4466]"
      >
        <span className="flex items-center gap-2">
          Filters
          {hasActiveFilters && (
            <span className="inline-block h-2 w-2 rounded-full bg-[#e8433f]" />
          )}
        </span>
        <span
          className="inline-block transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {/* Collapsible panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-4 rounded-lg border border-[#3a4466] bg-[#262b44] p-4">
              {/* ── Row 1: Type filters ──────────────── */}
              <div className="flex flex-wrap gap-3">
                {/* Primary type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                    Type
                  </label>
                  <select
                    value={config.typeFilter ?? ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      patch({
                        typeFilter: val,
                        // Reset dual type when primary changes
                        dualTypeFilter: val === null ? null : config.dualTypeFilter,
                      });
                    }}
                    className="rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] font-pixel outline-none focus:border-[#e8433f] transition-colors"
                  >
                    <option value="">Any</option>
                    {ALL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dual type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                    2nd Type
                  </label>
                  <select
                    value={config.dualTypeFilter ?? ""}
                    disabled={config.typeFilter === null}
                    onChange={(e) => patch({ dualTypeFilter: e.target.value || null })}
                    className="rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] font-pixel outline-none focus:border-[#e8433f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">Any</option>
                    {ALL_TYPES.filter((t) => t !== config.typeFilter).map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Row 2: BST range ─────────────────── */}
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                    Min BST
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1500}
                    value={config.minBST ?? ""}
                    placeholder="0"
                    onChange={(e) =>
                      patch({ minBST: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-24 rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] font-pixel outline-none focus:border-[#e8433f] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                    Max BST
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1500}
                    value={config.maxBST ?? ""}
                    placeholder="1500"
                    onChange={(e) =>
                      patch({ maxBST: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-24 rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] font-pixel outline-none focus:border-[#e8433f] transition-colors"
                  />
                </div>
              </div>

              {/* ── Row 3: Stat threshold sliders ────── */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                  Stat Thresholds
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {STAT_LABELS.map(({ key, label }) => {
                    const value = config.statThresholds[key] ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-8 text-[10px] font-pixel text-[#8b9bb4]">
                          {label}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={255}
                          value={value}
                          onChange={(e) => setStatThreshold(key, Number(e.target.value))}
                          className="flex-1 accent-[#e8433f]"
                        />
                        <span className="w-8 text-right text-[10px] font-pixel text-[#f0f0e8]">
                          {value > 0 ? value : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Row 4: Ability search ────────────── */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                  Ability
                </label>
                <input
                  type="text"
                  value={config.abilitySearch}
                  placeholder="Search ability..."
                  onChange={(e) => patch({ abilitySearch: e.target.value })}
                  className="w-full max-w-xs rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] placeholder-[#8b9bb4] font-pixel outline-none focus:border-[#e8433f] transition-colors"
                />
              </div>

              {/* ── Row 5: Sort + Clear ──────────────── */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Sort by */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#8b9bb4] font-pixel">
                    Sort By
                  </label>
                  <select
                    value={config.sortBy}
                    onChange={(e) =>
                      patch({ sortBy: e.target.value as PokedexFilterConfig["sortBy"] })
                    }
                    className="rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] font-pixel outline-none focus:border-[#e8433f] transition-colors"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Direction toggle */}
                <button
                  onClick={toggleDirection}
                  className="rounded border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs font-pixel text-[#f0f0e8] transition-colors hover:bg-[#3a4466]"
                  title={config.sortDirection === "asc" ? "Ascending" : "Descending"}
                >
                  {config.sortDirection === "asc" ? "▲ Asc" : "▼ Desc"}
                </button>

                {/* Clear filters */}
                <button
                  onClick={clearFilters}
                  className="ml-auto rounded border border-[#e8433f]/40 bg-[#e8433f]/10 px-3 py-1.5 text-xs font-pixel text-[#e8433f] transition-colors hover:bg-[#e8433f]/20"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
