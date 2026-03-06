"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getCurrentTier, ELO_TIERS } from "@/data/eloTiers";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  avatarSprite: number;
  elo: number;
  allTimeElo: number;
  seasonElo: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
}

type Tab = "season" | "alltime" | "mystats";

export default function RankedLeaderboard() {
  const { user, player, refreshPlayer } = useAuth();
  const [tab, setTab] = useState<Tab>("season");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaderboard = useCallback(async (mode: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ranked/leaderboard?mode=${mode}&limit=100`);
      const data = await res.json();
      setEntries(data.leaderboard ?? []);
    } catch {
      setEntries([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "mystats") {
      refreshPlayer();
    } else {
      fetchLeaderboard(tab === "alltime" ? "alltime" : "season");
    }
  }, [tab, fetchLeaderboard, refreshPlayer]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "season", label: "Season" },
    { id: "alltime", label: "All Time" },
    { id: "mystats", label: "My Stats" },
  ];

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-3 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
        Ranked Leaderboard
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[9px] font-pixel transition-colors ${
              tab === t.id
                ? "bg-[#6390F0] text-[#f0f0e8]"
                : "bg-[#1a1c2c] text-[#8b9bb4] hover:text-[#f0f0e8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* My Stats Tab */}
      {tab === "mystats" && player && (
        <div className="space-y-3">
          <PlayerStatCard player={player} />
        </div>
      )}

      {tab === "mystats" && !player && (
        <p className="text-center text-[10px] font-pixel text-[#8b9bb4] py-4">
          Sign in to view your ranked stats
        </p>
      )}

      {/* Leaderboard Table */}
      {tab !== "mystats" && (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <p className="text-center text-[10px] font-pixel text-[#8b9bb4] py-4 animate-pulse">
              Loading...
            </p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-center text-[10px] font-pixel text-[#8b9bb4] py-4">
              No ranked players yet
            </p>
          )}
          {!isLoading &&
            entries.map((entry) => {
              const tier = getCurrentTier(entry.elo);
              const isMe = entry.id === user?.id;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    isMe
                      ? "border border-[#6390F0] bg-[#6390F0]/10"
                      : "bg-[#1a1c2c]"
                  }`}
                >
                  <span className="text-[10px] font-pixel text-[#8b9bb4] w-6 text-right">
                    {entry.rank}
                  </span>
                  <span className="text-sm" style={{ color: tier.color }}>
                    {tier.icon}
                  </span>
                  <span className="flex-1 text-[10px] font-pixel text-[#f0f0e8] truncate">
                    {entry.displayName}
                    {isMe && (
                      <span className="ml-1 text-[8px] text-[#6390F0]">
                        (you)
                      </span>
                    )}
                  </span>
                  <span
                    className="text-xs font-bold font-pixel"
                    style={{ color: tier.color }}
                  >
                    {entry.elo}
                  </span>
                  <span className="text-[8px] font-pixel text-[#8b9bb4] w-12 text-right">
                    {entry.wins}W/{entry.losses}L
                  </span>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function PlayerStatCard({
  player,
}: {
  player: {
    display_name: string;
    elo_rating: number;
    season_elo: number;
    total_wins: number;
    total_losses: number;
    current_streak: number;
    best_streak: number;
  };
}) {
  const tier = getCurrentTier(player.season_elo);
  const totalGames = player.total_wins + player.total_losses;
  const winRate =
    totalGames > 0
      ? Math.round((player.total_wins / totalGames) * 100)
      : 0;

  return (
    <div className="space-y-3">
      {/* Rating Display */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 rounded-lg px-4 py-3 border-2"
          style={{
            borderColor: tier.color,
            backgroundColor: `${tier.color}15`,
          }}
        >
          <span className="text-2xl" style={{ color: tier.color }}>
            {tier.icon}
          </span>
          <div>
            <p
              className="text-lg font-bold font-pixel"
              style={{ color: tier.color }}
            >
              {player.season_elo}
            </p>
            <p
              className="text-[10px] font-pixel"
              style={{ color: tier.color }}
            >
              {tier.name}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="All-Time ELO" value={String(player.elo_rating)} />
        <StatBox label="Win Rate" value={`${winRate}%`} />
        <StatBox label="Wins" value={String(player.total_wins)} color="#38b764" />
        <StatBox label="Losses" value={String(player.total_losses)} color="#e8433f" />
        <StatBox label="Current Streak" value={String(player.current_streak)} />
        <StatBox label="Best Streak" value={String(player.best_streak)} color="#f7a838" />
      </div>

      {/* Tier Ladder */}
      <div className="space-y-1">
        <p className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Season Tier
        </p>
        {[...ELO_TIERS].reverse().map((t) => {
          const isCurrent = t.name === tier.name;
          return (
            <div
              key={t.name}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                isCurrent
                  ? "border border-current"
                  : "bg-[#1a1c2c] opacity-60"
              }`}
              style={
                isCurrent
                  ? {
                      borderColor: t.color,
                      backgroundColor: `${t.color}15`,
                    }
                  : undefined
              }
            >
              <span className="text-sm" style={{ color: t.color }}>
                {t.icon}
              </span>
              <span
                className="text-[10px] font-pixel flex-1"
                style={{ color: isCurrent ? t.color : "#8b9bb4" }}
              >
                {t.name}
              </span>
              <span className="text-[9px] text-[#8b9bb4] font-pixel">
                {t.minRating}+
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-[#1a1c2c] p-2 text-center">
      <p
        className="text-xs font-bold font-pixel"
        style={{ color: color ?? "#f0f0e8" }}
      >
        {value}
      </p>
      <p className="text-[8px] text-[#8b9bb4] font-pixel">{label}</p>
    </div>
  );
}
