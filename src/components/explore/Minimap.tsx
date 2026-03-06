"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ParsedMap, PlayerState } from "@/types/explore";
import type { CachedTileset } from "@/utils/tileCache";

interface MinimapProps {
  map: ParsedMap;
  player: PlayerState;
  tileset: CachedTileset | null;
}

const MINIMAP_SCALE = 2; // pixels per tile
const MAX_SIZE = 120; // max dimension in CSS pixels

export default function Minimap({ map, player, tileset }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  // Toggle with M key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat) {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tileset) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, grid } = map;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles as colored dots
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y * width + x];
        const id = cell.metatileId;

        // Color based on tile properties
        let color: string;
        if (cell.collision !== 0) {
          color = "#1a1c2c"; // wall — dark
        } else if (tileset.isWater[id]) {
          color = "#3b5dc9"; // water — blue
        } else if (tileset.isGrass[id]) {
          color = "#38b764"; // grass — green
        } else if (!tileset.passable[id]) {
          color = "#333c57"; // impassable — dark gray
        } else {
          color = "#5a6988"; // walkable — gray
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * MINIMAP_SCALE, y * MINIMAP_SCALE, MINIMAP_SCALE, MINIMAP_SCALE);
      }
    }

    // Draw player dot
    ctx.fillStyle = "#e8433f";
    const px = player.x * MINIMAP_SCALE;
    const py = player.y * MINIMAP_SCALE;
    ctx.fillRect(px, py, MINIMAP_SCALE + 1, MINIMAP_SCALE + 1);
  }, [map, player.x, player.y, tileset]);

  useEffect(() => {
    if (visible) draw();
  }, [visible, draw]);

  if (!visible) return null;

  const w = map.width * MINIMAP_SCALE;
  const h = map.height * MINIMAP_SCALE;
  const scale = Math.min(1, MAX_SIZE / Math.max(w, h));

  return (
    <div
      className="absolute top-2 right-2 rounded border pointer-events-none"
      style={{
        backgroundColor: "rgba(26, 28, 44, 0.85)",
        borderColor: "#3a4466",
        padding: "2px",
      }}
    >
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        style={{
          width: w * scale,
          height: h * scale,
          imageRendering: "pixelated",
          display: "block",
        }}
      />
    </div>
  );
}
