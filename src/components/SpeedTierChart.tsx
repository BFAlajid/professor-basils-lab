"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TeamSlot } from "@/types";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import { extractBaseStats } from "@/utils/damage";
// ── Props ─────────────────────────────────────────────────────────────

interface SpeedTierChartProps {
  team: TeamSlot[];
}

// ── Common competitive threats (base Speed stats) ─────────────────────

const COMMON_THREATS = [
  { name: "Dragapult", baseSpe: 142 },
  { name: "Weavile", baseSpe: 125 },
  { name: "Garchomp", baseSpe: 102 },
  { name: "Volcarona", baseSpe: 100 },
  { name: "Excadrill", baseSpe: 88 },
  { name: "Toxapex", baseSpe: 35 },
  { name: "Ferrothorn", baseSpe: 20 },
];

// Max speed at level 50: 31 IV, 252 EV, +Spe nature (×1.1)
function calcThreatMaxSpeed(baseSpe: number): number {
  return Math.floor(
    Math.floor((2 * baseSpe + 31 + 252 / 4) * 50 / 100 + 5) * 1.1
  );
}

const THREAT_ENTRIES = COMMON_THREATS.map((t) => ({
  name: t.name,
  speed: calcThreatMaxSpeed(t.baseSpe),
  isThreat: true as const,
}));

// ── Speed modifiers ───────────────────────────────────────────────────

type SpeedModifier = "base" | "+1" | "scarf" | "paralyzed" | "tailwind";

const MODIFIER_OPTIONS: { key: SpeedModifier; label: string; mult: number }[] = [
  { key: "base", label: "Base", mult: 1 },
  { key: "+1", label: "+1", mult: 1.5 },
  { key: "scarf", label: "Scarf", mult: 1.5 },
  { key: "paralyzed", label: "Paralyzed", mult: 0.5 },
  { key: "tailwind", label: "Tailwind", mult: 2 },
];

// ── Helpers ───────────────────────────────────────────────────────────

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Component ─────────────────────────────────────────────────────────

export default function SpeedTierChart({ team }: SpeedTierChartProps) {
  const [modifier, setModifier] = useState<SpeedModifier>("base");

  const mult = MODIFIER_OPTIONS.find((m) => m.key === modifier)!.mult;

  // Build combined entries (team + threats)
  const entries = useMemo(() => {
    const teamEntries = team.map((slot) => {
      const baseStats = extractBaseStats(slot.pokemon);
      const ivs = slot.ivs ?? DEFAULT_IVS;
      const evs = slot.evs ?? DEFAULT_EVS;
      const nature = slot.nature ?? null;
      const calc = calculateAllStats(baseStats, ivs, evs, nature);
      const adjustedSpeed = Math.floor(calc.speed * mult);

      return {
        name: formatName(slot.pokemon.name),
        speed: adjustedSpeed,
        isThreat: false as const,
      };
    });

    // Threats are always at their base max speed (no modifier)
    const all = [...teamEntries, ...THREAT_ENTRIES];
    all.sort((a, b) => b.speed - a.speed);
    return all;
  }, [team, mult]);

  const maxSpeed = entries.length > 0 ? entries[0].speed : 1;

  if (team.length === 0) {
    return (
      <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
        <h3 className="text-[#f0f0e8] text-sm mb-2">Speed Tiers</h3>
        <p className="text-[#8b9bb4] text-xs">
          Add Pokemon to your team to compare speed tiers.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
      <h3 className="text-[#f0f0e8] text-sm mb-3">Speed Tiers</h3>

      {/* Modifier toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODIFIER_OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded border transition-colors ${
              modifier === opt.key
                ? "bg-[#3a4466] border-[#5b6e8f] text-[#f0f0e8]"
                : "border-[#3a4466] text-[#8b9bb4] hover:border-[#5b6e8f]"
            }`}
          >
            <input
              type="radio"
              name="speed-modifier"
              value={opt.key}
              checked={modifier === opt.key}
              onChange={() => setModifier(opt.key)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Speed bars */}
      <div className="space-y-1.5">
        {entries.map((entry, i) => {
          const pct = maxSpeed > 0 ? (entry.speed / maxSpeed) * 100 : 0;
          const isTeam = !entry.isThreat;

          return (
            <div key={`${entry.name}-${entry.isThreat}-${i}`} className="flex items-center gap-2">
              {/* Pokemon name */}
              <span
                className={`text-xs w-24 truncate text-right shrink-0 ${
                  isTeam ? "text-[#f0f0e8]" : "text-[#e8433f]"
                }`}
                title={entry.name}
              >
                {entry.name}
              </span>

              {/* Bar container */}
              <div className="flex-1 h-4 bg-[#1a1c2c] rounded-sm overflow-hidden relative">
                <motion.div
                  className="h-full rounded-sm"
                  style={{
                    backgroundColor: isTeam ? "#38b764" : "#e8433f33",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Speed value */}
              <span
                className={`text-xs w-8 text-right shrink-0 tabular-nums ${
                  isTeam ? "text-[#f0f0e8]" : "text-[#e8433f]"
                }`}
              >
                {entry.speed}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-[#8b9bb4]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-[#38b764]" />
          Your team
          {modifier !== "base" && (
            <span className="text-[#5b6e8f]">
              {" "}({MODIFIER_OPTIONS.find((m) => m.key === modifier)!.label})
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-[#e8433f33]" />
          Threats (max speed)
        </span>
      </div>
    </div>
  );
}
