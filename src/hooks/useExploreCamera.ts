import { useMemo } from "react";
import type { PlayerState, ParsedMap } from "@/types/explore";
import { TILE_SIZE, VIEWPORT_TILES_X, VIEWPORT_TILES_Y } from "@/types/explore";

interface Camera {
  x: number;
  y: number;
}

export function useExploreCamera(
  player: PlayerState,
  map: ParsedMap | null
): Camera {
  return useMemo(() => {
    if (!map) return { x: 0, y: 0 };

    const viewWidthPixels = VIEWPORT_TILES_X * TILE_SIZE;
    const viewHeightPixels = VIEWPORT_TILES_Y * TILE_SIZE;
    const mapWidthPixels = map.width * TILE_SIZE;
    const mapHeightPixels = map.height * TILE_SIZE;

    // Center camera on player
    let camX = player.pixelX - viewWidthPixels / 2 + TILE_SIZE / 2;
    let camY = player.pixelY - viewHeightPixels / 2 + TILE_SIZE / 2;

    // Clamp to map edges
    camX = Math.max(0, Math.min(camX, mapWidthPixels - viewWidthPixels));
    camY = Math.max(0, Math.min(camY, mapHeightPixels - viewHeightPixels));

    // If map is smaller than viewport, center it
    if (mapWidthPixels < viewWidthPixels) {
      camX = -(viewWidthPixels - mapWidthPixels) / 2;
    }
    if (mapHeightPixels < viewHeightPixels) {
      camY = -(viewHeightPixels - mapHeightPixels) / 2;
    }

    return { x: camX, y: camY };
  }, [player.pixelX, player.pixelY, map]);
}
