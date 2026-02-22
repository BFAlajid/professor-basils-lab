import { TeamSlot, EVSpread, IVSpread, Nature, TypeName } from "@/types";
import { NATURES } from "@/data/natures";
import { fetchPokemon } from "@/hooks/usePokemon";
import { DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { capitalize } from "./format";

// ── Stat key ↔ Showdown abbreviation mapping ──────────────────────────

type SpreadKey = keyof EVSpread; // same keys for IVSpread

const STAT_TO_SHOWDOWN: Record<SpreadKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  spAtk: "SpA",
  spDef: "SpD",
  speed: "Spe",
};

const SHOWDOWN_TO_STAT: Record<string, SpreadKey> = {
  HP: "hp",
  Atk: "attack",
  Def: "defense",
  SpA: "spAtk",
  SpD: "spDef",
  Spe: "speed",
};

const STAT_KEYS: SpreadKey[] = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert a Pokemon API name (e.g. "iron-bundle") into a Showdown-style
 * display name (e.g. "Iron Bundle").
 */
function toDisplayName(apiName: string): string {
  return apiName.split("-").map(capitalize).join(" ");
}

/**
 * Convert a Showdown-style display name back to a PokeAPI-compatible
 * slug (e.g. "Iron Bundle" → "iron-bundle").
 */
function toApiName(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, "-");
}

// ── Export ──────────────────────────────────────────────────────────────

/**
 * Convert a team into the Showdown paste/import format.
 *
 * Each Pokemon block is separated by a blank line. Example:
 * ```
 * Garchomp @ Life Orb
 * Ability: Rough Skin
 * Tera Type: Steel
 * EVs: 252 Atk / 252 Spe / 4 HP
 * Jolly Nature
 * - Earthquake
 * - Outrage
 * - Swords Dance
 * - Stone Edge
 * ```
 */
export function exportToShowdown(team: TeamSlot[]): string {
  return team.map(exportSlot).join("\n\n");
}

function exportSlot(slot: TeamSlot): string {
  const lines: string[] = [];

  // ── Line 1: Species / Nickname @ Item ───────────────────────────────
  const speciesDisplay = toDisplayName(slot.pokemon.name);
  let line1 = speciesDisplay;

  if (slot.heldItem) {
    line1 += ` @ ${toDisplayName(slot.heldItem)}`;
  }

  lines.push(line1);

  // ── Ability ──────────────────────────────────────────────────────────
  if (slot.ability) {
    lines.push(`Ability: ${toDisplayName(slot.ability)}`);
  }

  // ── Tera Type ────────────────────────────────────────────────────────
  if (slot.teraConfig) {
    lines.push(`Tera Type: ${capitalize(slot.teraConfig.teraType)}`);
  }

  // ── EVs ──────────────────────────────────────────────────────────────
  const evs = slot.evs ?? { ...DEFAULT_EVS };
  const evParts: string[] = [];
  for (const key of STAT_KEYS) {
    if (evs[key] !== 0) {
      evParts.push(`${evs[key]} ${STAT_TO_SHOWDOWN[key]}`);
    }
  }
  if (evParts.length > 0) {
    lines.push(`EVs: ${evParts.join(" / ")}`);
  }

  // ── Nature ───────────────────────────────────────────────────────────
  if (slot.nature) {
    lines.push(`${capitalize(slot.nature.name)} Nature`);
  }

  // ── IVs ──────────────────────────────────────────────────────────────
  const ivs = slot.ivs ?? { ...DEFAULT_IVS };
  const hasNonMaxIv = STAT_KEYS.some((key) => ivs[key] !== 31);
  if (hasNonMaxIv) {
    const ivParts = STAT_KEYS.map(
      (key) => `${ivs[key]} ${STAT_TO_SHOWDOWN[key]}`
    );
    lines.push(`IVs: ${ivParts.join(" / ")}`);
  }

  // ── Moves ────────────────────────────────────────────────────────────
  if (slot.selectedMoves) {
    for (const move of slot.selectedMoves) {
      lines.push(`- ${toDisplayName(move)}`);
    }
  }

  return lines.join("\n");
}

