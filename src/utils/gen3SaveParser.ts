/**
 * Gen 3 Pokemon Save File Parser
 *
 * Supports Ruby, Sapphire, Emerald, FireRed, LeafGreen save files (128KB).
 * Save structure: 2 slots × 14 sections × 4096 bytes each.
 * Section footer at offset 0xFF4: sectionId(2), padding(2), checksum(2), padding(2), saveIndex(4), padding(4).
 */

import { decryptPokemonData, type Gen3Pokemon } from "./gen3PokemonDecryptor";

const SECTION_SIZE = 4096;
const SECTION_DATA_SIZE = 3968; // 4096 - 128 footer
const SECTIONS_PER_SLOT = 14;
const SLOT_SIZE = SECTION_SIZE * SECTIONS_PER_SLOT; // 57344

export interface Gen3SaveData {
  gameCode: string;
  trainerName: string;
  trainerId: number;
  secretId: number;
  partyPokemon: Gen3Pokemon[];
  pcBoxPokemon: Gen3Pokemon[][];
  activeSlot: number;
}

// Section footer offsets (relative to section start)
const SECTION_ID_OFFSET = 0xFF4;
const SAVE_INDEX_OFFSET = 0xFFC;

/**
 * Determine which save slot is active (higher save index wins)
 */
function getActiveSaveSlot(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  // Read save index from first section of each slot
  const slot0Index = view.getUint32(SAVE_INDEX_OFFSET, true);
  const slot1Index = view.getUint32(SLOT_SIZE + SAVE_INDEX_OFFSET, true);
  return slot1Index > slot0Index ? 1 : 0;
}

/**
 * Get the ordered section data for the active save slot
 * Returns array indexed by section ID (0-13) with the raw section data (3968 bytes each)
 */
function getSectionData(buffer: ArrayBuffer, slot: number): Uint8Array[] {
  const sections: Uint8Array[] = new Array(SECTIONS_PER_SLOT);
  const view = new DataView(buffer);
  const slotOffset = slot * SLOT_SIZE;

  for (let i = 0; i < SECTIONS_PER_SLOT; i++) {
    const sectionStart = slotOffset + i * SECTION_SIZE;
    const sectionId = view.getUint16(sectionStart + SECTION_ID_OFFSET, true);

    if (sectionId < SECTIONS_PER_SLOT) {
      sections[sectionId] = new Uint8Array(buffer, sectionStart, SECTION_DATA_SIZE);
    }
  }

  return sections;
}

/**
 * Gen 3 character encoding table (partial — covers A-Z, a-z, 0-9, common punctuation)
 */
const GEN3_CHARSET: Record<number, string> = {};
// Uppercase A-Z: 0xBB-0xD4
for (let i = 0; i < 26; i++) GEN3_CHARSET[0xBB + i] = String.fromCharCode(65 + i);
// Lowercase a-z: 0xD5-0xEE
for (let i = 0; i < 26; i++) GEN3_CHARSET[0xD5 + i] = String.fromCharCode(97 + i);
// Digits 0-9: 0xA1-0xAA
for (let i = 0; i < 10; i++) GEN3_CHARSET[0xA1 + i] = String.fromCharCode(48 + i);
// Common special characters
GEN3_CHARSET[0x00] = " ";
GEN3_CHARSET[0xAB] = "!";
GEN3_CHARSET[0xAC] = "?";
GEN3_CHARSET[0xAD] = ".";
GEN3_CHARSET[0xAE] = "-";
GEN3_CHARSET[0xB0] = "\u2026"; // ellipsis
GEN3_CHARSET[0xB1] = "\u201C"; // left double quote
GEN3_CHARSET[0xB2] = "\u201D"; // right double quote
GEN3_CHARSET[0xB3] = "\u2018"; // left single quote
GEN3_CHARSET[0xB4] = "\u2019"; // right single quote
GEN3_CHARSET[0xB5] = "\u2642"; // male symbol
GEN3_CHARSET[0xB6] = "\u2640"; // female symbol
GEN3_CHARSET[0xB8] = ",";
GEN3_CHARSET[0xFF] = ""; // string terminator

export function decodeGen3String(data: Uint8Array, offset: number, maxLen: number): string {
  let result = "";
  for (let i = 0; i < maxLen; i++) {
    const byte = data[offset + i];
    if (byte === 0xFF) break; // String terminator
    result += GEN3_CHARSET[byte] ?? "?";
  }
  return result;
}

/**
 * Detect game version from section 0 data
 */
