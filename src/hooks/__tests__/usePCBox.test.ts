import { renderHook, act, waitFor } from "@testing-library/react";
import { mockCharizard } from "@/test/mocks/pokemon";
import { usePCBox } from "../usePCBox";
import { DEFAULT_BALL_INVENTORY } from "@/data/pokeBalls";
import { STORAGE_KEYS } from "@/utils/persistence";
import type { PCBoxPokemon } from "@/types";

vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
}));

import { fetchPokemonData } from "@/utils/pokeApiClient";

/** Real in-memory localStorage so readStorage/writeStorage actually round-trip
 * data — the global test setup's default localStorage is a bare vi.fn() stub
 * with no backing store. Scoped to the describe block below and restored
 * afterward so it doesn't affect the other tests in this file. */
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

function slimEntry(pokemonId: number, nickname?: string) {
  return {
    pokemonId,
    nickname,
    caughtWith: "poke-ball",
    caughtInArea: "Route 1",
    caughtDate: "2024-01-01T00:00:00.000Z",
    level: 5,
    nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "blaze",
  };
}

function buildBoxPokemon(overrides?: Partial<PCBoxPokemon>): PCBoxPokemon {
  return {
    pokemon: mockCharizard,
    caughtWith: "poke-ball",
    caughtInArea: "Route 1",
    caughtDate: new Date().toISOString(),
    level: 10,
    nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "blaze",
    ...overrides,
  };
}

