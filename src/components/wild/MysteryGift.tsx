"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { PCBoxPokemon } from "@/types";
import { useMysteryGift } from "@/hooks/useMysteryGift";
import { playCry } from "@/utils/cryPlayer";

interface MysteryGiftProps {
  onAddToBox: (pokemon: PCBoxPokemon) => void;
  onGiftClaimed: () => void;
}

export default function MysteryGift({ onAddToBox, onGiftClaimed }: MysteryGiftProps) {
  const { state, todaysGift, isClaimedToday, claimGift } = useMysteryGift();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedPokemon, setClaimedPokemon] = useState<PCBoxPokemon | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const handleClaim = useCallback(async () => {
    if (isClaimedToday || isClaiming) return;
    setIsClaiming(true);
    try {
      const pokemon = await claimGift();
      if (pokemon) {
        setClaimedPokemon(pokemon);
        setShowReveal(true);
        onAddToBox(pokemon);
        playCry(pokemon.pokemon);
        onGiftClaimed();
      }
    } finally {
      setIsClaiming(false);
    }
  }, [isClaimedToday, isClaiming, claimGift, onAddToBox, onGiftClaimed]);

  if (!todaysGift) return null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Mystery Gift</h3>
        <span className="text-[9px] text-[#8b9bb4]">
          {state.totalClaimed} gifts claimed
        </span>
      </div>

      <div className="text-center text-[10px] font-pixel text-[#f7a838]">
        {todaysGift.reason}
      </div>

      <AnimatePresence mode="wait">
        {!showReveal ? (
          <motion.div
            key="gift-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, rotateY: 90 }}
            className="flex flex-col items-center py-4 space-y-3"
          >
            {/* Gift box icon */}
            <motion.div
              className="text-5xl select-none"
              animate={isClaimedToday ? {} : { scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isClaimedToday ? "\u{1F4E8}" : "\u{1F381}"}
            </motion.div>

            {isClaimedToday ? (
              <p className="text-xs text-[#8b9bb4]">
                Already claimed today! Come back tomorrow.
              </p>
            ) : (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="px-6 py-2 bg-[#e8433f] hover:bg-[#f05050] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors disabled:opacity-50"
              >
                {isClaiming ? "Opening..." : "Claim Gift"}
              </button>
            )}
          </motion.div>
        ) : claimedPokemon ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="flex flex-col items-center py-4 space-y-3"
          >
            {claimedPokemon.pokemon.sprites.other?.["official-artwork"]?.front_default && (
              <Image
                src={claimedPokemon.pokemon.sprites.other["official-artwork"].front_default!}
                alt={claimedPokemon.pokemon.name}
                width={120}
                height={120}
                unoptimized
                className="pixelated drop-shadow-lg"
              />
            )}
            <div className="text-center">
              <p className="text-sm font-pixel text-[#f0f0e8] capitalize">
                {claimedPokemon.pokemon.name}
                {claimedPokemon.isShiny && (
                  <span className="ml-1 text-[#f7a838]">&#10024;</span>
                )}
              </p>
              <p className="text-[10px] text-[#8b9bb4]">
                Lv.{claimedPokemon.level} · {claimedPokemon.nature.name}
              </p>
              {todaysGift.gift.ribbonText && (
                <p className="text-[9px] text-[#f7a838] mt-1">
                  {todaysGift.gift.ribbonText}
                </p>
              )}
            </div>
            <p className="text-[10px] text-[#38b764]">
              Added to your PC Box!
            </p>
            <button
              onClick={() => setShowReveal(false)}
              className="px-4 py-1.5 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              Close
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
