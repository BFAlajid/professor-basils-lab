"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pokemon, TypeName } from "@/types";
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

interface MovePoolBrowserProps {
  pokemonId?: number;
  pokemon?: Pokemon;
}

interface PokeAPIMoveDetail {
  name: string;
  type: { name: string };
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damage_class: { name: string };
}

interface PokeAPIVersionGroupDetail {
  move_learn_method: { name: string };
  level_learned_at: number;
  version_group: { name: string };
}

interface PokeAPIMoveRef {
  move: { name: string; url: string };
  version_group_details: PokeAPIVersionGroupDetail[];
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function classifyMethod(method: string): LearnMethod {
  if (method === "level-up") return "level-up";
  if (method === "machine") return "machine";
  if (method === "egg") return "egg";
  if (method === "tutor") return "tutor";
  return "level-up";
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

export default function MovePoolBrowser({ pokemonId, pokemon }: MovePoolBrowserProps) {
  const [moves, setMoves] = useState<MoveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LearnMethod>("level-up");
  const [sortKey, setSortKey] = useState<SortKey>("level");
  const [error, setError] = useState(false);

  const resolvedId = pokemonId ?? pokemon?.id;

  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setMoves([]);

    (async () => {
      try {
        const pokemonRes = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${resolvedId}`
        );
        if (!pokemonRes.ok) throw new Error("Failed to fetch");
        const data = await pokemonRes.json();

        const moveRefs: PokeAPIMoveRef[] = data.moves;

        const grouped = new Map<string, { method: LearnMethod; level: number; url: string }>();
        for (const ref of moveRefs) {
          for (const detail of ref.version_group_details) {
            const method = classifyMethod(detail.move_learn_method.name);
            const key = `${ref.move.name}-${method}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                method,
                level: detail.level_learned_at,
                url: ref.move.url,
              });
            }
          }
        }

        const uniqueUrls = new Map<string, string>();
        for (const ref of moveRefs) {
          uniqueUrls.set(ref.move.name, ref.move.url);
        }

        const batchSize = 30;
        const urlEntries = Array.from(uniqueUrls.entries());
        const moveDetails = new Map<string, PokeAPIMoveDetail>();

        for (let i = 0; i < urlEntries.length; i += batchSize) {
          if (cancelled) return;
          const batch = urlEntries.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async ([name, url]) => {
              const res = await fetch(url);
              if (!res.ok) return null;
              const detail: PokeAPIMoveDetail = await res.json();
              return { name, detail };
            })
          );
          for (const result of results) {
            if (result.status === "fulfilled" && result.value) {
              moveDetails.set(result.value.name, result.value.detail);
            }
          }
        }

        if (cancelled) return;

        const entries: MoveEntry[] = [];
        for (const [key, info] of grouped) {
          const moveName = key.split("-").slice(0, -1).join("-");
          const detail = moveDetails.get(moveName);
          if (!detail) continue;

          entries.push({
            name: moveName,
            displayName: formatName(moveName),
            type: detail.type.name as TypeName,
            power: detail.power,
            accuracy: detail.accuracy,
            pp: detail.pp,
            damageClass: detail.damage_class.name as MoveEntry["damageClass"],
            learnMethod: info.method,
            levelLearnedAt: info.level,
          });
        }

        setMoves(entries);
      } catch {
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  const filteredMoves = useMemo(() => {
    const filtered = moves.filter((m) => m.learnMethod === activeTab);

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case "level":
          return (a.levelLearnedAt || 0) - (b.levelLearnedAt || 0);
        case "power":
          return (b.power ?? -1) - (a.power ?? -1);
        case "type":
          return a.type.localeCompare(b.type);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [moves, activeTab, sortKey]);

  const tabCounts = useMemo(() => {
    const counts: Record<LearnMethod, number> = {
      "level-up": 0,
      machine: 0,
      egg: 0,
      tutor: 0,
    };
    for (const m of moves) {
      counts[m.learnMethod]++;
    }
    return counts;
  }, [moves]);

  if (!resolvedId) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <p className="text-[#8b9bb4] font-pixel text-xs text-center py-4">
          No Pokemon selected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Move Pool</h3>

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-2 py-6">
          <p className="text-[#8b9bb4] font-pixel text-xs text-center">Loading moves...</p>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-[#3a4466] rounded w-full" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-[#e8433f] text-xs font-pixel text-center py-4">
          Failed to load move data.
        </p>
      )}

      {!loading && !error && (
        <>
          {/* Tabs */}
          <div className="flex gap-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
                onClick={() => setSortKey(key)}
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
      )}
    </div>
  );
}
