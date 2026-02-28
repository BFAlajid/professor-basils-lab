"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot, BaseStats } from "@/types";
import { calculateAllStats, CalculatedStats, DEFAULT_IVS, DEFAULT_EVS } from "@/utils/statsWasm";
import { typeColors } from "@/data/typeColors";

// ── Constants ────────────────────────────────────────────────────────

interface PokemonComparisonProps {
  team: TeamSlot[];
}

const STAT_KEYS = ["hp", "attack", "defense", "spAtk", "spDef", "speed"] as const;
const STAT_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
const POLY_COLORS = ["#e8433f", "#38b764", "#60a5fa", "#f7a838"];
const CALC_MAX = 500;

// ── Geometry helpers ─────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number
): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function buildPolygon(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  max: number
): string {
  return values
    .map((v, i) => {
      const fraction = Math.min(v / max, 1);
      const [x, y] = polarToCartesian(cx, cy, radius * fraction, i, values.length);
      return `${x},${y}`;
    })
    .join(" ");
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

  // ── Radar chart parameters ──

  const chartSize = 320;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const radius = chartSize / 2 - 36;

  // Guide hexagons at 25%, 50%, 75%, 100%
  const guides = [0.25, 0.5, 0.75, 1].map((frac) => {
    return STAT_KEYS.map((_, i) => {
      const [x, y] = polarToCartesian(cx, cy, radius * frac, i, STAT_KEYS.length);
      return `${x},${y}`;
    }).join(" ");
  });

  // Axis lines
  const axisEnds = STAT_KEYS.map((_, i) =>
    polarToCartesian(cx, cy, radius, i, STAT_KEYS.length)
  );

  // Label positions
  const labelPositions = STAT_KEYS.map((_, i) =>
    polarToCartesian(cx, cy, radius + 22, i, STAT_KEYS.length)
  );

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
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h3 className="mb-3 font-pixel text-sm text-[#f0f0e8]">Stat Radar</h3>

          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center">
            {/* SVG radar */}
            <svg
              width={chartSize}
              height={chartSize}
              viewBox={`0 0 ${chartSize} ${chartSize}`}
              className="shrink-0"
            >
              {/* Background */}
              <rect width={chartSize} height={chartSize} fill="#1a1c2c" rx={8} />

              {/* Guide hexagons */}
              {guides.map((pts, i) => (
                <polygon
                  key={i}
                  points={pts}
                  fill="none"
                  stroke="#3a4466"
                  strokeWidth={1}
                  strokeDasharray={i < 3 ? "3,3" : undefined}
                />
              ))}

              {/* Axis lines */}
              {axisEnds.map(([x, y], i) => (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="#3a4466"
                  strokeWidth={1}
                />
              ))}

              {/* Pokemon polygons */}
              {selectedSlots.map(({ slot }, si) => {
                const calc = statsData[si].calc;
                const values = STAT_KEYS.map((k) => calc[k]);
                const pts = buildPolygon(cx, cy, radius, values, CALC_MAX);
                const color = POLY_COLORS[si % POLY_COLORS.length];

                return (
                  <motion.polygon
                    key={slot.pokemon.id}
                    points={pts}
                    fill={color}
                    fillOpacity={0.2}
                    stroke={color}
                    strokeWidth={2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: si * 0.1 }}
                  />
                );
              })}

              {/* Vertex dots for each Pokemon */}
              {selectedSlots.map(({ slot }, si) => {
                const calc = statsData[si].calc;
                const values = STAT_KEYS.map((k) => calc[k]);
                const color = POLY_COLORS[si % POLY_COLORS.length];

                return values.map((v, vi) => {
                  const fraction = Math.min(v / CALC_MAX, 1);
                  const [x, y] = polarToCartesian(cx, cy, radius * fraction, vi, STAT_KEYS.length);
                  return (
                    <circle
                      key={`${slot.pokemon.id}-${vi}`}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={color}
                      stroke="#1a1c2c"
                      strokeWidth={1}
                    />
                  );
                });
              })}

              {/* Stat labels */}
              {labelPositions.map(([x, y], i) => (
                <text
                  key={i}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#8b9bb4"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {STAT_LABELS[i]}
                </text>
              ))}
            </svg>

            {/* Legend */}
            <div className="flex flex-col gap-2">
              {selectedSlots.map(({ slot }, si) => {
                const color = POLY_COLORS[si % POLY_COLORS.length];
                return (
                  <div key={slot.pokemon.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-pixel text-xs capitalize text-[#f0f0e8]">
                      {slot.pokemon.name.replace(/-/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h3 className="mb-3 font-pixel text-sm text-[#f0f0e8]">Type Overview</h3>

          <div className="flex flex-wrap gap-4">
            {selectedSlots.map(({ slot }, si) => {
              const color = POLY_COLORS[si % POLY_COLORS.length];
              return (
                <div
                  key={slot.pokemon.id}
                  className="flex items-center gap-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-pixel text-xs capitalize text-[#f0f0e8]">
                    {slot.pokemon.name.replace(/-/g, " ")}
                  </span>
                  <div className="flex gap-1">
                    {slot.pokemon.types.map((t) => (
                      <span
                        key={t.type.name}
                        className="rounded px-2 py-0.5 font-pixel text-[10px] font-bold uppercase text-white"
                        style={{ backgroundColor: typeColors[t.type.name] }}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
