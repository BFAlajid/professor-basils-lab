import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEYS,
  readStorage,
  writeStorage,
  exportAllData,
  importAllData,
  clearAllData,
} from "@/utils/persistence";
import {
  toSlimBoxEntry,
  normalizeStoredBoxEntry,
  isLegacyBoxEntry,
  type SlimBoxEntry,
} from "@/utils/pcBoxStorage";
import { mockCharizard } from "@/test/mocks/pokemon";
import type { PCBoxPokemon } from "@/types";

// Build a real in-memory localStorage (the global setup.ts stub returns
// undefined, not null, from getItem — unsuitable for round-trip testing).
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}

beforeEach(() => {
  const memStorage = createMemoryStorage();
  Object.defineProperty(window, "localStorage", {
    value: memStorage,
    writable: true,
    configurable: true,
  });
});

// ── Every registered key round-trips ────────────────────────────────────

describe("STORAGE_KEYS round-trip", () => {
  it("every registered key writes and reads back its value", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      const value = { probe: key };
      expect(writeStorage(key, value)).toBe(true);
      expect(readStorage(key, null)).toEqual(value);
    }
  });

  it("has no duplicate key values (each hook owns a distinct slot)", () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ── Export visibility — the bug this refactor kills ─────────────────────
// Before R1, hand-rolled hooks wrote to unregistered keys, so
// exportAllData()/importAllData() silently omitted their data from
// backup/restore. Every migrated hook's key must now be registered and
// visible to export.

describe("exportAllData includes every migrated hook's key", () => {
  it("surfaces a value written through each migrated hook's storage key", () => {
    // One representative write per migrated hook/util, using each one's
    // real persisted shape.
    writeStorage(STORAGE_KEYS.achievements, { stats: {}, unlockedIds: {} });
    writeStorage(STORAGE_KEYS.nuzlocke, { enabled: true, encounteredAreas: ["route-1"], graveyard: [], isGameOver: false });
    writeStorage(STORAGE_KEYS.battleTowerStreak, 12);
    writeStorage(STORAGE_KEYS.gymBadges, ["Boulder Badge"]);
    writeStorage(STORAGE_KEYS.pcBox, [{ pokemonId: 6, caughtWith: "poke-ball", caughtInArea: "Route 1", caughtDate: "2026-01-01", level: 10, nature: { name: "adamant", increased: "attack", decreased: "spAtk" }, ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 }, ability: "blaze" }]);
    writeStorage(STORAGE_KEYS.ballInventory, { "poke-ball": 5 });
    writeStorage(STORAGE_KEYS.dayCare, { pair: null, eggs: [] });
    writeStorage(STORAGE_KEYS.wonderTrade, []);
    writeStorage(STORAGE_KEYS.mysteryGift, { claimedDates: ["2026-01-01"], totalClaimed: 1 });
    writeStorage(STORAGE_KEYS.berryFarm, { plots: [], inventory: {} });
    writeStorage(STORAGE_KEYS.slotCoins, 250);
    writeStorage(STORAGE_KEYS.gameCornerCoins, 40);
    writeStorage(STORAGE_KEYS.typeQuizBest, 90);
    writeStorage(STORAGE_KEYS.battleReplays, []);
    writeStorage(STORAGE_KEYS.hallOfFame, []);
    writeStorage(STORAGE_KEYS.keybinds, { z: "A" });
    // Raw (non-JSON) string keys — trainerIdentity.ts / useTrainerCard.ts
    localStorage.setItem(STORAGE_KEYS.trainerName, "Ash");
    localStorage.setItem(STORAGE_KEYS.trainerId, "12345");
    localStorage.setItem(STORAGE_KEYS.deviceKey, "a".repeat(64));
    localStorage.setItem(STORAGE_KEYS.trainerFirstSave, "2026-01-01T00:00:00.000Z");

    const parsed = JSON.parse(exportAllData());

    expect(parsed.data[STORAGE_KEYS.achievements]).toEqual({ stats: {}, unlockedIds: {} });
    expect(parsed.data[STORAGE_KEYS.nuzlocke].enabled).toBe(true);
    expect(parsed.data[STORAGE_KEYS.battleTowerStreak]).toBe(12);
    expect(parsed.data[STORAGE_KEYS.gymBadges]).toEqual(["Boulder Badge"]);
    expect(parsed.data[STORAGE_KEYS.pcBox]).toHaveLength(1);
    expect(parsed.data[STORAGE_KEYS.ballInventory]).toEqual({ "poke-ball": 5 });
    expect(parsed.data[STORAGE_KEYS.dayCare]).toEqual({ pair: null, eggs: [] });
    expect(parsed.data[STORAGE_KEYS.wonderTrade]).toEqual([]);
    expect(parsed.data[STORAGE_KEYS.mysteryGift].totalClaimed).toBe(1);
    expect(parsed.data[STORAGE_KEYS.berryFarm]).toEqual({ plots: [], inventory: {} });
    expect(parsed.data[STORAGE_KEYS.slotCoins]).toBe(250);
    expect(parsed.data[STORAGE_KEYS.gameCornerCoins]).toBe(40);
    expect(parsed.data[STORAGE_KEYS.typeQuizBest]).toBe(90);
    expect(parsed.data[STORAGE_KEYS.battleReplays]).toEqual([]);
    expect(parsed.data[STORAGE_KEYS.hallOfFame]).toEqual([]);
    expect(parsed.data[STORAGE_KEYS.keybinds]).toEqual({ z: "A" });
    // Raw-string keys: JSON.parse fails on unquoted "Ash" -> exportAllData
    // falls back to the raw string (see its try/catch), so this proves the
    // legacy-string format survives export intact rather than being dropped.
    expect(parsed.data[STORAGE_KEYS.trainerName]).toBe("Ash");
    // trainerId is a digit-only raw string ("12345"), which happens to be
    // valid JSON on its own — exportAllData's JSON.parse succeeds and
    // yields the NUMBER 12345, not the string. This doesn't lose data (see
    // the round-trip test below, which confirms import restores "12345"
    // as a string again via JSON.stringify), it just means the exported
    // JSON blob types this field as a number rather than a string.
    expect(parsed.data[STORAGE_KEYS.trainerId]).toBe(12345);
    expect(parsed.data[STORAGE_KEYS.deviceKey]).toBe("a".repeat(64));
  });
});

