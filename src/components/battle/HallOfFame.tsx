"use client";

import { useState, useEffect } from "react";
import Image from "@/components/PokeImage";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadHallOfFame,
  clearHallOfFame,
  HallOfFameEntry,
} from "@/data/hallOfFame";

interface HallOfFameProps {
  onClose: () => void;
}

const MODE_CONFIG: Record<
  HallOfFameEntry["mode"],
  { label: string; borderColor: string; badgeColor: string }
> = {
  elite_four: {
    label: "Elite Four",
    borderColor: "#f5c842",
    badgeColor: "#f5c842",
  },
  battle_tower: {
    label: "Battle Tower",
    borderColor: "#60a5fa",
    badgeColor: "#60a5fa",
  },
  gym_challenge: {
    label: "Gym Challenge",
    borderColor: "#38b764",
    badgeColor: "#38b764",
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function HallOfFame({ onClose }: HallOfFameProps) {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);

  useEffect(() => {
    setEntries(loadHallOfFame());
  }, []);

  function handleClearAll() {
    if (window.confirm("Clear all Hall of Fame entries? This cannot be undone.")) {
      clearHallOfFame();
      setEntries([]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-lg text-[#f0f0e8]">Hall of Fame</h2>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded border border-[#e8433f]/40 bg-[#e8433f]/20 px-3 py-1 font-pixel text-xs text-[#e8433f] transition-colors hover:bg-[#e8433f]/30"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded border border-[#3a4466] bg-[#262b44] px-3 py-1 font-pixel text-xs text-[#8b9bb4] transition-colors hover:bg-[#3a4466]"
          >
            Close
          </button>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#3a4466] bg-[#262b44] py-16">
          <p className="font-pixel text-sm text-[#8b9bb4]">
            No Hall of Fame entries yet
          </p>
        </div>
      )}

      {/* Trophy grid */}
      <AnimatePresence>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => {
            const config = MODE_CONFIG[entry.mode];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="rounded-lg bg-[#262b44] p-3"
                style={{
                  border: `2px solid ${config.borderColor}`,
                }}
              >
                {/* Card header */}
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="rounded px-2 py-0.5 font-pixel text-[10px] text-[#1a1c2c]"
                    style={{ backgroundColor: config.badgeColor }}
                  >
                    {config.label}
                  </span>
                  <span className="font-pixel text-[10px] text-[#8b9bb4]">
                    {formatDate(entry.date)}
                  </span>
                </div>

                {/* Team sprites */}
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  {entry.team.map((mon, j) => (
                    <div
                      key={`${entry.id}-${j}`}
                      className="relative"
                      title={`${mon.name} Lv.${mon.level}`}
                    >
                      {mon.spriteUrl ? (
                        <Image
                          src={mon.spriteUrl}
                          alt={mon.name}
                          width={32}
                          height={32}
                          unoptimized
                          className="pixelated"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#3a4466] font-pixel text-[8px] text-[#8b9bb4]">
                          ?
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Extra info */}
                <div className="flex items-center gap-2">
                  {entry.mode === "battle_tower" &&
                    entry.streak !== undefined && (
                      <span className="font-pixel text-[10px] text-[#60a5fa]">
                        Streak: {entry.streak}
                      </span>
                    )}
                  {entry.mode === "gym_challenge" &&
                    entry.gymBadges !== undefined && (
                      <span className="font-pixel text-[10px] text-[#38b764]">
                        Badges: {entry.gymBadges}
                      </span>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}
