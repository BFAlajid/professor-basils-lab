"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import { formatName } from "@/utils/format";

// ── Helpers ──────────────────────────────────────────────────────────

function getBaseStatTotal(slot: TeamSlot): number {
  return slot.pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

// ── Pokemon Card ─────────────────────────────────────────────────────

export default memo(function BattleFactoryCard({
  slot,
  selected,
  onClick,
  compact = false,
  highlight = false,
}: {
  slot: TeamSlot;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  highlight?: boolean;
}) {
  const bst = getBaseStatTotal(slot);
  const sprite = slot.pokemon.sprites.front_default;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative rounded-xl border-2 p-3 text-center transition-colors
        ${
          selected
            ? "border-[#f7a838] bg-[#f7a838]/10"
            : highlight
              ? "border-[#60a5fa] bg-[#60a5fa]/10"
              : "border-[#3a4466] bg-[#262b44] hover:border-[#4a5577]"
        }
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#f7a838] flex items-center justify-center"
        >
          <span className="text-[10px] font-bold text-[#1a1c2c]">&#10003;</span>
        </motion.div>
      )}

      {/* Sprite */}
      {sprite && (
        <Image
          src={sprite}
          alt={slot.pokemon.name}
          width={compact ? 48 : 64}
          height={compact ? 48 : 64}
          unoptimized
          className="mx-auto"
        />
      )}

      {/* Name */}
      <p
        className={`font-pixel capitalize truncate ${
          compact ? "text-[10px]" : "text-xs"
        } text-[#f0f0e8] mt-1`}
      >
        {formatName(slot.pokemon.name)}
      </p>

      {/* Type badges */}
      <div className="flex justify-center gap-1 mt-1">
        {slot.pokemon.types.map((t) => (
          <span
            key={t.type.name}
            className="rounded-full px-1.5 py-0.5 text-[8px] font-medium uppercase"
            style={{
              backgroundColor: typeColors[t.type.name] + "33",
              color: typeColors[t.type.name],
            }}
          >
            {t.type.name}
          </span>
        ))}
      </div>

      {/* BST */}
      {!compact && (
        <p className="text-[10px] text-[#8b9bb4] mt-1">BST: {bst}</p>
      )}
    </motion.button>
  );
});
