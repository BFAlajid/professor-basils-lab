"use client";

import { useState, useMemo } from "react";
import SVGRadar from "@/components/charts/SVGRadar";
import { TeamSlot } from "@/types";
import { extractBaseStats } from "@/utils/damageWasm";

const STAT_LABELS = ["HP", "Attack", "Defense", "Sp.Atk", "Sp.Def", "Speed"];
const COLORS = ["#e8433f", "#3B82F6", "#38b764", "#F59E0B", "#8B5CF6", "#EC4899"];

interface StatRadarProps {
  team: TeamSlot[];
}

export default function StatRadar({ team }: StatRadarProps) {
  const [visible, setVisible] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    team.forEach((_, i) => {
      init[i] = true;
    });
    return init;
  });

  const datasets = useMemo(() => {
    return team.map((slot, i) => {
      const stats = extractBaseStats(slot.pokemon);
      return {
        label: slot.pokemon.name,
        values: [stats.hp, stats.attack, stats.defense, stats.spAtk, stats.spDef, stats.speed],
        color: COLORS[i % COLORS.length],
        visible: visible[i] !== false,
      };
    });
  }, [team, visible]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to compare stats
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-lg font-bold font-pixel">Stat Comparison</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {team.map((slot, i) => (
          <label
            key={slot.pokemon.id}
            className="flex items-center gap-1.5 cursor-pointer text-sm"
          >
            <input
              type="checkbox"
              checked={visible[i] !== false}
              onChange={() =>
                setVisible((prev) => ({ ...prev, [i]: !prev[i] }))
              }
              className="accent-[#e8433f]"
            />
            <span
              className="capitalize"
              style={{ color: COLORS[i % COLORS.length] }}
            >
              {slot.pokemon.name}
            </span>
          </label>
        ))}
      </div>

      <SVGRadar labels={STAT_LABELS} datasets={datasets} maxValue={255} />
    </div>
  );
}
