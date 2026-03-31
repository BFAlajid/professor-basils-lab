"use client";

import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { BattleFacilityState, EliteFourMember, TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import LoadingSpinner from "../LoadingSpinner";

// ── Props ────────────────────────────────────────────────────────────

interface FacilityBattlePreviewProps {
  facilityState: BattleFacilityState;
  playerTeam: TeamSlot[];
  currentOpponent: EliteFourMember;
  isLoading: boolean;
  onBeginBattle: () => void;
  onReset: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function FacilityBattlePreview({
  facilityState,
  playerTeam,
  currentOpponent,
  isLoading,
  onBeginBattle,
  onReset,
}: FacilityBattlePreviewProps) {
  const { mode, currentOpponentIndex, wins, streak, teamHpPercents } = facilityState;
  const isEliteFour = mode === "elite_four";
  const isTower = mode === "battle_tower";
  const isGym = mode === "gym_challenge";

  const specialtyColor = currentOpponent.specialty !== "mixed"
    ? typeColors[currentOpponent.specialty] ?? "#8b9bb4"
    : "#f7a838";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 space-y-4"
    >
      {/* Header */}
      <div className="text-center">
        <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">
          {isEliteFour
            ? `Battle ${currentOpponentIndex + 1} of ${facilityState.totalOpponents}`
            : isGym
            ? `Gym ${currentOpponentIndex + 1} of 8`
            : `Floor ${wins + 1}`}
          {isTower && ` — Streak: ${streak}`}
        </span>
        <h3
          className="text-xl font-pixel mt-1"
          style={{ color: specialtyColor }}
        >
          {currentOpponent.name}
        </h3>
        <p className="text-xs text-[#8b9bb4]">{currentOpponent.title}</p>
      </div>

      {/* Quote */}
      <div className="rounded-lg bg-[#1a1c2c] p-3 text-center">
        <p className="text-sm text-[#f0f0e8] italic">
          &ldquo;{currentOpponent.quote}&rdquo;
        </p>
      </div>

      {/* Team info */}
      <div className="text-center text-xs text-[#8b9bb4]">
        <span
          className="inline-block rounded-full px-3 py-1 text-[10px] font-medium"
          style={{ backgroundColor: specialtyColor + "22", color: specialtyColor }}
        >
          {currentOpponent.specialty === "mixed" ? "Mixed" : currentOpponent.specialty.charAt(0).toUpperCase() + currentOpponent.specialty.slice(1)} specialist
        </span>
        <span className="block mt-2">
          Team of {currentOpponent.team.length} Pokemon
        </span>
      </div>

      {/* Player team HP status */}
      {teamHpPercents.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Your Team Status</p>
          <div className="grid grid-cols-6 gap-1">
            {playerTeam.map((slot, i) => {
              const hp = teamHpPercents[i] ?? 1;
              const fainted = hp <= 0;
              return (
                <div
                  key={i}
                  className={`rounded-lg bg-[#1a1c2c] p-1.5 text-center ${fainted ? "opacity-40" : ""}`}
                >
                  {slot.pokemon.sprites.front_default && (
                    <Image
                      src={slot.pokemon.sprites.front_default}
                      alt={slot.pokemon.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="mx-auto"
                    />
                  )}
                  <div className="h-1 rounded-full bg-[#3a4466] mt-0.5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, hp * 100)}%`,
                        backgroundColor: hp > 0.5 ? "#38b764" : hp > 0.25 ? "#f7a838" : "#e8433f",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#8b9bb4] capitalize truncate block">
                    {slot.pokemon.name.slice(0, 8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="flex justify-center gap-3">
        <button
          onClick={onBeginBattle}
          disabled={isLoading}
          className="rounded-lg bg-[#e8433f] px-8 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size={16} /> Loading...
            </span>
          ) : (
            "Battle!"
          )}
        </button>
        <button
          onClick={onReset}
          className="rounded-lg bg-[#3a4466] px-4 py-3 text-xs text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
        >
          Forfeit
        </button>
      </div>
    </motion.div>
  );
}
