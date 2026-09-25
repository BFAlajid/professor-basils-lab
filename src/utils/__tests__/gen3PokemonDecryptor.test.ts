import { decryptPokemonData } from "../gen3PokemonDecryptor";

// ---------------------------------------------------------------------------
// Fix 6: the 252-260 self-mapping overrides were deleted from
// GEN3_SPECIES_TO_NATIONAL — those internal indices are unused Gen3
// placeholders, distinct from the real Hoenn range (internal 277-411, mapped
// to National Dex 252-386). These tests build a minimal valid encrypted
// Pokemon data block per raw species index and assert the decrypted species.
//
// pid=0, otId=1 => pid % 24 === 0 => substructure order [0,1,2,3] (identity),
// so the Growth substructure (species) sits at byte offset 32 with no
// permutation to account for. XOR key = pid ^ otId = 1.
// ---------------------------------------------------------------------------

function buildPokemonBuffer(rawSpecies: number): Uint8Array {
  const data = new Uint8Array(80);
  const view = new DataView(data.buffer);

  view.setUint32(0, 0, true); // pid = 0
  view.setUint32(4, 1, true); // otId = 1
  // bytes 8-79 default to 0 (nickname decodes to spaces; substructures are plaintext-zero
  // except the Growth substructure's species field, encrypted below).

  const key = 0 ^ 1; // pid ^ otId

  // Build the 48-byte substructure plaintext, then XOR-encrypt each 4-byte
  // LE word with `key` (matching decryptSubstructures' inverse operation).
  const plain = new Uint8Array(48);
  const plainView = new DataView(plain.buffer);
  plainView.setUint16(0, rawSpecies, true); // Growth substructure: species (offset 0)

  const encrypted = new Uint8Array(48);
  const encView = new DataView(encrypted.buffer);
  for (let i = 0; i < 48; i += 4) {
    const word = plainView.getUint32(i, true);
    encView.setUint32(i, (word ^ key) >>> 0, true);
  }
  data.set(encrypted, 32);

  return data;
}

