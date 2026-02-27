"use client";

import { useMemo } from "react";
import SVGBarChart from "@/components/charts/SVGBarChart";
import { Pokemon, TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";
import { extractBaseStats } from "@/utils/damageWasm";

interface TeamSummaryProps {
  team: Pokemon[];
}

export default function TeamSummary({ team }: TeamSummaryProps) {
  const stats = useMemo(() => {
    if (team.length === 0) return null;

    const allStats = team.map((p) => {
      const s = extractBaseStats(p);
      return {
        name: p.name,
        total: s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed,
        ...s,
      };
    });

    const avgBST = Math.round(
      allStats.reduce((sum, s) => sum + s.total, 0) / allStats.length
    );

    const highest = (key: keyof ReturnType<typeof extractBaseStats>) => {
      let best = allStats[0];
      for (const s of allStats) {
        if (s[key] > best[key]) best = s;
      }
      return best;
    };

    return {
      avgBST,
      wall: highest("defense"),
      spWall: highest("spDef"),
      physSweeper: highest("attack"),
      spSweeper: highest("spAtk"),
      fastest: highest("speed"),
      tankiest: highest("hp"),
    };
  }, [team]);

  const barData = useMemo(() => {
    const counts: Partial<Record<TypeName, number>> = {};
    for (const p of team) {
      for (const t of p.types) {
        counts[t.type.name] = (counts[t.type.name] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([type, count]) => ({
        label: type,
        value: count!,
        color: typeColors[type as TypeName] || "#8b9bb4",
      }))
      .sort((a, b) => b.value - a.value);
  }, [team]);

  if (!stats || team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to see team statistics
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <h3 className="mb-4 text-lg font-bold font-pixel">Team Statistics</h3>

        <div className="mb-4">
          <span className="text-sm text-[#8b9bb4]">Average BST:</span>{" "}
          <span className="text-2xl font-bold text-[#e8433f]">
            {stats.avgBST}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          {[
            { label: "Physical Wall", pokemon: stats.wall, stat: `DEF ${stats.wall.defense}` },
            { label: "Special Wall", pokemon: stats.spWall, stat: `SPD ${stats.spWall.spDef}` },
            { label: "Physical Sweeper", pokemon: stats.physSweeper, stat: `ATK ${stats.physSweeper.attack}` },
            { label: "Special Sweeper", pokemon: stats.spSweeper, stat: `SPA ${stats.spSweeper.spAtk}` },
            { label: "Fastest", pokemon: stats.fastest, stat: `SPE ${stats.fastest.speed}` },
            { label: "Tankiest", pokemon: stats.tankiest, stat: `HP ${stats.tankiest.hp}` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-[#1a1c2c] p-3"
            >
              <p className="text-xs text-[#8b9bb4]">{item.label}</p>
              <p className="capitalize font-semibold">{item.pokemon.name}</p>
              <p className="text-xs text-[#e8433f]">{item.stat}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Type distribution bar chart */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <h3 className="mb-4 text-lg font-bold font-pixel">Type Distribution</h3>
        <SVGBarChart data={barData} height={200} />
      </div>
    </div>
  );
}
