"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { PCBoxPokemon } from "@/types";
import { useEvolution } from "@/hooks/useEvolution";
import { EvolutionOption } from "@/utils/evolutionChain";
import { EVOLUTION_ITEMS } from "@/data/evolutionItems";
import ItemSprite from "@/components/ItemSprite";

interface EvolutionScreenProps {
  pcPokemon: PCBoxPokemon;
  onEvolve: (evolved: PCBoxPokemon) => void;
  onClose: () => void;
  ownedItems?: Record<string, number>;
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export default function EvolutionScreen({ pcPokemon, onEvolve, onClose, ownedItems = {} }: EvolutionScreenProps) {
  const { checkEvolution, evolve, loading, options } = useEvolution();
  const [selected, setSelected] = useState<EvolutionOption | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [evolved, setEvolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEvolution(pcPokemon);
  }, [pcPokemon, checkEvolution]);

  const canUseItem = (option: EvolutionOption): boolean => {
    if (option.method !== "use-item" || !option.itemRequired) return true;
    return (ownedItems[option.itemRequired] ?? 0) > 0;
  };

  const handleEvolve = async () => {
    if (!selected) return;
    if (!canUseItem(selected)) {
      setError(`You need a ${formatName(selected.itemRequired!)} to evolve!`);
      return;
    }
    setEvolving(true);
    setError(null);
    const result = await evolve(pcPokemon, selected);
    if (result) {
      setEvolved(true);
      setTimeout(() => onEvolve(result), 1200);
    } else {
      setError("Evolution failed. Please try again.");
      setEvolving(false);
    }
  };

  const itemEvolutions = options.filter((o) => o.method === "use-item");
  const otherEvolutions = options.filter((o) => o.method !== "use-item");

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Evolution</h3>
        <button
          onClick={onClose}
          className="text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          aria-label="Close evolution screen"
        >
          Close
        </button>
      </div>

      {loading && (
        <div className="animate-pulse space-y-3 py-6">
          <p className="text-[#8b9bb4] font-pixel text-xs text-center">Checking evolution chain...</p>
          <div className="h-4 bg-[#3a4466] rounded w-full" />
          <div className="h-4 bg-[#3a4466] rounded w-3/4 mx-auto" />
        </div>
      )}

      {!loading && options.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[#8b9bb4] text-xs font-pixel">
            {formatName(pcPokemon.pokemon.name)} cannot evolve.
          </p>
        </div>
      )}

