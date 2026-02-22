"use client";

import { motion } from "framer-motion";
import { RouteArea } from "@/types";
import Image from "next/image";

interface AreaDetailProps {
  area: RouteArea;
  onStartEncounter: () => void;
  isLoading: boolean;
}

function getRarityLabel(rate: number, totalRate: number): { label: string; color: string } {
  const percent = (rate / totalRate) * 100;
  if (percent >= 30) return { label: "Common", color: "#8b9bb4" };
  if (percent >= 15) return { label: "Uncommon", color: "#38b764" };
  if (percent >= 5) return { label: "Rare", color: "#f7a838" };
  return { label: "Very Rare", color: "#e8433f" };
}

export default function AreaDetail({ area, onStartEncounter, isLoading }: AreaDetailProps) {
  const totalRate = area.encounterPool.reduce((sum, p) => sum + p.encounterRate, 0);
  const minLevel = Math.min(...area.encounterPool.map((p) => p.minLevel));
  const maxLevel = Math.max(...area.encounterPool.map((p) => p.maxLevel));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 space-y-3"
    >
      <div>
        <h3 className="text-sm font-pixel text-[#f0f0e8]">{area.name}</h3>
        <p className="text-xs text-[#8b9bb4] mt-1">{area.description}</p>
        <p className="text-[10px] text-[#8b9bb4] mt-1">
          Levels {minLevel}–{maxLevel} · {area.theme.charAt(0).toUpperCase() + area.theme.slice(1)}
        </p>
      </div>

      {/* Encounter pool */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase">Wild Pokemon</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {area.encounterPool.map((entry) => {
            const rarity = getRarityLabel(entry.encounterRate, totalRate);
            return (
              <div
                key={entry.pokemonId}
                className="flex items-center gap-2 bg-[#1a1c2c] rounded-lg px-2 py-1.5 border border-[#3a4466]"
              >
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.pokemonId}.png`}
                  alt={`Pokemon #${entry.pokemonId}`}
                  width={32}
                  height={32}
                  unoptimized
                  className="pixelated"
                />
                <div className="min-w-0">
                  <p className="text-[9px] text-[#f0f0e8] truncate">#{entry.pokemonId}</p>
                  <p className="text-[8px]" style={{ color: rarity.color }}>
                    {rarity.label}
                  </p>
                  <p className="text-[7px] text-[#8b9bb4]">
                    Lv.{entry.minLevel}-{entry.maxLevel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search button */}
      <button
        onClick={onStartEncounter}
        disabled={isLoading}
        className="w-full py-2.5 bg-[#38b764] hover:bg-[#2d9550] disabled:bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
      >
        {isLoading ? "Searching..." : "Search for Pokemon!"}
      </button>
    </motion.div>
  );
}
