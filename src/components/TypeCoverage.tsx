"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Pokemon, TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";
import { TYPE_LIST } from "@/data/typeChart";
import {
  analyzeDefensiveCoverage,
  getWeaknesses,
  getResistances,
  getOffensiveCoverage,
} from "@/utils/coverage";
import TypeBadge from "./TypeBadge";

interface TypeCoverageProps {
  team: Pokemon[];
}

export default function TypeCoverage({ team }: TypeCoverageProps) {
  const coverage = useMemo(() => analyzeDefensiveCoverage(team), [team]);
  const weaknesses = useMemo(() => getWeaknesses(coverage), [coverage]);
  const resistances = useMemo(() => getResistances(coverage), [coverage]);
  const offensiveCov = useMemo(() => getOffensiveCoverage(coverage), [coverage]);

  if (team.length < 2) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add at least 2 Pokemon to see type coverage analysis
      </div>
    );
  }

  const getColor = (status: "resist" | "weak" | "neutral") => {
    switch (status) {
      case "resist":
        return "#38b764";
      case "weak":
        return "#e8433f";
      case "neutral":
        return "#f7a838";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <h3 className="mb-4 text-lg font-bold font-pixel">Defensive Coverage</h3>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-18">
          {coverage.map((c) => (
            <motion.div
              key={c.type}
              whileHover={{ scale: 1.15 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[10px] font-bold uppercase text-[#f0f0e8]"
                style={{ backgroundColor: getColor(c.defensiveStatus) }}
                title={`${c.type}: ${c.defensiveStatus}`}
              >
                {c.type.slice(0, 3)}
              </div>
              <div
                className="h-1 w-full rounded-full"
                style={{ backgroundColor: typeColors[c.type] }}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#38b764]" />
            <span className="text-[#8b9bb4]">Resists</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#f7a838]" />
            <span className="text-[#8b9bb4]">Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#e8433f]" />
            <span className="text-[#8b9bb4]">Weak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h4 className="mb-3 text-sm font-semibold text-[#e8433f]">
            Weak to ({weaknesses.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {weaknesses.length === 0 ? (
              <span className="text-sm text-[#8b9bb4]">
                No unresisted weaknesses!
              </span>
            ) : (
              weaknesses.map((t) => <TypeBadge key={t} type={t} size="sm" />)
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h4 className="mb-3 text-sm font-semibold text-[#38b764]">
            STAB Coverage ({offensiveCov.length}/{TYPE_LIST.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {offensiveCov.length === 0 ? (
              <span className="text-sm text-[#8b9bb4]">No STAB coverage</span>
            ) : (
              offensiveCov.map((t) => <TypeBadge key={t} type={t} size="sm" />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