describe("decryptPokemonData species mapping", () => {
  it("maps National Dex 1-251 directly (identity)", () => {
    const result = decryptPokemonData(buildPokemonBuffer(1), false);
    expect(result?.species).toBe(1);

    const result251 = decryptPokemonData(buildPokemonBuffer(251), false);
    expect(result251?.species).toBe(251);
  });

  it("leaves unused placeholder indices 252-260 unmapped (passthrough, not a false Hoenn label)", () => {
    for (const rawSpecies of [252, 253, 260]) {
      const result = decryptPokemonData(buildPokemonBuffer(rawSpecies), false);
      // No explicit override exists for this range; the fallback (`?? gen3Id`)
      // returns the raw value itself rather than a fabricated species identity.
      expect(result?.species).toBe(rawSpecies);
    }
  });

  it("maps internal indices 277+ to the Hoenn National Dex range (252-386)", () => {
    const first = decryptPokemonData(buildPokemonBuffer(277), false);
    expect(first?.species).toBe(252); // Treecko

    const last = decryptPokemonData(buildPokemonBuffer(411), false);
    expect(last?.species).toBe(386); // Deoxys
  });

  it("returns null for an all-zero (empty) slot", () => {
    const data = new Uint8Array(80);
    expect(decryptPokemonData(data, false)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full 24-entry substructure-order table (test-gaps report Top 10 #1).
//
// SUBSTRUCTURE_ORDERS in the source is keyed by `pid % 24` and is not exported,
// so this table is independently re-derived from the documented Gen 3 spec
// (Growth/Attacks/EVs-Condition/Misc substructure ordering, as cataloged on
// Bulbapedia) rather than copied from the implementation — the whole point is
// to catch a wrong entry, not to restate whatever the source currently says.
// Two entries in the source (indices 14 and 15) carry comments literally
// reading "corrected"/"correct permutation order", i.e. direct evidence this
// table has been wrong before; every one of the 24 entries is exercised here
// with a full Growth+Attacks+EVs+Misc payload so a regression in any single
// entry is caught, not just the species field the tests above already cover.
//
// order[i] = which substructure type (0=Growth,1=Attacks,2=EVs,3=Misc) sits
// at byte position i (each 12 bytes) within the decrypted 48-byte block.
const EXPECTED_SUBSTRUCTURE_ORDERS: number[][] = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
  [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0], [1, 3, 0, 2], [1, 3, 2, 0],
  [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3], [2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0],
  [3, 0, 1, 2], [3, 0, 2, 1], [3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0],
];

interface SubstructureContent {
  species: number;
  item: number;
  experience: number;
  moves: number[];
  evs: { hp: number; attack: number; defense: number; speed: number; spAtk: number; spDef: number };
  ballCaught: number;
  ivs: { hp: number; attack: number; defense: number; speed: number; spAtk: number; spDef: number };
  isEgg: boolean;
  abilitySlot: number;
}

function packIvData(ivs: SubstructureContent["ivs"], isEgg: boolean, abilitySlot: number): number {
  return (
    (ivs.hp & 0x1f) |
    ((ivs.attack & 0x1f) << 5) |
    ((ivs.defense & 0x1f) << 10) |
    ((ivs.speed & 0x1f) << 15) |
    ((ivs.spAtk & 0x1f) << 20) |
    ((ivs.spDef & 0x1f) << 25) |
    ((isEgg ? 1 : 0) << 30) |
    ((abilitySlot & 1) << 31)
  ) >>> 0;
}

/** Builds an 80-byte encrypted Pokemon data block whose substructures are laid
 * out according to `order` (the position-i -> substructure-type mapping), so
 * decryptPokemonData is exercised against a specific pid%24 permutation. */
function buildPermutedPokemonBuffer(pid: number, otId: number, order: number[], content: SubstructureContent): Uint8Array {
  const data = new Uint8Array(80);
  const view = new DataView(data.buffer);
  view.setUint32(0, pid, true);
  view.setUint32(4, otId, true);

  const positions: number[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) positions[order[i]] = i;

  const plain = new Uint8Array(48);
  const plainView = new DataView(plain.buffer);

  const growthOffset = positions[0] * 12;
  plainView.setUint16(growthOffset, content.species, true);
  plainView.setUint16(growthOffset + 2, content.item, true);
  plainView.setUint32(growthOffset + 4, content.experience, true);

  const attackOffset = positions[1] * 12;
  plainView.setUint16(attackOffset, content.moves[0], true);
  plainView.setUint16(attackOffset + 2, content.moves[1], true);
  plainView.setUint16(attackOffset + 4, content.moves[2], true);
  plainView.setUint16(attackOffset + 6, content.moves[3], true);

  const evOffset = positions[2] * 12;
  plainView.setUint8(evOffset, content.evs.hp);
  plainView.setUint8(evOffset + 1, content.evs.attack);
  plainView.setUint8(evOffset + 2, content.evs.defense);
  plainView.setUint8(evOffset + 3, content.evs.speed);
  plainView.setUint8(evOffset + 4, content.evs.spAtk);
  plainView.setUint8(evOffset + 5, content.evs.spDef);

  const miscOffset = positions[3] * 12;
  plainView.setUint16(miscOffset + 2, content.ballCaught << 11, true);
  plainView.setUint32(miscOffset + 4, packIvData(content.ivs, content.isEgg, content.abilitySlot), true);

  const key = (pid ^ otId) >>> 0;
  const encrypted = new Uint8Array(48);
  const encView = new DataView(encrypted.buffer);
  for (let i = 0; i < 48; i += 4) {
    const word = plainView.getUint32(i, true);
    encView.setUint32(i, (word ^ key) >>> 0, true);
  }
  data.set(encrypted, 32);

  return data;
}

describe("SUBSTRUCTURE_ORDERS — full pid%24 permutation table", () => {
  const content: SubstructureContent = {
    species: 150,
    item: 13,
    experience: 12345,
    moves: [5, 10, 15, 20],
    evs: { hp: 1, attack: 2, defense: 3, speed: 4, spAtk: 5, spDef: 6 },
    ballCaught: 4,
    ivs: { hp: 31, attack: 20, defense: 15, speed: 10, spAtk: 25, spDef: 5 },
    isEgg: false,
    abilitySlot: 1,
  };

  it.each(EXPECTED_SUBSTRUCTURE_ORDERS.map((order, index) => ({ index, order })))(
    "correctly decodes Growth/Attacks/EVs/Misc for pid%%24 === $index",
    ({ index, order }) => {
      const otId = 1;
      const pid = index; // pid % 24 === index
      const data = buildPermutedPokemonBuffer(pid, otId, order, content);

      const result = decryptPokemonData(data, false);

      expect(result).not.toBeNull();
      expect(result!.species).toBe(content.species);
      expect(result!.heldItem).toBe(content.item);
      expect(result!.experience).toBe(content.experience);
      expect(result!.moves).toEqual(content.moves);
      expect(result!.evs).toEqual(content.evs);
      expect(result!.pokeball).toBe(content.ballCaught);
      expect(result!.ivs).toEqual(content.ivs);
      expect(result!.abilitySlot).toBe(content.abilitySlot);
      expect(result!.isEgg).toBe(content.isEgg);
    }
  );
});
