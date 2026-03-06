"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot, BaseStats } from "@/types";
import { calculateAllStats, CalculatedStats, DEFAULT_IVS, DEFAULT_EVS } from "@/utils/statsWasm";
import ComparisonStatBars, { STAT_KEYS, STAT_LABELS, POLY_COLORS } from "./ComparisonStatBars";
import ComparisonTypeChart from "./ComparisonTypeChart";

// ── Constants ────────────────────────────────────────────────────────

interface PokemonComparisonProps {
  team: TeamSlot[];
}

// ── Stat extraction helpers ──────────────────────────────────────────

function extractBaseStats(slot: TeamSlot): BaseStats {
  const get = (name: string) =>
    slot.pokemon.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  return {
    hp: get("hp"),
    attack: get("attack"),
    defense: get("defense"),
    spAtk: get("special-attack"),
    spDef: get("special-defense"),
    speed: get("speed"),
  };
}

function getCalculatedStats(slot: TeamSlot): CalculatedStats {
  const base = extractBaseStats(slot);
  const ivs = slot.ivs ?? DEFAULT_IVS;
  const evs = slot.evs ?? DEFAULT_EVS;
  const nature = slot.nature ?? null;
  return calculateAllStats(base, ivs, evs, nature);
}

function getBST(base: BaseStats): number {
  return base.hp + base.attack + base.defense + base.spAtk + base.spDef + base.speed;
}

function getCalcTotal(calc: CalculatedStats): number {
  return calc.hp + calc.attack + calc.defense + calc.spAtk + calc.spDef + calc.speed;
}

// ── Component ────────────────────────────────────────────────────────

