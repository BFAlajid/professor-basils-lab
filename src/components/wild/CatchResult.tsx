"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pokemon, BallType } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";
import Image from "next/image";

interface CatchResultProps {
  pokemon: Pokemon;
  ball: BallType;
  level: number;
  isCaught: boolean;
  onAddToBox: (nickname?: string) => void;
  onContinueBattle: () => void;
  onReturnToMap: () => void;
}

export default function CatchResult({
  pokemon,
  ball,
  level,
  isCaught,
  onAddToBox,
  onContinueBattle,
  onReturnToMap,
}: CatchResultProps) {
  const [nickname, setNickname] = useState("");
  const ballData = POKE_BALLS[ball];
  const spriteUrl = pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default;
  const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

  if (!isCaught) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-4"
      >
        <p className="text-sm font-pixel text-[#e8433f]">It broke free!</p>
        <p className="text-xs text-[#8b9bb4]">
          {displayName} escaped from the {ballData?.displayName ?? "ball"}!
        </p>
        <div className="flex gap-3">
          <button
            onClick={onContinueBattle}
            className="px-4 py-2 bg-[#e8433f] hover:bg-[#c9342e] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
          >
            Keep Fighting
          </button>
          <button
            onClick={onReturnToMap}
            className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5476] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
          >
            Run Away
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-4"
    >
      {/* Pokemon sprite */}
      {spriteUrl && (
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <Image
            src={spriteUrl}
            alt={displayName}
            width={120}
            height={120}
            unoptimized
            className="pixelated drop-shadow-lg"
          />
        </motion.div>
      )}

      <div className="text-center space-y-1">
        <p className="text-sm font-pixel text-[#38b764]">Gotcha!</p>
        <p className="text-xs text-[#f0f0e8]">
          {displayName} (Lv. {level}) was caught!
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <div
            className="w-3 h-3 rounded-full border border-[#3a4466]"
            style={{ backgroundColor: ballData?.spriteColor }}
          />
          <span className="text-[9px] text-[#8b9bb4]">{ballData?.displayName}</span>
        </div>
      </div>

      {/* Nickname input */}
      <div className="space-y-1 w-full max-w-[200px]">
        <label className="text-[9px] font-pixel text-[#8b9bb4] block text-center">
          Give a nickname? (optional)
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          placeholder={displayName}
          className="w-full bg-[#1a1c2c] border border-[#3a4466] rounded-lg px-3 py-1.5 text-xs text-[#f0f0e8] text-center placeholder:text-[#3a4466] focus:outline-none focus:border-[#38b764]"
        />
      </div>

      <button
        onClick={() => onAddToBox(nickname || undefined)}
        className="px-6 py-2.5 bg-[#38b764] hover:bg-[#2d9550] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
      >
        Send to PC Box
      </button>
    </motion.div>
  );
}
