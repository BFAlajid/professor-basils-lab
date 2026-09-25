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

// Bound every free-form string field a peer can send (names, nicknames,
// areas, abilities, items, moves) — a peer previously could send unbounded
// strings/arrays here (e.g. a 30-item PC_BOX_SHARE with multi-MB strings),
// bloating the receiver's localStorage or crashing the render.
const MAX_STRING_LEN = 64;
const MAX_URL_LEN = 300;
// Real Pokemon have at most ~3 types/abilities and exactly 6 stats — this
// bound is generous headroom while still capping the DoS surface.
const MAX_NESTED_ITEMS = 10;

const STAT_KEYS = ["hp", "attack", "defense", "spAtk", "spDef", "speed"] as const;

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === "string";
}

function isNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

function cleanBoundedString(val: unknown, maxLen: number = MAX_STRING_LEN): string | null {
  if (!isString(val)) return null;
  if (val.length === 0 || val.length > maxLen) return null;
  return val;
}

function cleanIvs(val: unknown): Record<string, number> {
  const source: Record<string, unknown> = isObject(val) ? val : {};
  const result: Record<string, number> = {};
  for (const k of STAT_KEYS) {
    result[k] = isNumber(source[k]) ? Math.min(31, Math.max(0, Math.floor(source[k] as number))) : 31;
  }
  return result;
}

// Returns null if the total EV spend exceeds the in-game cap — callers omit
// the field entirely rather than reject the whole payload (matches prior
// leniency for TeamSlot.evs).
function cleanEvs(val: unknown): Record<string, number> | null {
  if (!isObject(val)) return null;
  const result: Record<string, number> = {};
  let total = 0;
  for (const k of STAT_KEYS) {
    const v = isNumber(val[k]) ? Math.min(252, Math.max(0, Math.floor(val[k] as number))) : 0;
    result[k] = v;
    total += v;
  }
  return total <= 510 ? result : null;
}

function cleanPokemonType(val: unknown): { slot: number; type: { name: string } } | null {
  if (!isObject(val)) return null;
  const t = val;
  if (!isObject(t.type)) return null;
  const typeObj = t.type as Record<string, unknown>;
  const name = cleanBoundedString(typeObj.name);
  if (!name) return null;
  return { slot: isNumber(t.slot) ? t.slot : 0, type: { name } };
}

function cleanPokemonStat(val: unknown): { base_stat: number; stat: { name: string } } | null {
  if (!isObject(val)) return null;
  const s = val;
  if (!isObject(s.stat)) return null;
  const statObj = s.stat as Record<string, unknown>;
  const name = cleanBoundedString(statObj.name);
  if (!name || !isNumber(s.base_stat)) return null;
  return { base_stat: s.base_stat, stat: { name } };
}

function cleanPokemonAbility(
  val: unknown
): { ability: { name: string; url: string }; is_hidden: boolean; slot: number } | null {
  if (!isObject(val)) return null;
  const a = val;
  if (!isObject(a.ability)) return null;
  const abilityObj = a.ability as Record<string, unknown>;
  const name = cleanBoundedString(abilityObj.name);
  if (!name) return null;
  const url = isString(abilityObj.url) && abilityObj.url.length <= MAX_URL_LEN ? abilityObj.url : "";
  return { ability: { name, url }, is_hidden: a.is_hidden === true, slot: isNumber(a.slot) ? a.slot : 0 };
}

function cleanSpriteUrl(val: unknown): string | null {
  if (!isString(val)) return null;
  if (val.length === 0 || val.length > MAX_URL_LEN) return null;
  return val;
}

interface CleanPokemon {
  id: number;
  name: string;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string; url: string }; is_hidden: boolean; slot: number }[];
  sprites: { front_default: string | null };
}

