import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import type {
  ExploreState,
  ExploreAction,
  FullMapData,
  Warp,
  NpcData,
  WildSlot,
} from "@/types/explore";
import {
  TILE_SIZE,
  DEFAULT_START,
  GBA_WEATHER_MAP,
  EXPLORE_SAVE_KEY,
} from "@/types/explore";
import { ensureWasmReady } from "@/utils/gen3RomWasm";
import { parseMap } from "@/utils/gen3RomWasm";
import { getRomBuffer, detectGame } from "@/utils/romManager";
import { decodeTileset, clearTileCache, type CachedTileset } from "@/utils/tileCache";
import { decodeSprite, clearSpriteCache } from "@/utils/spriteCache";
import { playEncounterFlash } from "@/utils/exploreSfx";
import { getNpcDialog } from "@/data/explore/npcRoles";
import { useExploreCamera } from "./useExploreCamera";
import { useExploreMovement } from "./useExploreMovement";

const initialState: ExploreState = {
  player: {
    mapGroup: DEFAULT_START.mapGroup,
    mapNum: DEFAULT_START.mapNum,
    x: DEFAULT_START.x,
    y: DEFAULT_START.y,
    pixelX: DEFAULT_START.x * TILE_SIZE,
    pixelY: DEFAULT_START.y * TILE_SIZE,
    direction: DEFAULT_START.direction,
    isMoving: false,
    isRunning: false,
    animFrame: 0,
  },
  currentMap: null,
  phase: "loading",
  dialog: null,
  encounterCooldown: 0,
  isTransitioning: false,
  isBattleTransitioning: false,
  romLoaded: false,
  gameCode: null,
  pendingEncounter: null,
  weather: "none",
};

function exploreReducer(
  state: ExploreState,
  action: ExploreAction
): ExploreState {
  switch (action.type) {
    case "WASM_READY":
      return { ...state, phase: "rom_prompt" };

    case "WASM_FAILED":
      return { ...state, phase: "rom_prompt" };

    case "SET_ROM_LOADED":
      return {
        ...state,
        romLoaded: true,
        gameCode: action.gameCode,
        phase: "exploring",
      };

    case "SET_MAP":
      return { ...state, currentMap: action.data };

    case "MOVE_START":
      return {
        ...state,
        player: {
          ...state.player,
          direction: action.direction,
          isMoving: true,
        },
      };

    case "MOVE_COMPLETE":
      return {
        ...state,
        player: { ...state.player, isMoving: false },
        encounterCooldown: state.encounterCooldown + 1,
      };

    case "SET_POSITION":
      return {
        ...state,
        player: {
          ...state.player,
          x: action.x,
          y: action.y,
          mapGroup: state.currentMap?.map.group ?? state.player.mapGroup,
          mapNum: state.currentMap?.map.num ?? state.player.mapNum,
        },
      };

    case "SET_PIXEL_POSITION":
      return {
        ...state,
        player: {
          ...state.player,
          pixelX: action.pixelX,
          pixelY: action.pixelY,
        },
      };

    case "SET_DIRECTION":
      return {
        ...state,
        player: { ...state.player, direction: action.direction },
      };

    case "SET_RUNNING":
      return {
        ...state,
        player: { ...state.player, isRunning: action.isRunning },
      };

    case "SET_ANIM_FRAME":
      return {
        ...state,
        player: { ...state.player, animFrame: action.frame },
      };

    case "START_DIALOG":
      return {
        ...state,
        phase: "dialog",
        dialog: {
          lines: action.lines,
          currentLine: 0,
          charIndex: 0,
          isComplete: false,
          onClose: action.onClose,
        },
      };

    case "COMPLETE_DIALOG_LINE":
      if (!state.dialog || state.dialog.isComplete) return state;
      return {
        ...state,
        dialog: { ...state.dialog, isComplete: true },
      };

    case "ADVANCE_DIALOG":
      if (!state.dialog) return state;
      if (!state.dialog.isComplete) {
        // User pressed advance while typing — skip to full line
        return {
          ...state,
          dialog: { ...state.dialog, isComplete: true },
        };
      }
      if (state.dialog.currentLine < state.dialog.lines.length - 1) {
        return {
          ...state,
          dialog: {
            ...state.dialog,
            currentLine: state.dialog.currentLine + 1,
            charIndex: 0,
            isComplete: false,
          },
        };
      }
      return { ...state, phase: "exploring", dialog: null };

    case "CLOSE_DIALOG":
      return { ...state, phase: "exploring", dialog: null };

    case "START_TRANSITION":
      return { ...state, isTransitioning: true };

    case "END_TRANSITION":
      return { ...state, isTransitioning: false };

    case "START_BATTLE_TRANSITION":
      return {
        ...state,
        isBattleTransitioning: true,
        pendingEncounter: { speciesId: action.speciesId, level: action.level },
      };

    case "START_BATTLE":
      return { ...state, phase: "battle", isBattleTransitioning: false };

    case "END_BATTLE":
      return {
        ...state,
        phase: "exploring",
        pendingEncounter: null,
        isBattleTransitioning: false,
      };

    case "RESET_ENCOUNTER_COOLDOWN":
      return { ...state, encounterCooldown: 0 };

    case "SET_WEATHER":
      return { ...state, weather: action.weather };

    default:
      return state;
  }
}

