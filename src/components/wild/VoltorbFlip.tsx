"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoltorbFlip } from "@/hooks/useVoltorbFlip";
import { GAME_CORNER_PRIZES, GameCornerPrize } from "@/data/gameCornerPrizes";
import VoltorbBoard from "./VoltorbBoard";
import VoltorbResult from "./VoltorbResult";

interface VoltorbFlipProps {
  onAddToBox: (pokemonId: number, level: number, area: string) => void;
  onCoinsEarned?: (amount: number) => void;
}

// ── Prize shop ───────────────────────────────────────────────────────────

function PrizeShop({
  totalCoins,
  onBuy,
  onClose,
}: {
  totalCoins: number;
  onBuy: (prize: GameCornerPrize) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-pixel text-[#f7a838]">Prize Shop</h4>
        <span className="text-[9px] font-pixel text-[#f0f0e8]">
          {totalCoins.toLocaleString()} coins
        </span>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {GAME_CORNER_PRIZES.map((prize) => {
          const canAfford = totalCoins >= prize.cost;
          return (
            <div
              key={prize.id}
              className="flex items-center justify-between bg-[#1a1c2c] rounded-lg px-3 py-2 border border-[#3a4466]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-pixel text-[#f0f0e8]">
                    {prize.name}
                  </span>
                  <span className="text-[10px] text-[#8b9bb4]">
                    Lv.{prize.level}
                  </span>
                </div>
                <p className="text-[10px] text-[#8b9bb4] truncate">
                  {prize.description}
                </p>
              </div>

              <button
                onClick={() => onBuy(prize)}
                disabled={!canAfford}
                aria-label={`Buy ${prize.name} for ${prize.cost} coins`}
                className="ml-2 px-2.5 py-1 rounded-md text-[9px] font-pixel transition-colors shrink-0"
                style={{
                  backgroundColor: canAfford ? "#38b764" : "#3a4466",
                  color: canAfford ? "#f0f0e8" : "#8b9bb4",
                  opacity: canAfford ? 1 : 0.5,
                  cursor: canAfford ? "pointer" : "not-allowed",
                }}
              >
                {prize.cost.toLocaleString()}c
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="w-full text-center text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors py-1 font-pixel"
      >
        Back to Game
      </button>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function VoltorbFlip({ onAddToBox, onCoinsEarned }: VoltorbFlipProps) {
  const { state, flipTile, newGame, advanceLevel, spendCoins } = useVoltorbFlip();
  const [showShop, setShowShop] = useState(false);
  const [buyMessage, setBuyMessage] = useState<string | null>(null);
  const prevTotalCoins = useRef(state.totalCoins);

  // Track coins earned for achievements
  useEffect(() => {
    if (state.phase === "level_clear" && state.totalCoins > prevTotalCoins.current) {
      const earned = state.totalCoins - prevTotalCoins.current;
      onCoinsEarned?.(earned);
    }
    prevTotalCoins.current = state.totalCoins;
  }, [state.phase, state.totalCoins, onCoinsEarned]);

  const handleBuy = useCallback(
    (prize: GameCornerPrize) => {
      if (state.totalCoins < prize.cost) return;
      spendCoins(prize.cost);
      onAddToBox(prize.pokemonId, prize.level, "Game Corner");
      setBuyMessage(`${prize.name} was sent to your PC Box!`);
      setTimeout(() => setBuyMessage(null), 2500);
    },
    [state.totalCoins, spendCoins, onAddToBox]
  );

  const isPlaying = state.phase === "playing";

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-pixel text-[#f7a838]">Voltorb Flip</h3>
          <span className="text-[9px] font-pixel text-[#8b9bb4] bg-[#1a1c2c] px-1.5 py-0.5 rounded">
            Lv.{state.level}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-pixel">
          <span className="text-[#38b764]">
            Round: {state.currentCoins}
          </span>
          <span className="text-[#f0f0e8]">
            Bank: {state.totalCoins.toLocaleString()}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Prize shop view ────────────────────────────── */}
        {showShop ? (
          <PrizeShop
            key="shop"
            totalCoins={state.totalCoins}
            onBuy={handleBuy}
            onClose={() => setShowShop(false)}
          />
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* ── Grid + hints ─────────────────────────────── */}
            <VoltorbBoard state={state} isPlaying={isPlaying} onFlip={flipTile} />

            {/* ── Game Over / Level Clear overlays ────────────── */}
            <VoltorbResult state={state} onNewGame={newGame} onAdvanceLevel={advanceLevel} />

            {/* ── Buy message toast ────────────────────────────── */}
            <AnimatePresence>
              {buyMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-center text-[#38b764] font-pixel"
                >
                  {buyMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── Bottom actions ───────────────────────────────── */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShop(true)}
                className="flex-1 px-3 py-2 bg-[#f7a838] hover:bg-[#f9b84e] text-[#1a1c2c] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Prize Shop ({state.totalCoins.toLocaleString()}c)
              </button>
              {state.phase === "playing" && (
                <button
                  onClick={newGame}
                  className="px-3 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
