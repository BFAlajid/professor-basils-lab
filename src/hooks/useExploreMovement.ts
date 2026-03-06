import { useCallback, useEffect, useRef } from "react";
import type {
  Direction,
  ExploreState,
  ExploreAction,
  FullMapData,
  Warp,
  NpcData,
} from "@/types/explore";
import {
  TILE_SIZE,
  WALK_SPEED_MS,
  RUN_SPEED_MS,
  MB_TALL_GRASS,
  MB_LONG_GRASS,
  MB_LEDGE_SOUTH,
  MB_LEDGE_NORTH,
  MB_LEDGE_WEST,
  MB_LEDGE_EAST,
  MB_WARP_DOOR,
  MB_WARP_ARROW,
  MB_STAIRCASE,
} from "@/types/explore";
import type { CachedTileset } from "@/utils/tileCache";
import {
  playFootstep,
  playGrassStep,
  playBump,
  playLedgeJump,
  playWarp,
} from "@/utils/exploreSfx";

interface MovementCallbacks {
  onWarp: (warp: Warp) => void;
  onGrassStep: (encounterRate: number) => void;
  onNpcInteract: (npc: NpcData) => void;
}

const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const LEDGE_BEHAVIORS: Record<number, Direction> = {
  [MB_LEDGE_SOUTH]: "down",
  [MB_LEDGE_NORTH]: "up",
  [MB_LEDGE_WEST]: "left",
  [MB_LEDGE_EAST]: "right",
};

