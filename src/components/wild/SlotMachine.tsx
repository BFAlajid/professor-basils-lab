"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSlotMachine } from "@/hooks/useSlotMachine";
import { SLOT_SYMBOLS } from "@/data/slotSymbols";

function ReelSymbol({ symbolId, spinning }: { symbolId: number; spinning: boolean }) {
  const symbol = SLOT_SYMBOLS[symbolId];

  return (
    <motion.div
      className="w-16 h-16 rounded-lg border-2 border-[#3a4466] bg-[#1a1c2c] flex items-center justify-center font-pixel text-2xl select-none"
      style={{ color: symbol.color }}
      animate={
        spinning
          ? { y: [0, -20, 20, -10, 10, 0], opacity: [1, 0.5, 0.5, 0.5, 0.5, 1] }
          : { y: 0, opacity: 1 }
      }
      transition={
        spinning
          ? { duration: 0.3, repeat: Infinity, ease: "linear" }
          : { duration: 0.3 }
      }
    >
      {symbol.label}
    </motion.div>
  );
}

export default function SlotMachine() {
  const { state, spin, setBet, addCoins } = useSlotMachine();
  const { reels, spinning, coins, bet, lastWin } = state;

  const canSpin = coins >= bet && !spinning;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider text-center">
        Game Corner Slots
      </h3>

      {/* Coin Display */}
      <div className="flex justify-center mb-4">
        <div className="rounded-lg bg-[#1a1c2c] border border-[#3a4466] px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-pixel text-[#f7a838]" aria-hidden="true">
            C
          </span>
          <span className="text-lg font-bold font-pixel text-[#f0f0e8]">
            {coins}
          </span>
          <span className="text-[9px] text-[#8b9bb4] font-pixel">coins</span>
        </div>
      </div>

      {/* Reels */}
      <div className="flex justify-center gap-3 mb-4">
        {reels.map((symbolId, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={
              spinning
                ? {}
                : { scale: [1, 1.05, 1] }
            }
            transition={{ delay: i * 0.1, duration: 0.2 }}
          >
            <ReelSymbol symbolId={symbolId} spinning={spinning} />
          </motion.div>
        ))}
      </div>

      {/* Win Display */}
      <AnimatePresence mode="wait">
        {lastWin > 0 && !spinning && (
          <motion.div
            key="win"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-center mb-4"
          >
            <p className="text-lg font-bold font-pixel text-[#f7a838]">
              WIN: {lastWin} coins!
            </p>
            {lastWin >= bet * 10 && (
              <motion.p
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: 3, duration: 0.3 }}
                className="text-xs font-pixel text-[#e8433f]"
              >
                JACKPOT!
              </motion.p>
            )}
          </motion.div>
        )}
        {lastWin === 0 && !spinning && reels.some((r) => r !== 0) && (
          <motion.div
            key="lose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-4"
          >
            <p className="text-xs font-pixel text-[#8b9bb4]">No win. Try again!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Selector */}
      <div className="flex justify-center items-center gap-2 mb-4">
        <span className="text-[10px] font-pixel text-[#8b9bb4]">BET:</span>
        {[1, 5, 10].map((b) => (
          <button
            key={b}
            onClick={() => setBet(b)}
            disabled={spinning}
            aria-label={`Set bet to ${b}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-pixel transition-colors ${
              bet === b
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
            } disabled:opacity-50`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Spin Button */}
      <div className="flex justify-center mb-4">
        <motion.button
          onClick={spin}
          disabled={!canSpin}
          aria-label="Spin the reels"
          className="rounded-xl bg-[#e8433f] px-8 py-3 text-sm font-bold font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          whileHover={canSpin ? { scale: 1.05 } : {}}
          whileTap={canSpin ? { scale: 0.95 } : {}}
        >
          {spinning ? "Spinning..." : coins < bet ? "Not enough coins" : "SPIN!"}
        </motion.button>
      </div>

      {/* Low coins helper */}
      {coins < 10 && !spinning && (
        <div className="text-center">
          <button
            onClick={() => addCoins(50)}
            aria-label="Get 50 free coins"
            className="rounded bg-[#3a4466] px-3 py-1.5 text-[10px] font-pixel text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            + 50 Free Coins
          </button>
        </div>
      )}

      {/* Payout Table */}
      <div className="mt-4 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
        <h4 className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Payouts (x bet)
        </h4>
        <div className="space-y-1">
          {[
            { symbols: "7 7 7", payout: "100x", color: "#e8433f" },
            { symbols: "\uD83C\uDF52 \uD83C\uDF52 \uD83C\uDF52", payout: "20x", color: "#EE99AC" },
            { symbols: "\u26A1 \u26A1 \u26A1", payout: "15x", color: "#f7a838" },
            { symbols: "\u25AC \u25AC \u25AC", payout: "10x", color: "#f7a838" },
            { symbols: "\u266A \u266A \u266A", payout: "8x", color: "#f7a838" },
            { symbols: "Any Pair", payout: "2x", color: "#8b9bb4" },
          ].map(({ symbols, payout, color }) => (
            <div
              key={symbols}
              className="flex justify-between items-center text-[9px] font-pixel"
            >
              <span style={{ color }}>{symbols}</span>
              <span className="text-[#f7a838]">{payout}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
