"use client";

import { useRef, useEffect, useCallback } from "react";
import type { FullMapData, PlayerState, NpcData } from "@/types/explore";
import { VIEWPORT_TILES_X, VIEWPORT_TILES_Y, TILE_SIZE } from "@/types/explore";
import type { CachedTileset } from "@/utils/tileCache";
import type { ConnectedMap } from "@/hooks/useExplore";
import type { RemotePlayer } from "@/hooks/useOverworldPresence";
import { renderFrame } from "@/utils/mapRenderer";

interface OverworldCanvasProps {
  map: FullMapData | null;
  tileset: CachedTileset | null;
  player: PlayerState;
  npcs: NpcData[];
  camera: { x: number; y: number };
  connectedMaps: ConnectedMap[];
  remotePlayers?: Map<string, RemotePlayer>;
}

// Native GBA resolution — CSS handles upscaling with pixelated rendering
const GBA_WIDTH = VIEWPORT_TILES_X * TILE_SIZE; // 240
const GBA_HEIGHT = VIEWPORT_TILES_Y * TILE_SIZE; // 160

export default function OverworldCanvas({
  map,
  tileset,
  player,
  npcs,
  camera,
  connectedMaps,
  remotePlayers,
}: OverworldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !tileset) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    renderFrame(ctx, map, tileset, player, npcs, camera, 1, GBA_WIDTH, GBA_HEIGHT, connectedMaps, remotePlayers);
  }, [map, tileset, player, npcs, camera, connectedMaps, remotePlayers]);

  useEffect(() => {
    let running = true;

    function loop() {
      if (!running) return;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={GBA_WIDTH}
      height={GBA_HEIGHT}
      className="block w-full aspect-[3/2]"
      style={{
        imageRendering: "pixelated",
        WebkitImageRendering: "crisp-edges",
      } as React.CSSProperties}
      aria-label="Pokemon overworld exploration view"
      tabIndex={0}
    />
  );
}