export default function PokemonComparison({ team }: PokemonComparisonProps) {
  // Track which team positions are selected for comparison (indices into team[])
  const [selected, setSelected] = useState<Set<number>>(() => {
    const init = new Set<number>();
    if (team.length >= 2) {
      init.add(0);
      init.add(1);
    }
    return init;
  });

  // Keep selection in sync when team shrinks
  const validSelected = useMemo(() => {
    const valid = new Set<number>();
    selected.forEach((i) => {
      if (i < team.length) valid.add(i);
    });
    return valid;
  }, [selected, team.length]);

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < 4) {
        next.add(index);
      }
      return next;
    });
  };

  // Derive the ordered list of selected slots
  const selectedSlots = useMemo(() => {
    return Array.from(validSelected)
      .sort((a, b) => a - b)
      .map((i) => ({ index: i, slot: team[i] }));
  }, [validSelected, team]);

  // Pre-compute stats for all selected Pokemon
  const statsData = useMemo(() => {
    return selectedSlots.map(({ slot }) => ({
      base: extractBaseStats(slot),
      calc: getCalculatedStats(slot),
    }));
  }, [selectedSlots]);

  // ── Not enough Pokemon message ──

  if (team.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#3a4466] bg-[#262b44] p-8 text-center"
      >
        <p className="font-pixel text-sm text-[#8b9bb4]">
          Add at least 2 Pokemon to compare.
        </p>
      </motion.div>
    );
  }

  // Find max value per stat row for highlighting
  const maxPerStat = STAT_KEYS.map((key) => {
    let max = 0;
    statsData.forEach(({ calc }) => {
      const v = calc[key];
      if (v > max) max = v;
    });
    return max;
  });

  const maxBaseStat = STAT_KEYS.map((key) => {
    let max = 0;
    statsData.forEach(({ base }) => {
      const v = base[key];
      if (v > max) max = v;
    });
    return max;
  });

  const maxBST = Math.max(...statsData.map(({ base }) => getBST(base)));
  const maxCalcTotal = Math.max(...statsData.map(({ calc }) => getCalcTotal(calc)));

  // ── Render ──

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Pokemon Selector ── */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 font-pixel text-sm text-[#f0f0e8]">
          Select 2-4 Pokemon to Compare
        </h3>
        <div className="flex flex-wrap gap-3">
          {team.map((slot, i) => {
            const isSelected = validSelected.has(i);
            const sprite =
              slot.pokemon.sprites.other?.["official-artwork"]?.front_default ??
              slot.pokemon.sprites.front_default;

            return (
              <motion.button
                key={`${slot.pokemon.id}-${i}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSelection(i)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  isSelected
                    ? "border-[#e8433f] bg-[#e8433f]/15"
                    : "border-[#3a4466] bg-[#1a1c2c] hover:border-[#8b9bb4]"
                } ${!isSelected && validSelected.size >= 4 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                disabled={!isSelected && validSelected.size >= 4}
              >
                {sprite && (
                  <Image
                    src={sprite}
                    alt={slot.pokemon.name}
                    width={32}
                    height={32}
                    className="pixelated"
                    unoptimized
                  />
                )}
                <span className="font-pixel text-xs capitalize text-[#f0f0e8]">
                  {slot.pokemon.name.replace(/-/g, " ")}
                </span>
                {isSelected && (
                  <span
                    className="ml-1 inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        POLY_COLORS[
                          Array.from(validSelected)
                            .sort((a, b) => a - b)
                            .indexOf(i)
                        ] ?? POLY_COLORS[0],
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Radar Chart + Legend ── */}
      {selectedSlots.length >= 2 && (
        <ComparisonStatBars selectedSlots={selectedSlots} statsData={statsData} />
      )}

      {/* ── Stat Comparison Table ── */}
      {selectedSlots.length >= 2 && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 overflow-x-auto">
          <h3 className="mb-3 font-pixel text-sm text-[#f0f0e8]">Stat Breakdown</h3>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#3a4466]">
                <th className="px-2 py-2 text-left font-pixel text-[#8b9bb4]">Stat</th>
                {selectedSlots.map(({ slot }, si) => (
                  <th
                    key={slot.pokemon.id}
                    className="px-2 py-2 text-center font-pixel capitalize"
                    style={{ color: POLY_COLORS[si % POLY_COLORS.length] }}
                  >
                    {slot.pokemon.name.replace(/-/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_KEYS.map((key, si) => (
                <tr key={key} className="border-b border-[#3a4466]/50">
                  <td className="px-2 py-1.5 font-pixel text-[#8b9bb4]">{STAT_LABELS[si]}</td>
                  {statsData.map(({ base, calc }, pi) => {
                    const baseVal = base[key];
                    const calcVal = calc[key];
                    const isMaxBase = baseVal === maxBaseStat[si] && statsData.length > 1;
                    const isMaxCalc = calcVal === maxPerStat[si] && statsData.length > 1;

                    return (
                      <td key={pi} className="px-2 py-1.5 text-center">
                        <span
                          className="font-pixel"
                          style={{ color: isMaxBase ? "#38b764" : "#f0f0e8" }}
                        >
                          {baseVal}
                        </span>
                        <span className="text-[#8b9bb4]"> / </span>
                        <span
                          className="font-pixel font-bold"
                          style={{ color: isMaxCalc ? "#38b764" : "#f0f0e8" }}
                        >
                          {calcVal}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* BST row */}
              <tr className="border-t border-[#3a4466]">
                <td className="px-2 py-1.5 font-pixel text-[#8b9bb4]">BST</td>
                {statsData.map(({ base, calc }, pi) => {
                  const bst = getBST(base);
                  const total = getCalcTotal(calc);
                  const isMaxBST = bst === maxBST && statsData.length > 1;
                  const isMaxTotal = total === maxCalcTotal && statsData.length > 1;

                  return (
                    <td key={pi} className="px-2 py-1.5 text-center">
                      <span
                        className="font-pixel"
                        style={{ color: isMaxBST ? "#38b764" : "#f0f0e8" }}
                      >
                        {bst}
                      </span>
                      <span className="text-[#8b9bb4]"> / </span>
                      <span
                        className="font-pixel font-bold"
                        style={{ color: isMaxTotal ? "#38b764" : "#f0f0e8" }}
                      >
                        {total}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          <p className="mt-2 font-pixel text-[10px] text-[#8b9bb4]">
            Values shown as base / calculated (Lv.50, IVs, EVs, nature applied)
          </p>
        </div>
      )}

      {/* ── Type Matchup Row ── */}
      {selectedSlots.length >= 2 && (
        <ComparisonTypeChart selectedSlots={selectedSlots} />
      )}
    </motion.div>
  );
}
