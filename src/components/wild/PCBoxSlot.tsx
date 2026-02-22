"use client";

import { PCBoxPokemon } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";
import Image from "next/image";

interface PCBoxSlotProps {
  pokemon: PCBoxPokemon;
  onClick: () => void;
}

export default function PCBoxSlot({ pokemon, onClick }: PCBoxSlotProps) {
  const displayName = pokemon.nickname ?? (pokemon.pokemon.name.charAt(0).toUpperCase() + pokemon.pokemon.name.slice(1));
  const spriteUrl = pokemon.pokemon.sprites.front_default;
  const ballColor = POKE_BALLS[pokemon.caughtWith]?.spriteColor ?? "#e8433f";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center bg-[#1a1c2c] border border-[#3a4466] hover:border-[#8b9bb4] rounded-lg p-1.5 transition-all cursor-pointer group"
    >
      {spriteUrl && (
        <Image
          src={spriteUrl}
          alt={displayName}
          width={40}
          height={40}
          unoptimized
          className="pixelated group-hover:scale-110 transition-transform"
        />
      )}
      <p className="text-[7px] text-[#f0f0e8] truncate w-full text-center mt-0.5">
        {displayName}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: ballColor }}
        />
        <span className="text-[6px] text-[#8b9bb4]">Lv.{pokemon.level}</span>
      </div>
    </button>
  );
}
