"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";

type LearnMethod = "level-up" | "machine" | "egg" | "tutor";
type SortKey = "level" | "power" | "type" | "name";

interface MoveEntry {
  name: string;
  displayName: string;
  type: TypeName;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: "physical" | "special" | "status";
  learnMethod: LearnMethod;
  levelLearnedAt: number;
}

const TAB_CONFIG: { key: LearnMethod; label: string; color: string }[] = [
  { key: "level-up", label: "Level Up", color: "#38b764" },
  { key: "machine", label: "TM/HM", color: "#4a90d9" },
  { key: "egg", label: "Egg", color: "#f7a838" },
  { key: "tutor", label: "Tutor", color: "#a040a0" },
];

const DAMAGE_CLASS_ICONS: Record<string, string> = {
  physical: "PHY",
  special: "SPC",
  status: "STS",
};

const DAMAGE_CLASS_COLORS: Record<string, string> = {
  physical: "#e8433f",
  special: "#4a90d9",
  status: "#8b9bb4",
};

interface MoveTableProps {
  filteredMoves: MoveEntry[];
  tabCounts: Record<LearnMethod, number>;
  activeTab: LearnMethod;
  sortKey: SortKey;
  onTabChange: (tab: LearnMethod) => void;
  onSortChange: (key: SortKey) => void;
}

export default function MoveTable({
  filteredMoves,
  tabCounts,
  activeTab,
  sortKey,
  onTabChange,
  onSortChange,
}: MoveTableProps) {
  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-pixel transition-colors ${
              activeTab === tab.key
                ? "text-[#f0f0e8] border border-current"
                : "text-[#8b9bb4] bg-[#1a1c2c] border border-[#3a4466] hover:text-[#f0f0e8]"
            }`}
            style={
              activeTab === tab.key
                ? { backgroundColor: `${tab.color}20`, borderColor: tab.color, color: tab.color }
                : undefined
            }
            aria-label={`${tab.label} moves (${tabCounts[tab.key]})`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-[#8b9bb4] text-[10px]">Sort:</span>
        {(["level", "power", "type", "name"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onSortChange(key)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              sortKey === key
                ? "bg-[#3a4466] text-[#f0f0e8]"
                : "text-[#8b9bb4] hover:text-[#f0f0e8]"
            }`}
            aria-label={`Sort by ${key}`}
          >
            {key === "level" ? "Lv" : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Move list */}
      <div className="max-h-96 overflow-y-auto space-y-1">
        <AnimatePresence mode="popLayout">
          {filteredMoves.length === 0 && (
            <p className="text-[#8b9bb4] text-xs text-center py-4">
              No {TAB_CONFIG.find((t) => t.key === activeTab)?.label} moves.
            </p>
          )}
          {filteredMoves.map((move, i) => (
            <motion.div
              key={`${move.name}-${move.learnMethod}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-2 rounded-lg bg-[#1a1c2c] border border-[#3a4466] px-3 py-1.5"
            >
              {/* Level */}
              {activeTab === "level-up" && (
                <span className="text-[#8b9bb4] text-[10px] w-7 text-right shrink-0">
                  {move.levelLearnedAt > 0 ? `${move.levelLearnedAt}` : "--"}
                </span>
              )}

              {/* Type badge */}
              <span
                className="text-[9px] font-semibold uppercase tracking-wide text-[#f0f0e8] rounded-full px-1.5 py-0.5 shrink-0"
                style={{ backgroundColor: typeColors[move.type] }}
              >
                {move.type}
              </span>

              {/* Name */}
              <span className="text-[#f0f0e8] text-xs font-pixel flex-1 truncate">
                {move.displayName}
              </span>

              {/* Damage class */}
              <span
                className="text-[9px] font-bold shrink-0"
                style={{ color: DAMAGE_CLASS_COLORS[move.damageClass] }}
                aria-label={move.damageClass}
              >
                {DAMAGE_CLASS_ICONS[move.damageClass]}
              </span>

              {/* Power */}
              <span className="text-[#f0f0e8] text-[10px] w-7 text-right shrink-0">
                {move.power ?? "--"}
              </span>

              {/* Accuracy */}
              <span className="text-[#8b9bb4] text-[10px] w-8 text-right shrink-0">
                {move.accuracy ? `${move.accuracy}%` : "--"}
              </span>

              {/* PP */}
              <span className="text-[#8b9bb4] text-[10px] w-6 text-right shrink-0">
                {move.pp ?? "--"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 border-t border-[#3a4466]">
        {Object.entries(DAMAGE_CLASS_ICONS).map(([cls, icon]) => (
          <span key={cls} className="flex items-center gap-1">
            <span
              className="text-[9px] font-bold"
              style={{ color: DAMAGE_CLASS_COLORS[cls] }}
            >
              {icon}
            </span>
            <span className="text-[#8b9bb4] text-[9px] capitalize">{cls}</span>
          </span>
        ))}
        <span className="text-[#8b9bb4] text-[9px] ml-auto">PWR / ACC / PP</span>
      </div>
    </>
  );
}
