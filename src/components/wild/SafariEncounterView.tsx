"use client";

import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { SafariZoneState } from "@/types";

// ── Props ────────────────────────────────────────────────────────────

interface SafariEncounterViewProps {
  state: SafariZoneState;
  pokemon: NonNullable<SafariZoneState["currentPokemon"]>;
  onThrowBall: () => void;
  onThrowRock: () => void;
  onThrowBait: () => void;
  onRun: () => void;
}

// ── Component ────────────────────────────────────────────────────────

export default function SafariEncounterView({
  state,
  pokemon,
  onThrowBall,
  onThrowRock,
  onThrowBait,
  onRun,
}: SafariEncounterViewProps) {
  return (
    <div className="space-y-3">
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
    </div>
  );
}
