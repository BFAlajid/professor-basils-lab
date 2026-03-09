"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { useVoltorbFlip } from "@/hooks/useVoltorbFlip";

type VoltorbFlipState = ReturnType<typeof useVoltorbFlip>["state"];

interface VoltorbResultProps {
  state: VoltorbFlipState;
  onNewGame: () => void;
  onAdvanceLevel: () => void;
}

export default function VoltorbResult({ state, onNewGame, onAdvanceLevel }: VoltorbResultProps) {
  return (
    <>
      {/* Game Over overlay */}
      <AnimatePresence>
        {state.phase === "game_over" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#1a1c2c] border border-[#e8433f] rounded-lg p-4 space-y-3 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {/* Voltorb icon */}
              <div className="mx-auto w-12 h-12 rounded-full border-3 border-[#1a1c2c]"
                style={{
                  background: "linear-gradient(to bottom, #e8433f 50%, #f0f0e8 50%)",
                  border: "3px solid #1a1c2c",
                  boxShadow: "0 0 12px rgba(232,67,63,0.5)",
                }}
              />
            </motion.div>
            <p className="text-sm font-pixel text-[#e8433f]">Voltorb!</p>
            <p className="text-[10px] text-[#8b9bb4] font-pixel">
              You lost your round coins.
            </p>
            <button
              onClick={onNewGame}
              className="px-5 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              New Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Clear overlay */}
      <AnimatePresence>
        {state.phase === "level_clear" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#1a1c2c] border border-[#38b764] rounded-lg p-4 space-y-3 text-center"
          >
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="text-sm font-pixel text-[#38b764]"
            >
              Level Clear!
            </motion.p>
            <p className="text-[10px] text-[#f7a838] font-pixel">
              +{state.currentCoins} coins earned!
            </p>
            <p className="text-[9px] text-[#8b9bb4] font-pixel">
              Total: {state.totalCoins.toLocaleString()} coins
            </p>
            <button
              onClick={onAdvanceLevel}
              className="px-5 py-2 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              {state.level < 7 ? `Next Level (Lv.${Math.min(7, state.level + 1)})` : "Play Again (Lv.7)"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