describe("usePCBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addBalls", () => {
    it("adds to an existing ball count", () => {
      const { result } = renderHook(() => usePCBox());
      const before = result.current.ballInventory["great-ball"];

      act(() => {
        result.current.addBalls("great-ball", 5);
      });

      expect(result.current.ballInventory["great-ball"]).toBe(before + 5);
    });

    it("makes purchased balls usable via useBall after rerender", () => {
      const { result } = renderHook(() => usePCBox());

      act(() => {
        result.current.addBalls("master-ball", 3);
      });

      // DEFAULT_BALL_INVENTORY has 1 master-ball; +3 purchased = 4 usable.
      // Reading ballInventory here (a fresh render snapshot from React state,
      // not a stale localStorage read) is the actual regression check: the
      // purchased balls are immediately reflected for anything consuming
      // usePCBox's state, e.g. BallSelector.
      expect(result.current.ballInventory["master-ball"]).toBe(DEFAULT_BALL_INVENTORY["master-ball"] + 3);

      // The purchased balls are also consumable, proving they aren't stuck in
      // a stale closure or a separate localStorage-only write.
      act(() => {
        result.current.useBall("master-ball");
      });
      expect(result.current.ballInventory["master-ball"]).toBe(DEFAULT_BALL_INVENTORY["master-ball"] + 2);
    });

    it("persists the updated inventory to localStorage", () => {
      const { result } = renderHook(() => usePCBox());

      act(() => {
        result.current.addBalls("dive-ball", 2);
      });

      const setItemMock = window.localStorage.setItem as unknown as ReturnType<typeof vi.fn>;
      const lastBallCall = setItemMock.mock.calls
        .filter(([key]) => key === "pokemon-team-builder-ball-inventory")
        .pop();
      expect(lastBallCall).toBeDefined();
      const persisted = JSON.parse(lastBallCall![1]);
      expect(persisted["dive-ball"]).toBe(DEFAULT_BALL_INVENTORY["dive-ball"] + 2);
    });
  });

  describe("box operations", () => {
    it("addToBox appends a Pokemon and removeFromBox removes by index", () => {
      const { result } = renderHook(() => usePCBox());
      const mon = buildBoxPokemon();

      act(() => {
        result.current.addToBox(mon);
      });
      expect(result.current.box).toHaveLength(1);

      act(() => {
        result.current.removeFromBox(0);
      });
      expect(result.current.box).toHaveLength(0);
    });

    it("moveToTeam returns a TeamSlot built from the box entry without mutating the box", () => {
      const { result } = renderHook(() => usePCBox());
      const mon = buildBoxPokemon();

      act(() => {
        result.current.addToBox(mon);
      });

      let slot;
      act(() => {
        slot = result.current.moveToTeam(0);
      });

      expect(slot).not.toBeNull();
      expect(slot!.pokemon).toBe(mockCharizard);
      // moveToTeam itself is a pure read — box mutation is the caller's responsibility.
      expect(result.current.box).toHaveLength(1);
    });

    it("moveToTeam returns null for an out-of-range index", () => {
      const { result } = renderHook(() => usePCBox());
      let slot: unknown = "unset";
      act(() => {
        slot = result.current.moveToTeam(0);
      });
      expect(slot).toBeNull();
    });
  });

  describe("hydration + persistence guards (Wave 7 CRITICAL #1/#2)", () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        value: createMemoryStorage(),
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    // Regression CRITICAL #1: the beforeunload/visibilitychange/unmount flush
    // ignored the `enabled` (isHydrated) gate. If the user switches tabs or the
    // component unmounts while the async per-entry hydration fetch is still in
    // flight, `box` is still `[]` — flushing it used to wipe the whole PC box.
    it("does not write to storage when unmounted mid-hydration", () => {
      const seeded = [slimEntry(6, "Ash's Charizard")];
      localStorage.setItem(STORAGE_KEYS.pcBox, JSON.stringify(seeded));

      // Never resolves within this test — hydration stays in flight.
      vi.mocked(fetchPokemonData).mockReturnValue(new Promise(() => {}));

      const { unmount } = renderHook(() => usePCBox());

      // Unmount while the fetch is still pending (isHydrated is still false) —
      // exactly the tab-switch/close race the flush guards exist for.
      unmount();

      const stillStored = JSON.parse(localStorage.getItem(STORAGE_KEYS.pcBox)!);
      expect(stillStored).toEqual(seeded);
    });

    // Regression CRITICAL #2: entries whose hydration fetch rejected were mapped
    // to null and dropped from `box` — the next debounced write then persisted
    // the truncated box, permanently deleting those Pokemon after one transient
    // PokeAPI failure (or a 429 from the rate-limited proxy).
    it("keeps a failed-hydration entry in storage across a persist round-trip", async () => {
      const okEntry = slimEntry(6, "Survivor");
      const failEntry = slimEntry(9, "Lost One");
      localStorage.setItem(STORAGE_KEYS.pcBox, JSON.stringify([okEntry, failEntry]));

      vi.mocked(fetchPokemonData).mockImplementation(async (id: number) => {
        if (id === 9) throw new Error("PokeAPI 429");
        return { ...mockCharizard, id: 6 };
      });

      const { result, unmount } = renderHook(() => usePCBox());

      // Hydration completes once both entries — one success, one rejection —
      // have settled; only the successful one reaches `box`.
      await waitFor(() => expect(result.current.box).toHaveLength(1));
      expect(result.current.box[0].pokemon.id).toBe(6);

      // Force the debounced persist to flush.
      unmount();

      const persisted: Array<{ pokemonId: number }> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.pcBox)!
      );
      expect(persisted).toHaveLength(2);
      expect(persisted.some((e) => e.pokemonId === 9)).toBe(true);
      expect(persisted.some((e) => e.pokemonId === 6)).toBe(true);
    });

    // Regression (Wave 7 re-review MINOR #1): a failed-hydration entry used to
    // be appended at the tail on persist regardless of where it originally
    // sat in storage, silently reordering the box. It must now be spliced
    // back at its original index.
    it("splices a failed-hydration entry back at its original index instead of the tail", async () => {
      const first = slimEntry(6, "First");
      const middle = slimEntry(9, "Middle (fails)");
      const last = slimEntry(7, "Last");
      localStorage.setItem(STORAGE_KEYS.pcBox, JSON.stringify([first, middle, last]));

      vi.mocked(fetchPokemonData).mockImplementation(async (id: number) => {
        if (id === 9) throw new Error("PokeAPI 429");
        return { ...mockCharizard, id };
      });

      const { result, unmount } = renderHook(() => usePCBox());

      await waitFor(() => expect(result.current.box).toHaveLength(2));

      unmount();

      const persisted: Array<{ pokemonId: number }> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.pcBox)!
      );
      // Tail-append would have produced [6, 7, 9]; the fix preserves [6, 9, 7].
      expect(persisted.map((e) => e.pokemonId)).toEqual([6, 9, 7]);
    });

    it("hydrates and persists normally when every entry succeeds", async () => {
      localStorage.setItem(STORAGE_KEYS.pcBox, JSON.stringify([slimEntry(6, "Charizard")]));
      vi.mocked(fetchPokemonData).mockResolvedValue({ ...mockCharizard, id: 6 });

      const { result, unmount } = renderHook(() => usePCBox());
      await waitFor(() => expect(result.current.box).toHaveLength(1));

      unmount();

      const persisted: Array<{ pokemonId: number }> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.pcBox)!
      );
      expect(persisted).toHaveLength(1);
      expect(persisted[0].pokemonId).toBe(6);
    });
  });
});
