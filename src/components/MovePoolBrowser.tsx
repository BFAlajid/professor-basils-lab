"use client";

import { useState, useEffect, useMemo } from "react";
import { Move, Pokemon, PokemonMoveRef, TypeName } from "@/types";
import { fetchPokemonData, fetchMoveData } from "@/utils/pokeApiClient";
import { formatName } from "@/utils/format";
import MoveTable from "./MoveTable";

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

function classifyMethod(method: string): LearnMethod {
  if (method === "level-up") return "level-up";
  if (method === "machine") return "machine";
  if (method === "egg") return "egg";
  if (method === "tutor") return "tutor";
  return "level-up";
}

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
        const data = await fetchPokemonData(resolvedId);
        const moveRefs: PokemonMoveRef[] = data.moves;

        const grouped = new Map<string, { method: LearnMethod; level: number }>();
        for (const ref of moveRefs) {
          for (const detail of ref.version_group_details ?? []) {
            const method = classifyMethod(detail.move_learn_method.name);
            const key = `${ref.move.name}-${method}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                method,
                level: detail.level_learned_at,
              });
            }
          }
        }

        const uniqueNames = Array.from(new Set(moveRefs.map((ref) => ref.move.name)));

        const batchSize = 30;
        const moveDetails = new Map<string, Move>();

        for (let i = 0; i < uniqueNames.length; i += batchSize) {
          if (cancelled) return;
          const batch = uniqueNames.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (name) => {
              const detail = await fetchMoveData(name);
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
            type: detail.type.name,
            power: detail.power,
            accuracy: detail.accuracy,
            pp: detail.pp,
            damageClass: detail.damage_class.name,
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
        <MoveTable
          filteredMoves={filteredMoves}
          tabCounts={tabCounts}
          activeTab={activeTab}
          sortKey={sortKey}
          onTabChange={setActiveTab}
          onSortChange={setSortKey}
        />
      )}
    </div>
  );
}
