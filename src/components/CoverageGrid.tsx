"use client";

import { useMemo } from "react";
import { TeamSlot, TypeName } from "@/types";
import { TYPE_LIST, getEffectiveness } from "@/data/typeChart";
import { typeColors } from "@/data/typeColors";
import { getCachedMove } from "@/utils/pokeApiClient";

interface CoverageGridProps {
  team: TeamSlot[];
}

const TYPE_ABBR: Record<TypeName, string> = {
  normal: "NOR", fire: "FIR", water: "WAT", electric: "ELE", grass: "GRA",
  ice: "ICE", fighting: "FIG", poison: "POI", ground: "GRO", flying: "FLY",
  psychic: "PSY", bug: "BUG", rock: "ROC", ghost: "GHO", dragon: "DRA",
  dark: "DAR", steel: "STE", fairy: "FAI",
};

type Effectiveness = "se" | "ne" | "re" | "im";

function getLabel(eff: Effectiveness): string {
  switch (eff) { case "se": return "SE"; case "ne": return "—"; case "re": return "R"; case "im": return "X"; }
}

function getEffLabel(eff: Effectiveness): string {
  switch (eff) { case "se": return "super effective"; case "ne": return "neutral"; case "re": return "not very effective"; case "im": return "immune"; }
}

function getCellStyle(eff: Effectiveness): { bg: string; text: string } {
  switch (eff) {
    case "se": return { bg: "#22c55e", text: "#f0f0e8" };
    case "ne": return { bg: "#374151", text: "#6b7280" };
    case "re": return { bg: "#f59e0b", text: "#1a1c2c" };
    case "im": return { bg: "#991b1b", text: "#f0f0e8" };
  }
}

/** Collect all offensive types a slot can use: STAB + selected move types. */
function getSlotOffensiveTypes(slot: TeamSlot): TypeName[] {
  const types = new Set<TypeName>();
  // STAB types
  for (const t of slot.pokemon.types) {
    types.add(t.type.name as TypeName);
  }
  // Selected move types (damaging only)
  if (slot.selectedMoves) {
    for (const moveName of slot.selectedMoves) {
      const move = getCachedMove(moveName);
      if (move && move.damage_class.name !== "status") {
        types.add(move.type.name as TypeName);
      }
    }
  }
  return Array.from(types);
}

/** Best effectiveness any of this slot's offensive types has vs a defending type. */
function bestEffectiveness(offensiveTypes: TypeName[], defendType: TypeName): Effectiveness {
  let best = 0;
  for (const atkType of offensiveTypes) {
    const eff = getEffectiveness(atkType, defendType);
    if (eff > best) best = eff;
  }
  if (best === 0) return "im";
  if (best > 1) return "se";
  if (best < 1) return "re";
  return "ne";
}

interface RowData {
  name: string;
  types: TypeName[];
  cells: Effectiveness[];
}

export default function CoverageGrid({ team }: CoverageGridProps) {
  const rows: RowData[] = useMemo(() => {
    return team.map((slot) => {
      const offTypes = getSlotOffensiveTypes(slot);
      const cells = TYPE_LIST.map((defType) => bestEffectiveness(offTypes, defType));
      return {
        name: slot.pokemon.name,
        types: slot.pokemon.types.map((t) => t.type.name as TypeName),
        cells,
      };
    });
  }, [team]);

  const summary = useMemo(() => {
    return TYPE_LIST.map((_, colIdx) => {
      let count = 0;
      for (const row of rows) {
        if (row.cells[colIdx] === "se") count++;
      }
      return count;
    });
  }, [rows]);

  if (team.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-3 text-lg font-bold font-pixel text-[#f0f0e8]">Move Coverage Grid</h3>
      <div className="overflow-x-auto">
        <table className="w-max border-collapse text-[10px]" role="grid" aria-label="Offensive type coverage grid">
          {/* Column headers */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#262b44] px-2 py-1 text-left text-[#8b9bb4] font-normal min-w-[90px]">
                Pokemon
              </th>
              {TYPE_LIST.map((t) => (
                <th
                  key={t}
                  className="px-1 py-1 text-center font-bold uppercase"
                  style={{ color: typeColors[t] }}
                  title={t}
                >
                  {TYPE_ABBR[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                {/* Row header: Pokemon name + type dots */}
                <td className="sticky left-0 z-10 bg-[#262b44] px-2 py-1 min-w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="capitalize text-[#f0f0e8] text-[11px] font-semibold truncate max-w-[60px]">
                      {row.name}
                    </span>
                    {row.types.map((t) => (
                      <span
                        key={t}
                        className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: typeColors[t] }}
                        title={t}
                      />
                    ))}
                  </div>
                </td>
                {/* Effectiveness cells */}
                {row.cells.map((eff, i) => {
                  const style = getCellStyle(eff);
                  return (
                    <td
                      key={TYPE_LIST[i]}
                      className="px-1 py-1 text-center font-bold"
                      title={`${row.name} vs ${TYPE_LIST[i]}: ${getLabel(eff)}`}
                      aria-label={`${row.name} vs ${TYPE_LIST[i]}: ${getEffLabel(eff)}`}
                    >
                      <div
                        className="mx-auto flex h-5 w-7 items-center justify-center rounded-sm text-[10px]"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {getLabel(eff)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Summary row */}
            <tr className="border-t border-[#3a4466]">
              <td className="sticky left-0 z-10 bg-[#262b44] px-2 py-1.5 text-[11px] font-semibold text-[#8b9bb4]">
                Hits SE
              </td>
              {summary.map((count, i) => {
                const isHole = count === 0;
                return (
                  <td key={TYPE_LIST[i]} className="px-1 py-1.5 text-center">
                    <div
                      className="mx-auto flex h-5 w-7 items-center justify-center rounded-sm text-[10px] font-bold"
                      style={{
                        backgroundColor: isHole ? "#dc2626" : "#1a1c2c",
                        color: isHole ? "#f0f0e8" : count >= 3 ? "#22c55e" : "#8b9bb4",
                      }}
                      title={isHole ? `Coverage hole: no Pokemon hits ${TYPE_LIST[i]} super-effectively` : `${count} Pokemon hit ${TYPE_LIST[i]} SE`}
                    >
                      {count}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#8b9bb4]">
        <div className="flex items-center gap-1">
          <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span>SE = Super Effective</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: "#374151" }} />
          <span>— = Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
          <span>R = Resisted</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: "#991b1b" }} />
          <span>X = Immune</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
          <span>Coverage Hole</span>
        </div>
      </div>
    </div>
  );
}
