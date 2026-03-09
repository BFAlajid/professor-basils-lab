"use client";

import GymBadgeCase from "./GymBadgeCase";

// ── Props ────────────────────────────────────────────────────────────

interface FacilityLobbyProps {
  bestStreak: number;
  badges?: string[];
  onStartEliteFour: () => void;
  onStartBattleTower: () => void;
  onStartGymChallenge: () => void;
  onReset: () => void;
  onShowHallOfFame: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function FacilityLobby({
  bestStreak,
  badges,
  onStartEliteFour,
  onStartBattleTower,
  onStartGymChallenge,
  onReset,
  onShowHallOfFame,
}: FacilityLobbyProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-lg font-pixel text-[#f0f0e8]">Battle Facility</h3>
        <p className="text-xs text-[#8b9bb4]">
          Test your team in the ultimate challenge!
        </p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onStartEliteFour}
            className="rounded-xl border-2 border-[#f7a838] bg-[#1a1c2c] p-4 text-left hover:bg-[#262b44] transition-colors"
          >
            <span className="block text-sm font-pixel text-[#f7a838]">Elite Four</span>
            <span className="block text-[10px] text-[#8b9bb4] mt-1">
              5 battles, no healing. Defeat 4 specialists + Champion.
            </span>
          </button>
          <button
            onClick={onStartBattleTower}
            className="rounded-xl border-2 border-[#60a5fa] bg-[#1a1c2c] p-4 text-left hover:bg-[#262b44] transition-colors"
          >
            <span className="block text-sm font-pixel text-[#60a5fa]">Battle Tower</span>
            <span className="block text-[10px] text-[#8b9bb4] mt-1">
              Endless streak. Scales every 7 wins. Heal every 7.
            </span>
            {bestStreak > 0 && (
              <span className="block text-[10px] text-[#f7a838] mt-1">
                Best: {bestStreak}
              </span>
            )}
          </button>
          <button
            onClick={onStartGymChallenge}
            className="rounded-xl border-2 border-[#38b764] bg-[#1a1c2c] p-4 text-left hover:bg-[#262b44] transition-colors"
          >
            <span className="block text-sm font-pixel text-[#38b764]">Gym Challenge</span>
            <span className="block text-[10px] text-[#8b9bb4] mt-1">
              8 type-themed gyms. Full heal between battles. Earn badges.
            </span>
            {badges && badges.length > 0 && (
              <span className="block text-[10px] text-[#f7a838] mt-1">
                Badges: {badges.length}/8
              </span>
            )}
          </button>
        </div>

        {/* Badge case preview */}
        {badges && badges.length > 0 && (
          <GymBadgeCase earnedBadges={badges} />
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={onShowHallOfFame}
            className="text-xs text-[#f7a838] hover:text-[#f0f0e8] transition-colors"
          >
            Hall of Fame
          </button>
          <button
            onClick={onReset}
            className="text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            Back to Battle Setup
          </button>
        </div>
      </div>
    </div>
  );
}
