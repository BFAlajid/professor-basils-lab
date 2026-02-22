"use client";

import { useState, useMemo } from "react";
import { Pokemon } from "@/types";
import { useMove } from "@/hooks/useMove";
import TypeBadge from "./TypeBadge";

interface MoveSelectorProps {
  pokemon: Pokemon;
  selectedMoves: string[];
  onChange: (moves: string[]) => void;
  maxMoves?: number;
}

function MoveSlot({ moveName, onRemove }: { moveName: string; onRemove: () => void }) {
  const { data: move } = useMove(moveName);

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5">
      <div className="flex items-center gap-2">
        {move && <TypeBadge type={move.type.name} size="sm" />}
        <span className="text-sm capitalize text-[#f0f0e8]">{moveName.replace(/-/g, " ")}</span>
        {move && move.power && (
          <span className="text-[10px] text-[#8b9bb4]">
            {move.power} BP · {move.damage_class.name.slice(0, 4)}
          </span>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-xs text-[#8b9bb4] hover:text-[#e8433f] transition-colors"
      >
        X
      </button>
    </div>
  );
}

export default function MoveSelector({
  pokemon,
  selectedMoves,
  onChange,
  maxMoves = 4,
}: MoveSelectorProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const allMoves = useMemo(
    () => pokemon.moves.map((m) => m.move.name),
    [pokemon]
  );

  const filtered = useMemo(() => {
    const available = allMoves.filter((m) => !selectedMoves.includes(m));
    if (!search) return available.slice(0, 20);
    const q = search.toLowerCase();
    return available.filter((m) => m.includes(q)).slice(0, 20);
  }, [allMoves, selectedMoves, search]);

  const addMove = (move: string) => {
    if (selectedMoves.length >= maxMoves) return;
    onChange([...selectedMoves, move]);
    setSearch("");
    setOpen(false);
  };

  const removeMove = (index: number) => {
    onChange(selectedMoves.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b9bb4]">
        Moves ({selectedMoves.length}/{maxMoves})
      </label>

      <div className="space-y-1">
        {selectedMoves.map((move, i) => (
          <MoveSlot key={move} moveName={move} onRemove={() => removeMove(i)} />
        ))}
      </div>

      {selectedMoves.length < maxMoves && (
        <div className="relative mt-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Search moves..."
            className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f]"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-40 overflow-y-auto">
              {filtered.map((m) => (
                <button
                  key={m}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addMove(m)}
                  className="w-full px-3 py-2 text-left text-sm capitalize hover:bg-[#3a4466] transition-colors"
                >
                  {m.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