// Pick a random wild Pokemon from encounter slots using GBA-style weighted selection
function pickWildPokemon(slots: WildSlot[]): { speciesId: number; level: number } | null {
  if (slots.length === 0) return null;

  // GBA uses a cumulative rate table
  const totalRate = slots.reduce((sum, s) => sum + s.rate, 0);
  if (totalRate <= 0) {
    // Equal weight fallback
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const level = slot.minLevel + Math.floor(Math.random() * (slot.maxLevel - slot.minLevel + 1));
    return { speciesId: slot.speciesId, level };
  }

  let roll = Math.random() * totalRate;
  for (const slot of slots) {
    roll -= slot.rate;
    if (roll <= 0) {
      const level = slot.minLevel + Math.floor(Math.random() * (slot.maxLevel - slot.minLevel + 1));
      return { speciesId: slot.speciesId, level };
    }
  }

  // Fallback to last slot
  const last = slots[slots.length - 1];
  const level = last.minLevel + Math.floor(Math.random() * (last.maxLevel - last.minLevel + 1));
  return { speciesId: last.speciesId, level };
}

// Save explore position to localStorage
function savePosition(player: ExploreState["player"]) {
  try {
    localStorage.setItem(
      EXPLORE_SAVE_KEY,
      JSON.stringify({
        mapGroup: player.mapGroup,
        mapNum: player.mapNum,
        x: player.x,
        y: player.y,
        direction: player.direction,
      })
    );
  } catch { /* quota exceeded or private browsing */ }
}

// Load saved position from localStorage
function loadSavedPosition(): {
  mapGroup: number;
  mapNum: number;
  x: number;
  y: number;
  direction: string;
} | null {
  try {
    const raw = localStorage.getItem(EXPLORE_SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      typeof data.mapGroup === "number" &&
      typeof data.mapNum === "number" &&
      typeof data.x === "number" &&
      typeof data.y === "number"
    ) {
      return data;
    }
  } catch { /* corrupted or missing */ }
  return null;
}

export interface ConnectedMap {
  direction: number; // 1=down, 2=up, 3=left, 4=right
  offset: number;
  map: FullMapData;
  tileset: CachedTileset | null;
}

