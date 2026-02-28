"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot, TypeName } from "@/types";
import TypeBadge from "../TypeBadge";
import ItemSprite from "@/components/ItemSprite";

interface TeamPreviewProps {
  player1Team: TeamSlot[];
  player2Team: TeamSlot[];
  onConfirm: (leadIndex: number) => void;
  isOnline?: boolean;
}

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PokemonPreviewCard({
  slot,
  isSelected,
  onClick,
  hidden,
  side,
}: {
  slot: TeamSlot;
  isSelected: boolean;
  onClick?: () => void;
  hidden?: boolean;
  side: "player" | "opponent";
}) {
  const sprite = slot.pokemon.sprites.front_default;
  const borderColor = isSelected ? "#38b764" : "#3a4466";

  return (
    <motion.button
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { scale: 1.03 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
        onClick ? "cursor-pointer hover:bg-[#3a4466]/60" : "cursor-default"
      }`}
      style={{
        backgroundColor: isSelected ? "#38b76420" : "#1a1c2c",
        borderWidth: 2,
        borderColor,
      }}
      aria-label={
        onClick
          ? `Select ${formatName(slot.pokemon.name)} as lead`
          : formatName(slot.pokemon.name)
      }
      aria-pressed={isSelected ? "true" : "false"}
    >
      {sprite && (
        <Image
          src={sprite}
          alt={slot.pokemon.name}
          width={48}
          height={48}
          unoptimized
          className="pixelated"
        />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-pixel text-[#f0f0e8] capitalize truncate block">
          {formatName(slot.pokemon.name)}
        </span>
        <div className="flex items-center gap-1 mt-1">
          {slot.pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
          ))}
        </div>
        {!hidden && side === "opponent" && slot.heldItem && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#8b9bb4] mt-0.5 truncate">
            <ItemSprite name={slot.heldItem} size={14} />
            {slot.heldItem.replace(/-/g, " ")}
          </span>
        )}
        {side === "player" && slot.heldItem && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#8b9bb4] mt-0.5 truncate">
            <ItemSprite name={slot.heldItem} size={14} />
            {slot.heldItem.replace(/-/g, " ")}
          </span>
        )}
      </div>
      {isSelected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[10px] font-pixel text-[#38b764] shrink-0 uppercase"
        >
          Lead
        </motion.span>
      )}
    </motion.button>
  );
}

export default function TeamPreview({
  player1Team,
  player2Team,
  onConfirm,
  isOnline = false,
}: TeamPreviewProps) {
  const [selectedLead, setSelectedLead] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6"
    >
      <h3 className="text-lg font-bold font-pixel text-[#f0f0e8] text-center mb-6">
        Team Preview
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Player 1 */}
        <div>
          <h4 className="text-sm font-bold font-pixel text-[#38b764] mb-3">
            Your Team
          </h4>
          <p className="text-[10px] text-[#8b9bb4] mb-2">
            Select your lead Pokemon
          </p>
          <div className="space-y-2">
            {player1Team.map((slot, i) => (
              <PokemonPreviewCard
                key={slot.pokemon.id}
                slot={slot}
                isSelected={selectedLead === i}
                onClick={() => setSelectedLead(i)}
                side="player"
              />
            ))}
          </div>
        </div>

        {/* Player 2 / Opponent */}
        <div>
          <h4 className="text-sm font-bold font-pixel text-[#e8433f] mb-3">
            Opponent
          </h4>
          {isOnline && (
            <p className="text-[10px] text-[#8b9bb4] mb-2">
              Moves and items hidden
            </p>
          )}
          <div className="space-y-2">
            {player2Team.map((slot) => (
              <PokemonPreviewCard
                key={slot.pokemon.id}
                slot={slot}
                isSelected={false}
                hidden={isOnline}
                side="opponent"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.div
        className="flex justify-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onConfirm(selectedLead)}
          className="rounded-lg bg-[#e8433f] px-8 py-3 text-sm font-bold font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
          aria-label={`Confirm ${formatName(player1Team[selectedLead]?.pokemon.name ?? "")} as lead`}
        >
          Confirm Lead
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
