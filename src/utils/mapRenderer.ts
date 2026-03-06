import type { FullMapData, PlayerState, NpcData, Direction } from "@/types/explore";
import { TILE_SIZE } from "@/types/explore";
import type { CachedTileset } from "./tileCache";
import { getSpriteFrame } from "./spriteCache";
import type { ConnectedMap } from "@/hooks/useExplore";
import type { RemotePlayer } from "@/hooks/useOverworldPresence";

interface Camera {
  x: number;
  y: number;
}

// GBA movement type → facing direction
const MOVEMENT_DIRECTIONS: Record<number, Direction> = {
  7: "up",
  8: "down",
  9: "left",
  10: "right",
};

function getNpcDirection(npc: NpcData): Direction {
  return MOVEMENT_DIRECTIONS[npc.movementType] ?? "down";
}

// Time-of-day tint (outdoor maps only)
function getTimeTint(): { r: number; g: number; b: number; a: number } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 8) return { r: 255, g: 180, b: 100, a: 0.08 };
  if (hour >= 8 && hour < 17) return { r: 0, g: 0, b: 0, a: 0 };
  if (hour >= 17 && hour < 19) return { r: 255, g: 120, b: 50, a: 0.1 };
  if (hour >= 19 && hour < 21) return { r: 30, g: 30, b: 80, a: 0.12 };
  return { r: 10, g: 10, b: 50, a: 0.18 };
}

