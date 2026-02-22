/**
 * Gen 3 Save Parser Parity Test
 *
 * Builds a synthetic Gen 3 save file in-memory and verifies
 * the TypeScript parser produces correct output.
 *
 * Run with: node --experimental-strip-types tests/gen3-parser-parity.test.ts
 */

import { strict as assert } from "node:assert";
import { test, describe } from "node:test";

// ===== Inline Gen 3 parser (standalone, no module imports) =====
// Duplicated from gen3PokemonDecryptor.ts + gen3SaveParser.ts for test isolation.

const SECTION_SIZE = 4096;
const SECTION_DATA_SIZE = 3968;
const SECTIONS_PER_SLOT = 14;
const SLOT_SIZE = SECTION_SIZE * SECTIONS_PER_SLOT;
const SECTION_ID_OFFSET = 0xFF4;
const SAVE_INDEX_OFFSET = 0xFFC;

// Gen 3 charset
const GEN3_CHARSET: Record<number, string> = {};
for (let i = 0; i < 26; i++) GEN3_CHARSET[0xBB + i] = String.fromCharCode(65 + i);
for (let i = 0; i < 26; i++) GEN3_CHARSET[0xD5 + i] = String.fromCharCode(97 + i);
for (let i = 0; i < 10; i++) GEN3_CHARSET[0xA1 + i] = String.fromCharCode(48 + i);
GEN3_CHARSET[0x00] = " ";
GEN3_CHARSET[0xAB] = "!";
GEN3_CHARSET[0xAC] = "?";
GEN3_CHARSET[0xAD] = ".";
GEN3_CHARSET[0xAE] = "-";
GEN3_CHARSET[0xB0] = "\u2026";
GEN3_CHARSET[0xB1] = "\u201C";
GEN3_CHARSET[0xB2] = "\u201D";
GEN3_CHARSET[0xB3] = "\u2018";
GEN3_CHARSET[0xB4] = "\u2019";
GEN3_CHARSET[0xB5] = "\u2642";
GEN3_CHARSET[0xB6] = "\u2640";
GEN3_CHARSET[0xB8] = ",";
GEN3_CHARSET[0xFF] = "";

function decodeGen3String(data: Uint8Array, offset: number, maxLen: number): string {
  let result = "";
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= data.length) break;
    const byte = data[offset + i];
    if (byte === 0xFF) break;
    result += GEN3_CHARSET[byte] ?? "?";
  }
  return result;
}

