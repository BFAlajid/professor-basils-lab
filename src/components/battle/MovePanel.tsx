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

        return (
          <button
            key={moveName}
            onClick={() => onSelectMove(index)}
            disabled={disabled}
            className="rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
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
          </button>
        );
      })}
    </div>
  );
}
