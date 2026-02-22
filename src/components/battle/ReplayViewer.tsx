"use client";

import { BattleReplay } from "@/types";
import { useReplayPlayer } from "@/hooks/useReplayPlayer";
import { getActivePokemon } from "@/utils/battle";
import PokemonBattleSprite from "./PokemonBattleSprite";
import BattleLog from "./BattleLog";

interface ReplayViewerProps {
  replay: BattleReplay;
  onClose: () => void;
}

export default function ReplayViewer({ replay, onClose }: ReplayViewerProps) {
  const {
    currentState,
    currentIndex,
    totalSnapshots,
    isPlaying,
    isAtEnd,
    isAtStart,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    seekTo,
    cycleSpeed,
  } = useReplayPlayer(replay);

  if (!currentState) return null;

  const p1Active = getActivePokemon(currentState.player1);
  const p2Active = getActivePokemon(currentState.player2);
  const p1Label = currentState.mode === "ai" ? "Your Pokemon" : "Player 1";
  const p2Label = currentState.mode === "ai" ? "Opponent" : "Player 2";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-pixel text-sm text-[#f0f0e8]">Battle Replay</h3>
          <p className="text-[10px] text-[#8b9bb4]">
            {new Date(replay.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#8b9bb4] text-xs font-pixel hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
        >
          Close
        </button>
      </div>

      {/* Battle field */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <div className="flex items-center justify-between gap-8">
          <PokemonBattleSprite pokemon={p1Active} side="left" label={p1Label} />
          <div className="text-2xl font-bold text-[#3a4466] font-pixel select-none">VS</div>
          <PokemonBattleSprite pokemon={p2Active} side="right" label={p2Label} />
        </div>

        {/* Team status dots */}
        <div className="flex justify-between mt-4">
          <div className="flex gap-1">
            {currentState.player1.pokemon.map((p, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  p.isFainted
                    ? "bg-[#e8433f]"
                    : i === currentState.player1.activePokemonIndex
                      ? "bg-[#38b764]"
                      : "bg-[#8b9bb4]"
                }`}
                title={`${p.slot.pokemon.name} - ${p.isFainted ? "Fainted" : `${Math.round((p.currentHp / p.maxHp) * 100)}%`}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            {currentState.player2.pokemon.map((p, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  p.isFainted
                    ? "bg-[#e8433f]"
                    : i === currentState.player2.activePokemonIndex
                      ? "bg-[#38b764]"
                      : "bg-[#8b9bb4]"
                }`}
                title={`${p.slot.pokemon.name} - ${p.isFainted ? "Fainted" : `${Math.round((p.currentHp / p.maxHp) * 100)}%`}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={stepBack}
            disabled={isAtStart}
            className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={isPlaying ? pause : play}
            className="px-5 py-1.5 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-xs font-pixel hover:bg-[#f05050] transition-colors"
          >
            {isPlaying ? "Pause" : isAtEnd ? "Replay" : "Play"}
          </button>
          <button
            onClick={stepForward}
            disabled={isAtEnd}
            className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Fwd
          </button>
          <button
            onClick={cycleSpeed}
            className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#8b9bb4] text-xs font-pixel hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            {speed}x
          </button>
        </div>

        {/* Timeline scrubber */}
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSnapshots - 1)}
          value={currentIndex}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-[#3a4466] cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e8433f]
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e8433f] [&::-moz-range-thumb]:border-none"
        />
        <p className="text-center text-[10px] text-[#8b9bb4] mt-1 font-pixel">
          Turn {currentState.turn} / {replay.totalTurns}
        </p>
      </div>

      {/* Battle Log */}
      <BattleLog log={currentState.log} />
    </div>
  );
}
