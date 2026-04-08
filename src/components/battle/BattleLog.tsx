"use client";

import { useEffect, useRef } from "react";
import { BattleLogEntry } from "@/types";

interface BattleLogProps {
  log: BattleLogEntry[];
}

const KIND_COLORS: Record<string, string> = {
  damage: "#ffffff",
  status: "#f7a838",
  switch: "#3B82F6",
  faint: "#e8433f",
  info: "#a0b4cc",
  critical: "#f77622",
  miss: "#6B7280",
  heal: "#38b764",
  mega: "#f7a838",
  tera: "#60a5fa",
  dynamax: "#e8433f",
  weather: "#f7a838",
  terrain: "#38b764",
  hazard: "#A8835B",
};

const KIND_PREFIX: Record<string, string> = {
  damage: "\u2694",
  status: "\u25C6",
  switch: "\u21C4",
  faint: "\u2620",
  info: "\u25B8",
  critical: "\u203C",
  miss: "\u2022",
  heal: "\u2764",
  mega: "\u2605",
  tera: "\u2726",
  dynamax: "\u2B06",
  weather: "\u2601",
  terrain: "\u2618",
  hazard: "\u26A0",
};

export default function BattleLog({ log }: BattleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-3 max-h-60 overflow-y-auto">
      <h4 className="text-xs font-bold text-[#8b9bb4] mb-2 uppercase tracking-wider font-pixel">
        Battle Log
      </h4>
      <div className="space-y-0.5 text-xs font-mono">
        {log.map((entry, i) => (
          <div key={i} style={{ color: KIND_COLORS[entry.kind] ?? "#a0b4cc", borderLeft: `3px solid ${KIND_COLORS[entry.kind] ?? "#a0b4cc"}`, paddingLeft: "6px" }}>
            <span aria-hidden="true">{KIND_PREFIX[entry.kind] ?? "\u25B8"} </span>{entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
