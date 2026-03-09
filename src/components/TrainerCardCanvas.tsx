"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { TeamSlot } from "@/types";

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

// ── Props ────────────────────────────────────────────────────────────────

interface TrainerCardCanvasProps {
  team: TeamSlot[];
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
  };
  exportAsImage: (canvasRef: React.RefObject<HTMLCanvasElement | null>) => void;
}

export default function TrainerCardCanvas({ team, cardData, exportAsImage }: TrainerCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  return (
    <>
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

      {/* Hidden canvas for PNG export */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="hidden"
      />
    </>
  );
}
