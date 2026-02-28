"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PCBoxPokemon, TeamSlot } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";
import PCBoxSlot from "./PCBoxSlot";
import Image from "@/components/PokeImage";
import ItemSprite from "@/components/ItemSprite";

interface PCBoxProps {
  box: PCBoxPokemon[];
  teamSize: number;
  onMoveToTeam: (index: number) => void;
  onRemove: (index: number) => void;
  onSetNickname: (index: number, nickname: string) => void;
}

export default function PCBox({ box, teamSize, onMoveToTeam, onRemove, onSetNickname }: PCBoxProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selected = selectedIndex !== null ? box[selectedIndex] : null;
  const handleToggle = useCallback((i: number) => setSelectedIndex((prev) => prev === i ? null : i), []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">
          PC Box ({box.length})
        </h3>
      </div>

      {box.length === 0 ? (
        <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-6 text-center">
          <p className="text-sm text-[#8b9bb4]">No Pokemon in the box yet.</p>
          <p className="text-xs text-[#3a4466] mt-1">Catch wild Pokemon to fill your box!</p>
        </div>
      ) : (
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-[350px] overflow-y-auto bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-3">
          {box.map((pokemon, i) => (
            <PCBoxSlot
              key={i}
              pokemon={pokemon}
              index={i}
              isSelected={selectedIndex === i}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Selected Pokemon detail */}
      <AnimatePresence>
        {selected && selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              {selected.pokemon.sprites.other?.["official-artwork"]?.front_default && (
                <Image
                  src={selected.pokemon.sprites.other["official-artwork"].front_default}
                  alt={selected.pokemon.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="pixelated"
                />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-pixel text-[#f0f0e8]">
                  {selected.nickname ?? (selected.pokemon.name.charAt(0).toUpperCase() + selected.pokemon.name.slice(1))}
                </p>
                <p className="text-xs text-[#8b9bb4]">
                  Lv. {selected.level} · {selected.pokemon.types.map((t) => t.type.name).join("/")}
                </p>
                <div className="flex items-center gap-1">
                  <ItemSprite name={selected.caughtWith} size={18} fallbackColor={POKE_BALLS[selected.caughtWith]?.spriteColor} />
                  <span className="text-[11px] text-[#8b9bb4]">
                    Caught in {selected.caughtInArea} · {new Date(selected.caughtDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  Nature: {selected.nature.name} · Ability: {selected.ability}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {teamSize < 6 && (
                <button
                  onClick={() => { onMoveToTeam(selectedIndex); setSelectedIndex(null); }}
                  aria-label="Move Pokemon to team"
                  className="px-4 py-2 bg-[#38b764] hover:bg-[#2d9550] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
                >
                  Move to Team
                </button>
              )}
              <button
                onClick={() => { onRemove(selectedIndex); setSelectedIndex(null); }}
                aria-label="Release Pokemon"
                className="px-4 py-2 bg-[#e8433f] hover:bg-[#c9342e] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
              >
                Release
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