// Substructure orders
const SUBSTRUCTURE_ORDERS: number[][] = [
  [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
  [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
  [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
  [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0],
];

function gen3SpeciesToNational(gen3Id: number): number {
  if (gen3Id >= 277 && gen3Id <= 411) return gen3Id - 25;
  return gen3Id;
}

interface ParsedPokemon {
  pid: number;
  otId: number;
  species: number;
  nickname: string;
  level: number;
  experience: number;
  heldItem: number;
  moves: number[];
  ivs: { hp: number; attack: number; defense: number; speed: number; spAtk: number; spDef: number };
  evs: { hp: number; attack: number; defense: number; speed: number; spAtk: number; spDef: number };
  abilitySlot: number;
  pokeball: number;
  isEgg: boolean;
  isShiny: boolean;
}

function decryptPokemonData(data: Uint8Array, isParty: boolean): ParsedPokemon | null {
  if (data.length < 80) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const pid = view.getUint32(0, true);
  const otId = view.getUint32(4, true);
  if (pid === 0 && otId === 0) return null;

  const nickname = decodeGen3String(data, 8, 10);
  const encrypted = data.slice(32, 80);
  const key = (pid ^ otId) >>> 0;
  const decrypted = new Uint8Array(48);
  for (let i = 0; i < 48; i += 4) {
    const chunk = encrypted[i] | (encrypted[i+1]<<8) | (encrypted[i+2]<<16) | (encrypted[i+3]<<24);
    const dec = (chunk ^ key) >>> 0;
    decrypted[i] = dec & 0xFF;
    decrypted[i+1] = (dec >> 8) & 0xFF;
    decrypted[i+2] = (dec >> 16) & 0xFF;
    decrypted[i+3] = (dec >> 24) & 0xFF;
  }
  const dv = new DataView(decrypted.buffer);

  const orderIndex = pid % 24;
  const order = SUBSTRUCTURE_ORDERS[orderIndex];
  const positions: number[] = [0,0,0,0];
  for (let i = 0; i < 4; i++) positions[order[i]] = i;

  const growthOffset = positions[0] * 12;
  const rawSpecies = dv.getUint16(growthOffset, true);
  const species = gen3SpeciesToNational(rawSpecies);
  const heldItem = dv.getUint16(growthOffset + 2, true);
  const experience = dv.getUint32(growthOffset + 4, true);

  if (species === 0 || species > 440) return null;

  const attackOffset = positions[1] * 12;
  const moves: number[] = [
    dv.getUint16(attackOffset, true),
    dv.getUint16(attackOffset + 2, true),
    dv.getUint16(attackOffset + 4, true),
    dv.getUint16(attackOffset + 6, true),
  ].filter(m => m > 0);

  const evOffset = positions[2] * 12;
  const evs = {
    hp: decrypted[evOffset], attack: decrypted[evOffset+1],
    defense: decrypted[evOffset+2], speed: decrypted[evOffset+3],
    spAtk: decrypted[evOffset+4], spDef: decrypted[evOffset+5],
  };

  const miscOffset = positions[3] * 12;
  const originsInfo = dv.getUint16(miscOffset + 2, true);
  const ballCaught = (originsInfo >> 11) & 0xF;
  const ivData = dv.getUint32(miscOffset + 4, true);
  const ivs = {
    hp: ivData & 0x1F, attack: (ivData >> 5) & 0x1F,
    defense: (ivData >> 10) & 0x1F, speed: (ivData >> 15) & 0x1F,
    spAtk: (ivData >> 20) & 0x1F, spDef: (ivData >> 25) & 0x1F,
  };
  const isEgg = ((ivData >> 30) & 1) === 1;
  const abilityBit = (ivData >> 31) & 1;

  const tid = otId & 0xFFFF;
  const sid = (otId >> 16) & 0xFFFF;
  const isShiny = (tid ^ sid ^ ((pid >> 16) & 0xFFFF) ^ (pid & 0xFFFF)) < 8;

  let level: number;
  if (isParty && data.length >= 100) {
    level = data[84];
  } else {
    level = 1;
    for (let l = 1; l <= 100; l++) {
      if (experience < l * l * l) { level = Math.max(1, l - 1); break; }
      if (l === 100) level = 100;
    }
  }

  return {
    pid, otId, species, nickname, level, experience, heldItem, moves,
    ivs, evs, abilitySlot: abilityBit, pokeball: ballCaught, isEgg, isShiny,
  };
}

// ===== Test Helpers =====

function writeU16LE(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xFF;
  buf[offset+1] = (val >> 8) & 0xFF;
}

function writeU32LE(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = val & 0xFF;
  buf[offset+1] = (val >> 8) & 0xFF;
  buf[offset+2] = (val >> 16) & 0xFF;
  buf[offset+3] = (val >> 24) & 0xFF;
}

function buildPokemonData(opts: {
  pid: number; otId: number; species: number; heldItem: number;
  experience: number; moves: [number, number, number, number];
  evs: [number, number, number, number, number, number];
  ivData: number; originsInfo: number; party: boolean; partyLevel: number;
}): Uint8Array {
  const size = opts.party ? 100 : 80;
  const data = new Uint8Array(size);

  writeU32LE(data, 0, opts.pid);
  writeU32LE(data, 4, opts.otId);
  data[8] = 0xBB; data[9] = 0xBC; data[10] = 0xBD; data[11] = 0xBE; data[12] = 0xBF; data[13] = 0xFF;

  const growth = new Uint8Array(12);
  writeU16LE(growth, 0, opts.species);
  writeU16LE(growth, 2, opts.heldItem);
  writeU32LE(growth, 4, opts.experience);

  const attacks = new Uint8Array(12);
  writeU16LE(attacks, 0, opts.moves[0]);
  writeU16LE(attacks, 2, opts.moves[1]);
  writeU16LE(attacks, 4, opts.moves[2]);
  writeU16LE(attacks, 6, opts.moves[3]);

  const evBlock = new Uint8Array(12);
  evBlock.set(opts.evs);

  const misc = new Uint8Array(12);
  writeU16LE(misc, 2, opts.originsInfo);
  writeU32LE(misc, 4, opts.ivData);

  const subs = [growth, attacks, evBlock, misc];
  const order = SUBSTRUCTURE_ORDERS[opts.pid % 24];
  const plaintext = new Uint8Array(48);
  for (let pos = 0; pos < 4; pos++) {
    const subType = order[pos];
    plaintext.set(subs[subType], pos * 12);
  }

  const key = (opts.pid ^ opts.otId) >>> 0;
  const encrypted = new Uint8Array(48);
  for (let i = 0; i < 48; i += 4) {
    const chunk = plaintext[i] | (plaintext[i+1]<<8) | (plaintext[i+2]<<16) | (plaintext[i+3]<<24);
    const enc = (chunk ^ key) >>> 0;
    encrypted[i] = enc & 0xFF;
    encrypted[i+1] = (enc >> 8) & 0xFF;
    encrypted[i+2] = (enc >> 16) & 0xFF;
    encrypted[i+3] = (enc >> 24) & 0xFF;
  }
  data.set(encrypted, 32);

  if (opts.party) data[84] = opts.partyLevel;
  return data;
}

function buildSaveFile(opts: {
  activeSlot: number;
  trainerNameBytes: number[];
  trainerId: number;
  secretId: number;
  partyPokemon: Uint8Array[];
}): ArrayBuffer {
  const buffer = new ArrayBuffer(128 * 1024);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let slot = 0; slot < 2; slot++) {
    const slotOffset = slot * SLOT_SIZE;
    const saveIndex = slot === opts.activeSlot ? 10 : 5;

    for (let secId = 0; secId < SECTIONS_PER_SLOT; secId++) {
      const secStart = slotOffset + secId * SECTION_SIZE;
      view.setUint16(secStart + SECTION_ID_OFFSET, secId, true);
      view.setUint32(secStart + SAVE_INDEX_OFFSET, saveIndex, true);

      if (slot !== opts.activeSlot) continue;

      if (secId === 0) {
        for (let i = 0; i < opts.trainerNameBytes.length && i < 7; i++) {
          bytes[secStart + i] = opts.trainerNameBytes[i];
        }
        if (opts.trainerNameBytes.length < 7) bytes[secStart + opts.trainerNameBytes.length] = 0xFF;
        view.setUint16(secStart + 0x0A, opts.trainerId, true);
        view.setUint16(secStart + 0x0C, opts.secretId, true);
      }

      if (secId === 1) {
        view.setUint32(secStart + 0x0234, opts.partyPokemon.length, true);
        for (let i = 0; i < opts.partyPokemon.length && i < 6; i++) {
          const offset = secStart + 0x0238 + i * 100;
          bytes.set(opts.partyPokemon[i].slice(0, 100), offset);
        }
      }
    }
  }

  return buffer;
}

// ===== Tests =====

describe("Synthetic Pokemon Decryption", () => {
  test("parses a Pikachu with known values", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 42, experience: 27000,
      moves: [84, 85, 86, 87], evs: [10, 20, 30, 40, 50, 60],
      ivData: 31 | (31 << 5) | (31 << 10) | (31 << 15) | (31 << 20) | (31 << 25),
      originsInfo: 0, party: false, partyLevel: 0,
    });
    const p = decryptPokemonData(data, false)!;
    assert.ok(p, "should parse");
    assert.equal(p.species, 25);
    assert.equal(p.heldItem, 42);
    assert.equal(p.experience, 27000);
    assert.deepEqual(p.moves, [84, 85, 86, 87]);
    assert.equal(p.evs.hp, 10);
    assert.equal(p.evs.spDef, 60);
    assert.equal(p.ivs.hp, 31);
    assert.equal(p.ivs.spDef, 31);
    assert.equal(p.nickname, "ABCDE");
  });

  test("all 24 substructure permutations produce identical results", () => {
    for (let perm = 0; perm < 24; perm++) {
      const data = buildPokemonData({
        pid: perm, otId: 100, species: 25, heldItem: 42, experience: 27000,
        moves: [84, 85, 86, 87], evs: [10, 20, 30, 40, 50, 60],
        ivData: 0x3FFFFFFF, originsInfo: 0, party: false, partyLevel: 0,
      });
      const p = decryptPokemonData(data, false);
      assert.ok(p, `permutation ${perm} failed`);
      assert.equal(p!.species, 25, `perm ${perm}: species`);
      assert.equal(p!.heldItem, 42, `perm ${perm}: heldItem`);
      assert.deepEqual(p!.moves, [84, 85, 86, 87], `perm ${perm}: moves`);
      assert.equal(p!.ivs.hp, 31, `perm ${perm}: iv hp`);
    }
  });

  test("rejects empty slot", () => {
    assert.equal(decryptPokemonData(new Uint8Array(80), false), null);
  });

  test("rejects too-small data", () => {
    assert.equal(decryptPokemonData(new Uint8Array(79), false), null);
  });

  test("shiny boundary: XOR=7 is shiny, XOR=8 is not", () => {
    const shiny = buildPokemonData({
      pid: 0, otId: 7, species: 25, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.ok(decryptPokemonData(shiny, false)!.isShiny, "XOR=7 should be shiny");

    const notShiny = buildPokemonData({
      pid: 0, otId: 8, species: 25, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.ok(!decryptPokemonData(notShiny, false)!.isShiny, "XOR=8 should not be shiny");
  });

  test("egg flag and ability slot from IV data bits 30-31", () => {
    const eggAndAbility = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0],
      ivData: (1 << 30) | (1 << 31), // egg=1, ability=1
      originsInfo: 0, party: false, partyLevel: 0,
    });
    const p = decryptPokemonData(eggAndAbility, false)!;
    assert.ok(p.isEgg);
    assert.equal(p.abilitySlot, 1);
  });

  test("ball caught from origins_info bits 11-14", () => {
    const ultraBall = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0,
      originsInfo: 2 << 11, // Ultra Ball = 2
      party: false, partyLevel: 0,
    });
    assert.equal(decryptPokemonData(ultraBall, false)!.pokeball, 2);
  });

  test("party pokemon reads level from byte 84", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 999999,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: true, partyLevel: 73,
    });
    assert.equal(decryptPokemonData(data, true)!.level, 73);
  });

  test("species 277 maps to national dex 252", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 277, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.equal(decryptPokemonData(data, false)!.species, 252);
  });
});