function detectGameCode(section0: Uint8Array): string {
  // Game code is at offset 0xAC in the ROM header, but in save files
  // we can detect based on security key location/value and section sizes
  // For simplicity, we'll check the save size patterns
  // Section 0, offset 0x00AC has game code in some versions
  // Just return generic "gen3" — version detection not critical for Pokemon import
  return "gen3";
}

/**
 * Parse trainer info from section 0
 */
function parseTrainerInfo(section0: Uint8Array): {
  trainerName: string;
  trainerId: number;
  secretId: number;
} {
  const view = new DataView(section0.buffer, section0.byteOffset, section0.byteLength);

  const trainerName = decodeGen3String(section0, 0x00, 7);
  // Trainer ID at offset 0x0A (public ID)
  const trainerId = view.getUint16(0x0A, true);
  // Secret ID at offset 0x0C
  const secretId = view.getUint16(0x0C, true);

  return { trainerName, trainerId, secretId };
}

/**
 * Parse party Pokemon from section 1
 * Party count at offset 0x0234, party data starts at 0x0238
 * Each party Pokemon is 100 bytes
 */
function parsePartyPokemon(section1: Uint8Array): Gen3Pokemon[] {
  const view = new DataView(section1.buffer, section1.byteOffset, section1.byteLength);
  const partyCount = view.getUint32(0x0234, true);
  const pokemon: Gen3Pokemon[] = [];

  const count = Math.min(partyCount, 6);
  for (let i = 0; i < count; i++) {
    const offset = 0x0238 + i * 100;
    const pokemonData = section1.slice(offset, offset + 100);
    const parsed = decryptPokemonData(pokemonData, true);
    if (parsed && parsed.species > 0 && parsed.species <= 440) {
      pokemon.push(parsed);
    }
  }

  return pokemon;
}

/**
 * Parse PC Box Pokemon from sections 5-13
 * PC buffer structure: current box (4 bytes), then 14 boxes × 30 Pokemon × 80 bytes
 * Total PC data = 33600 bytes across sections 5-13
 */
function parsePCBoxPokemon(sections: Uint8Array[]): Gen3Pokemon[][] {
  // Assemble continuous PC buffer from sections 5-13
  const pcChunks: Uint8Array[] = [];
  for (let secId = 5; secId <= 13; secId++) {
    if (sections[secId]) {
      pcChunks.push(sections[secId]);
    }
  }

  if (pcChunks.length === 0) return [];

  // Combine into single buffer
  const totalLen = pcChunks.reduce((sum, c) => sum + c.length, 0);
  const pcBuffer = new Uint8Array(totalLen);
  let writeOffset = 0;
  for (const chunk of pcChunks) {
    pcBuffer.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  // Skip 4 bytes for current box index
  const dataStart = 4;
  const POKEMON_SIZE = 80; // PC pokemon are 80 bytes (no battle stats)
  const POKEMON_PER_BOX = 30;
  const NUM_BOXES = 14;
  const boxes: Gen3Pokemon[][] = [];

  for (let box = 0; box < NUM_BOXES; box++) {
    const boxPokemon: Gen3Pokemon[] = [];

    for (let slot = 0; slot < POKEMON_PER_BOX; slot++) {
      const offset = dataStart + (box * POKEMON_PER_BOX + slot) * POKEMON_SIZE;
      if (offset + POKEMON_SIZE > pcBuffer.length) break;

      const pokemonData = pcBuffer.slice(offset, offset + POKEMON_SIZE);
      const parsed = decryptPokemonData(pokemonData, false);
      if (parsed && parsed.species > 0 && parsed.species <= 440) {
        boxPokemon.push(parsed);
      }
    }

    boxes.push(boxPokemon);
  }

  return boxes;
}

/**
 * Main entry point: parse a Gen 3 save file
 */
export function parseGen3Save(buffer: ArrayBuffer): Gen3SaveData | null {
  // Validate save file size (should be 128KB or 64KB for half saves)
  if (buffer.byteLength < SLOT_SIZE) return null;

  try {
    const activeSlot = getActiveSaveSlot(buffer);
    const sections = getSectionData(buffer, activeSlot);

    if (!sections[0] || !sections[1]) return null;

    const gameCode = detectGameCode(sections[0]);
    const { trainerName, trainerId, secretId } = parseTrainerInfo(sections[0]);
    const partyPokemon = parsePartyPokemon(sections[1]);
    const pcBoxPokemon = parsePCBoxPokemon(sections);

    return {
      gameCode,
      trainerName,
      trainerId,
      secretId,
      partyPokemon,
      pcBoxPokemon,
      activeSlot,
    };
  } catch {
    return null;
  }
}
