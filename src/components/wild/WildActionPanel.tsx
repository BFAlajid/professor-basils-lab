"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BallType, BattlePokemon } from "@/types";
import BallSelector from "./BallSelector";

interface WildActionPanelProps {
  playerMoves: string[];
  ballInventory: Record<BallType, number>;
  onFight: (moveIndex: number) => void;
  onThrowBall: (ball: BallType) => void;
  onRun: () => void;
  disabled?: boolean;
}

export default function WildActionPanel({
  playerMoves,
  ballInventory,
  onFight,
  onThrowBall,
  onRun,
  disabled,
}: WildActionPanelProps) {
  const [mode, setMode] = useState<"main" | "fight" | "ball">("main");

  if (mode === "fight") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase">Select Move</h4>
          <button
            onClick={() => setMode("main")}
            className="text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            Back
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {playerMoves.map((move, i) => (
            <button
              key={i}
              onClick={() => { onFight(i); setMode("main"); }}
              disabled={disabled}
              className="bg-[#262b44] border border-[#3a4466] hover:border-[#f0f0e8] rounded-lg px-3 py-2 text-[10px] text-[#f0f0e8] transition-all disabled:opacity-50"
            >
              {move.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (mode === "ball") {
    return (
      <BallSelector
        inventory={ballInventory}
        onSelect={(ball) => { onThrowBall(ball); setMode("main"); }}
        onCancel={() => setMode("main")}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => setMode("fight")}
        disabled={disabled}
        className="bg-[#e8433f] hover:bg-[#c9342e] disabled:bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel rounded-lg py-3 transition-colors"
      >
        Fight
      </button>
      <button
        onClick={() => setMode("ball")}
        disabled={disabled}
        className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel rounded-lg py-3 transition-colors"
      >
        Ball
      </button>
      <button
        disabled
        className="bg-[#3a4466] text-[#8b9bb4] text-xs font-pixel rounded-lg py-3 cursor-not-allowed"
      >
        Item
      </button>
      <button
        onClick={onRun}
        disabled={disabled}
        className="bg-[#8b9bb4] hover:bg-[#6b7b94] disabled:bg-[#3a4466] text-[#1a1c2c] text-xs font-pixel rounded-lg py-3 transition-colors"
      >
        Run
      </button>
    </div>
  );
}
