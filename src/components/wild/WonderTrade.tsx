"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { PCBoxPokemon } from "@/types";
import { useWonderTrade } from "@/hooks/useWonderTrade";
import { playCry } from "@/utils/cryPlayer";

interface WonderTradeProps {
  box: PCBoxPokemon[];
  onRemoveFromBox: (index: number) => void;
  onAddToBox: (pokemon: PCBoxPokemon) => void;
  onTradeComplete: () => void;
}

export default function WonderTrade({
  box,
  onRemoveFromBox,
  onAddToBox,
  onTradeComplete,
}: WonderTradeProps) {
  const { state, selectPokemon, executeTrade, reset } = useWonderTrade();
  const [error, setError] = useState<string | null>(null);

  const handleExecuteTrade = useCallback(async () => {
    if (state.selectedBoxIndex === null) return;
    setError(null);
    try {
      const received = await executeTrade(box);
      if (received) {
        onRemoveFromBox(state.selectedBoxIndex);
        onAddToBox(received);
        playCry(received.pokemon);
        onTradeComplete();
      }
    } catch {
      setError("Trade failed. Try again!");
      reset();
    }
  }, [state.selectedBoxIndex, executeTrade, box, onRemoveFromBox, onAddToBox, onTradeComplete, reset]);

  const selectedPokemon = state.selectedBoxIndex !== null ? box[state.selectedBoxIndex] : null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Wonder Trade</h3>
        <span className="text-[9px] text-[#8b9bb4]">
          {state.history.length} trades completed
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE / SELECTING — Show PC Box grid for selection */}
        {(state.phase === "idle" || state.phase === "selecting") && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {box.length === 0 ? (
              <p className="text-xs text-[#8b9bb4] text-center py-4">
                No Pokemon in your PC Box to trade.
              </p>
            ) : (
              <>
                <p className="text-[10px] text-[#8b9bb4] mb-2">
                  Select a Pokemon to offer:
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                  {box.map((p, i) => {
                    const isSelected = state.selectedBoxIndex === i;
                    const sprite = p.pokemon.sprites.front_default;
                    return (
                      <button
                        key={i}
                        onClick={() => selectPokemon(i)}
                        className={`flex flex-col items-center rounded-lg p-1 transition-all ${
                          isSelected
                            ? "bg-[#e8433f]/20 border border-[#e8433f]"
                            : "bg-[#1a1c2c] border border-[#3a4466] hover:border-[#8b9bb4]"
                        }`}
                      >
                        {sprite && (
                          <Image
                            src={sprite}
                            alt={p.pokemon.name}
                            width={32}
                            height={32}
                            unoptimized
                            className="pixelated"
                          />
                        )}
                        <span className="text-[6px] text-[#f0f0e8] truncate w-full text-center">
                          {p.nickname ?? p.pokemon.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedPokemon && (
                  <div className="mt-3 flex items-center justify-between bg-[#1a1c2c] rounded-lg p-3 border border-[#3a4466]">
                    <div className="flex items-center gap-2">
                      {selectedPokemon.pokemon.sprites.front_default && (
                        <Image
                          src={selectedPokemon.pokemon.sprites.front_default}
                          alt={selectedPokemon.pokemon.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="pixelated"
                        />
                      )}
                      <div>
                        <p className="text-xs font-pixel text-[#f0f0e8] capitalize">
                          {selectedPokemon.nickname ?? selectedPokemon.pokemon.name}
                        </p>
                        <p className="text-[9px] text-[#8b9bb4]">
                          Lv.{selectedPokemon.level} · {selectedPokemon.nature.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExecuteTrade}
                      className="px-4 py-2 bg-[#e8433f] hover:bg-[#f05050] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                    >
                      Trade!
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* SEARCHING — Animated spinner */}
        {state.phase === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-4 border-[#3a4466] border-t-[#e8433f]"
            />
            <p className="text-xs font-pixel text-[#f0f0e8] animate-pulse">
              Searching for a trade partner...
            </p>
          </motion.div>
        )}

        {/* RESULT — Show what was received */}
        {state.phase === "result" && state.receivedPokemon && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-4 space-y-3"
          >
            <p className="text-[10px] text-[#8b9bb4]">You received:</p>
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {state.receivedPokemon.pokemon.sprites.other?.["official-artwork"]?.front_default && (
                <Image
                  src={state.receivedPokemon.pokemon.sprites.other["official-artwork"].front_default!}
                  alt={state.receivedPokemon.pokemon.name}
                  width={120}
                  height={120}
                  unoptimized
                  className="pixelated drop-shadow-lg"
                />
              )}
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-pixel text-[#f0f0e8] capitalize">
                {state.receivedPokemon.pokemon.name}
                {state.receivedPokemon.isShiny && (
                  <span className="ml-1 text-[#f7a838]">&#10024;</span>
                )}
              </p>
              <p className="text-[10px] text-[#8b9bb4]">
                Lv.{state.receivedPokemon.level} · {state.receivedPokemon.nature.name}
              </p>
            </div>
            <button
              onClick={reset}
              className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              Trade Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-[10px] text-[#e8433f] text-center">{error}</p>
      )}

      {/* Trade History */}
      {state.history.length > 0 && (
        <details className="text-[10px]">
          <summary className="text-[#8b9bb4] cursor-pointer hover:text-[#f0f0e8]">
            Trade History ({state.history.length})
          </summary>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {state.history.slice(0, 10).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between bg-[#1a1c2c] rounded px-2 py-1"
              >
                <span className="text-[#8b9bb4] capitalize">
                  {record.offeredPokemon.pokemon.name}
                </span>
                <span className="text-[#3a4466]">&rarr;</span>
                <span className="text-[#f0f0e8] capitalize">
                  {record.receivedPokemon.pokemon.name}
                  {record.receivedPokemon.isShiny && " \u2728"}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
