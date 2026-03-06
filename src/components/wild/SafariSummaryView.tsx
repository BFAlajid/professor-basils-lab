"use client";

import Image from "@/components/PokeImage";
import { SafariZoneState } from "@/types";

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

  return (
    <div className="space-y-4">
      <h3 className="text-center text-sm font-pixel text-[#f7a838]">
        Safari Zone Complete!
      </h3>

      {/* Stats */}
      <div className="flex justify-center gap-4 text-[10px] text-[#8b9bb4]">
        <span>Balls used: {ballsUsed}/30</span>
        <span>Steps: {stepsTaken}/500</span>
        <span>Caught: {state.caughtPokemon.length}</span>
      </div>

      {/* Caught grid */}
      {state.caughtPokemon.length > 0 ? (
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
              <span className="text-[7px] text-[#f0f0e8] capitalize truncate w-full text-center">
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

      {/* Actions */}
      <div className="flex gap-2">
        {state.caughtPokemon.length > 0 && (
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
