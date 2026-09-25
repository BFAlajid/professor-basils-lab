"use client";

import { useEffect, useRef } from "react";
import Image from "@/components/PokeImage";
import { SafariZoneState } from "@/types";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getTrainerId, getTrainerName } from "@/utils/trainerIdentity";
import { silentWarn } from "@/utils/silentWarn";
import type { LeaderboardEntry } from "@/types/leaderboard";

// ── Props ────────────────────────────────────────────────────────────

interface SafariSummaryViewProps {
  state: SafariZoneState;
  addedToBox: boolean;
  onAddAllToBox: () => void;
  onLeave: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function SafariSummaryView({
  state,
  addedToBox,
  onAddAllToBox,
  onLeave,
}: SafariSummaryViewProps) {
  const ballsUsed = 30 - state.ballsRemaining;
  const stepsTaken = 500 - state.stepsRemaining;
  const totalCatches = state.caughtPokemon.length;

  const { entries, playerRank, isLoading, submitScore } = useLeaderboard("safari-catches");
  const hasSubmitted = useRef(false);

  // Auto-submit safari catches when summary is shown
  useEffect(() => {
    if (hasSubmitted.current || totalCatches <= 0) return;
    hasSubmitted.current = true;

    const entry: LeaderboardEntry = {
      trainerName: getTrainerName(),
      trainerId: getTrainerId(),
      score: totalCatches,
      teamPokemon: state.caughtPokemon.map((c) => c.pokemon.name).slice(0, 6),
      timestamp: new Date().toISOString(),
    };
    submitScore(entry).catch((e) => silentWarn("safariLeaderboardSubmit", e));
  }, [totalCatches, state.caughtPokemon, submitScore]);

  const trainerId = getTrainerId();

  return (
    <div className="space-y-4">
      <h3 className="text-center text-sm font-pixel text-[#f7a838]">
        Safari Zone Complete!
      </h3>

      {/* Stats */}
      <div className="flex justify-center gap-4 text-[10px] text-[#8b9bb4]">
        <span>Balls used: {ballsUsed}/30</span>
        <span>Steps: {stepsTaken}/500</span>
        <span>Caught: {totalCatches}</span>
      </div>

      {/* Caught grid */}
      {totalCatches > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
          {state.caughtPokemon.map((entry, i) => (
            <div
              key={i}
              className="flex flex-col items-center bg-[#1a1c2c] rounded-lg p-1.5 border border-[#3a4466]"
            >
              {entry.pokemon.sprites.front_default && (
                <Image
                  src={entry.pokemon.sprites.front_default}
                  alt={entry.pokemon.name}
                  width={36}
                  height={36}
                  unoptimized
                  className="pixelated"
                />
              )}
              <span className="text-[10px] text-[#f0f0e8] capitalize truncate w-full text-center">
                {entry.pokemon.name}
                {entry.isShiny && " \u2728"}
              </span>
              <span className="text-[6px] text-[#8b9bb4]">
                Lv.{entry.level}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#8b9bb4] text-center py-3">
          No Pokemon were caught this trip.
        </p>
      )}

      {/* Safari Leaderboard (top 10) */}
      {totalCatches > 0 && (
        <div className="rounded-lg bg-[#1a1c2c] border border-[#3a4466] p-3">
          <p className="text-[9px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
            Safari Catches Leaderboard
          </p>

          {isLoading && (
            <p className="text-[10px] text-[#8b9bb4] font-pixel animate-pulse text-center py-2">
              Loading...
            </p>
          )}

          {!isLoading && entries.length === 0 && (
            <p className="text-[10px] text-[#8b9bb4] font-pixel text-center py-1">
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
                        : "bg-[#262b44]"
                    }`}
                  >
                    <span className="w-5 text-right text-[#8b9bb4]">
                      {rank <= 3 ? ["1st", "2nd", "3rd"][rank - 1] : `${rank}.`}
                    </span>
                    <span className={`flex-1 truncate ${isPlayer ? "text-[#38b764]" : "text-[#f0f0e8]"}`}>
                      {entry.trainerName}
                      {isPlayer && " (you)"}
                    </span>
                    <span className="text-[#f7a838] font-bold">{entry.score}</span>
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
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {totalCatches > 0 && (
          <button
            onClick={onAddAllToBox}
            disabled={addedToBox}
            className="flex-1 px-4 py-2 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors disabled:opacity-50"
          >
            {addedToBox ? "Added to PC Box!" : "Add All to PC Box"}
          </button>
        )}
        <button
          onClick={onLeave}
          className="flex-1 px-4 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