      {!loading && options.length > 0 && !evolving && (
        <>
          {/* Current Pokemon */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1a1c2c] rounded-lg border border-[#3a4466] flex items-center justify-center mx-auto">
                <Image
                  src={pcPokemon.pokemon.sprites.front_default ?? getSpriteUrl(pcPokemon.pokemon.id)}
                  alt={pcPokemon.pokemon.name}
                  width={64}
                  height={64}
                  unoptimized
                />
              </div>
              <p className="text-[#f0f0e8] text-xs font-pixel mt-1">
                {formatName(pcPokemon.pokemon.name)}
              </p>
              <p className="text-[#8b9bb4] text-[10px]">Lv. {pcPokemon.level}</p>
            </div>

            <AnimatePresence>
              {selected && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[#f0f0e8] text-lg font-pixel"
                  >
                    {"\u2192"}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 bg-[#1a1c2c] rounded-lg border border-[#38b764] flex items-center justify-center mx-auto">
                      <Image
                        src={getSpriteUrl(selected.targetSpeciesId)}
                        alt={selected.targetName}
                        width={64}
                        height={64}
                        unoptimized
                      />
                    </div>
                    <p className="text-[#38b764] text-xs font-pixel mt-1">
                      {formatName(selected.targetName)}
                    </p>
                    <p className="text-[#8b9bb4] text-[10px]">{selected.trigger}</p>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Evolution options */}
          <div className="space-y-2">
            <p className="text-[#8b9bb4] text-[10px] font-pixel uppercase tracking-wide">
              Available Evolutions
            </p>

            {otherEvolutions.length > 0 && (
              <div className="space-y-1">
                {otherEvolutions.map((opt) => (
                  <button
                    key={`${opt.targetSpeciesId}-${opt.trigger}`}
                    onClick={() => setSelected(opt)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selected === opt
                        ? "bg-[#38b764]/20 border border-[#38b764]"
                        : "bg-[#1a1c2c] border border-[#3a4466] hover:border-[#8b9bb4]"
                    }`}
                    aria-label={`Evolve to ${formatName(opt.targetName)}`}
                  >
                    <Image
                      src={getSpriteUrl(opt.targetSpeciesId)}
                      alt={opt.targetName}
                      width={32}
                      height={32}
                      unoptimized
                    />
                    <div>
                      <p className="text-[#f0f0e8] text-xs font-pixel">
                        {formatName(opt.targetName)}
                      </p>
                      <p className="text-[#8b9bb4] text-[10px]">{opt.trigger}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {itemEvolutions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[#8b9bb4] text-[10px] mt-2">Item Evolutions</p>
                {itemEvolutions.map((opt) => {
                  const hasItem = canUseItem(opt);
                  const item = EVOLUTION_ITEMS.find((i) => i.name === opt.itemRequired);
                  return (
                    <button
                      key={`${opt.targetSpeciesId}-${opt.trigger}`}
                      onClick={() => hasItem && setSelected(opt)}
                      disabled={!hasItem}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        selected === opt
                          ? "bg-[#38b764]/20 border border-[#38b764]"
                          : hasItem
                          ? "bg-[#1a1c2c] border border-[#3a4466] hover:border-[#8b9bb4]"
                          : "bg-[#1a1c2c] border border-[#3a4466] opacity-40 cursor-not-allowed"
                      }`}
                      aria-label={`Evolve to ${formatName(opt.targetName)} using ${item?.displayName ?? opt.itemRequired}`}
                    >
                      <Image
                        src={getSpriteUrl(opt.targetSpeciesId)}
                        alt={opt.targetName}
                        width={32}
                        height={32}
                        unoptimized
                      />
                      {opt.itemRequired && (
                        <ItemSprite name={opt.itemRequired} size={24} />
                      )}
                      <div className="flex-1">
                        <p className="text-[#f0f0e8] text-xs font-pixel">
                          {formatName(opt.targetName)}
                        </p>
                        <p className="text-[#8b9bb4] text-[10px]">
                          {item?.displayName ?? formatName(opt.itemRequired ?? "")}
                          {!hasItem && " (Not owned)"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-[#e8433f] text-[10px] text-center">{error}</p>
          )}

          {/* Evolve button */}
          <button
            onClick={handleEvolve}
            disabled={!selected}
            className="w-full rounded-lg bg-[#38b764] hover:bg-[#2a9d52] text-[#f0f0e8] text-xs font-pixel py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Confirm evolution"
          >
            Evolve!
          </button>
        </>
      )}

      {/* Evolution animation */}
      <AnimatePresence>
        {evolving && (
          <motion.div
            className="flex flex-col items-center justify-center py-8 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={
                evolved
                  ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                  : { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
              }
              transition={
                evolved
                  ? { duration: 1, ease: "easeInOut" }
                  : { duration: 0.6, repeat: Infinity }
              }
              className="w-24 h-24 bg-[#1a1c2c] rounded-lg border border-[#3a4466] flex items-center justify-center"
            >
              <Image
                src={
                  evolved
                    ? getSpriteUrl(selected!.targetSpeciesId)
                    : pcPokemon.pokemon.sprites.front_default ?? getSpriteUrl(pcPokemon.pokemon.id)
                }
                alt={evolved ? selected!.targetName : pcPokemon.pokemon.name}
                width={80}
                height={80}
                unoptimized
              />
            </motion.div>

            {evolved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-[#38b764] font-pixel text-sm">
                  {formatName(pcPokemon.pokemon.name)} evolved into{" "}
                  {formatName(selected!.targetName)}!
                </p>
              </motion.div>
            )}

            {!evolved && (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[#f0f0e8] font-pixel text-xs"
              >
                Evolving...
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
