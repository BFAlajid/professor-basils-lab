"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import type { TeamSlot } from "@/types";
import type { PlayerStats } from "@/hooks/useAchievements";
import { useTrainerCard } from "@/hooks/useTrainerCard";
import GymBadgeCase from "@/components/battle/GymBadgeCase";
import TrainerCardCanvas from "@/components/TrainerCardCanvas";

// ── Props ───────────────────────────────────────────────────────────────

interface TrainerCardProps {
  team: TeamSlot[];
  stats: PlayerStats;
}

// ── Component ───────────────────────────────────────────────────────────

export default memo(function TrainerCard({ team, stats }: TrainerCardProps) {
  const { cardData, setTrainerName, exportAsImage } = useTrainerCard(stats);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(cardData.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync edit value when card data changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(cardData.name);
    }
  }, [cardData.name, isEditing]);

  // Focus input on edit start
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameClick = useCallback(() => {
    setEditValue(cardData.name);
    setIsEditing(true);
  }, [cardData.name]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setTrainerName(editValue);
  }, [editValue, setTrainerName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        setIsEditing(false);
        setTrainerName(editValue);
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setEditValue(cardData.name);
      }
    },
    [editValue, cardData.name, setTrainerName]
  );

  // Rank tier colors
  const rankColors: Record<string, string> = {
    Beginner: "#8b9bb4",
    Poke: "#78c850",
    Great: "#6890f0",
    Hyper: "#f7a838",
    Ultra: "#f85888",
    Master: "#f0f0e8",
  };

  // Stat display rows
  const statRows = [
    { label: "Pokemon Caught", value: cardData.totalCaught },
    { label: "Battles Won", value: cardData.totalBattlesWon },
    { label: "Tower Streak", value: cardData.bestTowerStreak },
    { label: "Hall of Fame", value: cardData.hallOfFameEntries },
  ];

  return (
    <motion.div
      className="bg-[#1a1c2c] border-2 border-[#3a4466] rounded-xl overflow-hidden max-w-md mx-auto"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-[#262b44] to-[#3a4466] px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-pixel text-[#f0f0e8] tracking-wider">
          TRAINER CARD
        </h2>
        <span className="text-xs font-pixel text-[#8b8b8b]">
          ID No. {cardData.trainerId}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Name + play time row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-pixel text-[#8b8b8b]">Name:</span>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                aria-label="Trainer name"
                placeholder="Trainer"
                maxLength={16}
                className="bg-[#262b44] border border-[#3a4466] rounded px-2 py-0.5 text-sm font-pixel text-[#f7a838] outline-none focus:border-[#f7a838] w-32"
              />
            ) : (
              <button
                onClick={handleNameClick}
                className="text-sm font-pixel text-[#f7a838] hover:underline cursor-pointer transition-colors"
                title="Click to edit name"
              >
                {cardData.name}
              </button>
            )}
          </div>
          <span className="text-xs font-pixel text-[#8b8b8b]">
            Play Time: {cardData.playTime}
          </span>
        </div>

        {/* ELO / Rank / Money row */}
        <div className="flex items-center justify-between bg-[#262b44] rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span
              className="font-pixel text-[10px] font-bold"
              style={{ color: rankColors[cardData.rankTier] ?? "#8b9bb4" }}
            >
              {cardData.rankTier} Ball
            </span>
            <span className="font-pixel text-[9px] text-[#8b9bb4]">
              ELO {cardData.eloRating}
            </span>
          </div>
          <span className="font-pixel text-[10px] text-[#f7a838]">
            ¥{cardData.money.toLocaleString()}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#3a4466]" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {statRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs font-pixel text-[#8b8b8b]">
                {row.label}
              </span>
              <span className="text-xs font-pixel text-[#f0f0e8] ml-2">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#3a4466]" />

        {/* Badge case */}
        <GymBadgeCase earnedBadges={cardData.badges} />

        {/* Divider */}
        <div className="border-t border-[#3a4466]" />

        {/* Team sprites */}
        <div>
          <p className="text-xs font-pixel text-[#8b8b8b] mb-2">Team</p>
          <div className="flex items-center gap-2 justify-center min-h-[48px]">
            {team.length === 0 && (
              <span className="text-xs font-pixel text-[#3a4466]">
                No Pokemon in team
              </span>
            )}
            {team.slice(0, 6).map((slot) => {
              const sprite = slot.pokemon.sprites.front_default;
              return (
                <motion.div
                  key={slot.position}
                  className="w-12 h-12 bg-[#262b44] border border-[#3a4466] rounded-lg flex items-center justify-center overflow-hidden"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: slot.position * 0.05,
                  }}
                >
                  {sprite ? (
                    <Image
                      src={sprite}
                      alt={slot.pokemon.name}
                      width={40}
                      height={40}
                      className="pixelated"
                      unoptimized
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#3a4466]" />
                  )}
                </motion.div>
              );
            })}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 6 - team.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-12 h-12 bg-[#262b44] border border-[#3a4466] rounded-lg flex items-center justify-center"
                >
                  <div className="w-4 h-4 rounded-full border border-[#3a4466]" />
                </div>
              )
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#3a4466]" />

        {/* Canvas export */}
        <TrainerCardCanvas team={team} cardData={cardData} exportAsImage={exportAsImage} />
      </div>
    </motion.div>
  );
});