// Validate + rebuild a Pokemon-shaped payload from scratch. Never returns a
// reference into the raw input — every nested array/string is bounded and
// copied so a peer can't smuggle oversized or malformed data through.
function cleanPokemon(val: unknown): CleanPokemon | null {
  if (!isObject(val)) return null;
  const p = val;
  if (!isNumber(p.id) || p.id < 1 || p.id > MAX_POKEMON_ID) return null;
  const id: number = p.id;
  const name = cleanBoundedString(p.name);
  if (!name) return null;

  const types = Array.isArray(p.types)
    ? p.types.slice(0, MAX_NESTED_ITEMS).map(cleanPokemonType).filter((t): t is NonNullable<typeof t> => t !== null)
    : [];
  const stats = Array.isArray(p.stats)
    ? p.stats.slice(0, MAX_NESTED_ITEMS).map(cleanPokemonStat).filter((s): s is NonNullable<typeof s> => s !== null)
    : [];
  const abilities = Array.isArray(p.abilities)
    ? p.abilities.slice(0, MAX_NESTED_ITEMS).map(cleanPokemonAbility).filter((a): a is NonNullable<typeof a> => a !== null)
    : [];

  const spritesRaw: Record<string, unknown> = isObject(p.sprites) ? p.sprites : {};
  const frontDefault = cleanSpriteUrl(spritesRaw.front_default);

  return { id, name, types, stats, abilities, sprites: { front_default: frontDefault } };
}

