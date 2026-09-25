"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import PokeImage from "@/components/PokeImage";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { getTrainerId } from "@/utils/trainerIdentity";
import { formatName } from "@/utils/format";
import type { DailyEncounterSlot, DailySlotProgress, EncounterRarity } from "@/types/daily";

const RARITY_META: Record<EncounterRarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#8b9bb4" },
  uncommon: { label: "Uncommon", color: "#4a90d9" },
  rare: { label: "Rare", color: "#f7a838" },
};

function getSpriteUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface SlotCardProps {
  encounter: DailyEncounterSlot;
  progress: DailySlotProgress;
  nextChance: number;
  canThrow: boolean;
  onThrow: () => void;
}

function SlotCard({ encounter, progress, nextChance, canThrow, onThrow }: SlotCardProps) {
  const rarity = RARITY_META[encounter.rarity];
  const resolved = progress.caught || progress.exhausted;

  return (
    <div
      className={`rounded-lg border p-3 text-center transition-colors ${
        progress.caught
          ? "border-[#38b764] bg-[#38b764]/10"
          : progress.exhausted
            ? "border-[#e8433f] bg-[#e8433f]/10"
            : "border-[#3a4466] bg-[#1a1c2c]"
      }`}
    >
      <div className="flex justify-center">
        <PokeImage
          src={getSpriteUrl(encounter.pokemonId)}
          alt={encounter.pokemonName}
          width={56}
          height={56}
          unoptimized
        />
      </div>
      <p className="text-[10px] font-pixel text-[#f0f0e8]">{formatName(encounter.pokemonName)}</p>
      <p className="text-[9px] font-pixel" style={{ color: rarity.color }}>
        {rarity.label} · Lv. {encounter.level}
      </p>

      {resolved ? (
        <p
          className={`mt-2 text-[9px] font-pixel ${
            progress.caught ? "text-[#38b764]" : "text-[#e8433f]"
          }`}
        >
          {progress.caught ? "Caught!" : "Escaped"}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[9px] text-[#8b9bb4]">
            {Math.round(nextChance * 100)}% chance · {progress.attemptsUsed}/
            {encounter.rolls.length} balls
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onThrow}
            disabled={!canThrow}
            className="mt-2 w-full rounded-lg border border-[#e8433f] bg-[#e8433f]/10 py-1.5 text-[9px] font-pixel text-[#e8433f] transition-colors hover:bg-[#e8433f]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Throw Ball
          </motion.button>
        </>
      )}
    </div>
  );
}

export default function DailyChallenge() {
  const {
    today,
    challenge,
    record,
    slotProgress,
    ballsRemaining,
    complete,
    maxScore,
    msUntilReset,
    start,
    throwBall,
    submit,
    submitError,
    leaderboard,
    playerRank,
    leaderboardLoading,
    catchChanceForAttempt,
  } = useDailyChallenge();

  const [submitting, setSubmitting] = useState(false);
  const trainerId = useMemo(() => getTrainerId(), []);

  const progressBySlot = useMemo(() => {
    const map = new Map<number, DailySlotProgress>();
    for (const p of slotProgress) map.set(p.slot, p);
    return map;
  }, [slotProgress]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-pixel">
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#f0f0e8]">Daily Challenge</h3>
            <p className="text-[9px] text-[#8b9bb4]">{today} (UTC)</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#8b9bb4]">Resets in</p>
            <p className="text-xs text-[#f7a838]">{formatCountdown(msUntilReset)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8b9bb4]">
          <span>
            Balls left <span className="font-bold text-[#f0f0e8]">{ballsRemaining}</span>/
            {challenge.params.ballBudget}
          </span>
          <span>
            Score <span className="font-bold text-[#f0f0e8]">{record.score}</span>/{maxScore}
          </span>
        </div>

        {record.status === "idle" && (
          <button
            onClick={start}
            className="mt-3 w-full rounded-lg border-2 border-[#38b764] bg-[#38b764]/10 py-2.5 text-xs text-[#38b764] transition-colors hover:bg-[#38b764]/20"
          >
            Start Challenge
          </button>
        )}
      </div>

      {record.status !== "idle" && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {challenge.encounters.map((encounter) => {
              const progress = progressBySlot.get(encounter.slot) ?? {
                slot: encounter.slot,
                attemptsUsed: 0,
                caught: false,
                exhausted: false,
              };
              const nextChance = catchChanceForAttempt(
                encounter.baseCatchChance,
                progress.attemptsUsed
              );
              return (
                <SlotCard
                  key={encounter.slot}
                  encounter={encounter}
                  progress={progress}
                  nextChance={nextChance}
                  canThrow={!complete && ballsRemaining > 0}
                  onThrow={() => throwBall(encounter.slot)}
                />
              );
            })}
          </div>
        </div>
      )}

      {complete && (
        <div className="rounded-xl border border-[#f7a838] bg-[#f7a838]/10 p-4 text-center space-y-2">
          <p className="text-xs text-[#f7a838]">Challenge Complete!</p>
          <p className="text-sm text-[#f0f0e8]">
            Final Score: <span className="font-bold">{record.score}</span>
          </p>
          {record.submitted ? (
            <p className="text-[10px] text-[#38b764]">Submitted to today&apos;s leaderboard.</p>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg border border-[#f7a838] bg-[#f7a838]/10 px-4 py-2 text-xs text-[#f7a838] transition-colors hover:bg-[#f7a838]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Score"}
            </button>
          )}
          {submitError && <p className="text-[9px] text-[#e8433f]">{submitError}</p>}
        </div>
      )}

      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">Today&apos;s Leaderboard</h3>

        {leaderboardLoading && (
          <p className="py-3 text-center text-[10px] text-[#8b9bb4] animate-pulse">
            Loading rankings...
          </p>
        )}

        {!leaderboardLoading && leaderboard.length === 0 && (
          <p className="py-3 text-center text-[10px] text-[#8b9bb4]">
            No submissions yet today. Be the first!
          </p>
        )}

        {!leaderboardLoading && leaderboard.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {leaderboard.map((entry, i) => {
              const rank = i + 1;
              const isPlayer = entry.trainerId === trainerId;
              return (
                <div
                  key={`${entry.trainerId}-${i}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] ${
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
                  <span className="font-bold text-[#f7a838]">{entry.score}</span>
                </div>
              );
            })}
          </div>
        )}

        {playerRank !== null && (
          <p className="mt-2 text-center text-[9px] text-[#f7a838]">Your rank: #{playerRank}</p>
        )}
      </div>
    </div>
  );
}