// ── PC box old-format -> slim migration ─────────────────────────────────

describe("PC box format migration", () => {
  function buildLegacyEntry(overrides?: Partial<PCBoxPokemon>): PCBoxPokemon {
    return {
      pokemon: mockCharizard,
      nickname: "Ol' Reliable",
      caughtWith: "great-ball",
      caughtInArea: "Route 1",
      caughtDate: "2026-01-01T00:00:00.000Z",
      level: 36,
      nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
      ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      ability: "blaze",
      isShiny: true,
      ...overrides,
    };
  }

  it("recognizes a full-object legacy entry", () => {
    expect(isLegacyBoxEntry(buildLegacyEntry())).toBe(true);
    expect(isLegacyBoxEntry({ pokemonId: 6 })).toBe(false);
  });

  it("converts a legacy entry to slim form without losing data", () => {
    const legacy = buildLegacyEntry();
    const slim = toSlimBoxEntry(legacy);

    expect(slim.pokemonId).toBe(mockCharizard.id);
    expect(slim.nickname).toBe("Ol' Reliable");
    expect(slim.caughtWith).toBe("great-ball");
    expect(slim.caughtInArea).toBe("Route 1");
    expect(slim.level).toBe(36);
    expect(slim.nature).toEqual(legacy.nature);
    expect(slim.ivs).toEqual(legacy.ivs);
    expect(slim.ability).toBe("blaze");
    expect(slim.isShiny).toBe(true);
    // The whole point of the migration: no full Pokemon payload survives.
    expect(slim).not.toHaveProperty("pokemon");
  });

  it("normalizeStoredBoxEntry converts either format to slim shape", () => {
    const legacy = buildLegacyEntry();
    const fromLegacy = normalizeStoredBoxEntry(legacy);
    expect(fromLegacy?.pokemonId).toBe(mockCharizard.id);

    const alreadySlim: SlimBoxEntry = toSlimBoxEntry(legacy);
    const fromSlim = normalizeStoredBoxEntry(alreadySlim);
    expect(fromSlim).toEqual(alreadySlim);

    expect(normalizeStoredBoxEntry({ garbage: true })).toBeNull();
    expect(normalizeStoredBoxEntry(null)).toBeNull();
  });

  it("a stored array of legacy entries all migrate to slim form", () => {
    const legacyBox: PCBoxPokemon[] = [
      buildLegacyEntry({ nickname: "First" }),
      buildLegacyEntry({ nickname: "Second", isShiny: false }),
    ];
    writeStorage(STORAGE_KEYS.pcBox, legacyBox);

    const raw = readStorage<unknown[]>(STORAGE_KEYS.pcBox, []);
    const migrated = raw.map((e) => normalizeStoredBoxEntry(e)).filter((e): e is SlimBoxEntry => e !== null);

    expect(migrated).toHaveLength(2);
    expect(migrated[0].nickname).toBe("First");
    expect(migrated[1].nickname).toBe("Second");
    expect(migrated.every((e) => typeof e.pokemonId === "number")).toBe(true);
  });
});

