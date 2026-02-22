"use client";

import { motion } from "framer-motion";
import { BattleState } from "@/types";

interface BattleResultProps {
  state: BattleState;
  onPlayAgain: () => void;
  onReset: () => void;
}

export default function BattleResult({ state, onPlayAgain, onReset }: BattleResultProps) {
  const isPlayer1Winner = state.winner === "player1";
  const winnerLabel = state.mode === "ai"
    ? (isPlayer1Winner ? "You Win!" : "You Lose!")
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

      <div className="mb-6 space-y-2 text-sm text-[#8b9bb4]">
        <p>Turns: {state.turn}</p>
        <p>
          {state.mode === "ai" ? "Your" : "P1"} Pokemon remaining: {p1Alive}/{state.player1.pokemon.length}
        </p>
        <p>
          {state.mode === "ai" ? "Opponent" : "P2"} Pokemon remaining: {p2Alive}/{state.player2.pokemon.length}
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-[#e8433f] px-6 py-2 text-sm font-medium text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
        >
          Play Again
        </button>
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
