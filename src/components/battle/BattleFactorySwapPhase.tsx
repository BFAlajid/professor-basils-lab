"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot } from "@/types";
import { formatName } from "@/utils/format";
import BattleFactoryCard from "./BattleFactoryCard";

// ── Props ────────────────────────────────────────────────────────────

interface BattleFactorySwapPhaseProps {
  playerTeam: TeamSlot[];
  opponentTeam: TeamSlot[];
  wins: number;
  onSwap: (myIndex: number, opponentIndex: number) => void;
  onSkipSwap: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function BattleFactorySwapPhase({
  playerTeam,
  opponentTeam,
  wins,
  onSwap,
  onSkipSwap,
}: BattleFactorySwapPhaseProps) {
  const [swapMyIndex, setSwapMyIndex] = useState<number | null>(null);
  const [swapOpponentIndex, setSwapOpponentIndex] = useState<number | null>(null);

  const handleSwapConfirm = () => {
    if (swapMyIndex !== null && swapOpponentIndex !== null) {
      onSwap(swapMyIndex, swapOpponentIndex);
      setSwapMyIndex(null);
      setSwapOpponentIndex(null);
    }
  };

  const handleSkip = () => {
    setSwapMyIndex(null);
    setSwapOpponentIndex(null);
    onSkipSwap();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-6 space-y-4"
    >
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-pixel text-[#38b764]">
          Battle {wins} Won!
        </h3>
        <p className="text-xs text-[#8b9bb4] mt-1">
          You may swap one of your Pokemon for one of the opponent&apos;s
        </p>
        <p className="text-[10px] text-[#8b9bb4]">
          Wins: {wins} / 7
        </p>
      </div>

      {/* Side-by-side teams */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player's team */}
        <div className="space-y-2">
          <p className="text-xs font-pixel text-[#f0f0e8] text-center uppercase tracking-wider">
            Your Team
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {playerTeam.map((slot, idx) => (
                <motion.div
                  key={`my-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <BattleFactoryCard
                    slot={slot}
                    compact
                    selected={swapMyIndex === idx}
                    onClick={() =>
                      setSwapMyIndex(swapMyIndex === idx ? null : idx)
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Opponent's team */}
        <div className="space-y-2">
          <p className="text-xs font-pixel text-[#f0f0e8] text-center uppercase tracking-wider">
            Opponent&apos;s Team
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {opponentTeam.map((slot, idx) => (
                <motion.div
                  key={`opp-${idx}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <BattleFactoryCard
                    slot={slot}
                    compact
                    highlight={swapOpponentIndex === idx}
                    onClick={() =>
                      setSwapOpponentIndex(
                        swapOpponentIndex === idx ? null : idx
                      )
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Swap preview */}
      {swapMyIndex !== null && swapOpponentIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-[#f7a838]/30 bg-[#f7a838]/10 p-3 text-center"
        >
          <p className="text-xs text-[#f0f0e8]">
            <span className="capitalize font-pixel">
              {formatName(playerTeam[swapMyIndex].pokemon.name)}
            </span>
            <span className="text-[#8b9bb4] mx-2">&rarr;</span>
            <span className="capitalize font-pixel text-[#f7a838]">
              {formatName(opponentTeam[swapOpponentIndex].pokemon.name)}
            </span>
          </p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleSwapConfirm}
          disabled={swapMyIndex === null || swapOpponentIndex === null}
          className="rounded-lg bg-[#f7a838] px-6 py-3 text-sm font-pixel text-[#1a1c2c] hover:bg-[#d89230] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Swap
        </button>
        <button
          onClick={handleSkip}
          className="rounded-lg bg-[#3a4466] px-6 py-3 text-xs font-pixel text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}