// ── Import ─────────────────────────────────────────────────────────────

/**
 * Parse a Showdown paste/import string and return an array of TeamSlot
 * objects with Pokemon data fetched from PokeAPI.
 *
 * Blocks are separated by one or more blank lines.
 */
export async function importFromShowdown(text: string): Promise<TeamSlot[]> {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const slots: TeamSlot[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const slot = await parseBlock(blocks[i], i);
    if (slot) {
      slots.push(slot);
    }
  }

  return slots;
}

async function parseBlock(
  block: string,
  position: number
): Promise<TeamSlot | null> {
  const lines = block.split("\n").map((l) => l.trim());
  if (lines.length === 0) return null;

  // ── Line 1: Species / Nickname @ Item ───────────────────────────────
  let firstLine = lines[0];
  let heldItem: string | null = null;
  let species: string;

  // Extract item after " @ "
  const atIdx = firstLine.indexOf(" @ ");
  if (atIdx !== -1) {
    heldItem = toApiName(firstLine.slice(atIdx + 3));
    firstLine = firstLine.slice(0, atIdx);
  }

  // Check for "Nickname (Species)" pattern
  const parenMatch = firstLine.match(/^.*\((.+)\)\s*$/);
  if (parenMatch) {
    species = parenMatch[1].trim();
  } else {
    species = firstLine.trim();
  }

  const apiName = toApiName(species);

  // ── Fetch Pokemon from PokeAPI ──────────────────────────────────────
  let pokemon;
  try {
    pokemon = await fetchPokemon(apiName);
  } catch {
    // If fetch fails, skip this block
    return null;
  }

  // ── Parse remaining lines ───────────────────────────────────────────
  let ability: string | null = null;
  let nature: Nature | null = null;
  let evs: EVSpread = { ...DEFAULT_EVS };
  let ivs: IVSpread = { ...DEFAULT_IVS };
  let teraConfig: { teraType: TypeName } | undefined = undefined;
  const selectedMoves: string[] = [];
  let hasIvLine = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Ability:")) {
      ability = toApiName(line.slice("Ability:".length).trim());
    } else if (line.startsWith("Tera Type:")) {
      const teraType = line
        .slice("Tera Type:".length)
        .trim()
        .toLowerCase() as TypeName;
      teraConfig = { teraType };
    } else if (line.startsWith("EVs:")) {
      evs = parseSpread(line.slice("EVs:".length).trim(), { ...DEFAULT_EVS });
    } else if (line.startsWith("IVs:")) {
      ivs = parseSpread(line.slice("IVs:".length).trim(), { ...DEFAULT_IVS });
      hasIvLine = true;
    } else if (line.endsWith("Nature")) {
      const natureName = line.replace("Nature", "").trim().toLowerCase();
      nature =
        NATURES.find((n) => n.name === natureName) ?? null;
    } else if (line.startsWith("- ")) {
      selectedMoves.push(toApiName(line.slice(2).trim()));
    }
  }

  const slot: TeamSlot = {
    pokemon,
    position,
    nature,
    evs,
    ivs: hasIvLine ? ivs : { ...DEFAULT_IVS },
    ability,
    heldItem,
    selectedMoves: selectedMoves.length > 0 ? selectedMoves : undefined,
    teraConfig,
  };

  return slot;
}

/**
 * Parse an EV or IV spread string like "252 Atk / 252 Spe / 4 HP"
 * into an EVSpread or IVSpread object.
 */
function parseSpread<T extends EVSpread | IVSpread>(
  raw: string,
  base: T
): T {
  const spread = { ...base };
  const parts = raw.split("/").map((p) => p.trim());

  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(\w+)$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const abbrev = match[2];
      const key = SHOWDOWN_TO_STAT[abbrev];
      if (key) {
        (spread as unknown as Record<string, number>)[key] = value;
      }
    }
  }

  return spread;
}
