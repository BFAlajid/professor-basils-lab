"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { BattleFacilityState, EliteFourMember, TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import LoadingSpinner from "../LoadingSpinner";
import GymBadgeCase from "./GymBadgeCase";
import HallOfFame from "./HallOfFame";
import { saveToHallOfFame } from "@/data/hallOfFame";

interface BattleFacilityViewProps {
  facilityState: BattleFacilityState;
  playerTeam: TeamSlot[];
  isLoading: boolean;
  onStartEliteFour: () => void;
  onStartBattleTower: () => void;
  onStartGymChallenge: () => void;
  onBeginBattle: () => void;
  onNextBattle: () => void;
  onHeal: () => void;
  onReset: () => void;
}

export default function BattleFacilityView({
  facilityState,
  playerTeam,
  isLoading,
  onStartEliteFour,
  onStartBattleTower,
  onStartGymChallenge,
  onBeginBattle,
  onNextBattle,
  onHeal,
  onReset,
}: BattleFacilityViewProps) {
  const { mode, phase, currentOpponentIndex, wins, streak, bestStreak, opponents, teamHpPercents, badges } = facilityState;
  const currentOpponent = opponents[currentOpponentIndex] ?? null;
  const isEliteFour = mode === "elite_four";
  const isTower = mode === "battle_tower";
  const isGym = mode === "gym_challenge";
  const [showHallOfFame, setShowHallOfFame] = useState(false);

  // Hall of Fame overlay
  if (showHallOfFame) {
    return <HallOfFame onClose={() => setShowHallOfFame(false)} />;
  }

  // Lobby — choose mode
  if (phase === "lobby") {
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
              onClick={() => setShowHallOfFame(true)}
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

  // Pre-battle — show opponent info
  if (phase === "pre_battle" && currentOpponent) {
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
                    <span className="text-[8px] text-[#8b9bb4] capitalize truncate block">
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

  // Between battles — show HP carry-over and next opponent preview
  if (phase === "between_battles") {
    const canHeal = isTower && wins > 0 && wins % 7 === 0;
    const nextOpponent = opponents[currentOpponentIndex] ?? null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 space-y-4"
      >
        <div className="text-center">
          <h3 className="text-lg font-pixel text-[#38b764]">Victory!</h3>
          <p className="text-xs text-[#8b9bb4] mt-1">
            {isEliteFour
              ? `Defeated ${wins} of ${facilityState.totalOpponents} trainers`
              : isGym
              ? `Defeated ${wins} of 8 Gym Leaders`
              : `Streak: ${streak} | Best: ${bestStreak}`}
          </p>
        </div>

        {/* Team status */}
        <div className="space-y-1">
          <p className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Team Status</p>
          <div className="space-y-1">
            {playerTeam.map((slot, i) => {
              const hp = teamHpPercents[i] ?? 1;
              const fainted = hp <= 0;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg bg-[#1a1c2c] px-3 py-1.5 ${fainted ? "opacity-40" : ""}`}
                >
                  {slot.pokemon.sprites.front_default && (
                    <Image
                      src={slot.pokemon.sprites.front_default}
                      alt={slot.pokemon.name}
                      width={28}
                      height={28}
                      unoptimized
                    />
                  )}
                  <span className="text-xs font-pixel capitalize flex-1">{slot.pokemon.name}</span>
                  <div className="w-24 h-2 rounded-full bg-[#3a4466]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, hp * 100)}%`,
                        backgroundColor: hp > 0.5 ? "#38b764" : hp > 0.25 ? "#f7a838" : "#e8433f",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[#8b9bb4] w-10 text-right">
                    {fainted ? "KO" : `${Math.round(hp * 100)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heal milestone */}
        {canHeal && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="rounded-lg border border-[#38b764]/30 bg-[#38b764]/10 p-3 text-center"
          >
            <p className="text-sm text-[#38b764] font-pixel">Milestone Reached!</p>
            <p className="text-[10px] text-[#8b9bb4] mt-1">
              Every 7 wins, your team is fully healed.
            </p>
            <button
              onClick={onHeal}
              className="mt-2 rounded-lg bg-[#38b764] px-6 py-2 text-xs font-pixel text-[#f0f0e8] hover:bg-[#2d9453] transition-colors"
            >
              Heal Team
            </button>
          </motion.div>
        )}

        {/* Next opponent preview */}
        {nextOpponent && (
          <div className="rounded-lg bg-[#1a1c2c] p-3 text-center">
            <p className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Next Opponent</p>
            <p className="text-sm font-pixel text-[#f0f0e8] mt-1">{nextOpponent.name}</p>
            <p className="text-[10px] text-[#8b9bb4]">{nextOpponent.title}</p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={onNextBattle}
            disabled={isLoading}
            className="rounded-lg bg-[#e8433f] px-8 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Continue"}
          </button>
          <button
            onClick={onReset}
            className="rounded-lg bg-[#3a4466] px-4 py-3 text-xs text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            Retire
          </button>
        </div>
      </motion.div>
    );
  }

  // Victory
  if (phase === "victory") {
    // Auto-save to Hall of Fame
    const teamForHof = playerTeam.map((slot) => ({
      pokemonId: slot.pokemon.id,
      name: slot.pokemon.name,
      spriteUrl: slot.pokemon.sprites.front_default,
      level: 50,
    }));

    // Save once (useEffect pattern not ideal here, so we rely on idempotent save)
    saveToHallOfFame({
      id: "",
      date: new Date().toISOString(),
      mode: mode as "elite_four" | "battle_tower" | "gym_challenge",
      team: teamForHof,
      streak: isTower ? streak : undefined,
      gymBadges: isGym ? (badges?.length ?? 0) : undefined,
    });

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-[#f7a838] bg-[#262b44] p-8 text-center space-y-4"
      >
        <motion.h2
          className="text-2xl font-pixel text-[#f7a838]"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          {isEliteFour ? "Elite Four Champion!" : isGym ? "Gym Champion!" : "Battle Tower Record!"}
        </motion.h2>
        <p className="text-sm text-[#8b9bb4]">
          {isEliteFour
            ? "You defeated all Elite Four members and the Champion!"
            : isGym
            ? "You defeated all 8 Gym Leaders and earned every badge!"
            : `Final streak: ${streak} | Best: ${bestStreak}`}
        </p>
        {isGym && badges && <GymBadgeCase earnedBadges={badges} />}
        <p className="text-[10px] text-[#f7a838]">Saved to Hall of Fame!</p>
        <button
          onClick={onReset}
          className="rounded-lg bg-[#f7a838] px-8 py-3 text-sm font-pixel text-[#1a1c2c] hover:bg-[#d89230] transition-colors"
        >
          Back to Facility
        </button>
      </motion.div>
    );
  }

  // Defeat
  if (phase === "defeat") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-[#e8433f] bg-[#262b44] p-8 text-center space-y-4"
      >
        <motion.h2
          className="text-2xl font-pixel text-[#e8433f]"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          Defeated!
        </motion.h2>
        <p className="text-sm text-[#8b9bb4]">
          {isEliteFour
            ? `Fell at battle ${wins + 1} of ${facilityState.totalOpponents}.`
            : `Streak ended at ${streak}. Best: ${bestStreak}`}
        </p>
        <button
          onClick={onReset}
          className="rounded-lg bg-[#3a4466] px-8 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  // Fallback (battling phase is handled by BattleArena in BattleTab)
  return null;
}
