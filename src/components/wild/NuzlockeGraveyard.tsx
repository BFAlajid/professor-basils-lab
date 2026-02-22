"use client";

import { NuzlockeGravePokemon } from "@/types";
import { motion } from "framer-motion";

interface NuzlockeGraveyardProps {
  graveyard: NuzlockeGravePokemon[];
}

export default function NuzlockeGraveyard({ graveyard }: NuzlockeGraveyardProps) {
  if (graveyard.length === 0) {
    return (
      <div className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 text-center">
        <p className="text-xs text-[#8b9bb4] font-pixel">No fallen Pokemon yet</p>
        <p className="text-[10px] text-[#3a4466] mt-1">May your journey be safe...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-pixel text-[#e8433f] flex items-center gap-2">
        Graveyard
        <span className="text-[10px] text-[#8b9bb4]">({graveyard.length} fallen)</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
        {graveyard.map((fallen, i) => (
          <motion.div
            key={`${fallen.pokemon.id}-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1c2c] rounded-lg p-2 flex items-center gap-2 border border-[#3a4466]/50"
          >
            {fallen.pokemon.sprites.front_default && (
              <img
                src={fallen.pokemon.sprites.front_default}
                alt={fallen.nickname}
                width={32}
                height={32}
                className="pixelated opacity-50 grayscale"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-pixel text-[#8b9bb4] truncate">
                {fallen.nickname}
              </p>
              <p className="text-[8px] text-[#3a4466]">
                Lv.{fallen.level} — {fallen.area}
              </p>
              <p className="text-[8px] text-[#e8433f]">
                {fallen.causeOfDeath}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
