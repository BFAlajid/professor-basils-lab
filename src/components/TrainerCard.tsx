"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import type { TeamSlot } from "@/types";
import type { PlayerStats } from "@/hooks/useAchievements";
import { useTrainerCard } from "@/hooks/useTrainerCard";
import GymBadgeCase from "@/components/battle/GymBadgeCase";

// ── Props ───────────────────────────────────────────────────────────────

interface TrainerCardProps {
  team: TeamSlot[];
  stats: PlayerStats;
}

// ── Canvas Export ────────────────────────────────────────────────────────

const CANVAS_W = 480;
const CANVAS_H = 290;

function drawCardToCanvas(
  canvas: HTMLCanvasElement,
  cardData: {
    name: string;
    trainerId: string;
    badges: string[];
    totalCaught: number;
    totalBattlesWon: number;
    bestTowerStreak: number;
    hallOfFameEntries: number;
    playTime: string;
    eloRating: number;
    rankTier: string;
    money: number;
  },
  teamSprites: (string | null)[],
  onComplete: () => void
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // Background
  ctx.fillStyle = "#1a1c2c";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Border
  ctx.strokeStyle = "#3a4466";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, CANVAS_W - 8, CANVAS_H - 8);

  // Gradient header bar
  const grad = ctx.createLinearGradient(0, 10, CANVAS_W, 10);
  grad.addColorStop(0, "#262b44");
  grad.addColorStop(1, "#3a4466");
  ctx.fillStyle = grad;
  ctx.fillRect(10, 10, CANVAS_W - 20, 44);

  // Header text
  ctx.fillStyle = "#f0f0e8";
  ctx.font = "bold 18px monospace";
  ctx.fillText("TRAINER CARD", 20, 38);

  // Trainer name and ID
  ctx.font = "14px monospace";
  ctx.fillStyle = "#f7a838";
  ctx.fillText(cardData.name, 20, 76);
  ctx.fillStyle = "#8b8b8b";
  ctx.fillText(`ID No. ${cardData.trainerId}`, CANVAS_W - 150, 38);

  // Play time
  ctx.fillStyle = "#f0f0e8";
  ctx.font = "12px monospace";
  ctx.fillText(`Play Time: ${cardData.playTime}`, CANVAS_W - 170, 76);

  // Divider line
  ctx.strokeStyle = "#3a4466";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 86);
  ctx.lineTo(CANVAS_W - 20, 86);
  ctx.stroke();

  // ELO / Rank / Money row
  ctx.fillStyle = "#262b44";
  ctx.fillRect(16, 90, CANVAS_W - 32, 22);
  const rankColorMap: Record<string, string> = {
    Beginner: "#8b9bb4", Poke: "#78c850", Great: "#6890f0",
    Hyper: "#f7a838", Ultra: "#f85888", Master: "#f0f0e8",
  };
  ctx.fillStyle = rankColorMap[cardData.rankTier] ?? "#8b9bb4";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`${cardData.rankTier} Ball`, 24, 106);
  ctx.fillStyle = "#8b8b8b";
  ctx.font = "11px monospace";
  ctx.fillText(`ELO ${cardData.eloRating}`, 130, 106);
  ctx.fillStyle = "#f7a838";
  ctx.fillText(`¥${cardData.money.toLocaleString()}`, CANVAS_W - 110, 106);

  // Stats section
  ctx.fillStyle = "#f0f0e8";
  ctx.font = "12px monospace";
  const statsStartY = 126;
  const lineH = 20;
  const statLabels = [
    ["Pokemon Caught", String(cardData.totalCaught)],
    ["Battles Won", String(cardData.totalBattlesWon)],
    ["Tower Streak", String(cardData.bestTowerStreak)],
    ["Hall of Fame", String(cardData.hallOfFameEntries)],
  ];
  for (let i = 0; i < statLabels.length; i++) {
    const [label, val] = statLabels[i];
    ctx.fillStyle = "#8b8b8b";
    ctx.fillText(label, 20, statsStartY + i * lineH);
    ctx.fillStyle = "#f0f0e8";
    ctx.fillText(val, 180, statsStartY + i * lineH);
  }

  // Badge indicators
  ctx.fillStyle = "#8b8b8b";
  ctx.font = "12px monospace";
  ctx.fillText("Badges", CANVAS_W - 170, statsStartY);
  const badgeY = statsStartY + 10;
  const badgeStartX = CANVAS_W - 170;
  for (let i = 0; i < 8; i++) {
    const x = badgeStartX + i * 20;
    if (i < cardData.badges.length) {
      ctx.fillStyle = "#f7a838";
      ctx.beginPath();
      ctx.arc(x + 8, badgeY + 10, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#3a4466";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 8, badgeY + 10, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Team sprites section label
  ctx.fillStyle = "#8b8b8b";
  ctx.font = "12px monospace";
  ctx.fillText("Team", 20, CANVAS_H - 56);

  // Divider before team
  ctx.strokeStyle = "#3a4466";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, CANVAS_H - 50);
  ctx.lineTo(CANVAS_W - 20, CANVAS_H - 50);
  ctx.stroke();

  // Load team sprites
  const validSprites = teamSprites.filter(Boolean) as string[];
  if (validSprites.length === 0) {
    onComplete();
    return;
  }

  let loadedCount = 0;
  const spriteSize = 40;
  const totalWidth = validSprites.length * (spriteSize + 8);
  const offsetX = Math.floor((CANVAS_W - totalWidth) / 2);

  validSprites.forEach((url, i) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(
        img,
        offsetX + i * (spriteSize + 8),
        CANVAS_H - 46,
        spriteSize,
        spriteSize
      );
      loadedCount++;
      if (loadedCount === validSprites.length) {
        onComplete();
      }
    };
    img.onerror = () => {
      loadedCount++;
      if (loadedCount === validSprites.length) {
        onComplete();
      }
    };
    img.src = url;
  });
}

// ── Component ───────────────────────────────────────────────────────────

export default function TrainerCard({ team, stats }: TrainerCardProps) {
  const { cardData, setTrainerName, exportAsImage } = useTrainerCard(stats);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(cardData.name);
  const [isExporting, setIsExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isExporting) return;

    setIsExporting(true);

    const teamSprites = team
      .slice(0, 6)
      .map((s) => s.pokemon.sprites.front_default);

    drawCardToCanvas(canvas, cardData, teamSprites, () => {
      exportAsImage(canvasRef);
      setIsExporting(false);
    });
  }, [team, cardData, exportAsImage, isExporting]);

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
              className={`font-pixel text-[10px] font-bold text-[${rankColors[cardData.rankTier] ?? "#8b9bb4"}]`}
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

        {/* Export button */}
        <div className="flex justify-center">
          <motion.button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-[#262b44] border border-[#3a4466] rounded-lg text-xs font-pixel text-[#f0f0e8] hover:bg-[#3a4466] hover:border-[#f7a838] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isExporting ? "Exporting..." : "Export PNG"}
          </motion.button>
        </div>
      </div>

      {/* Hidden canvas for PNG export */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="hidden"
      />
    </motion.div>
  );
}
