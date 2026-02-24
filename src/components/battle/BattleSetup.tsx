"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { TeamSlot, BattleMode, GenerationalMechanic, DifficultyLevel } from "@/types";
import LoadingSpinner from "../LoadingSpinner";
import TypeBadge from "../TypeBadge";

interface BattleSetupProps {
  playerTeam: TeamSlot[];
  onStart: (player1Team: TeamSlot[], player2Team: TeamSlot[], mode: BattleMode, playerMechanic?: GenerationalMechanic, aiMechanic?: GenerationalMechanic, difficulty?: DifficultyLevel) => void;
  onGenerateOpponent: () => Promise<TeamSlot[]>;
  isLoadingOpponent: boolean;
  onModeChange?: (mode: string) => void;
}

export default function BattleSetup({
  playerTeam,
  onStart,
  onGenerateOpponent,
  isLoadingOpponent,
  onModeChange,
}: BattleSetupProps) {
  const [mode, setMode] = useState<BattleMode>("ai");
  const [mechanic, setMechanic] = useState<GenerationalMechanic>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("normal");
  const [opponentTeam, setOpponentTeam] = useState<TeamSlot[] | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleGenerateOpponent = async () => {
    const team = await onGenerateOpponent();
    setOpponentTeam(team);
  };

  const handleStart = async () => {
    if (!opponentTeam) return;
    setIsStarting(true);
    try {
      await onStart(playerTeam, opponentTeam, mode, mechanic, mechanic, difficulty);
    } finally {
      setIsStarting(false);
    }
  };

  // Check if team has moves selected
  const teamHasMoves = playerTeam.every(
    (s) => (s.selectedMoves?.length ?? 0) > 0
  );

  const canStart = opponentTeam && opponentTeam.length > 0 && playerTeam.length > 0;

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-lg font-bold font-pixel">Battle Mode</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setMode("ai")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              mode === "ai"
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
            }`}
          >
            <span className="block text-base font-pixel">vs AI</span>
            <span className="block text-[10px] mt-1 opacity-70">
              Battle against a smart computer opponent
            </span>
          </button>
          <button
            onClick={() => setMode("pvp")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              mode === "pvp"
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
            }`}
          >
            <span className="block text-base font-pixel">Local PvP</span>
            <span className="block text-[10px] mt-1 opacity-70">
              Two players on the same device
            </span>
          </button>
          <button
            onClick={() => onModeChange?.("tournament")}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          >
            <span className="block text-base font-pixel">Tournament</span>
            <span className="block text-[10px] mt-1 opacity-70">
              8-trainer bracket challenge
            </span>
          </button>
          <button
            onClick={() => onModeChange?.("online")}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          >
            <span className="block text-base font-pixel">Online</span>
            <span className="block text-[10px] mt-1 opacity-70">
              P2P battle via room code
            </span>
          </button>
          <button
            onClick={() => onModeChange?.("facility")}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          >
            <span className="block text-base font-pixel">Facility</span>
            <span className="block text-[10px] mt-1 opacity-70">
              E4, Tower &amp; Gyms
            </span>
          </button>
          <button
            onClick={() => onModeChange?.("factory")}
            className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          >
            <span className="block text-base font-pixel">Factory</span>
            <span className="block text-[10px] mt-1 opacity-70">
              Rental Pokemon
            </span>
          </button>
        </div>
      </div>

      {/* Generational Mechanic */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-lg font-bold font-pixel">Gimmick</h3>
        <div className="grid grid-cols-4 gap-2">
          {([
            { value: null, label: "None", color: "#3a4466" },
            { value: "mega" as const, label: "Mega", color: "#f7a838" },
            { value: "tera" as const, label: "Tera", color: "#60a5fa" },
            { value: "dynamax" as const, label: "D-Max", color: "#e8433f" },
          ]).map(({ value, label, color }) => (
            <button
              key={label}
              onClick={() => setMechanic(value)}
              className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                mechanic === value
                  ? "ring-2 ring-[#f0f0e8] text-[#f0f0e8]"
                  : "text-[#8b9bb4] hover:text-[#f0f0e8]"
              }`}
              style={{
                backgroundColor: mechanic === value ? color : "#262b44",
                borderWidth: 2,
                borderColor: color,
              }}
            >
              <span className="block text-sm font-pixel">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Difficulty (only in AI mode) */}
      {mode === "ai" && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h3 className="mb-3 text-lg font-bold font-pixel">Difficulty</h3>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "easy" as const, label: "Easy", desc: "Random moves, forgiving" },
              { value: "normal" as const, label: "Normal", desc: "Smart move selection" },
              { value: "hard" as const, label: "Hard", desc: "Ability-aware, predicts" },
            ]).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDifficulty(value)}
                className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  difficulty === value
                    ? "bg-[#e8433f] ring-2 ring-[#f0f0e8] text-[#f0f0e8]"
                    : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8]"
                }`}
              >
                <span className="block text-sm font-pixel">{label}</span>
                <span className="block text-[10px] mt-1 opacity-70">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warning if no moves */}
      {!teamHasMoves && playerTeam.length > 0 && (
        <div className="rounded-lg border border-[#f7a838]/30 bg-[#f7a838]/10 p-3 text-sm text-[#f7a838]">
          Some Pokemon on your team don&apos;t have moves selected. Go to the Team tab and click a Pokemon to configure its moves.
        </div>
      )}

      {/* Teams Display */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Player Team */}
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h4 className="mb-3 text-sm font-bold text-[#38b764] font-pixel">
            {mode === "ai" ? "Your Team" : "Player 1"}
          </h4>
          {playerTeam.length === 0 ? (
            <p className="text-sm text-[#8b9bb4]">
              Add Pokemon to your team first
            </p>
          ) : (
            <div className="space-y-2">
              {playerTeam.map((slot) => (
                <TeamMemberRow key={slot.pokemon.id} slot={slot} />
              ))}
            </div>
          )}
        </div>

        {/* Opponent Team */}
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h4 className="mb-3 text-sm font-bold text-[#e8433f] font-pixel">
            {mode === "ai" ? "Opponent" : "Player 2"}
          </h4>
          {isLoadingOpponent ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <LoadingSpinner size={30} />
              <span className="text-sm text-[#8b9bb4]">Generating team...</span>
            </div>
          ) : opponentTeam ? (
            <div className="space-y-2">
              {opponentTeam.map((slot) => (
                <TeamMemberRow key={slot.pokemon.id} slot={slot} />
              ))}
              <button
                onClick={handleGenerateOpponent}
                className="w-full rounded-lg bg-[#3a4466] px-3 py-1.5 text-xs text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors mt-2"
              >
                Reroll Team
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <button
                onClick={handleGenerateOpponent}
                className="rounded-lg bg-[#e8433f] px-6 py-3 text-sm font-medium text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
              >
                Generate Random Team
              </button>
              <span className="text-[10px] text-[#8b9bb4]">
                Picks from competitive Pokemon with random movesets
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Start Button */}
      {canStart && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="rounded-xl bg-[#e8433f] px-10 py-4 text-lg font-bold font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-50"
          >
            {isStarting ? "Loading Moves..." : "Start Battle!"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

function TeamMemberRow({ slot }: { slot: TeamSlot }) {
  const sprite = slot.pokemon.sprites.front_default;
  const moveCount = slot.selectedMoves?.length ?? 0;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#1a1c2c] px-3 py-2">
      {sprite && (
        <Image
          src={sprite}
          alt={slot.pokemon.name}
          width={36}
          height={36}
          unoptimized
        />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium capitalize truncate block font-pixel">
          {slot.pokemon.name}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          {slot.pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
          ))}
          {moveCount > 0 && (
            <span className="text-[10px] text-[#38b764] ml-1">
              {moveCount} moves
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
