"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { BattleState } from "@/types";

interface BattleResultProps {
  state: BattleState;
  onPlayAgain: () => void;
  onReset: () => void;
  onSaveReplay?: () => void;
  replaySaved?: boolean;
  trainerName?: string;
  prizeMoney?: number;
  badgeEarned?: string;
  onPrizeMoney?: (amount: number) => void;
}

export default function BattleResult({ state, onPlayAgain, onReset, onSaveReplay, replaySaved, trainerName, prizeMoney, badgeEarned, onPrizeMoney }: BattleResultProps) {
  const isPlayer1Winner = state.winner === "player1";

  // Award prize money once when result is shown
  const prizeAwarded = useRef(false);
  useEffect(() => {
    if (isPlayer1Winner && prizeMoney && prizeMoney > 0 && onPrizeMoney && !prizeAwarded.current) {
      prizeAwarded.current = true;
      onPrizeMoney(prizeMoney);
    }
  }, [isPlayer1Winner, prizeMoney, onPrizeMoney]);
  const winnerLabel = state.mode === "ai"
    ? (isPlayer1Winner
        ? (trainerName ? `You defeated ${trainerName}!` : "You Win!")
        : "You Lose!")
    : (isPlayer1Winner ? "Player 1 Wins!" : "Player 2 Wins!");

  const p1Alive = state.player1.pokemon.filter((p) => !p.isFainted).length;
  const p2Alive = state.player2.pokemon.filter((p) => !p.isFainted).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-[#3a4466] bg-[#262b44] p-8 text-center"
    >
      <motion.h2
        className={`text-3xl font-bold font-pixel mb-4 ${
          isPlayer1Winner ? "text-[#38b764]" : "text-[#e8433f]"
        }`}
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
      >
        {winnerLabel}
      </motion.h2>

      {/* Rewards */}
      {isPlayer1Winner && (prizeMoney || badgeEarned) && (
        <div className="mb-4 space-y-1">
          {prizeMoney != null && prizeMoney > 0 && (
            <motion.p
              className="text-sm font-pixel text-[#f7a838]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              You received ¥{prizeMoney.toLocaleString()}!
            </motion.p>
          )}
          {badgeEarned && (
            <motion.p
              className="text-sm font-pixel text-[#f0f0e8]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              You received the <span className="text-[#f7a838]">{badgeEarned} Badge</span>!
            </motion.p>
          )}
        </div>
      )}

      <div className="mb-6 space-y-2 text-sm text-[#8b9bb4]">
        <p>Turns: {state.turn}</p>
        <p>
          {state.mode === "ai" ? "Your" : "P1"} Pokemon remaining: {p1Alive}/{state.player1.pokemon.length}
        </p>
        <p>
          {state.mode === "ai" ? "Opponent" : "P2"} Pokemon remaining: {p2Alive}/{state.player2.pokemon.length}
        </p>
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-[#e8433f] px-6 py-2 text-sm font-medium text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
        >
          Play Again
        </button>
        {onSaveReplay && (
          <button
            onClick={onSaveReplay}
            disabled={replaySaved}
            className="rounded-lg bg-[#3a4466] px-6 py-2 text-sm font-medium text-[#f0f0e8] hover:bg-[#4a5577] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {replaySaved ? "Replay Saved" : "Save Replay"}
          </button>
        )}
        <button
          onClick={onReset}
          className="rounded-lg bg-[#3a4466] px-6 py-2 text-sm font-medium text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
        >
          Back to Setup
        </button>
      </div>
    </motion.div>
  );
}
