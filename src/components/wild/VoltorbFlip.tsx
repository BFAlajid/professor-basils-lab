"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoltorbFlip } from "@/hooks/useVoltorbFlip";
import { GAME_CORNER_PRIZES, GameCornerPrize } from "@/data/gameCornerPrizes";

interface VoltorbFlipProps {
  onAddToBox: (pokemonId: number, level: number, area: string) => void;
  onCoinsEarned?: (amount: number) => void;
}

// ── Tile display ─────────────────────────────────────────────────────────

function TileCell({
  value,
  revealed,
  onClick,
  disabled,
}: {
  value: number;
  revealed: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const colors: Record<number, { bg: string; text: string; label: string }> = {
    0: { bg: "#e8433f", text: "#f0f0e8", label: "V" },
    1: { bg: "#3a4466", text: "#8b9bb4", label: "1" },
    2: { bg: "#38b764", text: "#f0f0e8", label: "2" },
    3: { bg: "#f7a838", text: "#1a1c2c", label: "3" },
  };

  const c = colors[value] ?? colors[1];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || revealed}
      className="relative w-full aspect-square rounded-md border-2 font-pixel text-sm flex items-center justify-center transition-colors select-none"
      style={{
        backgroundColor: revealed ? c.bg : "#262b44",
        borderColor: revealed ? c.bg : "#3a4466",
        color: revealed ? c.text : "#3a4466",
        cursor: disabled || revealed ? "default" : "pointer",
      }}
      whileHover={!disabled && !revealed ? { scale: 1.08 } : {}}
      whileTap={!disabled && !revealed ? { scale: 0.92 } : {}}
    >
      <AnimatePresence mode="wait">
        {revealed ? (
          <motion.span
            key="revealed"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="font-pixel text-sm font-bold"
          >
            {value === 0 ? (
              /* Voltorb: red circle icon */
              <span className="flex items-center justify-center">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: "linear-gradient(to bottom, #e8433f 50%, #f0f0e8 50%)",
                    border: "2px solid #1a1c2c",
                  }}
                />
              </span>
            ) : (
              c.label
            )}
          </motion.span>
        ) : (
          <motion.span
            key="hidden"
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] text-[#8b9bb4]"
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Hint badge ───────────────────────────────────────────────────────────

function HintBadge({ total, voltorbs }: { total: number; voltorbs: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md bg-[#1a1c2c] border border-[#3a4466] p-1 text-center w-full aspect-square">
      <span className="text-[9px] font-pixel text-[#f0f0e8] leading-tight">
        &Sigma;:{total}
      </span>
      <span className="text-[9px] font-pixel text-[#e8433f] leading-tight">
        V:{voltorbs}
      </span>
    </div>
  );
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
                  <span className="text-[8px] text-[#8b9bb4]">
                    Lv.{prize.level}
                  </span>
                </div>
                <p className="text-[8px] text-[#8b9bb4] truncate">
                  {prize.description}
                </p>
              </div>

              <button
                onClick={() => onBuy(prize)}
                disabled={!canAfford}
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
            <div className="flex justify-center">
              <div className="inline-block">
                {/* Main grid with right-side row hints */}
                <div className="flex gap-1">
                  {/* 5x5 tile grid */}
                  <div className="grid grid-cols-5 gap-1" style={{ width: 220 }}>
                    {state.board.map((row, ri) =>
                      row.map((val, ci) => (
                        <TileCell
                          key={`${ri}-${ci}`}
                          value={val}
                          revealed={state.revealed[ri][ci]}
                          onClick={() => flipTile(ri, ci)}
                          disabled={!isPlaying}
                        />
                      ))
                    )}
                  </div>

                  {/* Row hints (right side) */}
                  <div className="flex flex-col gap-1" style={{ width: 40 }}>
                    {state.rowHints.map((hint, i) => (
                      <HintBadge key={`rh-${i}`} total={hint.total} voltorbs={hint.voltorbs} />
                    ))}
                  </div>
                </div>

                {/* Column hints (bottom) */}
                <div className="flex gap-1 mt-1">
                  <div className="grid grid-cols-5 gap-1" style={{ width: 220 }}>
                    {state.colHints.map((hint, i) => (
                      <HintBadge key={`ch-${i}`} total={hint.total} voltorbs={hint.voltorbs} />
                    ))}
                  </div>
                  {/* Empty corner space to align with row hints */}
                  <div style={{ width: 40 }} />
                </div>
              </div>
            </div>

            {/* ── Game Over overlay ──────────────────────────── */}
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
                    onClick={newGame}
                    className="px-5 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                  >
                    New Game
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Level Clear overlay ─────────────────────────── */}
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
                    onClick={advanceLevel}
                    className="px-5 py-2 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                  >
                    {state.level < 7 ? `Next Level (Lv.${Math.min(7, state.level + 1)})` : "Play Again (Lv.7)"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
