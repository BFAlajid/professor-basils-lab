"use client";

import { motion } from "framer-motion";
import { TournamentTrainer, TournamentState, TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import { TypeName } from "@/types";

interface TournamentBracketProps {
  state: TournamentState;
  isGenerating: boolean;
  onStartTournament: () => void;
  onBeginMatch: (opponentIndex: number) => void;
  onNextRound: () => void;
  onReset: () => void;
}

export default function TournamentBracket({
  state,
  isGenerating,
  onStartTournament,
  onBeginMatch,
  onNextRound,
  onReset,
}: TournamentBracketProps) {
  if (state.trainers.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-lg font-pixel text-[#f0f0e8]">Tournament Mode</h3>
        <p className="text-xs text-[#8b9bb4]">
          Battle through 3 rounds of increasingly tough trainers to become champion!
        </p>
        <button
          onClick={onStartTournament}
          disabled={isGenerating}
          className="rounded-lg bg-[#e8433f] px-6 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating Bracket..." : "Start Tournament"}
        </button>
      </div>
    );
  }

  // Tournament completed
  if (state.phase === "completed") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-lg font-pixel text-[#f0f0e8]">
          {state.isChampion ? "Tournament Champion!" : "Tournament Over"}
        </h3>
        <p className="text-sm text-[#8b9bb4]">
          {state.isChampion
            ? `You defeated all 3 opponents and claimed victory!`
            : `You were eliminated in round ${state.round + 1}. Better luck next time!`}
        </p>
        <p className="text-xs text-[#f7a838]">Wins: {state.playerWins}/3</p>
        <button
          onClick={onReset}
          className="rounded-lg bg-[#3a4466] px-6 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
        >
          New Tournament
        </button>
      </div>
    );
  }

  // Bracket view
  const roundNames = ["Quarterfinals", "Semifinals", "Finals"];
  const currentRoundName = roundNames[state.round] ?? `Round ${state.round + 1}`;

  // Get opponents for current round
  const undefeated = state.trainers.filter((t) => !t.defeated);
  const nextOpponent = undefeated[0];
  const nextOpponentIndex = nextOpponent ? state.trainers.indexOf(nextOpponent) : -1;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Tournament Bracket</h3>
        <span className="text-[10px] text-[#f7a838] font-pixel">
          {currentRoundName} — Wins: {state.playerWins}/3
        </span>
      </div>

      {/* Bracket grid */}
      <div className="grid grid-cols-4 gap-2">
        {state.trainers.map((trainer, index) => (
          <TrainerCard
            key={index}
            trainer={trainer}
            isCurrentOpponent={index === nextOpponentIndex && state.phase === "bracket"}
            isDefeated={trainer.defeated}
          />
        ))}
      </div>

      {/* Post-match: Next round button */}
      {state.phase === "post_match" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-3"
        >
          <p className="text-xs text-[#38b764]">Victory! Ready for the next round?</p>
          <button
            onClick={onNextRound}
            className="rounded-lg bg-[#38b764] px-6 py-2 text-sm font-pixel text-[#f0f0e8] hover:bg-[#2a9d52] transition-colors"
          >
            Next Round
          </button>
        </motion.div>
      )}

      {/* Bracket: Begin match button */}
      {state.phase === "bracket" && nextOpponent && (
        <div className="space-y-3">
          {/* Opponent preview */}
          <div className="rounded-lg bg-[#1a1c2c] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-pixel text-[#f0f0e8]">{nextOpponent.name}</span>
                <span className="text-[10px] text-[#8b9bb4] ml-2">{nextOpponent.title}</span>
              </div>
              <ThemeBadge theme={nextOpponent.theme} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {nextOpponent.team.map((slot, i) => (
                <span key={i} className="text-[10px] text-[#8b9bb4] capitalize bg-[#262b44] px-2 py-0.5 rounded">
                  {slot.pokemon.name}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-[#f7a838]">
              Difficulty: {nextOpponent.difficulty}
            </span>
          </div>

          <button
            onClick={() => onBeginMatch(nextOpponentIndex)}
            className="w-full rounded-lg bg-[#e8433f] px-6 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
          >
            Begin Match vs {nextOpponent.name}!
          </button>
        </div>
      )}
    </div>
  );
}

function TrainerCard({
  trainer,
  isCurrentOpponent,
  isDefeated,
}: {
  trainer: TournamentTrainer;
  isCurrentOpponent: boolean;
  isDefeated: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2 text-center transition-colors ${
        isDefeated
          ? "border-[#3a4466]/50 bg-[#1a1c2c]/50 opacity-50"
          : isCurrentOpponent
          ? "border-[#e8433f] bg-[#e8433f]/10"
          : "border-[#3a4466] bg-[#1a1c2c]"
      }`}
    >
      <p className="text-[10px] font-pixel text-[#f0f0e8] truncate">{trainer.name}</p>
      <p className="text-[8px] text-[#8b9bb4] truncate">{trainer.title}</p>
      <ThemeBadge theme={trainer.theme} />
      {isDefeated && <p className="text-[8px] text-[#e8433f] mt-0.5">Defeated</p>}
    </div>
  );
}

function ThemeBadge({ theme }: { theme: TypeName | "mixed" }) {
  const color = theme === "mixed" ? "#8b9bb4" : (typeColors[theme] ?? "#8b9bb4");
  return (
    <span
      className="inline-block text-[8px] px-1.5 py-0.5 rounded capitalize mt-0.5"
      style={{ backgroundColor: `${color}30`, color }}
    >
      {theme}
    </span>
  );
}