export function useExplore() {
  const [state, dispatch] = useReducer(exploreReducer, initialState);
  const romBufferRef = useRef<Uint8Array | null>(null);
  const [tileset, setTileset] = useState<CachedTileset | null>(null);
  const [connectedMaps, setConnectedMaps] = useState<ConnectedMap[]>([]);

  const camera = useExploreCamera(
    state.player,
    state.currentMap?.map ?? null
  );

  // Load map by (group, num)
  const loadMap = useCallback(
    async (group: number, num: number, startX?: number, startY?: number) => {
      const buffer = romBufferRef.current;
      if (!buffer) return;

      const mapData = parseMap(buffer, group, num);
      if (!mapData) {
        console.warn(`[explore] Failed to parse map (${group}, ${num})`);
        return;
      }

      // Decode tileset for this map
      const ts = decodeTileset(
        buffer,
        mapData.map.primaryTilesetPtr,
        mapData.map.secondaryTilesetPtr
      );
      setTileset(ts);

      // Preload player + NPC sprites
      decodeSprite(buffer, 0);
      for (const npc of mapData.npcs) {
        decodeSprite(buffer, npc.graphicsId);
      }

      dispatch({ type: "SET_MAP", data: mapData });

      // Set weather from map data
      const weather = GBA_WEATHER_MAP[mapData.map.weather] ?? "none";
      dispatch({ type: "SET_WEATHER", weather });

      // Preload connected maps for seamless edge rendering
      const connected: ConnectedMap[] = [];
      for (const conn of mapData.map.connections) {
        const connMap = parseMap(buffer, conn.destGroup, conn.destNum);
        if (connMap) {
          const connTileset = decodeTileset(
            buffer,
            connMap.map.primaryTilesetPtr,
            connMap.map.secondaryTilesetPtr
          );
          connected.push({
            direction: conn.direction,
            offset: conn.offset,
            map: connMap,
            tileset: connTileset,
          });
        }
      }
      setConnectedMaps(connected);

      if (startX !== undefined && startY !== undefined) {
        dispatch({ type: "SET_POSITION", x: startX, y: startY });
        dispatch({
          type: "SET_PIXEL_POSITION",
          pixelX: startX * TILE_SIZE,
          pixelY: startY * TILE_SIZE,
        });
      }
    },
    []
  );

  // Handle warp transitions
  const onWarp = useCallback(
    async (warp: Warp) => {
      dispatch({ type: "START_TRANSITION" });
      await new Promise((r) => setTimeout(r, 200));

      // Resolve destination: use warpId to look up the target map's warp list
      // The dest warp's x/y gives the spawn position
      const buffer = romBufferRef.current;
      let destX = warp.x;
      let destY = warp.y;

      if (buffer) {
        const destMap = parseMap(buffer, warp.destMapGroup, warp.destMapNum);
        if (destMap && warp.warpId < destMap.warps.length) {
          const destWarp = destMap.warps[warp.warpId];
          destX = destWarp.x;
          destY = destWarp.y;
        }
      }

      await loadMap(warp.destMapGroup, warp.destMapNum, destX, destY);
      dispatch({ type: "RESET_ENCOUNTER_COOLDOWN" });

      await new Promise((r) => setTimeout(r, 200));
      dispatch({ type: "END_TRANSITION" });
    },
    [loadMap]
  );

  // Handle grass step encounter check
  const onGrassStep = useCallback(
    (encounterRate: number) => {
      if (state.isTransitioning || state.isBattleTransitioning) return;
      if (state.encounterCooldown < 3) return;

      const roll = Math.random();
      const threshold = encounterRate / 2870;

      if (roll < threshold) {
        // Pick a random Pokemon from the encounter table
        const slots = state.currentMap?.encounters?.land?.slots;
        if (!slots || slots.length === 0) return;

        const pick = pickWildPokemon(slots);
        if (!pick) return;

        // Start battle transition (flash + SFX), then battle
        playEncounterFlash();
        dispatch({
          type: "START_BATTLE_TRANSITION",
          speciesId: pick.speciesId,
          level: pick.level,
        });
        dispatch({ type: "RESET_ENCOUNTER_COOLDOWN" });

        // After transition completes, enter battle phase
        setTimeout(() => {
          dispatch({ type: "START_BATTLE" });
        }, 600);
      }
    },
    [state.encounterCooldown, state.currentMap, state.isTransitioning, state.isBattleTransitioning]
  );

  // Handle NPC interaction
  const onNpcInteract = useCallback(
    (npc: NpcData) => {
      const lines = getNpcDialog(npc);
      dispatch({ type: "START_DIALOG", lines });
    },
    []
  );

  // Set up movement
  useExploreMovement(state, dispatch, tileset, {
    onWarp,
    onGrassStep,
    onNpcInteract,
  });

  // Save position periodically on move
  useEffect(() => {
    if (state.phase === "exploring" && state.currentMap) {
      savePosition(state.player);
    }
  }, [state.player.x, state.player.y, state.player.mapGroup, state.player.mapNum, state.phase, state.currentMap, state.player]);

  // Initialize: load WASM and check for ROM
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const wasmReady = await ensureWasmReady();
      if (cancelled) return;
      if (!wasmReady) {
        dispatch({ type: "WASM_FAILED" });
        return;
      }

      const buffer = await getRomBuffer();
      if (cancelled) return;
      if (!buffer) {
        dispatch({ type: "WASM_READY" });
        return;
      }

      const info = await detectGame(buffer);
      if (!info?.isSupported || cancelled) return;

      clearTileCache();
      clearSpriteCache();
      romBufferRef.current = buffer;
      dispatch({ type: "SET_ROM_LOADED", gameCode: info.gameCode });

      // Check for saved position
      const saved = loadSavedPosition();
      if (saved) {
        await loadMap(saved.mapGroup, saved.mapNum, saved.x, saved.y);
      } else {
        await loadMap(
          DEFAULT_START.mapGroup,
          DEFAULT_START.mapNum,
          DEFAULT_START.x,
          DEFAULT_START.y
        );
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadMap]);

  // Load ROM from file
  const loadRomFromFile = useCallback(
    async (buffer: Uint8Array, name: string) => {
      const { storeAndCacheRom } = await import("@/utils/romManager");
      await storeAndCacheRom(name, buffer.buffer as ArrayBuffer);

      const wasmOk = await ensureWasmReady();
      if (!wasmOk) return false;

      const info = await detectGame(buffer);
      if (!info?.isSupported) return false;

      clearTileCache();
      clearSpriteCache();
      romBufferRef.current = buffer;
      dispatch({ type: "SET_ROM_LOADED", gameCode: info.gameCode });

      await loadMap(
        DEFAULT_START.mapGroup,
        DEFAULT_START.mapNum,
        DEFAULT_START.x,
        DEFAULT_START.y
      );
      return true;
    },
    [loadMap]
  );

  // End battle and return to exploring
  const endBattle = useCallback(() => {
    dispatch({ type: "END_BATTLE" });
  }, []);

  return {
    state,
    camera,
    tileset,
    connectedMaps,
    loadRomFromFile,
    endBattle,
    dispatch,
  };
}
