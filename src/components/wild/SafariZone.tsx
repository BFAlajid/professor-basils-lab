"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { SafariZoneState, SafariCaughtEntry } from "@/types";
import { SAFARI_REGIONS } from "@/data/safariZoneEncounters";

interface SafariZoneProps {
  state: SafariZoneState;
  isSearching: boolean;
  onEnter: (region: string) => void;
  onSearch: () => void;
  onThrowBall: () => void;
  onThrowRock: () => void;
  onThrowBait: () => void;
  onRun: () => void;
  onContinue: () => void;
  onExit: () => void;
  onReset: () => void;
  onAddAllToBox: (entries: SafariCaughtEntry[]) => void;
  onClose: () => void;
}

const REGION_LABELS: Record<string, string> = {
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
};

export default memo(function SafariZone({
  state,
  isSearching,
  onEnter,
  onSearch,
  onThrowBall,
  onThrowRock,
  onThrowBait,
  onRun,
  onContinue,
  onExit,
  onReset,
  onAddAllToBox,
  onClose,
}: SafariZoneProps) {
  const [addedToBox, setAddedToBox] = useState(false);

  // Reset addedToBox when phase changes away from summary
  useEffect(() => {
    if (state.phase !== "summary") setAddedToBox(false);
  }, [state.phase]);

  const handleAddAllToBox = useCallback(() => {
    if (state.caughtPokemon.length > 0 && !addedToBox) {
      onAddAllToBox(state.caughtPokemon);
      setAddedToBox(true);
    }
  }, [state.caughtPokemon, addedToBox, onAddAllToBox]);

  const handleLeave = useCallback(() => {
    onReset();
    onClose();
  }, [onReset, onClose]);

  const ballsUsed = 30 - state.ballsRemaining;
  const stepsTaken = 500 - state.stepsRemaining;
  const pokemon = state.currentPokemon;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <AnimatePresence mode="wait">
        {/* ── ENTRANCE ─────────────────────────────────────────── */}
        {state.phase === "entrance" && (
          <motion.div
            key="entrance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1">
              <h3 className="text-base font-pixel text-[#f7a838]">
                Safari Zone
              </h3>
              <p className="text-[10px] text-[#8b9bb4]">
                30 Safari Balls, 500 Steps. Catch rare Pokemon!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SAFARI_REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => onEnter(region)}
                  className="px-3 py-3 bg-[#1a1c2c] border border-[#3a4466] hover:border-[#f7a838] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors capitalize"
                >
                  {REGION_LABELS[region] ?? region}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full text-center text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors py-1"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* ── WALKING ──────────────────────────────────────────── */}
        {state.phase === "walking" && (
          <motion.div
            key="walking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* HUD */}
            <div className="bg-[#1a1c2c] rounded-lg p-3 border border-[#3a4466] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-pixel text-[#f7a838]">
                  Safari Zone — {REGION_LABELS[state.region] ?? state.region}
                </span>
                <span className="text-[9px] text-[#8b9bb4]">
                  Caught: {state.caughtPokemon.length}
                </span>
              </div>

              {/* Balls bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-[#f0f0e8]">Balls</span>
                  <span className="text-[#8b9bb4]">
                    {state.ballsRemaining}/30
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#262b44] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#38b764] rounded-full transition-all"
                    style={{ width: `${(state.ballsRemaining / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Steps bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-[#f0f0e8]">Steps</span>
                  <span className="text-[#8b9bb4]">
                    {state.stepsRemaining}/500
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#262b44] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4a90d9] rounded-full transition-all"
                    style={{
                      width: `${(state.stepsRemaining / 500) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Search or loading */}
            <div className="flex flex-col items-center py-4 space-y-3">
              {isSearching ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-10 h-10 rounded-full border-4 border-[#3a4466] border-t-[#38b764]"
                  />
                  <p className="text-xs font-pixel text-[#f0f0e8] animate-pulse">
                    Searching in the tall grass...
                  </p>
                </>
              ) : (
                <motion.button
                  onClick={onSearch}
                  className="px-6 py-3 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors border-2 border-transparent"
                  animate={{
                    borderColor: [
                      "rgba(56,183,100,0)",
                      "rgba(56,183,100,0.6)",
                      "rgba(56,183,100,0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Search for Pokemon
                </motion.button>
              )}
            </div>

            <button
              onClick={onExit}
              className="w-full text-center text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors py-1"
            >
              Leave Safari Zone
            </button>
          </motion.div>
        )}

        {/* ── ENCOUNTER ────────────────────────────────────────── */}
        {state.phase === "encounter" && pokemon && (
          <motion.div
            key="encounter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Pokemon display */}
            <div className="flex flex-col items-center py-2 space-y-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                {pokemon.pokemon.sprites.front_default && (
                  <Image
                    src={pokemon.pokemon.sprites.front_default}
                    alt={pokemon.pokemon.name}
                    width={96}
                    height={96}
                    unoptimized
                    className="pixelated drop-shadow-lg"
                  />
                )}
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-pixel text-[#f0f0e8] capitalize">
                  {pokemon.pokemon.name}
                  {pokemon.isShiny && (
                    <span className="ml-1 text-[#f7a838]">&#10024;</span>
                  )}
                </p>
                <p className="text-[10px] text-[#8b9bb4]">
                  Lv.{pokemon.level}
                </p>
              </div>

              {/* Modifier badges */}
              <div className="flex gap-1.5 flex-wrap justify-center">
                {pokemon.catchModifier > 1 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#38b764]/20 text-[#38b764] font-pixel">
                    Catch &uarr;
                  </span>
                )}
                {pokemon.catchModifier < 1 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#e8433f]/20 text-[#e8433f] font-pixel">
                    Catch &darr;
                  </span>
                )}
                {pokemon.fleeModifier > 1 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#e8433f]/20 text-[#e8433f] font-pixel">
                    Flee &uarr;
                  </span>
                )}
                {pokemon.fleeModifier < 1 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#38b764]/20 text-[#38b764] font-pixel">
                    Flee &darr;
                  </span>
                )}
              </div>
            </div>

            {/* Last action result */}
            {state.lastResult && (
              <p className="text-[10px] text-center text-[#f7a838] font-pixel">
                {state.lastResult}
              </p>
            )}

            {/* HUD mini bar */}
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] px-1">
              <span>Balls: {state.ballsRemaining}/30</span>
              <span>Steps: {state.stepsRemaining}/500</span>
            </div>

            {/* Action grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onThrowBall}
                disabled={state.ballsRemaining <= 0}
                className="px-3 py-2.5 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors disabled:opacity-40 space-y-0.5"
              >
                <div>Safari Ball</div>
                <div className="text-[8px] opacity-70">
                  {state.ballsRemaining} left
                </div>
              </button>
              <button
                onClick={onThrowRock}
                className="px-3 py-2.5 bg-[#d97b2a] hover:bg-[#e68a35] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors space-y-0.5"
              >
                <div>Throw Rock</div>
                <div className="text-[8px] opacity-70">
                  Easier catch, may flee!
                </div>
              </button>
              <button
                onClick={onThrowBait}
                className="px-3 py-2.5 bg-[#4a90d9] hover:bg-[#5a9ee5] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors space-y-0.5"
              >
                <div>Throw Bait</div>
                <div className="text-[8px] opacity-70">
                  Less likely to flee
                </div>
              </button>
              <button
                onClick={onRun}
                className="px-3 py-2.5 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
              >
                <div>Run Away</div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── THROWING (ball animation) ────────────────────────── */}
        {state.phase === "throwing" && (
          <motion.div
            key="throwing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-10 space-y-4"
          >
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="w-8 h-8 rounded-full bg-gradient-to-b from-[#e8433f] to-white border-2 border-[#1a1c2c]"
            />
            <p className="text-xs font-pixel text-[#f0f0e8] animate-pulse">
              ...
            </p>
          </motion.div>
        )}

        {/* ── CATCH RESULT ─────────────────────────────────────── */}
        {state.phase === "catch_result" && (
          <motion.div
            key="catch_result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6 space-y-4"
          >
            {state.isCaught && pokemon ? (
              <>
                <motion.p
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.6 }}
                  className="text-lg font-pixel text-[#38b764]"
                >
                  Gotcha!
                </motion.p>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                >
                  {pokemon.pokemon.sprites.front_default && (
                    <Image
                      src={pokemon.pokemon.sprites.front_default}
                      alt={pokemon.pokemon.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="pixelated drop-shadow-lg"
                    />
                  )}
                </motion.div>
                <p className="text-xs font-pixel text-[#f0f0e8] capitalize">
                  {pokemon.pokemon.name} was caught!
                  {pokemon.isShiny && (
                    <span className="ml-1 text-[#f7a838]">&#10024;</span>
                  )}
                </p>
              </>
            ) : state.isFled && pokemon ? (
              <>
                <p className="text-sm font-pixel text-[#e8433f]">
                  The Pokemon fled!
                </p>
                <motion.div
                  initial={{ opacity: 1, x: 0 }}
                  animate={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.5 }}
                >
                  {pokemon.pokemon.sprites.front_default && (
                    <Image
                      src={pokemon.pokemon.sprites.front_default}
                      alt={pokemon.pokemon.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="pixelated"
                    />
                  )}
                </motion.div>
              </>
            ) : (
              <p className="text-xs text-[#8b9bb4]">
                The ball missed...
              </p>
            )}

            <button
              onClick={onContinue}
              className="px-5 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ── SUMMARY ──────────────────────────────────────────── */}
        {state.phase === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
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
                  onClick={handleAddAllToBox}
                  disabled={addedToBox}
                  className="flex-1 px-4 py-2 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors disabled:opacity-50"
                >
                  {addedToBox ? "Added to PC Box!" : "Add All to PC Box"}
                </button>
              )}
              <button
                onClick={handleLeave}
                className="flex-1 px-4 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Leave
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
