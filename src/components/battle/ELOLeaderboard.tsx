"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getCurrentTier } from "@/data/eloTiers";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getTrainerId, getTrainerName } from "@/utils/trainerIdentity";
import { silentWarn } from "@/utils/silentWarn";
import type { LeaderboardEntry } from "@/types/leaderboard";

const ELO_TIERS = [
  { name: "Poke Ball", min: 0, color: "#e8433f" },
  { name: "Great Ball", min: 1000, color: "#6390F0" },
  { name: "Ultra Ball", min: 1200, color: "#f7a838" },
  { name: "Master Ball", min: 1400, color: "#7B62A1" },
];

interface ELOLeaderboardProps {
  eloRating: number;
  totalWins: number;
  totalLosses: number;
  teamPokemonNames?: string[];
}

export default function ELOLeaderboard({
  eloRating,
  totalWins,
  totalLosses,
  teamPokemonNames = [],
}: ELOLeaderboardProps) {
  const tier = getCurrentTier(eloRating);
  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const { entries, playerRank, isLoading, error, submitScore } = useLeaderboard("elo-rating");
  const lastSubmittedRating = useRef<number>(0);

  // Auto-submit ELO rating when it changes
  useEffect(() => {
    if (eloRating <= 0 || eloRating === lastSubmittedRating.current) return;
    // Only submit after at least 1 game
    if (totalGames <= 0) return;
    lastSubmittedRating.current = eloRating;

    const entry: LeaderboardEntry = {
      trainerName: getTrainerName(),
      trainerId: getTrainerId(),
      score: eloRating,
      teamPokemon: teamPokemonNames.slice(0, 6),
      timestamp: new Date().toISOString(),
    };
    submitScore(entry).catch((e) => silentWarn("eloLeaderboardSubmit", e));
  }, [eloRating, totalGames, teamPokemonNames, submitScore]);

  const trainerId = getTrainerId();

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
        ELO Ranking
      </h3>

      {/* Current Rating */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-4"
      >
        <div
          className="inline-flex items-center gap-2 rounded-lg px-4 py-3 border-2"
          style={{ borderColor: tier.color, backgroundColor: `${tier.color}15` }}
        >
          <span className="text-2xl" style={{ color: tier.color }}>
            {tier.icon}
          </span>
          <div>
            <p className="text-lg font-bold font-pixel" style={{ color: tier.color }}>
              {eloRating}
            </p>
            <p className="text-[10px] font-pixel" style={{ color: tier.color }}>
              {tier.name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Win/Loss Record */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-[#1a1c2c] p-2 text-center">
          <p className="text-xs font-bold font-pixel text-[#38b764]">{totalWins}</p>
          <p className="text-[8px] text-[#8b9bb4] font-pixel">Wins</p>
        </div>
        <div className="rounded-lg bg-[#1a1c2c] p-2 text-center">
          <p className="text-xs font-bold font-pixel text-[#e8433f]">{totalLosses}</p>
          <p className="text-[8px] text-[#8b9bb4] font-pixel">Losses</p>
        </div>
        <div className="rounded-lg bg-[#1a1c2c] p-2 text-center">
          <p className="text-xs font-bold font-pixel text-[#f7a838]">{winRate}%</p>
          <p className="text-[8px] text-[#8b9bb4] font-pixel">Rate</p>
        </div>
      </div>

      {/* Tier Ladder */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Tier Ladder
        </p>
        {[...ELO_TIERS].reverse().map((t) => {
          const isCurrentTier = t.name === tier.name;
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                isCurrentTier
                  ? "border border-current"
                  : "bg-[#1a1c2c] opacity-60"
              }`}
              style={
                isCurrentTier
                  ? { borderColor: t.color, backgroundColor: `${t.color}15` }
                  : undefined
              }
            >
              <span
                className="text-sm"
                style={{ color: t.color }}
                aria-hidden="true"
              >
                {t.name === "Poke Ball" && "\u25CF"}
                {t.name === "Great Ball" && "\u25C6"}
                {t.name === "Ultra Ball" && "\u2605"}
                {t.name === "Master Ball" && "\u2726"}
              </span>
              <span
                className="text-xs font-pixel flex-1"
                style={{ color: isCurrentTier ? t.color : "#8b9bb4" }}
              >
                {t.name}
              </span>
              <span className="text-[9px] text-[#8b9bb4] font-pixel">
                {t.min}+
              </span>
              {isCurrentTier && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[8px] font-pixel rounded bg-[#38b764] px-1.5 py-0.5 text-[#f0f0e8]"
                >
                  YOU
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Global Rankings */}
      <div className="mt-4 pt-4 border-t border-[#3a4466]">
        <p className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Global Rankings
        </p>

        {isLoading && (
          <div className="py-4 text-center">
            <p className="text-[10px] text-[#8b9bb4] font-pixel animate-pulse">
              Loading rankings...
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="py-3 text-center">
            <p className="text-[10px] text-[#e8433f] font-pixel">{error}</p>
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <div className="py-3 text-center">
            <p className="text-[10px] text-[#8b9bb4] font-pixel">
              No global rankings yet. Play a ranked battle!
            </p>
          </div>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isPlayer = entry.trainerId === trainerId;
              const entryTier = getCurrentTier(entry.score);
              return (
                <div
                  key={`${entry.trainerId}-${i}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-pixel ${
                    isPlayer
                      ? "bg-[#38b764]/15 border border-[#38b764]/40"
                      : "bg-[#1a1c2c]"
                  }`}
                >
                  <span className="w-5 text-right text-[#8b9bb4]">
                    {rank <= 3 ? ["1st", "2nd", "3rd"][rank - 1] : `${rank}.`}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: entryTier.color }}
                    aria-hidden="true"
                  >
                    {entryTier.icon}
                  </span>
                  <span className={`flex-1 truncate ${isPlayer ? "text-[#38b764]" : "text-[#f0f0e8]"}`}>
                    {entry.trainerName}
                    {isPlayer && " (you)"}
                  </span>
                  <span className="font-bold" style={{ color: entryTier.color }}>
                    {entry.score}
                  </span>
                  {entry.teamPokemon.length > 0 && (
                    <span className="text-[8px] text-[#8b9bb4] truncate max-w-[80px] hidden sm:inline">
                      {entry.teamPokemon.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {playerRank !== null && (
          <p className="mt-2 text-[9px] text-[#f7a838] font-pixel text-center">
            Your rank: #{playerRank}
          </p>
        )}
      </div>
    </div>
  );
}
