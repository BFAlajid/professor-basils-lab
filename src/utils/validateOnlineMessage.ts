import type { OnlineMessage, TeamSlot, BattleTurnAction, PCBoxPokemon, TradeOffer, LinkMode, BallType } from "@/types";

const VALID_MESSAGE_TYPES: OnlineMessage["type"][] = [
  "TEAM_SUBMIT", "ACTION", "FORCE_SWITCH_ACTION", "READY", "PING", "PONG",
  "DISCONNECT", "LINK_MODE", "PC_BOX_SHARE", "TRADE_OFFER", "TRADE_ACCEPT",
  "TRADE_REJECT", "TRADE_CONFIRM", "TRADE_COMPLETE",
  "TRADE_ESCROW", "TRADE_FINALIZE",
];

const VALID_BALL_TYPES: BallType[] = [
  "poke-ball", "great-ball", "ultra-ball", "master-ball",
  "quick-ball", "dusk-ball", "timer-ball", "net-ball",
  "repeat-ball", "luxury-ball", "premier-ball", "dive-ball",
  "nest-ball", "heal-ball",
];

const VALID_LINK_MODES: LinkMode[] = ["idle", "battle", "trade"];

const VALID_ACTION_TYPES: BattleTurnAction["type"][] = [
  "MOVE", "SWITCH", "MEGA_EVOLVE", "TERASTALLIZE", "DYNAMAX",
];

// Max Pokemon national dex ID
const MAX_POKEMON_ID = 1025;

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

function isNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

// Validate a minimal Pokemon shape (id, name, types array)
function isValidPokemonShape(val: unknown): boolean {
  if (!isObject(val)) return false;
  const p = val as Record<string, unknown>;
  if (!isNumber(p.id) || p.id < 1 || p.id > MAX_POKEMON_ID) return false;
  if (!isString(p.name) || p.name.length === 0 || p.name.length > 100) return false;
  if (!Array.isArray(p.types)) return false;
  return true;
}

export function validateOnlineMessage(raw: unknown): OnlineMessage | null {
  if (!isObject(raw)) return null;
  const obj = raw as Record<string, unknown>;

  if (!isString(obj.type)) return null;
  if (!(VALID_MESSAGE_TYPES as string[]).includes(obj.type)) return null;
  if (!isNumber(obj.timestamp)) return null;

  return {
    type: obj.type as OnlineMessage["type"],
    payload: obj.payload,
    timestamp: obj.timestamp,
  };
}

export function validateTeamSlots(payload: unknown): TeamSlot[] | null {
  if (!Array.isArray(payload)) return null;
  if (payload.length < 1 || payload.length > 6) return null;

  for (const slot of payload) {
    if (!isObject(slot)) return null;
    const s = slot as Record<string, unknown>;
    if (!isValidPokemonShape(s.pokemon)) return null;
    if (!isNumber(s.position)) return null;
  }

  return payload as TeamSlot[];
}

export function validateBattleTurnAction(payload: unknown): BattleTurnAction | null {
  if (!isObject(payload)) return null;
  const a = payload as Record<string, unknown>;

  if (!isString(a.type)) return null;
  if (!(VALID_ACTION_TYPES as string[]).includes(a.type)) return null;

  const actionType = a.type as BattleTurnAction["type"];

  switch (actionType) {
    case "SWITCH":
      if (!isNumber(a.pokemonIndex) || a.pokemonIndex < 0 || a.pokemonIndex > 5) return null;
      return { type: "SWITCH", pokemonIndex: a.pokemonIndex };
    case "MOVE":
    case "MEGA_EVOLVE":
    case "TERASTALLIZE":
    case "DYNAMAX":
      if (!isNumber(a.moveIndex) || a.moveIndex < 0 || a.moveIndex > 3) return null;
      return { type: actionType, moveIndex: a.moveIndex } as BattleTurnAction;
    default:
      return null;
  }
}

function isValidPCBoxPokemon(val: unknown): boolean {
  if (!isObject(val)) return false;
  const p = val as Record<string, unknown>;

  if (!isValidPokemonShape(p.pokemon)) return false;
  if (p.nickname !== undefined && !isString(p.nickname)) return false;
  if (!isString(p.caughtWith) || !(VALID_BALL_TYPES as string[]).includes(p.caughtWith)) return false;
  if (!isString(p.caughtInArea)) return false;
  if (!isString(p.caughtDate)) return false;
  if (!isNumber(p.level) || p.level < 1 || p.level > 100) return false;
  if (!isObject(p.nature) || !isString((p.nature as Record<string, unknown>).name)) return false;
  if (!isObject(p.ivs)) return false;
  if (!isString(p.ability)) return false;

  return true;
}

export function validatePCBoxPokemon(payload: unknown, maxItems: number = 30): PCBoxPokemon[] | null {
  if (!Array.isArray(payload)) return null;
  if (payload.length > maxItems) return null;

  for (const item of payload) {
    if (!isValidPCBoxPokemon(item)) return null;
  }

  return payload as PCBoxPokemon[];
}

// Validate a single PCBoxPokemon (used for TRADE_COMPLETE)
export function validateSinglePCBoxPokemon(payload: unknown): PCBoxPokemon | null {
  if (!isValidPCBoxPokemon(payload)) return null;
  return payload as PCBoxPokemon;
}

export function validateTradeOffer(payload: unknown): TradeOffer | null {
  if (!isObject(payload)) return null;
  const o = payload as Record<string, unknown>;

  if (typeof o.fromHost !== "boolean") return null;
  if (!isNumber(o.pokemonIndex) || o.pokemonIndex < 0 || o.pokemonIndex > 29) return null;
  if (!isValidPCBoxPokemon(o.pokemon)) return null;

  return payload as unknown as TradeOffer;
}

export function validateLinkMode(payload: unknown): LinkMode | null {
  if (!isString(payload)) return null;
  if (!(VALID_LINK_MODES as string[]).includes(payload)) return null;
  return payload as LinkMode;
}
