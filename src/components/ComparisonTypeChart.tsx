"use client";

import { memo } from "react";
import { TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import { POLY_COLORS } from "./ComparisonStatBars";

// ── Props ────────────────────────────────────────────────────────────

interface ComparisonTypeChartProps {
  selectedSlots: Array<{ index: number; slot: TeamSlot }>;
}

// ── Component ────────────────────────────────────────────────────────

export default memo(function ComparisonTypeChart({
  selectedSlots,
}: ComparisonTypeChartProps) {
  return (
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
  );
});