// ── Import / export round-trip ──────────────────────────────────────────

describe("import/export round-trip across migrated keys", () => {
  it("restores every migrated key's data after export -> clear -> import", () => {
    writeStorage(STORAGE_KEYS.achievements, { stats: { totalCaught: 5 }, unlockedIds: {} });
    writeStorage(STORAGE_KEYS.nuzlocke, { enabled: true, encounteredAreas: [], graveyard: [], isGameOver: false });
    writeStorage(STORAGE_KEYS.pcBox, [{ pokemonId: 25, caughtWith: "poke-ball", caughtInArea: "Viridian Forest", caughtDate: "2026-01-01", level: 5, nature: { name: "jolly", increased: "speed", decreased: "spAtk" }, ivs: { hp: 1, attack: 1, defense: 1, spAtk: 1, spDef: 1, speed: 1 }, ability: "static" }]);
    writeStorage(STORAGE_KEYS.berryFarm, { plots: [], inventory: { oran: 3 } });
    localStorage.setItem(STORAGE_KEYS.trainerName, "Red");
    localStorage.setItem(STORAGE_KEYS.trainerId, "12345");

    const backup = exportAllData();
    clearAllData();

    expect(localStorage.getItem(STORAGE_KEYS.achievements)).toBeNull();

    const count = importAllData(backup);
    expect(count).toBeGreaterThanOrEqual(6);

    expect(readStorage<{ stats: { totalCaught: number } }>(STORAGE_KEYS.achievements, { stats: { totalCaught: 0 } }).stats.totalCaught).toBe(5);
    expect(readStorage(STORAGE_KEYS.nuzlocke, null)).toMatchObject({ enabled: true });
    expect(readStorage<unknown[]>(STORAGE_KEYS.pcBox, [])).toHaveLength(1);
    expect(readStorage(STORAGE_KEYS.berryFarm, null)).toMatchObject({ inventory: { oran: 3 } });
    expect(localStorage.getItem(STORAGE_KEYS.trainerName)).toBe("Red");
    // Digit-only raw string: confirms the number/string quirk documented
    // above doesn't lose data — it comes back as the identical raw string.
    expect(localStorage.getItem(STORAGE_KEYS.trainerId)).toBe("12345");
  });
});