describe("Synthetic Save File Parsing", () => {
  function parseSave(buffer: ArrayBuffer) {
    if (buffer.byteLength < SLOT_SIZE) return null;
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const slot0Idx = view.getUint32(SAVE_INDEX_OFFSET, true);
    const slot1Idx = view.getUint32(SLOT_SIZE + SAVE_INDEX_OFFSET, true);
    const activeSlot = slot1Idx > slot0Idx ? 1 : 0;
    const slotOff = activeSlot * SLOT_SIZE;

    const sections: (Uint8Array | null)[] = Array(14).fill(null);
    for (let i = 0; i < 14; i++) {
      const secStart = slotOff + i * SECTION_SIZE;
      const secId = view.getUint16(secStart + SECTION_ID_OFFSET, true);
      if (secId < 14) {
        sections[secId] = bytes.slice(secStart, secStart + SECTION_DATA_SIZE);
      }
    }

    if (!sections[0] || !sections[1]) return null;
    const trainerName = decodeGen3String(sections[0], 0, 7);
    const trainerId = new DataView(sections[0].buffer, sections[0].byteOffset).getUint16(0x0A, true);
    const secretId = new DataView(sections[0].buffer, sections[0].byteOffset).getUint16(0x0C, true);

    const s1view = new DataView(sections[1].buffer, sections[1].byteOffset);
    const partyCount = Math.min(s1view.getUint32(0x0234, true), 6);
    const party: ParsedPokemon[] = [];
    for (let i = 0; i < partyCount; i++) {
      const off = 0x0238 + i * 100;
      const pdata = sections[1].slice(off, off + 100);
      const p = decryptPokemonData(pdata, true);
      if (p && p.species > 0 && p.species <= 440) party.push(p);
    }

    return { activeSlot, trainerName, trainerId, secretId, partyPokemon: party };
  }

  test("parses a full save with trainer info and party", () => {
    const pikachu = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 125000,
      moves: [84, 85, 0, 0], evs: [0,0,0,0,0,0], ivData: 0x3FFFFFFF,
      originsInfo: 0, party: true, partyLevel: 50,
    });

    const buffer = buildSaveFile({
      activeSlot: 0,
      trainerNameBytes: [0xCC, 0xBF, 0xBE], // "RED"
      trainerId: 12345,
      secretId: 54321,
      partyPokemon: [pikachu],
    });

    const result = parseSave(buffer)!;
    assert.ok(result);
    assert.equal(result.activeSlot, 0);
    assert.equal(result.trainerName, "RED");
    assert.equal(result.trainerId, 12345);
    assert.equal(result.secretId, 54321);
    assert.equal(result.partyPokemon.length, 1);
    assert.equal(result.partyPokemon[0].species, 25);
    assert.equal(result.partyPokemon[0].level, 50);
    assert.deepEqual(result.partyPokemon[0].moves, [84, 85]);
    assert.equal(result.partyPokemon[0].ivs.hp, 31);
  });

  test("slot 1 active when it has higher save index", () => {
    const bulbasaur = buildPokemonData({
      pid: 24, otId: 100, species: 1, heldItem: 0, experience: 125,
      moves: [33,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: true, partyLevel: 5,
    });
    const buffer = buildSaveFile({
      activeSlot: 1,
      trainerNameBytes: [0xBC, 0xC6, 0xCF, 0xBF], // "BLUE"
      trainerId: 999, secretId: 111,
      partyPokemon: [bulbasaur],
    });
    const result = parseSave(buffer)!;
    assert.equal(result.activeSlot, 1);
    assert.equal(result.trainerName, "BLUE");
  });

  test("rejects file too small", () => {
    assert.equal(parseSave(new ArrayBuffer(1000)), null);
  });

  test("empty party", () => {
    const buffer = buildSaveFile({
      activeSlot: 0, trainerNameBytes: [0xBB], trainerId: 1, secretId: 2,
      partyPokemon: [],
    });
    const result = parseSave(buffer)!;
    assert.equal(result.partyPokemon.length, 0);
  });

  test("party of 6", () => {
    const party = [1, 4, 7, 25, 150, 151].map((sp, i) =>
      buildPokemonData({
        pid: 24, otId: 100, species: sp, heldItem: 0,
        experience: ((i + 1) * 10) ** 3,
        moves: [33,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
        party: true, partyLevel: (i + 1) * 10,
      })
    );
    const buffer = buildSaveFile({
      activeSlot: 0, trainerNameBytes: [0xBB], trainerId: 1, secretId: 2,
      partyPokemon: party,
    });
    const result = parseSave(buffer)!;
    assert.equal(result.partyPokemon.length, 6);
    assert.equal(result.partyPokemon[0].species, 1);
    assert.equal(result.partyPokemon[3].species, 25);
    assert.equal(result.partyPokemon[5].species, 151);
  });
});

