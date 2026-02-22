"use client";

import { useState, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TeamSlot } from "@/types";
import { extractBaseStats } from "@/utils/damage";

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

  const data = useMemo(() => {
    return STAT_LABELS.map((label, i) => {
      const entry: Record<string, string | number> = { stat: label };
      team.forEach((slot) => {
        const stats = extractBaseStats(slot.pokemon);
        const values = [
          stats.hp,
          stats.attack,
          stats.defense,
          stats.spAtk,
          stats.spDef,
          stats.speed,
        ];
        entry[slot.pokemon.name] = values[i];
      });
      return entry;
    });
  }, [team]);

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

      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data}>
          <PolarGrid stroke="#3a4466" />
          <PolarAngleAxis dataKey="stat" tick={{ fill: "#8b9bb4", fontSize: 12 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 255]}
            tick={{ fill: "#8b9bb4", fontSize: 10 }}
            axisLine={false}
          />
          {team.map((slot, i) =>
            visible[i] !== false ? (
              <Radar
                key={slot.pokemon.id}
                name={slot.pokemon.name}
                dataKey={slot.pokemon.name}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ) : null
          )}
          <Legend
            wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
