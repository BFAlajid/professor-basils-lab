"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BattleReplay } from "@/types";
import { getCurrentTier, ELO_TIERS } from "@/data/eloTiers";

interface BattleHistoryDashboardProps {
  stats: {
    totalBattlesWon: number;
    totalBattlesPlayed: number;
    eloRating: number;
  };
  replays: BattleReplay[];
}

export default function BattleHistoryDashboard({
  stats,
  replays,
}: BattleHistoryDashboardProps) {
  const winRate =
    stats.totalBattlesPlayed > 0
      ? Math.round((stats.totalBattlesWon / stats.totalBattlesPlayed) * 100)
      : 0;

  const tier = getCurrentTier(stats.eloRating);

  const nextTier = useMemo(() => {
    const idx = ELO_TIERS.findIndex((t) => t.name === tier.name);
    return idx < ELO_TIERS.length - 1 ? ELO_TIERS[idx + 1] : null;
  }, [tier]);

  const progressToNext = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.minRating - tier.minRating;
    const progress = stats.eloRating - tier.minRating;
    return Math.min(100, Math.round((progress / range) * 100));
  }, [tier, nextTier, stats.eloRating]);

  const mostUsed = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const replay of replays) {
      for (const name of replay.player1TeamNames) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [replays]);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 text-center"
        >
          <p className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-1">
            Win Rate
          </p>
          <p className="text-2xl font-bold font-pixel text-[#38b764]">
            {winRate}%
          </p>
          <p className="text-[9px] text-[#8b9bb4] mt-1">
            {stats.totalBattlesWon}W / {stats.totalBattlesPlayed - stats.totalBattlesWon}L
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 text-center"
        >
          <p className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-1">
            ELO Rating
          </p>
          <p className="text-2xl font-bold font-pixel" style={{ color: tier.color }}>
            {stats.eloRating}
          </p>
          <p className="text-[9px] text-[#8b9bb4] mt-1">
            {stats.totalBattlesPlayed} battles
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 text-center"
        >
          <p className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-1">
            Rank
          </p>
          <p className="text-lg font-bold font-pixel" style={{ color: tier.color }}>
            <span className="mr-1">{tier.icon}</span>
            {tier.name}
          </p>
          {nextTier && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-[#1a1c2c] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
              </div>
              <p className="text-[8px] text-[#8b9bb4] mt-1">
                {nextTier.minRating - stats.eloRating} to {nextTier.name}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Most Used Pokemon */}
      {mostUsed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4"
        >
          <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-3">
            Most Used Pokemon
          </h4>
          <div className="space-y-2">
            {mostUsed.map(([name, count], i) => {
              const maxCount = mostUsed[0][1];
              const barWidth = Math.round((count / maxCount) * 100);
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8b9bb4] w-4 text-right font-pixel">
                    {i + 1}.
                  </span>
                  <span className="text-xs font-pixel text-[#f0f0e8] capitalize w-24 truncate">
                    {name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[#1a1c2c] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="h-full rounded-full bg-[#e8433f]"
                    />
                  </div>
                  <span className="text-[10px] text-[#8b9bb4] font-pixel w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Battles Summary */}
      {replays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4"
        >
          <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-3">
            Recent Battles
          </h4>
          <div className="flex gap-1 flex-wrap">
            {replays.slice(0, 20).map((replay) => (
              <div
                key={replay.id}
                aria-label={`Battle ${replay.winner === "player1" ? "won" : "lost"}`}
                className="w-4 h-4 rounded-sm"
                style={{
                  backgroundColor:
                    replay.winner === "player1" ? "#38b764" : "#e8433f",
                }}
                title={`${replay.winner === "player1" ? "W" : "L"} - ${replay.totalTurns} turns`}
              />
            ))}
          </div>
          {replays.length > 20 && (
            <p className="text-[8px] text-[#8b9bb4] mt-2">
              +{replays.length - 20} more battles
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