export function useExploreMovement(
  state: ExploreState,
  dispatch: React.Dispatch<ExploreAction>,
  tileset: CachedTileset | null,
  callbacks: MovementCallbacks
) {
  const keysDown = useRef(new Set<string>());
  const movingRef = useRef(false);
  const animIntervalRef = useRef<number | null>(null);
  const currentMapRef = useRef(state.currentMap);
  const callbacksRef = useRef(callbacks);
  currentMapRef.current = state.currentMap;
  callbacksRef.current = callbacks;

  const canMoveTo = useCallback(
    (map: FullMapData, x: number, y: number): boolean => {
      const { width, height, grid } = map.map;
      if (x < 0 || y < 0 || x >= width || y >= height) return false;

      const cell = grid[y * width + x];
      if (cell.collision !== 0) return false;

      if (tileset && cell.metatileId < tileset.passable.length) {
        if (!tileset.passable[cell.metatileId]) return false;
      }

      for (const npc of map.npcs) {
        if (npc.x === x && npc.y === y) return false;
      }

      return true;
    },
    [tileset]
  );

  const getBehavior = useCallback(
    (map: FullMapData, x: number, y: number): number => {
      const { width, height, grid } = map.map;
      if (x < 0 || y < 0 || x >= width || y >= height) return 0;
      const idx = y * width + x;
      if (idx >= grid.length) return 0;
      const cell = grid[idx];
      if (tileset && cell.metatileId < tileset.behaviors.length) {
        return tileset.behaviors[cell.metatileId];
      }
      return 0;
    },
    [tileset]
  );

  const checkTileActions = useCallback(
    (map: FullMapData, x: number, y: number) => {
      const behavior = getBehavior(map, x, y);

      // Warp check
      if (
        behavior === MB_WARP_DOOR ||
        behavior === MB_WARP_ARROW ||
        behavior === MB_STAIRCASE
      ) {
        const warp = map.warps.find((w) => w.x === x && w.y === y);
        if (warp) {
          playWarp();
          callbacksRef.current.onWarp(warp);
          return;
        }
      }

      // Grass encounter check
      if (behavior === MB_TALL_GRASS || behavior === MB_LONG_GRASS) {
        playGrassStep();
        const rate = map.encounters?.land?.encounterRate ?? 0;
        if (rate > 0) {
          callbacksRef.current.onGrassStep(rate);
        }
      }
    },
    [getBehavior]
  );

  const move = useCallback(
    (direction: Direction) => {
      if (
        movingRef.current ||
        !state.currentMap ||
        state.phase !== "exploring" ||
        state.isTransitioning ||
        state.isBattleTransitioning
      ) {
        if (!movingRef.current) {
          dispatch({ type: "SET_DIRECTION", direction });
        }
        return;
      }

      dispatch({ type: "SET_DIRECTION", direction });

      const { dx, dy } = DIRECTION_DELTAS[direction];
      const targetX = state.player.x + dx;
      const targetY = state.player.y + dy;

      // Check for ledge jump
      const targetBehavior =
        targetX >= 0 &&
        targetY >= 0 &&
        targetX < state.currentMap.map.width &&
        targetY < state.currentMap.map.height
          ? getBehavior(state.currentMap, targetX, targetY)
          : -1;

      const ledgeDir = LEDGE_BEHAVIORS[targetBehavior];
      if (ledgeDir && ledgeDir !== direction) {
        playBump();
        return;
      }

      if (!canMoveTo(state.currentMap, targetX, targetY)) {
        playBump();
        return;
      }

      movingRef.current = true;
      dispatch({ type: "MOVE_START", direction });

      const isRunning =
        keysDown.current.has("ShiftLeft") ||
        keysDown.current.has("ShiftRight") ||
        keysDown.current.has("KeyX");
      dispatch({ type: "SET_RUNNING", isRunning });

      // Play footstep SFX
      playFootstep(isRunning);
      if (ledgeDir) playLedgeJump();

      const speed = isRunning ? RUN_SPEED_MS : WALK_SPEED_MS;
      const startX = state.player.x * TILE_SIZE;
      const startY = state.player.y * TILE_SIZE;
      const endX = targetX * TILE_SIZE;
      const endY = targetY * TILE_SIZE;
      const startTime = performance.now();

      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / speed, 1);
        const px = startX + (endX - startX) * progress;
        const py = startY + (endY - startY) * progress;
        dispatch({ type: "SET_PIXEL_POSITION", pixelX: px, pixelY: py });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          dispatch({ type: "SET_POSITION", x: targetX, y: targetY });
          dispatch({
            type: "SET_PIXEL_POSITION",
            pixelX: endX,
            pixelY: endY,
          });
          dispatch({ type: "MOVE_COMPLETE" });
          movingRef.current = false;

          const mapNow = currentMapRef.current;
          if (mapNow) {
            checkTileActions(mapNow, targetX, targetY);
          }
        }
      };

      requestAnimationFrame(animate);
    },
    [state, dispatch, canMoveTo, getBehavior, checkTileActions]
  );

  const interact = useCallback(() => {
    if (!state.currentMap || state.phase !== "exploring") return;

    const { dx, dy } = DIRECTION_DELTAS[state.player.direction];
    const facingX = state.player.x + dx;
    const facingY = state.player.y + dy;

    const npc = state.currentMap.npcs.find(
      (n) => n.x === facingX && n.y === facingY
    );
    if (npc) {
      callbacksRef.current.onNpcInteract(npc);
    }
  }, [state]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current.add(e.code);

      if (state.phase === "dialog") {
        if (e.code === "KeyZ" || e.code === "Enter" || e.code === "Space") {
          dispatch({ type: "ADVANCE_DIALOG" });
        }
        return;
      }

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          move("up");
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          move("down");
          break;
        case "ArrowLeft":
        case "KeyA":
          e.preventDefault();
          move("left");
          break;
        case "ArrowRight":
        case "KeyD":
          e.preventDefault();
          move("right");
          break;
        case "KeyZ":
        case "Enter":
          e.preventDefault();
          interact();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [move, interact, dispatch, state.phase]);

  // Walk animation frame cycling
  useEffect(() => {
    if (state.player.isMoving && !animIntervalRef.current) {
      let frame = 0;
      animIntervalRef.current = window.setInterval(() => {
        frame = (frame + 1) % 4;
        dispatch({ type: "SET_ANIM_FRAME", frame });
      }, 100);
    } else if (!state.player.isMoving && animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
      dispatch({ type: "SET_ANIM_FRAME", frame: 0 });
    }

    return () => {
      if (animIntervalRef.current) {
        clearInterval(animIntervalRef.current);
        animIntervalRef.current = null;
      }
    };
  }, [state.player.isMoving, dispatch]);

  // Continuous movement when holding direction keys
  useEffect(() => {
    if (movingRef.current || state.phase !== "exploring" || state.isTransitioning || state.isBattleTransitioning) return;

    const directions: [string[], Direction][] = [
      [["ArrowUp", "KeyW"], "up"],
      [["ArrowDown", "KeyS"], "down"],
      [["ArrowLeft", "KeyA"], "left"],
      [["ArrowRight", "KeyD"], "right"],
    ];

    for (const [keys, dir] of directions) {
      if (keys.some((k) => keysDown.current.has(k))) {
        const timer = setTimeout(() => move(dir), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [state.player.x, state.player.y, state.phase, move]);
}
