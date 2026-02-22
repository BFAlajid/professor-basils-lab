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
  info: "#8b9bb4",
  critical: "#f77622",
  miss: "#6B7280",
  heal: "#38b764",
  mega: "#f7a838",
  tera: "#60a5fa",
  dynamax: "#e8433f",
  weather: "#f7a838",
  terrain: "#38b764",
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
          <div key={i} style={{ color: KIND_COLORS[entry.kind] ?? "#8b9bb4" }}>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
