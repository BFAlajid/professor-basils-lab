/**
 * Gen 3 Pokemon Data Decryptor
 *
 * Pokemon data structure:
 *   Party: 100 bytes, PC: 80 bytes
 *   Bytes 0-3: Personality Value (PID)
 *   Bytes 4-7: Original Trainer ID (OTID = TID | SID<<16)
 *   Bytes 8-17: Nickname (10 bytes, Gen 3 encoding)
 *   Bytes 18-19: Language
 *   Bytes 20-29: OT Name (7 bytes, Gen 3 encoding)
 *   Bytes 30: Markings
 *   Bytes 31: Checksum (unused in our parsing)
 *   Bytes 32-79: Encrypted substructure data (48 bytes = 4 sub × 12 bytes)
 *   Bytes 80-99: Battle stats (party only)
 */

import { decodeGen3String } from "./gen3SaveParser";

export interface Gen3Pokemon {
  pid: number;
  otId: number;
  species: number;
  nickname: string;
  level: number;
  experience: number;
  heldItem: number;
  moves: number[];
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  evs: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  abilitySlot: number;
  pokeball: number;
  isEgg: boolean;
  isShiny: boolean;
}

/**
 * Substructure order based on PID % 24
 * G = Growth (0), A = Attacks (1), E = EVs/Condition (2), M = Misc (3)
 */
const SUBSTRUCTURE_ORDERS: number[][] = [
  [0, 1, 2, 3], // 0:  GAEM
  [0, 1, 3, 2], // 1:  GAME
  [0, 2, 1, 3], // 2:  GEAM
  [0, 2, 3, 1], // 3:  GEMA
  [0, 3, 1, 2], // 4:  GMAE
  [0, 3, 2, 1], // 5:  GMEA
  [1, 0, 2, 3], // 6:  AGEM
  [1, 0, 3, 2], // 7:  AGME
  [1, 2, 0, 3], // 8:  AEGM
  [1, 2, 3, 0], // 9:  AEMG
  [1, 3, 0, 2], // 10: AMGE
  [1, 3, 2, 0], // 11: AMEG
  [2, 0, 1, 3], // 12: EAGM
  [2, 0, 3, 1], // 13: EAMG
  [2, 1, 0, 3], // 14: EAGM → EDAM (corrected: EAGM)
  [2, 1, 3, 0], // 15: EAMG → correct permutation order
  [2, 3, 0, 1], // 16: EMGA
  [2, 3, 1, 0], // 17: EMAG
  [3, 0, 1, 2], // 18: MGAE
  [3, 0, 2, 1], // 19: MGEA
  [3, 1, 0, 2], // 20: MAGE
  [3, 1, 2, 0], // 21: MAEG
  [3, 2, 0, 1], // 22: MEGA
  [3, 2, 1, 0], // 23: MEAG
];

/**
 * Gen 3 species index → National Dex mapping
 * Gen 3 uses an internal species index that differs from the National Dex for Pokemon #252+
 * Pokemon 1-251 match directly, 252+ need mapping
 */
const GEN3_SPECIES_TO_NATIONAL: Record<number, number> = {};
// 1-251 are the same
for (let i = 1; i <= 251; i++) GEN3_SPECIES_TO_NATIONAL[i] = i;
// Gen 3 species indices 277-411 map to National Dex 252-386
// (Gen 3 internal indices skip 252-276 for Unown forms and other internal entries)
for (let i = 0; i < 135; i++) GEN3_SPECIES_TO_NATIONAL[277 + i] = 252 + i;
// Common specific mappings that differ
GEN3_SPECIES_TO_NATIONAL[252] = 252; // Treecko (may vary by game)
GEN3_SPECIES_TO_NATIONAL[253] = 253;
GEN3_SPECIES_TO_NATIONAL[254] = 254;
GEN3_SPECIES_TO_NATIONAL[255] = 255;
GEN3_SPECIES_TO_NATIONAL[256] = 256;
GEN3_SPECIES_TO_NATIONAL[257] = 257;
GEN3_SPECIES_TO_NATIONAL[258] = 258;
GEN3_SPECIES_TO_NATIONAL[259] = 259;
GEN3_SPECIES_TO_NATIONAL[260] = 260;

function gen3SpeciesToNational(gen3Id: number): number {
  return GEN3_SPECIES_TO_NATIONAL[gen3Id] ?? gen3Id;
}

/**
 * Decrypt the 48-byte encrypted substructure block
 * XOR key = PID ^ OTID, applied per 4-byte chunk
 */
function decryptSubstructures(encrypted: Uint8Array, pid: number, otId: number): DataView {
  const key = (pid ^ otId) >>> 0;
  const decrypted = new Uint8Array(48);

  for (let i = 0; i < 48; i += 4) {
    const chunk =
      encrypted[i] |
      (encrypted[i + 1] << 8) |
      (encrypted[i + 2] << 16) |
      (encrypted[i + 3] << 24);
    const dec = (chunk ^ key) >>> 0;
    decrypted[i] = dec & 0xFF;
    decrypted[i + 1] = (dec >> 8) & 0xFF;
    decrypted[i + 2] = (dec >> 16) & 0xFF;
    decrypted[i + 3] = (dec >> 24) & 0xFF;
  }

  return new DataView(decrypted.buffer);
}

