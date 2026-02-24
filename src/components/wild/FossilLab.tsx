"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { FOSSILS, Fossil } from "@/data/fossils";

interface FossilLabProps {
  fossilInventory: Record<string, number>;
  onRevive: (fossilId: string) => void;
  onClose: () => void;
}

export default function FossilLab({ fossilInventory, onRevive, onClose }: FossilLabProps) {
  const [revivingId, setRevivingId] = useState<string | null>(null);

  const handleRevive = (fossilId: string) => {
    setRevivingId(fossilId);
    // Brief animation delay before calling parent handler
    setTimeout(() => {
      onRevive(fossilId);
      setRevivingId(null);
    }, 800);
  };

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Fossil Lab</h3>
        <button
          onClick={onClose}
          className="text-[10px] font-pixel text-[#8b9bb4] hover:text-[#e8433f] transition-colors px-2 py-1 rounded border border-[#3a4466] hover:border-[#e8433f]"
        >
          Close
        </button>
      </div>

      <p className="text-[10px] text-[#8b9bb4]">
        Revive ancient Pokemon from fossils. Fossils can be found in caves, mountains, and deserts.
      </p>

      {/* Fossil list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {FOSSILS.map((fossil) => (
          <FossilCard
            key={fossil.id}
            fossil={fossil}
            quantity={fossilInventory[fossil.id] || 0}
            isReviving={revivingId === fossil.id}
            onRevive={() => handleRevive(fossil.id)}
          />
        ))}
      </div>

      {/* Footer info */}
      <div className="border-t border-[#3a4466] pt-2">
        <p className="text-[9px] text-[#3a4466] text-center">
          Revived Pokemon will be added to your PC Box at the fossil&apos;s revive level.
        </p>
      </div>
    </div>
  );
}

function FossilCard({
  fossil,
  quantity,
  isReviving,
  onRevive,
}: {
  fossil: Fossil;
  quantity: number;
  isReviving: boolean;
  onRevive: () => void;
}) {
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fossil.pokemonId}.png`;

  return (
    <motion.div
      layout
      className="bg-[#262b44] border border-[#3a4466] rounded-lg p-3 flex items-center gap-3"
    >
      {/* Pokemon sprite */}
      <div className="relative w-12 h-12 shrink-0">
        <Image
          src={spriteUrl}
          alt={fossil.description}
          width={48}
          height={48}
          unoptimized
          className={`pixelated ${quantity === 0 ? "opacity-30 grayscale" : ""}`}
        />
        <AnimatePresence>
          {isReviving && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 rounded-full bg-[#f7a838]/30 border-2 border-[#f7a838]"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Fossil info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-pixel text-[#f0f0e8] truncate">
            {fossil.name}
          </span>
          <span className="text-[8px] font-pixel text-[#8b9bb4] shrink-0">
            Lv. {fossil.reviveLevel}
          </span>
        </div>
        <p className="text-[9px] text-[#8b9bb4]">{fossil.description}</p>
      </div>

      {/* Quantity + Revive button */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-pixel px-1.5 py-0.5 rounded ${
            quantity > 0
              ? "text-[#f7a838] bg-[#f7a838]/10 border border-[#f7a838]/30"
              : "text-[#3a4466] bg-[#1a1c2c] border border-[#3a4466]"
          }`}
        >
          x{quantity}
        </span>
        <button
          onClick={onRevive}
          disabled={quantity === 0 || isReviving}
          className={`text-[10px] font-pixel px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            quantity > 0 && !isReviving
              ? "bg-[#38b764]/20 border-[#38b764] text-[#38b764] hover:bg-[#38b764]/30 active:scale-95"
              : "bg-[#1a1c2c] border-[#3a4466] text-[#3a4466] cursor-not-allowed"
          }`}
        >
          {isReviving ? "..." : "Revive"}
        </button>
      </div>
    </motion.div>
  );
}
