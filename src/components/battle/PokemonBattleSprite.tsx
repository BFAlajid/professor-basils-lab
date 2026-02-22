"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BattlePokemon } from "@/types";
import HealthBar from "./HealthBar";
import StatusIcon from "./StatusIcon";

interface PokemonBattleSpriteProps {
  pokemon: BattlePokemon;
  side: "left" | "right";
  label: string;
}

export default function PokemonBattleSprite({
  pokemon,
  side,
  label,
}: PokemonBattleSpriteProps) {
  const sprite =
    pokemon.slot.pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.slot.pokemon.sprites.front_default;

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: side === "left" ? -50 : 50 }}
      animate={{
        opacity: pokemon.isFainted ? 0.3 : 1,
        x: 0,
        y: pokemon.isFainted ? 20 : 0,
      }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-pixel">{label}</span>

      {sprite && (
        <motion.div
          className="relative"
          animate={pokemon.isFainted ? { rotate: 90, opacity: 0.3 } : pokemon.isDynamaxed ? { rotate: 0, opacity: 1, scale: 1.3 } : { rotate: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ transform: side === "right" ? "scaleX(-1)" : undefined }}
        >
          <Image
            src={sprite}
            alt={pokemon.slot.pokemon.name}
            width={120}
            height={120}
            className="pixelated drop-shadow-lg"
            unoptimized
          />
          {/* Mega Evolution glow */}
          {pokemon.isMegaEvolved && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ boxShadow: ["0 0 8px #f7a838", "0 0 20px #f7a838", "0 0 8px #f7a838"] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          {/* Terastallize crystal overlay */}
          {pokemon.isTerastallized && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-30"
              style={{ background: `radial-gradient(circle, #60a5fa, transparent)` }}
            />
          )}
        </motion.div>
      )}

      <div className="w-full max-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-bold capitalize truncate font-pixel">
            {pokemon.slot.pokemon.name}
          </h4>
          <StatusIcon status={pokemon.status} />
        </div>
        <HealthBar current={pokemon.currentHp} max={pokemon.maxHp} />
        {pokemon.isMegaEvolved && (
          <span className="text-[10px] font-bold font-pixel text-[#f7a838]">MEGA</span>
        )}
        {pokemon.isTerastallized && (
          <span className="text-[10px] font-bold font-pixel text-[#60a5fa]">TERA {pokemon.teraType?.toUpperCase()}</span>
        )}
        {pokemon.isDynamaxed && (
          <span className="text-[10px] font-bold font-pixel text-[#e8433f]">DMAX {pokemon.dynamaxTurnsLeft}t</span>
        )}
      </div>
    </motion.div>
  );
}