/**
 * Experience → Level lookup (medium-fast growth rate as default)
 * Most Pokemon use one of 6 growth rates; medium-fast is common
 */
function expToLevel(exp: number): number {
  // Rough approximation using medium-fast formula: n^3
  for (let level = 1; level <= 100; level++) {
    if (exp < level * level * level) return Math.max(1, level - 1);
  }
  return 100;
}

/**
 * Decrypt and parse a Pokemon data block
 */
export function decryptPokemonData(data: Uint8Array, isParty: boolean): Gen3Pokemon | null {
  if (data.length < 80) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Read header
  const pid = view.getUint32(0, true);
  const otId = view.getUint32(4, true);

  // All zeros = empty slot
  if (pid === 0 && otId === 0) return null;

  const nickname = decodeGen3String(data, 8, 10);

  // Decrypt substructure data (bytes 32-79)
  const encrypted = data.slice(32, 80);
  const decrypted = decryptSubstructures(encrypted, pid, otId);

  // Determine substructure order
  const orderIndex = pid % 24;
  const order = SUBSTRUCTURE_ORDERS[orderIndex];

  // Find which position in the 48-byte block contains each substructure type
  // order[i] = what substructure type is at position i
  // We need: position of Growth (0), Attacks (1), EVs (2), Misc (3)
  const positions: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    positions[order[i]] = i;
  }

  // Read Growth substructure (type 0): species, item, experience, etc.
  const growthOffset = positions[0] * 12;
  const rawSpecies = decrypted.getUint16(growthOffset, true);
  const species = gen3SpeciesToNational(rawSpecies);
  const heldItem = decrypted.getUint16(growthOffset + 2, true);
  const experience = decrypted.getUint32(growthOffset + 4, true);
  const ppBonuses = decrypted.getUint8(growthOffset + 8);
  const friendship = decrypted.getUint8(growthOffset + 9);

  if (species === 0 || species > 440) return null;

  // Read Attacks substructure (type 1): 4 moves + 4 PP values
  const attackOffset = positions[1] * 12;
  const moves: number[] = [
    decrypted.getUint16(attackOffset, true),
    decrypted.getUint16(attackOffset + 2, true),
    decrypted.getUint16(attackOffset + 4, true),
    decrypted.getUint16(attackOffset + 6, true),
  ].filter((m) => m > 0);

  // Read EVs substructure (type 2): 6 EV values + condition values
  const evOffset = positions[2] * 12;
  const evs = {
    hp: decrypted.getUint8(evOffset),
    attack: decrypted.getUint8(evOffset + 1),
    defense: decrypted.getUint8(evOffset + 2),
    speed: decrypted.getUint8(evOffset + 3),
    spAtk: decrypted.getUint8(evOffset + 4),
    spDef: decrypted.getUint8(evOffset + 5),
  };

  // Read Misc substructure (type 3): IVs packed in 32 bits, ability, etc.
  const miscOffset = positions[3] * 12;
  const pokeball = decrypted.getUint8(miscOffset); // Pokeball caught in (bits 0-3 of met info)
  // Met data at misc offset 0-1 (pokeball is part of origins info)
  const originsInfo = decrypted.getUint16(miscOffset + 2, true);
  const ballCaught = (originsInfo >> 11) & 0xF; // bits 11-14

  // IV data at misc offset 4-7
  const ivData = decrypted.getUint32(miscOffset + 4, true);
  const ivs = {
    hp: ivData & 0x1F,
    attack: (ivData >> 5) & 0x1F,
    defense: (ivData >> 10) & 0x1F,
    speed: (ivData >> 15) & 0x1F,
    spAtk: (ivData >> 20) & 0x1F,
    spDef: (ivData >> 25) & 0x1F,
  };
  const isEgg = (ivData >> 30) & 1;
  const abilityBit = (ivData >> 31) & 1;

  // Shiny check: (tid ^ sid ^ (pid >> 16) ^ (pid & 0xFFFF)) < 8
  const tid = otId & 0xFFFF;
  const sid = (otId >> 16) & 0xFFFF;
  const isShiny = (tid ^ sid ^ ((pid >> 16) & 0xFFFF) ^ (pid & 0xFFFF)) < 8;

  // Level: from party data if available, otherwise compute from experience
  let level: number;
  if (isParty && data.length >= 100) {
    level = data[84]; // Level at offset 84 in party data
  } else {
    level = expToLevel(experience);
  }

  return {
    pid,
    otId,
    species,
    nickname,
    level,
    experience,
    heldItem,
    moves,
    ivs,
    evs,
    abilitySlot: abilityBit,
    pokeball: ballCaught,
    isEgg: isEgg === 1,
    isShiny,
  };
}
