import { describe, it, expect, beforeEach } from "vitest";
import { getTrainerId, getTrainerName, getDeviceKey, regenerateTrainerId } from "../trainerIdentity";

// Build a real in-memory localStorage for these tests (the global setup.ts
// provides vi.fn() stubs with no backing store, which can't round-trip data).
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}

describe("trainerIdentity", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
  });

  describe("getTrainerId", () => {
    it("generates and persists an id on first call", () => {
      const id = getTrainerId();
      expect(id).toBeTruthy();
      expect(localStorage.getItem("pokemon-trainer-id")).toBe(id);
    });

    it("returns the same id on subsequent calls", () => {
      const first = getTrainerId();
      const second = getTrainerId();
      expect(second).toBe(first);
    });

    // The leaderboard API requires trainerId to match /^\d{5,10}$/ — regression
    // test for a format mismatch that made every leaderboard submission
    // through getTrainerId() fail server-side validation.
    it("generates an id matching the leaderboard API's 5-10 digit format", () => {
      const id = getTrainerId();
      expect(id).toMatch(/^\d{5,10}$/);
    });

    it("regenerates the id if the stored value doesn't match the digit format (corrupted/legacy)", () => {
      localStorage.setItem("pokemon-trainer-id", "not-digits-hex-abc123");
      const id = getTrainerId();
      expect(id).toMatch(/^\d{5,10}$/);
    });

    // Byte-compatibility: a pre-existing 5-digit id must survive an upgrade
    // unchanged, or every returning player loses their leaderboard identity.
    it("keeps a legacy 5-digit stored id unchanged", () => {
      localStorage.setItem("pokemon-trainer-id", "12345");
      const id = getTrainerId();
      expect(id).toBe("12345");
    });
  });

  describe("regenerateTrainerId", () => {
    it("issues a new id different from the previous one", () => {
      const first = getTrainerId();
      const second = regenerateTrainerId();
      expect(second).not.toBe(first);
      expect(second).toMatch(/^\d{5,10}$/);
    });

    it("persists the new id so subsequent getTrainerId() calls return it", () => {
      const regenerated = regenerateTrainerId();
      expect(getTrainerId()).toBe(regenerated);
    });
  });

  describe("getTrainerName", () => {
    it("defaults to 'Trainer' when unset", () => {
      expect(getTrainerName()).toBe("Trainer");
    });

    it("returns the persisted name", () => {
      localStorage.setItem("pokemon-trainer-name", "Ash");
      expect(getTrainerName()).toBe("Ash");
    });
  });

  describe("getDeviceKey", () => {
    it("generates and persists a device key on first call", () => {
      const key = getDeviceKey();
      expect(key).toBeTruthy();
      expect(localStorage.getItem("pokemon-device-key")).toBe(key);
    });

    it("returns the same device key on subsequent calls (stable across submissions)", () => {
      const first = getDeviceKey();
      const second = getDeviceKey();
      expect(second).toBe(first);
    });

    it("generates a sufficiently long, hex-encoded key", () => {
      const key = getDeviceKey();
      expect(key.length).toBeGreaterThanOrEqual(32);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it("regenerates a key if the stored value is too short (corrupted/legacy)", () => {
      localStorage.setItem("pokemon-device-key", "short");
      const key = getDeviceKey();
      expect(key).not.toBe("short");
      expect(key.length).toBeGreaterThanOrEqual(32);
    });

    it("is independent of the trainerId (different storage keys)", () => {
      const trainerId = getTrainerId();
      const deviceKey = getDeviceKey();
      expect(deviceKey).not.toBe(trainerId);
    });
  });
});
