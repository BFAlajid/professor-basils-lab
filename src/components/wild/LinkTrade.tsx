"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { PCBoxPokemon, LinkTradeState, TradeOffer } from "@/types";

interface LinkTradeProps {
  myBox: PCBoxPokemon[];
  trade: LinkTradeState;
  isHost: boolean;
  onShareBox: (box: PCBoxPokemon[]) => void;
  onOfferPokemon: (offer: TradeOffer) => void;
  onConfirm: () => void;
  onReject: () => void;
  onComplete: (sentPokemon: PCBoxPokemon) => void;
  onReset: () => void;
  onAddToBox: (pokemon: PCBoxPokemon) => void;
  onRemoveFromBox: (index: number) => void;
  onBack: () => void;
}

/* ---------- tiny helpers ---------- */

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ivTotal(ivs: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number }) {
  return ivs.hp + ivs.attack + ivs.defense + ivs.spAtk + ivs.spDef + ivs.speed;
}

/* ---------- sub-components ---------- */

function PokemonCard({
  pokemon,
  selected,
  onClick,
  readonly,
}: {
  pokemon: PCBoxPokemon;
  selected?: boolean;
  onClick?: () => void;
  readonly?: boolean;
}) {
  const name = pokemon.nickname ?? pokemon.pokemon.name;
  const sprite = pokemon.pokemon.sprites.front_default;
  return (
    <div
      {...(!readonly && { role: "button" })}
      tabIndex={readonly ? undefined : 0}
      onClick={readonly ? undefined : onClick}
      onKeyDown={readonly ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className={`flex items-center gap-2 rounded-lg bg-[#1a1c2c] px-2 py-1.5 transition-all ${
        readonly ? "opacity-80" : "cursor-pointer"
      } ${selected ? "ring-2 ring-[#f7a838]" : readonly ? "" : "hover:bg-[#262b44]"}`}
    >
      {sprite && (
        <Image src={sprite} alt={name} width={32} height={32} unoptimized className="pixelated" />
      )}
      <div className="min-w-0">
        <span className="text-xs font-pixel capitalize block truncate text-[#f0f0e8]">{name}</span>
        <span className="text-[10px] text-[#8b9bb4] block">Lv. {pokemon.level}</span>
      </div>
      {pokemon.isShiny && <span className="text-[10px] text-[#f7a838] shrink-0">&#9733;</span>}
    </div>
  );
}

function OfferDetail({ pokemon, label }: { pokemon: PCBoxPokemon; label: string }) {
  const sprite = pokemon.pokemon.sprites.front_default;
  const types = pokemon.pokemon.types.map((t) => capitalize(t.type.name)).join(" / ");
  return (
    <div className="flex-1 flex flex-col items-center bg-[#1a1c2c] rounded-xl border border-[#3a4466] p-3 gap-1">
      <span className="text-[9px] text-[#8b9bb4] mb-1">{label}</span>
      {sprite && (
        <Image src={sprite} alt={pokemon.pokemon.name} width={64} height={64} unoptimized className="pixelated" />
      )}
      <p className="text-xs font-pixel text-[#f0f0e8] capitalize">
        {pokemon.nickname ?? pokemon.pokemon.name}
        {pokemon.isShiny && <span className="ml-1 text-[#f7a838]">&#9733;</span>}
      </p>
      <p className="text-[10px] text-[#8b9bb4]">Lv. {pokemon.level}</p>
      <p className="text-[9px] text-[#8b9bb4]">{types}</p>
      <p className="text-[9px] text-[#8b9bb4]">{capitalize(pokemon.nature.name)} nature</p>
      <p className="text-[9px] text-[#8b9bb4]">IVs total: {ivTotal(pokemon.ivs)}/186</p>
    </div>
  );
}

/* ---------- main component ---------- */

export default function LinkTrade({
  myBox,
  trade,
  isHost,
  onShareBox,
  onOfferPokemon,
  onConfirm,
  onReject,
  onComplete,
  onReset,
  onAddToBox,
  onRemoveFromBox,
  onBack,
}: LinkTradeProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  /* Phase 6 — both confirmed: fire the complete callback */
  useEffect(() => {
    if (trade.myConfirmed && trade.opponentConfirmed && !trade.tradeComplete && trade.myOffer) {
      onComplete(trade.myOffer.pokemon);
    }
  }, [trade.myConfirmed, trade.opponentConfirmed, trade.tradeComplete, trade.myOffer, onComplete]);

  const handleOffer = useCallback(() => {
    if (selectedIndex === null) return;
    onOfferPokemon({ fromHost: isHost, pokemonIndex: selectedIndex, pokemon: myBox[selectedIndex] });
    setSelectedIndex(null);
  }, [selectedIndex, isHost, myBox, onOfferPokemon]);

  const handleFinish = useCallback(() => {
    if (trade.lastTradedReceived && trade.myOffer) {
      onAddToBox(trade.lastTradedReceived);
      onRemoveFromBox(trade.myOffer.pokemonIndex);
    }
    onReset();
  }, [trade.lastTradedReceived, trade.myOffer, onAddToBox, onRemoveFromBox, onReset]);

  /* ---------- derive phase ---------- */
  const bothBoxesShared = trade.myBoxShared && trade.opponentBox.length > 0;
  const bothOffered = !!(trade.myOffer && trade.opponentOffer);
  const bothConfirmed = trade.myConfirmed && trade.opponentConfirmed;

  return (
    <div className="rounded-xl border-2 border-[#262b44] bg-[#262b44] overflow-hidden">
      {/* GBA chrome — status bar */}
      <div className="flex items-center justify-between bg-[#1a1c2c] px-3 py-1.5 border-b border-[#3a4466]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${bothBoxesShared ? "bg-[#38b764]" : "bg-[#f7a838] animate-pulse"}`} />
          <span className="text-[10px] font-pixel text-[#f0f0e8]">Link Trade</span>
        </div>
        <button onClick={onBack} className="text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] font-pixel transition-colors">
          Back
        </button>
      </div>

      {/* Cable dashed line */}
      <div className="h-px border-t border-dashed border-[#3a4466] mx-4" />

      <div className="p-4">
        <AnimatePresence mode="wait">

          {/* ---- Phase 1: Box Sharing ---- */}
          {!trade.myBoxShared && (
            <motion.div key="share" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-6">
              <p className="text-xs text-[#8b9bb4] text-center">Share your PC Box so your partner can see your Pokemon.</p>
              <button
                onClick={() => onShareBox(myBox)}
                disabled={myBox.length === 0}
                className="px-5 py-2.5 bg-[#38b764] hover:bg-[#4ad87a] disabled:opacity-40 text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
              >
                Share PC Box
              </button>
              {myBox.length === 0 && <p className="text-[10px] text-[#e8433f]">Your PC Box is empty.</p>}
            </motion.div>
          )}

          {/* Waiting for opponent box */}
          {trade.myBoxShared && !bothBoxesShared && !trade.myOffer && (
            <motion.div key="waiting-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 rounded-full border-4 border-[#3a4466] border-t-[#38b764]" />
              <p className="text-xs font-pixel text-[#f0f0e8] animate-pulse">Waiting for partner to share...</p>
            </motion.div>
          )}

          {/* ---- Phase 2: Selection ---- */}
          {bothBoxesShared && !trade.myOffer && !trade.opponentOffer && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Your Pokemon */}
                <div>
                  <h4 className="text-[10px] font-pixel text-[#f7a838] mb-1.5">Your Pokemon</h4>
                  <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {myBox.map((p, i) => (
                      <PokemonCard key={i} pokemon={p} selected={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
                    ))}
                  </div>
                </div>
                {/* Their Pokemon */}
                <div>
                  <h4 className="text-[10px] font-pixel text-[#8b9bb4] mb-1.5">Their Pokemon</h4>
                  <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {trade.opponentBox.map((p, i) => (
                      <PokemonCard key={i} pokemon={p} readonly />
                    ))}
                  </div>
                </div>
              </div>

              {/* Cable line */}
              <div className="h-px border-t border-dashed border-[#3a4466]" />

              <div className="flex justify-center">
                <button
                  onClick={handleOffer}
                  disabled={selectedIndex === null}
                  className="px-5 py-2 bg-[#e8433f] hover:bg-[#f05050] disabled:opacity-40 text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Offer Trade
                </button>
              </div>
            </motion.div>
          )}

          {/* ---- Phase 4: Waiting for opponent offer ---- */}
          {trade.myOffer && !trade.opponentOffer && (
            <motion.div key="waiting-offer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-4">
              <OfferDetail pokemon={trade.myOffer.pokemon} label="Your offer" />
              <motion.p animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-xs font-pixel text-[#f0f0e8]">
                Waiting for partner&apos;s selection...
              </motion.p>
            </motion.div>
          )}

          {/* ---- Phase 3: Both offered — confirmation ---- */}
          {bothOffered && !bothConfirmed && !trade.tradeComplete && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-2">
                <OfferDetail pokemon={trade.myOffer!.pokemon} label="You send" />
                {/* Animated arrow */}
                <div className="flex flex-col items-center shrink-0">
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-lg text-[#f7a838]"
                  >
                    &#8644;
                  </motion.span>
                </div>
                <OfferDetail pokemon={trade.opponentOffer!.pokemon} label="You receive" />
              </div>

              <div className="text-center bg-[#1a1c2c] rounded-lg p-2 border border-[#3a4466]">
                <p className="text-xs font-pixel text-[#f0f0e8]">Trade?</p>
              </div>

              {trade.myConfirmed ? (
                <p className="text-xs font-pixel text-[#f0f0e8] text-center animate-pulse">Waiting for partner to confirm...</p>
              ) : (
                <div className="flex justify-center gap-3">
                  <button onClick={onConfirm} className="px-5 py-2 bg-[#38b764] hover:bg-[#4ad87a] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors">
                    Confirm
                  </button>
                  <button onClick={onReject} className="px-5 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ---- Phase 6: Both confirmed — trading animation ---- */}
          {bothConfirmed && !trade.tradeComplete && (
            <motion.div key="trading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 rounded-full border-4 border-[#3a4466] border-t-[#e8433f] border-b-[#f7a838]"
              />
              <p className="text-xs font-pixel text-[#f0f0e8] animate-pulse">Trading...</p>
            </motion.div>
          )}

          {/* ---- Phase 5: Trade Complete ---- */}
          {trade.tradeComplete && trade.lastTradedReceived && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-4">
              <p className="text-xs font-pixel text-[#38b764]">The trade is complete!</p>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}>
                {trade.lastTradedReceived.pokemon.sprites.front_default && (
                  <Image
                    src={trade.lastTradedReceived.pokemon.sprites.front_default}
                    alt={trade.lastTradedReceived.pokemon.name}
                    width={96}
                    height={96}
                    unoptimized
                    className="pixelated drop-shadow-lg"
                  />
                )}
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-pixel text-[#f0f0e8] capitalize">
                  {trade.lastTradedReceived.nickname ?? trade.lastTradedReceived.pokemon.name}
                  {trade.lastTradedReceived.isShiny && <span className="ml-1 text-[#f7a838]">&#9733;</span>}
                </p>
                <p className="text-[10px] text-[#8b9bb4]">
                  Lv. {trade.lastTradedReceived.level} &middot; {capitalize(trade.lastTradedReceived.nature.name)}
                </p>
              </div>
              <div className="flex gap-3 mt-1">
                <button onClick={handleFinish} className="px-4 py-2 bg-[#38b764] hover:bg-[#4ad87a] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors">
                  Add to PC Box
                </button>
                <button onClick={onReset} className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors">
                  Trade Again
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
