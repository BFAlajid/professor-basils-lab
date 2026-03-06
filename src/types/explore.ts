// Types for the GBA ROM exploration system

export interface PlayerState {
  mapGroup: number;
  mapNum: number;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  direction: Direction;
  isMoving: boolean;
  isRunning: boolean;
  animFrame: number;
}

export type Direction = "up" | "down" | "left" | "right";

export interface PendingEncounter {
  speciesId: number;
  level: number;
}

export interface ExploreState {
  player: PlayerState;
  currentMap: FullMapData | null;
  phase: ExplorePhase;
  dialog: DialogState | null;
  encounterCooldown: number;
  isTransitioning: boolean;
  isBattleTransitioning: boolean;
  romLoaded: boolean;
  gameCode: string | null;
  pendingEncounter: PendingEncounter | null;
  weather: WeatherType;
}

export type ExplorePhase = "loading" | "rom_prompt" | "exploring" | "dialog" | "battle" | "battle_transition" | "menu";

export type WeatherType = "none" | "rain" | "snow" | "sandstorm" | "fog";

export interface DialogState {
  lines: string[];
  currentLine: number;
  charIndex: number;
  isComplete: boolean;
  onClose?: () => void;
}

// --- ROM data types (match Rust serde output) ---

export interface RomInfo {
  gameCode: string;
  title: string;
  version: string;
  isSupported: boolean;
}

export interface FullMapData {
  map: ParsedMap;
  warps: Warp[];
  npcs: NpcData[];
  encounters: WildEncounters | null;
}

export interface ParsedMap {
  group: number;
  num: number;
  width: number;
  height: number;
  grid: MapCell[];
  connections: Connection[];
  primaryTilesetPtr: number;
  secondaryTilesetPtr: number;
  musicId: number;
  weather: number;
  isIndoor: boolean;
  isCave: boolean;
  runningAllowed: boolean;
  showMapName: boolean;
}

export interface MapCell {
  metatileId: number;
  collision: number;
  elevation: number;
}

export interface Connection {
  direction: number;
  offset: number;
  destGroup: number;
  destNum: number;
}

export interface Warp {
  x: number;
  y: number;
  elevation: number;
  warpId: number;
  destMapNum: number;
  destMapGroup: number;
}

export interface NpcData {
  localId: number;
  graphicsId: number;
  x: number;
  y: number;
  elevation: number;
  movementType: number;
  movementRangeX: number;
  movementRangeY: number;
  trainerType: number;
  sightRange: number;
  flagId: number;
}

export interface WildEncounters {
  land: EncounterInfo | null;
  water: EncounterInfo | null;
  rockSmash: EncounterInfo | null;
  fishing: EncounterInfo | null;
}

export interface EncounterInfo {
  encounterRate: number;
  slots: WildSlot[];
}

export interface WildSlot {
  minLevel: number;
  maxLevel: number;
  speciesId: number;
  rate: number;
}

export interface DecodedMetatile {
  basePixels: number[];
  overlayPixels: number[];
  behavior: number;
  passable: boolean;
  isGrass: boolean;
  isWater: boolean;
  isLedge: boolean;
  ledgeDirection: string | null;
}

export interface DecodedSprite {
  graphicsId: number;
  width: number;
  height: number;
  frames: SpriteFrame[];
}

export interface SpriteFrame {
  direction: string;
  frameIndex: number;
  pixels: number[];
}

export interface MapTableEntry {
  group: number;
  num: number;
  width: number;
  height: number;
  isIndoor: boolean;
}

// --- Explore action types ---

export type ExploreAction =
  | { type: "WASM_READY" }
  | { type: "WASM_FAILED" }
  | { type: "SET_ROM_LOADED"; gameCode: string }
  | { type: "SET_MAP"; data: FullMapData }
  | { type: "MOVE_START"; direction: Direction }
  | { type: "MOVE_COMPLETE" }
  | { type: "SET_POSITION"; x: number; y: number }
  | { type: "SET_PIXEL_POSITION"; pixelX: number; pixelY: number }
  | { type: "SET_DIRECTION"; direction: Direction }
  | { type: "SET_RUNNING"; isRunning: boolean }
  | { type: "SET_ANIM_FRAME"; frame: number }
  | { type: "START_DIALOG"; lines: string[]; onClose?: () => void }
  | { type: "ADVANCE_DIALOG" }
  | { type: "COMPLETE_DIALOG_LINE" }
  | { type: "CLOSE_DIALOG" }
  | { type: "START_TRANSITION" }
  | { type: "END_TRANSITION" }
  | { type: "START_BATTLE_TRANSITION"; speciesId: number; level: number }
  | { type: "START_BATTLE" }
  | { type: "END_BATTLE" }
  | { type: "RESET_ENCOUNTER_COOLDOWN" }
  | { type: "SET_WEATHER"; weather: WeatherType };

// --- Constants ---

export const TILE_SIZE = 16;
export const SCALE = 3;
export const VIEWPORT_TILES_X = 15;
export const VIEWPORT_TILES_Y = 10;
export const VIEWPORT_WIDTH = VIEWPORT_TILES_X * TILE_SIZE * SCALE;
export const VIEWPORT_HEIGHT = VIEWPORT_TILES_Y * TILE_SIZE * SCALE;

export const WALK_SPEED_MS = 200;
export const RUN_SPEED_MS = 125;

// Metatile behavior constants (match Rust)
export const MB_NORMAL = 0x00;
export const MB_TALL_GRASS = 0x02;
export const MB_LONG_GRASS = 0x03;
export const MB_SURF = 0x04;
export const MB_LEDGE_SOUTH = 0x38;
export const MB_LEDGE_NORTH = 0x39;
export const MB_LEDGE_WEST = 0x3A;
export const MB_LEDGE_EAST = 0x3B;
export const MB_WARP_DOOR = 0x62;
export const MB_WARP_ARROW = 0x63;
export const MB_STAIRCASE = 0x64;

// GBA weather byte → WeatherType mapping
export const GBA_WEATHER_MAP: Record<number, WeatherType> = {
  0: "none",
  1: "none", // sunny / clouds
  2: "rain",
  3: "snow",
  4: "rain", // thunderstorm
  5: "fog",
  6: "none", // ash
  7: "sandstorm",
  8: "fog", // mist
  9: "none", // underwater
};

// Starting position: Pallet Town player house (FireRed)
export const DEFAULT_START = {
  mapGroup: 4,
  mapNum: 0,
  x: 5,
  y: 6,
  direction: "down" as Direction,
};

// localStorage key for saved explore position
export const EXPLORE_SAVE_KEY = "pokemon-explore-position";