export function validateOnlineMessage(raw: unknown): OnlineMessage | null {
  if (!isObject(raw)) return null;
  const obj = raw;

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

  const validated: TeamSlot[] = [];
  for (let i = 0; i < payload.length; i++) {
    const slot = payload[i];
    if (!isObject(slot)) return null;
    const s = slot;

    const pokemon = cleanPokemon(s.pokemon);
    if (!pokemon) return null;

    // Build a clean slot with only allowed, bounded fields
    const cleanSlot: Record<string, unknown> = {
      pokemon,
      position: isNumber(s.position) ? s.position : i,
    };

    if (isObject(s.nature)) {
      const n = s.nature;
      const natureName = cleanBoundedString(n.name);
      if (natureName) {
        cleanSlot.nature = {
          name: natureName,
          increased: isString(n.increased) ? cleanBoundedString(n.increased, 20) : null,
          decreased: isString(n.decreased) ? cleanBoundedString(n.decreased, 20) : null,
        };
      }
    }

    if (isObject(s.evs)) {
      const evs = cleanEvs(s.evs);
      if (evs) cleanSlot.evs = evs;
    }

    if (isObject(s.ivs)) {
      cleanSlot.ivs = cleanIvs(s.ivs);
    }

    if (isString(s.ability)) {
      const ability = cleanBoundedString(s.ability);
      if (ability) cleanSlot.ability = ability;
    }

    if (isString(s.heldItem)) {
      const heldItem = cleanBoundedString(s.heldItem);
      if (heldItem) cleanSlot.heldItem = heldItem;
    }

    if (Array.isArray(s.selectedMoves)) {
      cleanSlot.selectedMoves = (s.selectedMoves as unknown[])
        .slice(0, MAX_NESTED_ITEMS)
        .filter(isString)
        .map((m) => cleanBoundedString(m))
        .filter((m): m is string => m !== null)
        .slice(0, 4);
    }

    validated.push(cleanSlot as unknown as TeamSlot);
  }

  return validated;
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

// Validate + rebuild a PCBoxPokemon from scratch (never casts the raw
// payload). Optional gameplay fields (isShiny/gender/friendship/evs/
// isHyperTrained) are preserved when present and well-formed so trades
// don't silently lose shiny/EV/hyper-training info.
function cleanPCBoxPokemon(val: unknown): Record<string, unknown> | null {
  if (!isObject(val)) return null;
  const p = val;

  const pokemon = cleanPokemon(p.pokemon);
  if (!pokemon) return null;

  let nickname: string | undefined;
  if (p.nickname !== undefined) {
    const clean = cleanBoundedString(p.nickname);
    if (!clean) return null;
    nickname = clean;
  }

  if (!isString(p.caughtWith) || !(VALID_BALL_TYPES as string[]).includes(p.caughtWith)) return null;
  const caughtWith: BallType = p.caughtWith as BallType;

  const caughtInArea = cleanBoundedString(p.caughtInArea);
  if (!caughtInArea) return null;

  const caughtDate = cleanBoundedString(p.caughtDate, 40);
  if (!caughtDate) return null;

  if (!isNumber(p.level) || p.level < 1 || p.level > 100) return null;
  const level: number = p.level;

  if (!isObject(p.nature)) return null;
  const natureRaw = p.nature as Record<string, unknown>;
  const natureName = cleanBoundedString(natureRaw.name);
  if (!natureName) return null;

  if (!isObject(p.ivs)) return null;
  const ivs = cleanIvs(p.ivs);

  const ability = cleanBoundedString(p.ability);
  if (!ability) return null;

  const cleaned: Record<string, unknown> = {
    pokemon,
    caughtWith,
    caughtInArea,
    caughtDate,
    level,
    nature: {
      name: natureName,
      increased: isString(natureRaw.increased) ? cleanBoundedString(natureRaw.increased, 20) : null,
      decreased: isString(natureRaw.decreased) ? cleanBoundedString(natureRaw.decreased, 20) : null,
    },
    ivs,
    ability,
  };
  if (nickname !== undefined) cleaned.nickname = nickname;

  if (typeof p.isShiny === "boolean") cleaned.isShiny = p.isShiny;

  if (p.gender === "male" || p.gender === "female" || p.gender === "genderless") {
    cleaned.gender = p.gender;
  }

  if (isNumber(p.friendship)) {
    cleaned.friendship = Math.min(255, Math.max(0, Math.floor(p.friendship)));
  }

  if (isObject(p.evs)) {
    const evs = cleanEvs(p.evs);
    if (evs) cleaned.evs = evs;
  }

  if (isObject(p.isHyperTrained)) {
    const ht = p.isHyperTrained as Record<string, unknown>;
    const cleanHt: Record<string, boolean> = {};
    let any = false;
    for (const k of STAT_KEYS) {
      if (typeof ht[k] === "boolean") {
        cleanHt[k] = ht[k] as boolean;
        any = true;
      }
    }
    if (any) cleaned.isHyperTrained = cleanHt;
  }

  return cleaned;
}

export function validatePCBoxPokemon(payload: unknown, maxItems: number = 30): PCBoxPokemon[] | null {
  if (!Array.isArray(payload)) return null;
  if (payload.length > maxItems) return null;

  const cleaned: PCBoxPokemon[] = [];
  for (const item of payload) {
    const clean = cleanPCBoxPokemon(item);
    if (!clean) return null;
    cleaned.push(clean as unknown as PCBoxPokemon);
  }

  return cleaned;
}

// Validate a single PCBoxPokemon (used for TRADE_COMPLETE)
export function validateSinglePCBoxPokemon(payload: unknown): PCBoxPokemon | null {
  const clean = cleanPCBoxPokemon(payload);
  return clean ? (clean as unknown as PCBoxPokemon) : null;
}

export function validateTradeOffer(payload: unknown): TradeOffer | null {
  if (!isObject(payload)) return null;
  const o = payload;

  if (typeof o.fromHost !== "boolean") return null;
  if (!isNumber(o.pokemonIndex) || o.pokemonIndex < 0 || o.pokemonIndex > 29) return null;

  const pokemon = cleanPCBoxPokemon(o.pokemon);
  if (!pokemon) return null;

  return {
    fromHost: o.fromHost,
    pokemonIndex: o.pokemonIndex,
    pokemon: pokemon as unknown as PCBoxPokemon,
  };
}

export function validateLinkMode(payload: unknown): LinkMode | null {
  if (!isString(payload)) return null;
  if (!(VALID_LINK_MODES as string[]).includes(payload)) return null;
  return payload as LinkMode;
}

// Exclusive upper bound for the battle-start handshake's rngSeed field.
const RNG_SEED_MAX = 2 ** 32;

/**
 * Validate the optional rngSeed field carried on the battle-start handshake
 * message (used to seed a shared deterministic RNG stream so both peers'
 * battle engines stay in sync). Missing seed is valid — local/unseeded
 * battles fall back to Math.random. A present-but-malformed value is
 * rejected (null) so callers fall back to unseeded behavior rather than
 * trust it.
 */
export function validateRngSeed(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!isNumber(value)) return null;
  if (value < 0 || value >= RNG_SEED_MAX) return null;
  return value;
}
