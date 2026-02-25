"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import type { BattleFactoryState } from "@/hooks/useBattleFactory";
import LoadingSpinner from "../LoadingSpinner";

// ── Props ────────────────────────────────────────────────────────────

interface BattleFactoryProps {
  factoryState: BattleFactoryState;
  onSelect: (index: number) => void;
  onDeselect: (index: number) => void;
  onConfirm: () => void;
  onSwap: (myIndex: number, opponentIndex: number) => void;
  onSkipSwap: () => void;
  onReset: () => void;
  isLoading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getBaseStatTotal(slot: TeamSlot): number {
  return slot.pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Pokemon Card ─────────────────────────────────────────────────────

function PokemonCard({
  slot,
  selected,
  onClick,
  compact = false,
  highlight = false,
}: {
  slot: TeamSlot;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  highlight?: boolean;
}) {
  const bst = getBaseStatTotal(slot);
  const sprite = slot.pokemon.sprites.front_default;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative rounded-xl border-2 p-3 text-center transition-colors
        ${
          selected
            ? "border-[#f7a838] bg-[#f7a838]/10"
            : highlight
              ? "border-[#60a5fa] bg-[#60a5fa]/10"
              : "border-[#3a4466] bg-[#262b44] hover:border-[#4a5577]"
        }
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#f7a838] flex items-center justify-center"
        >
          <span className="text-[10px] font-bold text-[#1a1c2c]">&#10003;</span>
        </motion.div>
      )}

      {/* Sprite */}
      {sprite && (
        <Image
          src={sprite}
          alt={slot.pokemon.name}
          width={compact ? 48 : 64}
          height={compact ? 48 : 64}
          unoptimized
          className="mx-auto"
        />
      )}

      {/* Name */}
      <p
        className={`font-pixel capitalize truncate ${
          compact ? "text-[10px]" : "text-xs"
        } text-[#f0f0e8] mt-1`}
      >
        {formatName(slot.pokemon.name)}
      </p>

      {/* Type badges */}
      <div className="flex justify-center gap-1 mt-1">
        {slot.pokemon.types.map((t) => (
          <span
            key={t.type.name}
            className="rounded-full px-1.5 py-0.5 text-[8px] font-medium uppercase"
            style={{
              backgroundColor: typeColors[t.type.name] + "33",
              color: typeColors[t.type.name],
            }}
          >
            {t.type.name}
          </span>
        ))}
      </div>

