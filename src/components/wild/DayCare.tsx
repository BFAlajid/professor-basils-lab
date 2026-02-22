"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { PCBoxPokemon } from "@/types";
import { useDayCare } from "@/hooks/useDayCare";

interface DayCareProps {
  box: PCBoxPokemon[];
}

export default function DayCare({ box }: DayCareProps) {
  const { state, isCheckingCompat, setPair, clearPair, collectEgg, hatchEgg, removeEgg } = useDayCare(box);
  const [selectedSlot, setSelectedSlot] = useState<1 | 2>(1);
  const [showSelector, setShowSelector] = useState(false);

  const parent1 = state.currentPair ? box[state.currentPair.parent1Index] : null;
  const parent2 = state.currentPair ? box[state.currentPair.parent2Index] : null;

  const readyToHatch = useMemo(
    () => state.eggs.filter((e) => !e.isHatched && e.stepsCompleted >= e.stepsRequired),
    [state.eggs]
  );

  const handleSelectParent = (boxIndex: number) => {
    if (selectedSlot === 1) {
      const otherIndex = state.currentPair?.parent2Index ?? -1;
      if (boxIndex === otherIndex) return;
      setPair({ parent1Index: boxIndex, parent2Index: otherIndex >= 0 ? otherIndex : -1 });
    } else {
      const otherIndex = state.currentPair?.parent1Index ?? -1;
      if (boxIndex === otherIndex) return;
      setPair({ parent1Index: otherIndex >= 0 ? otherIndex : -1, parent2Index: boxIndex });
    }
    setShowSelector(false);
  };

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Day Care</h3>
        {state.currentPair && (
          <button
            onClick={clearPair}
            className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
          >
            Clear Pair
          </button>
        )}
      </div>

      {/* Parent slots */}
      <div className="grid grid-cols-2 gap-3">
        <ParentSlot
          label="Parent 1"
          pokemon={parent1}
          onSelect={() => { setSelectedSlot(1); setShowSelector(true); }}
        />
        <ParentSlot
          label="Parent 2"
          pokemon={parent2}
          onSelect={() => { setSelectedSlot(2); setShowSelector(true); }}
        />
      </div>

      {/* Compatibility message */}
      <div className={`text-center text-xs px-3 py-2 rounded-lg ${
        state.isCompatible ? "text-[#38b764] bg-[#38b764]/10" : "text-[#8b9bb4] bg-[#1a1c2c]"
      }`}>
        {isCheckingCompat ? "Checking compatibility..." : state.compatibilityMessage}
      </div>

      {/* Collect egg button */}
      {state.isCompatible && parent1 && parent2 && (
        <button
          onClick={collectEgg}
          disabled={state.eggs.length >= 6}
          className="w-full rounded-lg bg-[#38b764] hover:bg-[#2a9d52] text-[#f0f0e8] text-xs font-pixel py-2 transition-colors disabled:opacity-40"
        >
          {state.eggs.length >= 6 ? "Egg slots full (max 6)" : "Collect Egg"}
        </button>
      )}

      {/* Eggs */}
      {state.eggs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider">
            Eggs ({state.eggs.length}/6)
          </h4>
          {state.eggs.map((egg, index) => {
            const progress = Math.min(100, (egg.stepsCompleted / egg.stepsRequired) * 100);
            const ready = egg.stepsCompleted >= egg.stepsRequired && !egg.isHatched;

            return (
              <div key={egg.id} className="rounded-lg bg-[#1a1c2c] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-pixel text-[#f0f0e8] capitalize">
                    {egg.isHatched ? egg.speciesName : "Egg"}
                  </span>
                  <div className="flex items-center gap-2">
                    {ready && (
                      <button
                        onClick={() => hatchEgg(index)}
                        className="text-[10px] font-pixel text-[#f7a838] hover:text-[#f0f0e8] transition-colors"
                      >
                        Hatch!
                      </button>
                    )}
                    {egg.isHatched && (
                      <button
                        onClick={() => removeEgg(index)}
                        className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {!egg.isHatched && (
                  <div className="w-full bg-[#3a4466] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: ready ? "#f7a838" : "#38b764",
                      }}
                    />
                  </div>
                )}

                {!egg.isHatched && (
                  <p className="text-[10px] text-[#8b9bb4]">
                    {ready ? "Ready to hatch!" : `${Math.floor(progress)}% — ${egg.stepsRequired - egg.stepsCompleted} steps remaining`}
                  </p>
                )}

                {/* Hatched Pokemon info */}
                <AnimatePresence>
                  {egg.isHatched && egg.hatchedPokemon && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-3 pt-1"
                    >
                      {egg.hatchedPokemon.pokemon.sprites.front_default && (
                        <Image
                          src={egg.hatchedPokemon.pokemon.sprites.front_default}
                          alt={egg.speciesName}
                          width={48}
                          height={48}
                          unoptimized
                        />
                      )}
                      <div className="text-[10px] text-[#8b9bb4] space-y-0.5">
                        <p>Nature: <span className="text-[#f0f0e8]">{egg.hatchedPokemon.nature.name}</span></p>
                        <p>Ability: <span className="text-[#f0f0e8] capitalize">{egg.hatchedPokemon.ability.replace(/-/g, " ")}</span></p>
                        <p className="text-[9px]">
                          IVs: {Object.entries(egg.hatchedPokemon.ivs).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                        {egg.inheritedIVs.length > 0 && (
                          <p className="text-[9px] text-[#38b764]">
                            Inherited: {egg.inheritedIVs.map((iv) => `${iv.stat} (P${iv.fromParent})`).join(", ")}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Pokemon selector overlay */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 max-w-sm w-full mx-4 max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-pixel text-[#f0f0e8] mb-3">
                Select Parent {selectedSlot}
              </h4>
              {box.length === 0 ? (
                <p className="text-xs text-[#8b9bb4] text-center py-4">No Pokemon in PC Box</p>
              ) : (
                <div className="space-y-1">
                  {box.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectParent(i)}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 hover:bg-[#3a4466] transition-colors text-left"
                    >
                      {p.pokemon.sprites.front_default && (
                        <Image
                          src={p.pokemon.sprites.front_default}
                          alt={p.pokemon.name}
                          width={32}
                          height={32}
                          unoptimized
                        />
                      )}
                      <div>
                        <span className="text-xs font-pixel text-[#f0f0e8] capitalize block">
                          {p.nickname ?? p.pokemon.name}
                        </span>
                        <span className="text-[10px] text-[#8b9bb4]">
                          Lv.{p.level} · {p.nature.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParentSlot({
  label,
  pokemon,
  onSelect,
}: {
  label: string;
  pokemon: PCBoxPokemon | null;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="rounded-lg border border-dashed border-[#3a4466] bg-[#1a1c2c] p-3 text-center hover:border-[#8b9bb4] transition-colors"
    >
      {pokemon ? (
        <div className="flex flex-col items-center gap-1">
          {pokemon.pokemon.sprites.front_default && (
            <Image
              src={pokemon.pokemon.sprites.front_default}
              alt={pokemon.pokemon.name}
              width={48}
              height={48}
              unoptimized
            />
          )}
          <span className="text-xs font-pixel text-[#f0f0e8] capitalize">
            {pokemon.nickname ?? pokemon.pokemon.name}
          </span>
        </div>
      ) : (
        <div className="py-3">
          <span className="text-[10px] text-[#8b9bb4]">{label}</span>
          <p className="text-[9px] text-[#3a4466] mt-1">Tap to select</p>
        </div>
      )}
    </button>
  );
}
