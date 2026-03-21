"use client";

import { BattlePokemon } from "@/types";
import { typeColors } from "@/data/typeColors";
import { getCachedMoves } from "@/utils/battle";
import { convertToMaxMove } from "@/data/maxMoves";

interface MovePanelProps {
  pokemon: BattlePokemon;
  onSelectMove: (moveIndex: number) => void;
  disabled: boolean;
  isDynamaxed?: boolean;
}

export default function MovePanel({ pokemon, onSelectMove, disabled, isDynamaxed }: MovePanelProps) {
  const moves = pokemon.slot.selectedMoves ?? [];
  const cachedMoves = getCachedMoves();

  if (moves.length === 0) {
    return (
      <div className="text-sm text-[#8b9bb4] p-4 text-center">
        No moves selected for this Pokemon
      </div>
    );
  }

  // When all moves are out of PP, show Struggle button
  const allPPDepleted = pokemon.movePP?.length > 0 && pokemon.movePP.every((pp) => pp <= 0);
  if (allPPDepleted) {
    return (
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={() => onSelectMove(0)}
          disabled={disabled}
          aria-label="Use move struggle (all PP depleted)"
          className="rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: "#A8A878", backgroundColor: "#A8A87820" }}
        >
          <span className="block capitalize text-[#f0f0e8] text-xs font-pixel">Struggle</span>
          <span className="block text-[10px] mt-0.5 text-[#A8A878]">50 BP</span>
          <span className="block text-[9px] mt-0.5 font-pixel text-red-400">No moves left!</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {moves.map((moveName, index) => {
        const moveData = cachedMoves.get(moveName);
        const displayData = isDynamaxed && moveData ? convertToMaxMove({
          name: moveData.name,
          power: moveData.power,
          accuracy: moveData.accuracy,
          pp: moveData.pp,
          type: moveData.type,
          damage_class: moveData.damage_class,
        }) : moveData;
        const moveType = displayData?.type.name ?? "normal";
        const color = typeColors[moveType as keyof typeof typeColors] ?? "#A8A878";

        const isChoiceLocked = pokemon.choiceLockedMove !== null;
        const isLockedMove = isChoiceLocked && pokemon.choiceLockedMove === moveName;
        const isBlockedByLock = isChoiceLocked && pokemon.choiceLockedMove !== moveName;

        const currentPP = pokemon.movePP?.[index] ?? 0;
        const maxPP = pokemon.moveMaxPP?.[index] ?? 0;
        const outOfPP = currentPP <= 0;

        return (
          <button
            key={moveName}
            onClick={() => { if (!isBlockedByLock && !outOfPP) onSelectMove(index); }}
            disabled={disabled || isBlockedByLock || outOfPP}
            aria-label={`Use move ${(displayData?.name ?? moveName).replace(/-/g, " ")}${isLockedMove ? " (locked)" : ""}${isBlockedByLock ? " (unavailable - choice locked)" : ""}${outOfPP ? " (no PP left)" : ""}, PP ${currentPP} of ${maxPP}`}
            className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed relative ${isBlockedByLock || outOfPP ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              borderColor: color,
              backgroundColor: `${color}20`,
            }}
          >
            <span className="block capitalize text-[#f0f0e8] text-xs font-pixel">
              {(displayData?.name ?? moveName).replace(/-/g, " ")}
            </span>
            {displayData && (
              <span className="block text-[10px] mt-0.5" style={{ color }}>
                {displayData.damage_class.name === "status"
                  ? "Status"
                  : `${displayData.power ?? "—"} BP`}
                {displayData.accuracy ? ` · ${displayData.accuracy}%` : ""}
              </span>
            )}
            <span className={`block text-[9px] mt-0.5 font-pixel ${outOfPP ? "text-red-400" : "text-[#8b9bb4]"}`}>
              PP: {currentPP}/{maxPP}
            </span>
            {isLockedMove && (
              <span className="absolute top-1 right-1 text-[8px] font-pixel text-[#f7a838] bg-[#1a1c2c] px-1 rounded">
                Locked
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
