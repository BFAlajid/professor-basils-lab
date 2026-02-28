"use client";

import { motion } from "framer-motion";
import { getCurrentTier } from "@/data/eloTiers";

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
}

export default function ELOLeaderboard({
  eloRating,
  totalWins,
  totalLosses,
}: ELOLeaderboardProps) {
  const tier = getCurrentTier(eloRating);
  const totalGames = totalWins + totalLosses;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

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
    </div>
  );
}
