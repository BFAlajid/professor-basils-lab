import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  STORAGE_KEYS,
  readStorage,
  readStorageValidated,
  writeStorage,
  removeStorage,
  getStorageUsageSync,
  exportAllData,
  importAllData,
  clearAllData,
} from "@/utils/persistence";

// Build a real in-memory localStorage for these tests (the global
// setup.ts provides vi.fn() stubs which aren't suitable for integration
// testing of read-after-write).
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

// ── Key Registry ───────────────────────────────────────────────────────

describe("STORAGE_KEYS", () => {
  it("contains expected key count", () => {
    const keys = Object.values(STORAGE_KEYS);
    expect(keys.length).toBeGreaterThanOrEqual(22);
  });

  it("has no duplicate values", () => {
    const values = Object.values(STORAGE_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("all values are non-empty strings", () => {
    for (const val of Object.values(STORAGE_KEYS)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

// ── readStorage / writeStorage ─────────────────────────────────────────

describe("readStorage", () => {
  it("returns fallback when key is missing", () => {
    expect(readStorage("nonexistent", 42)).toBe(42);
  });

  it("returns parsed JSON for an existing key", () => {
    localStorage.setItem("test-key", JSON.stringify({ a: 1 }));
    expect(readStorage("test-key", {})).toEqual({ a: 1 });
  });

  it("returns fallback on invalid JSON", () => {
    localStorage.setItem("bad-json", "{invalid");
    expect(readStorage("bad-json", "fallback")).toBe("fallback");
  });

  it("returns fallback when localStorage throws", () => {
    const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });
    expect(readStorage("key", 99)).toBe(99);
    spy.mockRestore();
  });
});

describe("writeStorage", () => {
  it("writes and reads back a value", () => {
    expect(writeStorage("round-trip", [1, 2, 3])).toBe(true);
    expect(readStorage("round-trip", [])).toEqual([1, 2, 3]);
  });

  it("returns false on quota error", () => {
    const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    expect(writeStorage("full", "data")).toBe(false);
    spy.mockRestore();
  });
});

// ── readStorageValidated ───────────────────────────────────────────────

describe("readStorageValidated", () => {
  it("uses validator to transform stored data", () => {
    localStorage.setItem("validated", JSON.stringify({ count: 5 }));
    const validate = (raw: unknown): number | null => {
      if (raw && typeof raw === "object" && "count" in raw) {
        return (raw as { count: number }).count;
      }
      return null;
    };
    expect(readStorageValidated("validated", 0, validate)).toBe(5);
  });

  it("returns fallback when validator returns null", () => {
    localStorage.setItem("validated", JSON.stringify("bad shape"));
    const validate = (_: unknown): number | null => null;
    expect(readStorageValidated("validated", 99, validate)).toBe(99);
  });

  it("returns fallback on missing key", () => {
    const validate = (raw: unknown) => raw as string | null;
    expect(readStorageValidated("missing", "default", validate)).toBe("default");
  });
});

// ── removeStorage ──────────────────────────────────────────────────────

describe("removeStorage", () => {
  it("removes an existing key", () => {
    writeStorage("to-remove", "value");
    expect(readStorage("to-remove", null)).toBe("value");
    removeStorage("to-remove");
    expect(readStorage("to-remove", null)).toBe(null);
  });
});

// ── getStorageUsageSync ────────────────────────────────────────────────

describe("getStorageUsageSync", () => {
  it("returns zero usage when storage is empty", () => {
    const usage = getStorageUsageSync();
    expect(usage.used).toBe(0);
    expect(usage.limit).toBeGreaterThan(0);
    expect(usage.percent).toBe(0);
  });

  it("measures usage for registered keys", () => {
    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify([1, 2, 3]));
    const usage = getStorageUsageSync();
    expect(usage.used).toBeGreaterThan(0);
  });

  it("ignores unregistered keys", () => {
    localStorage.setItem("unregistered-key", "some data");
    const usage = getStorageUsageSync();
    expect(usage.used).toBe(0);
  });
});

// ── Export / Import ────────────────────────────────────────────────────

describe("exportAllData", () => {
  it("exports stored data as valid JSON", () => {
    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify([1, 2]));
    localStorage.setItem(STORAGE_KEYS.trainerName, JSON.stringify("Ash"));
    const json = exportAllData();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.data[STORAGE_KEYS.team]).toEqual([1, 2]);
    expect(parsed.data[STORAGE_KEYS.trainerName]).toBe("Ash");
  });

  it("omits keys with no stored value", () => {
    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify([1]));
    const json = exportAllData();
    const parsed = JSON.parse(json);
    expect(STORAGE_KEYS.pokedex in parsed.data).toBe(false);
  });

  it("returns empty data when storage is empty", () => {
    const json = exportAllData();
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed.data).length).toBe(0);
  });
});

describe("importAllData", () => {
  it("restores exported data", () => {
    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify([1, 2, 3]));
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify({ stats: {} }));
    const backup = exportAllData();

    clearAllData();
    expect(localStorage.getItem(STORAGE_KEYS.team)).toBeNull();

    const count = importAllData(backup);
    expect(count).toBe(2);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.team)!)).toEqual([1, 2, 3]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements)!)).toEqual({ stats: {} });
  });

  it("ignores unknown keys in import data", () => {
    const payload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        "unknown-key-xyz": "should be ignored",
        [STORAGE_KEYS.team]: [1],
      },
    });
    const count = importAllData(payload);
    expect(count).toBe(1);
    expect(localStorage.getItem("unknown-key-xyz")).toBeNull();
  });

  it("throws on invalid JSON", () => {
    expect(() => importAllData("{bad json")).toThrow();
  });

  it("throws on missing version", () => {
    expect(() => importAllData(JSON.stringify({ data: {} }))).toThrow(
      "missing version or data field",
    );
  });

  it("throws on unsupported version", () => {
    expect(() =>
      importAllData(JSON.stringify({ version: 99, data: {} })),
    ).toThrow("Unsupported save data version");
  });

  it("throws when data is not an object", () => {
    expect(() =>
      importAllData(JSON.stringify({ version: 1, data: "not-object" })),
    ).toThrow("data must be an object");
  });
});

// ── clearAllData ───────────────────────────────────────────────────────

describe("clearAllData", () => {
  it("removes all registered keys", () => {
    localStorage.setItem(STORAGE_KEYS.team, "[]");
    localStorage.setItem(STORAGE_KEYS.pokedex, "{}");
    localStorage.setItem("unregistered", "keep");

    clearAllData();

    expect(localStorage.getItem(STORAGE_KEYS.team)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.pokedex)).toBeNull();
    // unregistered keys should be untouched
    expect(localStorage.getItem("unregistered")).toBe("keep");
  });
});
