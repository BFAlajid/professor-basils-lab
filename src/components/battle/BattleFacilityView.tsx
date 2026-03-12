"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { BattleFacilityState, TeamSlot } from "@/types";
import GymBadgeCase from "./GymBadgeCase";
import HallOfFame from "./HallOfFame";
import { saveToHallOfFame } from "@/data/hallOfFame";
import FacilityLobby from "./FacilityLobby";
import FacilityBattlePreview from "./FacilityBattlePreview";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getTrainerId, getTrainerName } from "@/utils/trainerIdentity";
import { silentWarn } from "@/utils/silentWarn";
import type { LeaderboardEntry } from "@/types/leaderboard";

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

  // Leaderboard hooks
  const towerLeaderboard = useLeaderboard("battle-tower");
  const hofLeaderboard = useLeaderboard("hall-of-fame");
  const submittedTowerStreak = useRef<number>(0);
  const submittedHof = useRef(false);

  // Auto-submit battle tower streak when a new personal best is achieved (defeat/victory phase)
  useEffect(() => {
    if (!isTower) return;
    if (phase !== "defeat" && phase !== "victory") return;
    if (bestStreak <= 0 || bestStreak <= submittedTowerStreak.current) return;
    submittedTowerStreak.current = bestStreak;

    const entry: LeaderboardEntry = {
      trainerName: getTrainerName(),
      trainerId: getTrainerId(),
      score: bestStreak,
      teamPokemon: playerTeam.map((s) => s.pokemon.name).slice(0, 6),
      timestamp: new Date().toISOString(),
    };
    towerLeaderboard.submitScore(entry).catch((e) => silentWarn("towerLeaderboardSubmit", e));
  }, [isTower, phase, bestStreak, playerTeam, towerLeaderboard.submitScore]);

  // Auto-submit hall of fame entry on victory
  useEffect(() => {
    if (phase !== "victory") {
      submittedHof.current = false;
      return;
    }
    if (submittedHof.current) return;
    submittedHof.current = true;

    // Score = total base stat sum of the team
    const totalBaseStats = playerTeam.reduce((sum, slot) => {
      const stats = slot.pokemon.stats;
      if (!stats) return sum;
      return sum + stats.reduce((s: number, st: { base_stat: number }) => s + st.base_stat, 0);
    }, 0);

    const entry: LeaderboardEntry = {
      trainerName: getTrainerName(),
      trainerId: getTrainerId(),
      score: totalBaseStats,
      teamPokemon: playerTeam.map((s) => s.pokemon.name).slice(0, 6),
      timestamp: new Date().toISOString(),
    };
    hofLeaderboard.submitScore(entry).catch((e) => silentWarn("hofLeaderboardSubmit", e));
  }, [phase, playerTeam, hofLeaderboard.submitScore]);

  // Hall of Fame overlay
  if (showHallOfFame) {
    return <HallOfFame onClose={() => setShowHallOfFame(false)} />;
  }

  // Lobby — choose mode
  if (phase === "lobby") {
    return (
      <FacilityLobby
        bestStreak={bestStreak}
        badges={badges}
        onStartEliteFour={onStartEliteFour}
        onStartBattleTower={onStartBattleTower}
        onStartGymChallenge={onStartGymChallenge}
        onReset={onReset}
        onShowHallOfFame={() => setShowHallOfFame(true)}
      />
    );
  }

  // Pre-battle — show opponent info
  if (phase === "pre_battle" && currentOpponent) {
    return (
      <FacilityBattlePreview
        facilityState={facilityState}
        playerTeam={playerTeam}
        currentOpponent={currentOpponent}
        isLoading={isLoading}
        onBeginBattle={onBeginBattle}
        onReset={onReset}
      />
    );
  }

  // Between battles — show HP carry-over and next opponent preview
  if (phase === "between_battles") {
    const canHeal = isTower && wins > 0 && wins % 7 === 0;
    const nextOpponent = opponents[currentOpponentIndex] ?? null;
    const defeatedOpponent = opponents[currentOpponentIndex - 1] ?? null;
    const earnedBadge = isGym ? (badges?.[badges.length - 1] ?? null) : null;
    const prizeMoney = defeatedOpponent?.prizeMoney ?? (isTower ? 1000 * wins : 0);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 space-y-4"
      >
        {/* Defeated trainer announcement */}
        <div className="text-center space-y-2">
          <motion.h3
            className="text-lg font-pixel text-[#38b764]"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            You defeated {defeatedOpponent?.name ?? "the opponent"}!
          </motion.h3>

          {/* Prize money */}
          {prizeMoney > 0 && (
            <motion.p
              className="text-sm font-pixel text-[#f7a838]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              You received ¥{prizeMoney.toLocaleString()}!
            </motion.p>
          )}

          {/* Badge earned (gym only) */}
          {earnedBadge && (
            <motion.p
              className="text-sm font-pixel text-[#f0f0e8]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              You received the <span className="text-[#f7a838]">{earnedBadge} Badge</span>!
            </motion.p>
          )}

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

        {/* Global Tower Rankings (battle tower mode) */}
        {isTower && (
          <TowerRankingsInline
            entries={towerLeaderboard.entries}
            isLoading={towerLeaderboard.isLoading}
            playerRank={towerLeaderboard.playerRank}
          />
        )}

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

        {/* Global Tower Rankings (battle tower mode) */}
        {isTower && (
          <TowerRankingsInline
            entries={towerLeaderboard.entries}
            isLoading={towerLeaderboard.isLoading}
            playerRank={towerLeaderboard.playerRank}
          />
        )}

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

// ── Inline Tower Rankings (top 10) ──────────────────────────────────

function TowerRankingsInline({
  entries,
  isLoading,
  playerRank,
}: {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  playerRank: number | null;
}) {
  const trainerId = getTrainerId();

  return (
    <div className="mt-2 pt-3 border-t border-[#3a4466] text-left">
      <p className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
        Global Tower Rankings
      </p>

      {isLoading && (
        <p className="text-[10px] text-[#8b9bb4] font-pixel animate-pulse text-center py-2">
          Loading...
        </p>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="text-[10px] text-[#8b9bb4] font-pixel text-center py-2">
          No rankings yet.
        </p>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-1">
          {entries.slice(0, 10).map((entry, i) => {
            const rank = i + 1;
            const isPlayer = entry.trainerId === trainerId;
            return (
              <div
                key={`${entry.trainerId}-${i}`}
                className={`flex items-center gap-2 rounded px-2 py-1 text-[10px] font-pixel ${
                  isPlayer
                    ? "bg-[#38b764]/15 border border-[#38b764]/40"
                    : "bg-[#1a1c2c]"
                }`}
              >
                <span className="w-5 text-right text-[#8b9bb4]">
                  {rank <= 3 ? ["1st", "2nd", "3rd"][rank - 1] : `${rank}.`}
                </span>
                <span className={`flex-1 truncate ${isPlayer ? "text-[#38b764]" : "text-[#f0f0e8]"}`}>
                  {entry.trainerName}
                  {isPlayer && " (you)"}
                </span>
                <span className="text-[#60a5fa] font-bold">{entry.score}</span>
              </div>
            );
          })}
        </div>
      )}

      {playerRank !== null && (
        <p className="mt-1 text-[9px] text-[#f7a838] font-pixel text-center">
          Your rank: #{playerRank}
        </p>
      )}
    </div>
  );
}
