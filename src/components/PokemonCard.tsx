"use client";

import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot } from "@/types";
import { typeColors } from "@/data/typeColors";
import TypeBadge from "./TypeBadge";
import { extractBaseStats } from "@/utils/damageWasm";
import { getHeldItem } from "@/data/heldItems";
import { playCry } from "@/utils/cryPlayer";

interface PokemonCardProps {
  slot: TeamSlot;
  onRemove: (position: number) => void;
  onClick?: () => void;
  isExpanded?: boolean;
}

export default function PokemonCard({
  slot,
  onRemove,
  onClick,
  isExpanded,
}: PokemonCardProps) {
  const { pokemon, position } = slot;
  const stats = extractBaseStats(pokemon);
  const totalStats =
    stats.hp + stats.attack + stats.defense + stats.spAtk + stats.spDef + stats.speed;
  const primaryType = pokemon.types[0]?.type.name ?? "normal";
  const glowColor = typeColors[primaryType];
  const sprite =
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default;

  const heldItem = slot.heldItem ? getHeldItem(slot.heldItem) : null;

  return (
    <motion.div
      layout
      layoutId={`pokemon-${pokemon.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{
        boxShadow: `0 0 20px ${glowColor}4D`,
        borderColor: `${glowColor}80`,
      }}
      className={`relative rounded-xl border bg-[#262b44] p-4 cursor-pointer transition-colors ${
        isExpanded ? "border-[#e8433f]" : "border-[#3a4466]"
      }`}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            playCry(pokemon);
          }}
          aria-label={`Play ${pokemon.name} cry`}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4466] text-xs text-[#8b9bb4] hover:bg-[#3b82f6] hover:text-[#f0f0e8] transition-colors"
          title="Play cry"
        >
          &#9835;
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(position);
          }}
          aria-label={`Remove ${pokemon.name} from team`}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4466] text-xs text-[#8b9bb4] hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
        >
          X
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        {sprite && (
          <Image
            src={sprite}
            alt={pokemon.name}
            width={96}
            height={96}
            className="pixelated"
            unoptimized
          />
        )}

        <h3 className="text-lg font-bold font-pixel capitalize">{pokemon.name}</h3>

        <div className="flex gap-1.5">
          {pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} />
          ))}
        </div>

        {/* Config indicators */}
        <div className="flex flex-wrap gap-1 justify-center">
          {slot.nature && (
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-[#3a4466] text-[#8b9bb4] capitalize">
              {slot.nature.name}
            </span>
          )}
          {slot.ability && (
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-[#3a4466] text-[#8b9bb4] capitalize">
              {slot.ability.replace(/-/g, " ")}
            </span>
          )}
          {heldItem && (
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-[#3a4466] text-[#f7a838]">
              {heldItem.displayName}
            </span>
          )}
          {(slot.selectedMoves?.length ?? 0) > 0 && (
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-[#3a4466] text-[#38b764]">
              {slot.selectedMoves!.length} moves
            </span>
          )}
        </div>

        <div className="w-full space-y-1 text-xs">
          {[
            { label: "HP", value: stats.hp },
            { label: "ATK", value: stats.attack },
            { label: "DEF", value: stats.defense },
            { label: "SPA", value: stats.spAtk },
            { label: "SPD", value: stats.spDef },
            { label: "SPE", value: stats.speed },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-8 text-[#8b9bb4]">{s.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#3a4466] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: glowColor }}
                />
              </div>
              <span className="w-8 text-right tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-[#8b9bb4]">
          BST: <span className="text-[#f0f0e8] font-semibold">{totalStats}</span>
        </div>
      </div>
    </motion.div>
  );
}
