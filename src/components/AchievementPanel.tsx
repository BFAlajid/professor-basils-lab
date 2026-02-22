"use client";

import { useState, useMemo } from "react";
import { useAchievements, AchievementCategory, Achievement } from "@/hooks/useAchievements";

type FilterTab = "all" | AchievementCategory;

const CATEGORY_LABELS: Record<FilterTab, string> = {
  all: "All",
  catching: "Catching",
  battle: "Battle",
  collection: "Collection",
  exploration: "Exploration",
  special: "Special",
};

const FILTER_TABS: FilterTab[] = [
  "all",
  "catching",
  "battle",
  "collection",
  "exploration",
  "special",
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  if (achievement.unlocked) {
    return (
      <div
        className="relative rounded-xl border-2 border-[#e8433f] bg-[#262b44] p-4 transition-transform hover:scale-[1.02]"
        style={{ boxShadow: "0 0 12px rgba(232, 67, 63, 0.15)" }}
      >
        <div className="mb-2 text-center text-3xl leading-none">
          {achievement.icon}
        </div>
        <h4 className="mb-1 text-center font-pixel text-xs leading-relaxed text-[#f0f0e8]">
          {achievement.name}
        </h4>
        <p className="mb-2 text-center text-xs text-[#8b9bb4] leading-relaxed">
          {achievement.description}
        </p>
        {achievement.unlockedAt && (
          <p className="text-center text-[10px] text-[#e8433f]">
            {formatDate(achievement.unlockedAt)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-[#3a4466] bg-[#262b44] p-4 opacity-50">
      <div className="mb-2 text-center text-3xl leading-none grayscale">
        {"\u{1F512}"}
      </div>
      <h4 className="mb-1 text-center font-pixel text-xs leading-relaxed text-[#8b9bb4]">
        {achievement.name}
      </h4>
      <p className="mb-2 text-center text-xs text-[#5a6784] leading-relaxed">
        ???
      </p>
    </div>
  );
}

export default function AchievementPanel() {
  const {
    achievements,
    stats,
    getUnlockedCount,
    getTotalCount,
  } = useAchievements();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const unlockedCount = getUnlockedCount();
  const totalCount = getTotalCount();
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const filteredAchievements = useMemo(() => {
    if (activeFilter === "all") return achievements;
    return achievements.filter((a) => a.category === activeFilter);
  }, [achievements, activeFilter]);

  // Sort: unlocked first, then by category
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });
  }, [filteredAchievements]);

  const statEntries: { label: string; value: string | number }[] = [
    { label: "Total Caught", value: stats.totalCaught },
    { label: "Unique Species", value: stats.uniqueSpeciesCaught },
    { label: "Shinies Caught", value: stats.shinyCaught },
    { label: "Legends Caught", value: stats.legendsCaught },
    { label: "Battles Won", value: stats.totalBattlesWon },
    { label: "Battles Played", value: stats.totalBattlesPlayed },
    {
      label: "Win Rate",
      value:
        stats.totalBattlesPlayed > 0
          ? `${Math.round((stats.totalBattlesWon / stats.totalBattlesPlayed) * 100)}%`
          : "0%",
    },
    { label: "Best Win Streak", value: stats.bestWinStreak },
    { label: "Critical Hits", value: stats.criticalHits },
    { label: "Super Effective Hits", value: stats.superEffectiveHits },
    { label: "Teams Built", value: stats.totalTeamsBuilt },
    { label: "Balls Thrown", value: stats.ballsThrown },
    { label: "Ball Types Used", value: stats.uniqueBallTypesUsed.length },
    { label: "GBA Imports", value: stats.gbaImports },
    { label: "Types Owned", value: stats.uniqueTypesOwned.length },
    { label: "Showdown Exports", value: stats.showdownExports },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-lg text-[#f0f0e8]">Achievements</h2>
        <span className="font-pixel text-sm text-[#8b9bb4]">
          {unlockedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full border border-[#3a4466] bg-[#262b44]">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg, #e8433f, #ff6b6b)",
            minWidth: progressPercent > 0 ? "8px" : "0px",
          }}
        />
      </div>
      <p className="text-center text-xs text-[#8b9bb4]">
        {Math.round(progressPercent)}% Complete
      </p>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`rounded-lg px-3 py-1.5 font-pixel text-xs transition-colors ${
              activeFilter === tab
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#262b44] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
            }`}
          >
            {CATEGORY_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-8 text-center text-[#8b9bb4]">
          No achievements in this category.
        </div>
      )}

      {/* Stats summary */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <h3 className="mb-4 font-pixel text-sm text-[#f0f0e8]">
          Player Stats
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {statEntries.map((entry) => (
            <div
              key={entry.label}
              className="rounded-lg bg-[#1a1c2c] p-3"
            >
              <p className="text-[10px] text-[#8b9bb4] leading-relaxed">
                {entry.label}
              </p>
              <p className="font-pixel text-sm text-[#f0f0e8]">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