      {/* BST */}
      {!compact && (
        <p className="text-[10px] text-[#8b9bb4] mt-1">BST: {bst}</p>
      )}
    </motion.button>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function BattleFactory({
  factoryState,
  onSelect,
  onDeselect,
  onConfirm,
  onSwap,
  onSkipSwap,
  onReset,
  isLoading,
}: BattleFactoryProps) {
  const {
    phase,
    rentalPool,
    selectedIndices,
    playerTeam,
    opponentTeam,
    wins,
    bestRun,
    totalRuns,
  } = factoryState;

  // Swap selection state
  const [swapMyIndex, setSwapMyIndex] = useState<number | null>(null);
  const [swapOpponentIndex, setSwapOpponentIndex] = useState<number | null>(null);

  // ── Idle phase ─────────────────────────────────────────────────────

  if (phase === "idle") {
    return null; // Handled externally (start button in parent)
  }

  // ── Pick phase ─────────────────────────────────────────────────────

  if (phase === "pick") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-6 space-y-4"
      >
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-pixel text-[#f7a838]">Battle Factory</h3>
          <p className="text-xs text-[#8b9bb4] mt-1">
            Choose 3 rental Pokemon from the pool below
          </p>
          <p className="text-[10px] text-[#8b9bb4]">
            Selected: {selectedIndices.length} / 3
          </p>
        </div>

        {/* Rental pool grid — 3x2 */}
        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {rentalPool.map((slot, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <motion.div
                  key={slot.pokemon.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <PokemonCard
                    slot={slot}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        onDeselect(idx);
                      } else {
                        onSelect(idx);
                      }
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Confirm button */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onConfirm}
            disabled={selectedIndices.length !== 3}
            className="rounded-lg bg-[#f7a838] px-8 py-3 text-sm font-pixel text-[#1a1c2c] hover:bg-[#d89230] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Confirm Team
          </button>
          <button
            onClick={onReset}
            className="rounded-lg bg-[#3a4466] px-4 py-3 text-xs text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Swap phase ─────────────────────────────────────────────────────

  if (phase === "swap") {
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
              {playerTeam.map((slot, idx) => (
                <motion.div
                  key={`my-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PokemonCard
                    slot={slot}
                    compact
                    selected={swapMyIndex === idx}
                    onClick={() =>
                      setSwapMyIndex(swapMyIndex === idx ? null : idx)
                    }
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Opponent's team */}
          <div className="space-y-2">
            <p className="text-xs font-pixel text-[#f0f0e8] text-center uppercase tracking-wider">
              Opponent&apos;s Team
            </p>
            <div className="space-y-2">
              {opponentTeam.map((slot, idx) => (
                <motion.div
                  key={`opp-${idx}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PokemonCard
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

  // ── Victory phase ──────────────────────────────────────────────────

  if (phase === "victory") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-[#f7a838] bg-[#1a1c2c] p-8 text-center space-y-4"
      >
        <motion.h2
          className="text-2xl font-pixel text-[#f7a838]"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          Factory Champion!
        </motion.h2>
        <p className="text-sm text-[#f0f0e8]">
          You conquered all 7 Battle Factory trainers!
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Wins</p>
            <p className="text-xl font-pixel text-[#38b764]">{wins}</p>
          </div>
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Best Run</p>
            <p className="text-xl font-pixel text-[#f7a838]">{bestRun}</p>
          </div>
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Total Runs</p>
            <p className="text-xl font-pixel text-[#60a5fa]">{totalRuns}</p>
          </div>
        </div>

        {/* Final team showcase */}
        <div className="space-y-1">
          <p className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">
            Winning Team
          </p>
          <div className="flex justify-center gap-2">
            {playerTeam.map((slot, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="rounded-lg bg-[#262b44] p-2 text-center"
              >
                {slot.pokemon.sprites.front_default && (
                  <Image
                    src={slot.pokemon.sprites.front_default}
                    alt={slot.pokemon.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="mx-auto"
                  />
                )}
                <p className="text-[8px] text-[#f0f0e8] capitalize truncate max-w-[60px]">
                  {formatName(slot.pokemon.name)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onReset}
            className="rounded-lg bg-[#f7a838] px-8 py-3 text-sm font-pixel text-[#1a1c2c] hover:bg-[#d89230] transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onReset}
            className="rounded-lg bg-[#3a4466] px-6 py-3 text-xs font-pixel text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            Exit
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Defeat phase ───────────────────────────────────────────────────

  if (phase === "defeat") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-[#e8433f] bg-[#1a1c2c] p-8 text-center space-y-4"
      >
        <motion.h2
          className="text-2xl font-pixel text-[#e8433f]"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          Defeated!
        </motion.h2>
        <p className="text-sm text-[#f0f0e8]">
          Your Battle Factory run has ended.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Wins</p>
            <p className="text-xl font-pixel text-[#f0f0e8]">{wins}</p>
          </div>
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Best Run</p>
            <p className="text-xl font-pixel text-[#f7a838]">{bestRun}</p>
          </div>
          <div className="rounded-lg bg-[#262b44] p-3">
            <p className="text-[10px] text-[#8b9bb4] uppercase">Total Runs</p>
            <p className="text-xl font-pixel text-[#60a5fa]">{totalRuns}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onReset}
            className="rounded-lg bg-[#e8433f] px-8 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onReset}
            className="rounded-lg bg-[#3a4466] px-6 py-3 text-xs font-pixel text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            Exit
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Battling phase — show loading while generating opponent ────────

  if (phase === "battling" && isLoading) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-8 text-center space-y-4">
        <LoadingSpinner size={32} />
        <p className="text-xs text-[#8b9bb4] font-pixel">
          Generating opponent...
        </p>
        <p className="text-[10px] text-[#8b9bb4]">
          Battle {wins + 1} of 7
        </p>
      </div>
    );
  }

  // ── Battling phase fallback (battle is handled by parent) ─────────

  return null;
}
