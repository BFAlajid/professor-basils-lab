"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pokemon, IVSpread } from "@/types";
import { calculateAllStats, DEFAULT_EVS } from "@/utils/stats";
import { extractBaseStats } from "@/utils/damage";

interface IVOptimizerProps {
  pokemon: Pokemon;
  currentIvs: IVSpread;
  onApply: (ivs: IVSpread) => void;
}

type Role = "physical" | "special" | "mixed" | "trickroom";

const ROLE_SPREADS: Record<Role, { label: string; ivs: IVSpread }> = {
  physical: {
    label: "Physical Attacker",
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 0, spDef: 31, speed: 31 },
  },
  special: {
    label: "Special Attacker",
    ivs: { hp: 31, attack: 0, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
  },
  mixed: {
    label: "Mixed Attacker",
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
  },
  trickroom: {
    label: "Trick Room",
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 0 },
  },
};

const STAT_LABELS: { key: keyof IVSpread; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAtk", label: "SpA" },
  { key: "spDef", label: "SpD" },
  { key: "speed", label: "Spe" },
];

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function IVOptimizer({ pokemon, currentIvs, onApply }: IVOptimizerProps) {
  const [selectedRole, setSelectedRole] = useState<Role>("mixed");

  const baseStats = useMemo(() => extractBaseStats(pokemon), [pokemon]);

  const suggested = ROLE_SPREADS[selectedRole].ivs;

  const currentStats = useMemo(
    () => calculateAllStats(baseStats, currentIvs, DEFAULT_EVS, null),
    [baseStats, currentIvs]
  );

  const suggestedStats = useMemo(
    () => calculateAllStats(baseStats, suggested, DEFAULT_EVS, null),
    [baseStats, suggested]
  );

  const hasChanges = STAT_LABELS.some(
    ({ key }) => currentIvs[key] !== suggested[key]
  );

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 font-pixel">
      <h3 className="text-sm font-bold text-[#f0f0e8] mb-3">
        IV Optimizer
        <span className="text-[#8b9bb4] font-normal ml-2 text-xs capitalize">
          {formatName(pokemon.name)}
        </span>
      </h3>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
        {(Object.entries(ROLE_SPREADS) as [Role, typeof ROLE_SPREADS[Role]][]).map(
          ([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelectedRole(key)}
              className={`rounded-lg px-3 py-2 text-xs transition-colors ${
                selectedRole === key
                  ? "bg-[#e8433f] text-[#f0f0e8]"
                  : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466]"
              }`}
              aria-label={`Select ${label} role`}
              aria-pressed={selectedRole === key ? "true" : "false"}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Stat comparison table */}
      <div className="rounded-lg bg-[#1a1c2c] border border-[#3a4466] overflow-hidden">
        <div className="grid grid-cols-4 gap-0 text-[10px] text-[#8b9bb4] px-3 py-1.5 border-b border-[#3a4466]">
          <span>Stat</span>
          <span className="text-center">Current IV</span>
          <span className="text-center">Suggested IV</span>
          <span className="text-center">Stat Diff</span>
        </div>
        {STAT_LABELS.map(({ key, label }) => {
          const diff = suggestedStats[key] - currentStats[key];
          const ivChanged = currentIvs[key] !== suggested[key];

          return (
            <motion.div
              key={key}
              className="grid grid-cols-4 gap-0 text-xs px-3 py-1.5 border-b border-[#3a4466]/40 last:border-b-0"
              animate={ivChanged ? { backgroundColor: "#3a446630" } : {}}
            >
              <span className="text-[#f0f0e8]">{label}</span>
              <span className="text-center text-[#8b9bb4] tabular-nums">
                {currentIvs[key]}
              </span>
              <span
                className={`text-center tabular-nums ${
                  ivChanged ? "text-[#f7a838]" : "text-[#8b9bb4]"
                }`}
              >
                {suggested[key]}
              </span>
              <span
                className={`text-center tabular-nums ${
                  diff > 0
                    ? "text-[#38b764]"
                    : diff < 0
                    ? "text-[#e8433f]"
                    : "text-[#8b9bb4]"
                }`}
              >
                {diff > 0 ? `+${diff}` : diff === 0 ? "--" : diff}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Explanation */}
      <p className="text-[10px] text-[#8b9bb4] mt-2">
        {selectedRole === "physical" &&
          "0 SpA IV minimizes confusion and Foul Play-like damage."}
        {selectedRole === "special" &&
          "0 Atk IV minimizes confusion and Foul Play damage taken."}
        {selectedRole === "mixed" && "All 31 IVs for maximum offensive versatility."}
        {selectedRole === "trickroom" &&
          "0 Spe IV ensures you move first under Trick Room."}
      </p>

      {/* Apply button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <button
              onClick={() => onApply(suggested)}
              className="w-full rounded-lg bg-[#38b764] px-4 py-2 text-xs font-bold text-[#f0f0e8] hover:bg-[#2d9950] transition-colors"
              aria-label={`Apply ${ROLE_SPREADS[selectedRole].label} IV spread`}
            >
              Apply {ROLE_SPREADS[selectedRole].label} IVs
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