// Draw connected map tiles that are visible in the viewport
function drawConnectedMaps(
  ctx: CanvasRenderingContext2D,
  map: FullMapData,
  camera: Camera,
  scale: number,
  viewWidth: number,
  viewHeight: number,
  connected: ConnectedMap[],
  pass: "base" | "overlay"
) {
  const tilePixels = TILE_SIZE * scale;
  const mainW = map.map.width;
  const mainH = map.map.height;

  for (const conn of connected) {
    if (!conn.tileset) continue;
    const connGrid = conn.map.map.grid;
    const connW = conn.map.map.width;
    const connH = conn.map.map.height;
    const canvases = pass === "base" ? conn.tileset.baseCanvases : conn.tileset.overlayCanvases;

    // Calculate the connected map's tile origin relative to the main map
    let originX = 0;
    let originY = 0;
    switch (conn.direction) {
      case 1: // down
        originX = conn.offset;
        originY = mainH;
        break;
      case 2: // up
        originX = conn.offset;
        originY = -connH;
        break;
      case 3: // left
        originX = -connW;
        originY = conn.offset;
        break;
      case 4: // right
        originX = mainW;
        originY = conn.offset;
        break;
    }

    // Only draw tiles that are visible in the viewport
    const visStartX = Math.max(0, Math.floor((camera.x / TILE_SIZE) - originX) - 1);
    const visStartY = Math.max(0, Math.floor((camera.y / TILE_SIZE) - originY) - 1);
    const visEndX = Math.min(connW, Math.ceil(((camera.x + viewWidth / scale) / TILE_SIZE) - originX) + 1);
    const visEndY = Math.min(connH, Math.ceil(((camera.y + viewHeight / scale) / TILE_SIZE) - originY) + 1);

    for (let ty = visStartY; ty < visEndY; ty++) {
      for (let tx = visStartX; tx < visEndX; tx++) {
        const cellIdx = ty * connW + tx;
        if (cellIdx >= connGrid.length) continue;

        const cell = connGrid[cellIdx];
        const metatileId = cell.metatileId;
        if (metatileId >= canvases.length) continue;

        const screenX = ((originX + tx) * TILE_SIZE - camera.x) * scale;
        const screenY = ((originY + ty) * TILE_SIZE - camera.y) * scale;

        // Skip if fully off-screen
        if (screenX + tilePixels < 0 || screenY + tilePixels < 0) continue;
        if (screenX > viewWidth || screenY > viewHeight) continue;

        ctx.drawImage(canvases[metatileId], screenX, screenY, tilePixels, tilePixels);
      }
    }
  }
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  map: FullMapData,
  tileset: CachedTileset,
  player: PlayerState,
  npcs: NpcData[],
  camera: Camera,
  scale: number,
  viewWidth: number,
  viewHeight: number,
  connectedMaps: ConnectedMap[] = [],
  remotePlayers?: Map<string, RemotePlayer>
): void {
  const tilePixels = TILE_SIZE * scale;
  const { width, height, grid } = map.map;

  // Clear
  ctx.fillStyle = "#1a1c2c";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // Connected maps base layer (behind main map)
  if (connectedMaps.length > 0) {
    drawConnectedMaps(ctx, map, camera, scale, viewWidth, viewHeight, connectedMaps, "base");
  }

  // Calculate visible tile range
  const startTileX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
  const startTileY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
  const endTileX = Math.min(
    width,
    Math.ceil((camera.x + viewWidth / scale) / TILE_SIZE) + 1
  );
  const endTileY = Math.min(
    height,
    Math.ceil((camera.y + viewHeight / scale) / TILE_SIZE) + 1
  );

  // Pass 1: Draw base layer (terrain, ground)
  for (let ty = startTileY; ty < endTileY; ty++) {
    for (let tx = startTileX; tx < endTileX; tx++) {
      const cellIdx = ty * width + tx;
      if (cellIdx >= grid.length) continue;

      const cell = grid[cellIdx];
      const metatileId = cell.metatileId;
      if (metatileId >= tileset.baseCanvases.length) continue;

      const screenX = (tx * TILE_SIZE - camera.x) * scale;
      const screenY = (ty * TILE_SIZE - camera.y) * scale;

      ctx.drawImage(
        tileset.baseCanvases[metatileId],
        screenX,
        screenY,
        tilePixels,
        tilePixels
      );
    }
  }

  // Draw NPCs — sorted by Y for correct overlap
  const sortedNpcs = [...npcs].sort((a, b) => a.y - b.y);
  for (const npc of sortedNpcs) {
    const npcScreenX = (npc.x * TILE_SIZE - camera.x) * scale;
    const npcScreenY = ((npc.y - 1) * TILE_SIZE - camera.y) * scale;
    const dir = getNpcDirection(npc);

    const frame = getSpriteFrame(npc.graphicsId, dir, 0);
    if (frame) {
      ctx.drawImage(
        frame,
        npcScreenX,
        npcScreenY,
        frame.width * scale,
        frame.height * scale
      );
    } else {
      ctx.fillStyle = "#e8433f";
      ctx.fillRect(
        npcScreenX + 2 * scale,
        npcScreenY + TILE_SIZE * scale + 2 * scale,
        (TILE_SIZE - 4) * scale,
        (TILE_SIZE - 4) * scale
      );
    }
  }

  // Draw remote players (other players in multiplayer)
  if (remotePlayers && remotePlayers.size > 0) {
    const sortedRemote = [...remotePlayers.values()].sort((a, b) => a.y - b.y);
    for (const rp of sortedRemote) {
      const rpScreenX = (rp.x * TILE_SIZE - camera.x) * scale;
      const rpScreenY = ((rp.y - 1) * TILE_SIZE - camera.y) * scale;

      // Try to render sprite; fall back to colored square
      const frame = getSpriteFrame(rp.spriteId || 0, rp.direction, rp.isMoving ? 1 : 0);
      if (frame) {
        ctx.drawImage(frame, rpScreenX, rpScreenY, frame.width * scale, frame.height * scale);
      } else {
        const px = (rp.x * TILE_SIZE - camera.x) * scale;
        const py = (rp.y * TILE_SIZE - camera.y) * scale;
        ctx.fillStyle = "#5b6ee1";
        ctx.fillRect(px + 2 * scale, py + 2 * scale, (TILE_SIZE - 4) * scale, (TILE_SIZE - 4) * scale);
      }

      // Name tag above sprite
      const nameX = (rp.x * TILE_SIZE - camera.x + TILE_SIZE / 2) * scale;
      const nameY = ((rp.y - 1) * TILE_SIZE - camera.y - 2) * scale;
      ctx.font = `${Math.max(6, 7 * scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      const textWidth = ctx.measureText(rp.displayName).width;
      ctx.fillRect(nameX - textWidth / 2 - 2, nameY - 7 * scale, textWidth + 4, 8 * scale);
      ctx.fillStyle = "#f0f0e8";
      ctx.fillText(rp.displayName, nameX, nameY);
    }
  }

  // Draw player
  const playerScreenX = (player.pixelX - camera.x) * scale;
  const playerScreenY = ((player.pixelY - TILE_SIZE) - camera.y) * scale;

  const playerFrame = getSpriteFrame(0, player.direction, player.animFrame);
  if (playerFrame) {
    ctx.drawImage(
      playerFrame,
      playerScreenX,
      playerScreenY,
      playerFrame.width * scale,
      playerFrame.height * scale
    );
  } else {
    const px = (player.pixelX - camera.x) * scale;
    const py = (player.pixelY - camera.y) * scale;
    ctx.fillStyle = "#38b764";
    ctx.fillRect(
      px + 2 * scale,
      py + 2 * scale,
      (TILE_SIZE - 4) * scale,
      (TILE_SIZE - 4) * scale
    );

    ctx.fillStyle = "#f0f0e8";
    const cx = px + (TILE_SIZE / 2) * scale;
    const cy = py + (TILE_SIZE / 2) * scale;
    const ds = 2 * scale;
    switch (player.direction) {
      case "up":
        ctx.fillRect(cx - ds / 2, py + 1 * scale, ds, ds);
        break;
      case "down":
        ctx.fillRect(cx - ds / 2, py + (TILE_SIZE - 3) * scale, ds, ds);
        break;
      case "left":
        ctx.fillRect(px + 1 * scale, cy - ds / 2, ds, ds);
        break;
      case "right":
        ctx.fillRect(px + (TILE_SIZE - 3) * scale, cy - ds / 2, ds, ds);
        break;
    }
  }

  // Pass 2: Draw overlay layer (tree tops, roof edges — rendered over player)
  for (let ty = startTileY; ty < endTileY; ty++) {
    for (let tx = startTileX; tx < endTileX; tx++) {
      const cellIdx = ty * width + tx;
      if (cellIdx >= grid.length) continue;

      const cell = grid[cellIdx];
      const metatileId = cell.metatileId;
      if (metatileId >= tileset.overlayCanvases.length) continue;

      const screenX = (tx * TILE_SIZE - camera.x) * scale;
      const screenY = (ty * TILE_SIZE - camera.y) * scale;

      ctx.drawImage(
        tileset.overlayCanvases[metatileId],
        screenX,
        screenY,
        tilePixels,
        tilePixels
      );
    }
  }

  // Connected maps overlay layer
  if (connectedMaps.length > 0) {
    drawConnectedMaps(ctx, map, camera, scale, viewWidth, viewHeight, connectedMaps, "overlay");
  }

  // Time-of-day tint (outdoor maps only)
  if (!map.map.isIndoor && !map.map.isCave) {
    const tint = getTimeTint();
    if (tint.a > 0) {
      ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
  }
}
