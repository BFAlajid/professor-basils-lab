"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PCBoxPokemon, TeamSlot } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";
import PCBoxSlot from "./PCBoxSlot";
import Image from "next/image";

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-pixel text-[#f0f0e8]">
          PC Box ({box.length})
        </h3>
      </div>

      {box.length === 0 ? (
        <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-6 text-center">
          <p className="text-xs text-[#8b9bb4]">No Pokemon in the box yet.</p>
          <p className="text-[10px] text-[#3a4466] mt-1">Catch wild Pokemon to fill your box!</p>
        </div>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-[250px] overflow-y-auto bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-2">
          {box.map((pokemon, i) => (
            <PCBoxSlot
              key={i}
              pokemon={pokemon}
              onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
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
            className="bg-[#262b44] border border-[#3a4466] rounded-xl p-3 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              {selected.pokemon.sprites.other?.["official-artwork"]?.front_default && (
                <Image
                  src={selected.pokemon.sprites.other["official-artwork"].front_default}
                  alt={selected.pokemon.name}
                  width={64}
                  height={64}
                  unoptimized
                  className="pixelated"
                />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-xs font-pixel text-[#f0f0e8]">
                  {selected.nickname ?? (selected.pokemon.name.charAt(0).toUpperCase() + selected.pokemon.name.slice(1))}
                </p>
                <p className="text-[9px] text-[#8b9bb4]">
                  Lv. {selected.level} · {selected.pokemon.types.map((t) => t.type.name).join("/")}
                </p>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: POKE_BALLS[selected.caughtWith]?.spriteColor }}
                  />
                  <span className="text-[8px] text-[#8b9bb4]">
                    Caught in {selected.caughtInArea} · {new Date(selected.caughtDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[8px] text-[#8b9bb4]">
                  Nature: {selected.nature.name} · Ability: {selected.ability}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {teamSize < 6 && (
                <button
                  onClick={() => { onMoveToTeam(selectedIndex); setSelectedIndex(null); }}
                  aria-label="Move Pokemon to team"
                  className="px-3 py-1.5 bg-[#38b764] hover:bg-[#2d9550] text-[#f0f0e8] text-[9px] font-pixel rounded-lg transition-colors"
                >
                  Move to Team
                </button>
              )}
              <button
                onClick={() => { onRemove(selectedIndex); setSelectedIndex(null); }}
                aria-label="Release Pokemon"
                className="px-3 py-1.5 bg-[#e8433f] hover:bg-[#c9342e] text-[#f0f0e8] text-[9px] font-pixel rounded-lg transition-colors"
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
