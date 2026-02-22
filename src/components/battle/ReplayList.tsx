"use client";

import { useState, useEffect, useCallback } from "react";
import { BattleReplay } from "@/types";
import { useReplayRecorder } from "@/hooks/useReplayRecorder";

interface ReplayListProps {
  onViewReplay: (replay: BattleReplay) => void;
}

export default function ReplayList({ onViewReplay }: ReplayListProps) {
  const { loadReplays, deleteReplay } = useReplayRecorder();
  const [replays, setReplays] = useState<BattleReplay[]>([]);

  useEffect(() => {
    setReplays(loadReplays());
  }, [loadReplays]);

  const handleDelete = useCallback((id: string) => {
    deleteReplay(id);
    setReplays((prev) => prev.filter((r) => r.id !== id));
  }, [deleteReplay]);

  if (replays.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="font-pixel text-xs text-[#8b9bb4] mb-3 uppercase tracking-wider">
        Saved Replays
      </h3>
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {replays.map((replay) => {
          const date = new Date(replay.date);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          const winnerLabel = replay.mode === "ai"
            ? (replay.winner === "player1" ? "Won" : "Lost")
            : (replay.winner === "player1" ? "P1 Won" : "P2 Won");

          return (
            <div
              key={replay.id}
              className="flex items-center justify-between rounded-lg bg-[#1a1c2c] p-3 border border-[#3a4466]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-pixel px-1.5 py-0.5 rounded ${
                    (replay.winner === "player1")
                      ? "bg-[#38b764]/20 text-[#38b764]"
                      : "bg-[#e8433f]/20 text-[#e8433f]"
                  }`}>
                    {winnerLabel}
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">
                    {replay.totalTurns} turns
                  </span>
                </div>
                <p className="text-[10px] text-[#f0f0e8] truncate capitalize">
                  {replay.player1TeamNames.slice(0, 3).join(", ")}
                  {replay.player1TeamNames.length > 3 && ` +${replay.player1TeamNames.length - 3}`}
                  {" vs "}
                  {replay.player2TeamNames.slice(0, 3).join(", ")}
                  {replay.player2TeamNames.length > 3 && ` +${replay.player2TeamNames.length - 3}`}
                </p>
                <p className="text-[8px] text-[#8b9bb4]">
                  {dateStr} {timeStr}
                </p>
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                <button
                  onClick={() => onViewReplay(replay)}
                  className="px-2.5 py-1 rounded bg-[#3a4466] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(replay.id)}
                  className="px-2 py-1 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                >
                  Del
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