describe("Edge Cases", () => {
  test("XOR encryption with key=0 is identity", () => {
    const data = buildPokemonData({
      pid: 0x12345678, otId: 0x12345678, // key = 0
      species: 25, heldItem: 0, experience: 8000,
      moves: [33,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    const p = decryptPokemonData(data, false)!;
    assert.ok(p);
    assert.equal(p.species, 25);
  });

  test("moves with zeros in the middle are filtered", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 8000,
      moves: [84, 0, 86, 0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.deepEqual(decryptPokemonData(data, false)!.moves, [84, 86]);
  });

  test("species > 440 rejected", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 441, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.equal(decryptPokemonData(data, false), null);
  });

  test("species 0 rejected", () => {
    const data = buildPokemonData({
      pid: 1, otId: 1, species: 0, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [0,0,0,0,0,0], ivData: 0, originsInfo: 0,
      party: false, partyLevel: 0,
    });
    assert.equal(decryptPokemonData(data, false), null);
  });

  test("all max EV values (252 each)", () => {
    const data = buildPokemonData({
      pid: 24, otId: 100, species: 25, heldItem: 0, experience: 8000,
      moves: [1,0,0,0], evs: [252, 252, 252, 252, 252, 252],
      ivData: 0, originsInfo: 0, party: false, partyLevel: 0,
    });
    const p = decryptPokemonData(data, false)!;
    assert.equal(p.evs.hp, 252);
    assert.equal(p.evs.attack, 252);
    assert.equal(p.evs.defense, 252);
    assert.equal(p.evs.speed, 252);
    assert.equal(p.evs.spAtk, 252);
    assert.equal(p.evs.spDef, 252);
  });

  test("large PID values work correctly", () => {
    const data = buildPokemonData({
      pid: 0xFFFFFFFF, otId: 0xFFFFFFFF, species: 25, heldItem: 0,
      experience: 8000, moves: [1,0,0,0], evs: [0,0,0,0,0,0],
      ivData: 0, originsInfo: 0, party: false, partyLevel: 0,
    });
    const p = decryptPokemonData(data, false)!;
    assert.ok(p);
    assert.equal(p.pid, 0xFFFFFFFF);
    assert.equal(p.species, 25);
  });
});
