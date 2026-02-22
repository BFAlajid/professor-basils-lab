"use client";

import { NuzlockeGravePokemon } from "@/types";
import { motion } from "framer-motion";

interface NuzlockeGameOverProps {
  graveyard: NuzlockeGravePokemon[];
  onReset: () => void;
  onDisable: () => void;
}

export default function NuzlockeGameOver({ graveyard, onReset, onDisable }: NuzlockeGameOverProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[500px] space-y-6 px-4"
    >
      <motion.h2
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.3, delay: 0.2 }}
        className="text-2xl font-pixel text-[#e8433f]"
      >
        GAME OVER
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-[#8b9bb4] text-center max-w-md"
      >
        All of your Pokemon have fallen. Your Nuzlocke run has ended.
      </motion.p>

      {/* Graveyard summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-md bg-[#262b44] border border-[#3a4466] rounded-xl p-4 space-y-2"
      >
        <h3 className="text-sm font-pixel text-[#8b9bb4]">
          Fallen Companions ({graveyard.length})
        </h3>
        <div className="max-h-[250px] overflow-y-auto space-y-1">
          {graveyard.map((fallen, i) => (
            <div
              key={`${fallen.pokemon.id}-${i}`}
              className="flex items-center gap-2 bg-[#1a1c2c] rounded-lg px-3 py-1.5"
            >
              {fallen.pokemon.sprites.front_default && (
                <img
                  src={fallen.pokemon.sprites.front_default}
                  alt={fallen.nickname}
                  width={28}
                  height={28}
                  className="pixelated grayscale opacity-50"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-pixel text-[#8b9bb4]">{fallen.nickname}</span>
                <span className="text-[8px] text-[#3a4466] ml-2">
                  Lv.{fallen.level} — {fallen.causeOfDeath}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex gap-3"
      >
        <button
          onClick={onReset}
          className="px-6 py-3 bg-[#e8433f] hover:bg-[#c73535] text-[#f0f0e8] text-sm font-pixel rounded-lg transition-colors"
        >
          New Run
        </button>
        <button
          onClick={onDisable}
          className="px-6 py-3 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] hover:text-[#f0f0e8] text-sm font-pixel rounded-lg transition-colors"
        >
          Disable Nuzlocke
        </button>
      </motion.div>
    </motion.div>
  );
}
