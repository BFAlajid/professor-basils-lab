"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { TeamSlot, BaseStats } from "@/types";
import { CalculatedStats } from "@/utils/statsWasm";
import { STAT_KEYS, STAT_LABELS_SHORT } from "@/data/constants";

// Re-export for consumers that already import from here
export { STAT_KEYS };
export const STAT_LABELS = STAT_LABELS_SHORT;
export const POLY_COLORS = ["#e8433f", "#38b764", "#60a5fa", "#f7a838"];
export const CALC_MAX = 500;

// ── Geometry helpers ─────────────────────────────────────────────────

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number
): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

export function buildPolygon(
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

// ── Props ────────────────────────────────────────────────────────────

interface ComparisonStatBarsProps {
  selectedSlots: Array<{ index: number; slot: TeamSlot }>;
  statsData: Array<{ base: BaseStats; calc: CalculatedStats }>;
}

// ── Component ────────────────────────────────────────────────────────

export default memo(function ComparisonStatBars({
  selectedSlots,
  statsData,
}: ComparisonStatBarsProps) {
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

  return (
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
              {STAT_LABELS_SHORT[i]}
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
  );
});
