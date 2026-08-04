import { useCallback, useReducer, useState } from "react";
import { renderHook, act } from "@testing-library/react";
import { mockCharizard } from "@/test/mocks/pokemon";
import { statsReducer, DEFAULT_STATS } from "@/utils/statsReducer";
import type {
  BallType,
  Pokemon,
  WildEncounterState,
  StatStages,
} from "@/types";

vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
}));

import { useWildActions } from "../useWildActions";
import { fetchPokemonData } from "@/utils/pokeApiClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultStatStages(): StatStages {
  return { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

function buildEncounter(overrides?: Partial<WildEncounterState>): WildEncounterState {
  return {
    phase: "map",
    currentArea: null,
    wildPokemon: null,
    wildLevel: 1,
    wildCaptureRate: 45,
    wildCurrentHp: 0,
    wildMaxHp: 0,
    wildStatus: null,
    wildStatStages: defaultStatStages(),
    playerCurrentHp: 0,
    playerMaxHp: 0,
    playerStatus: null,
    playerStatStages: defaultStatStages(),
    encounterTurn: 0,
    shakeCount: 0,
    isCaught: false,
    isShiny: false,
    selectedBall: null,
    ...overrides,
  };
}

function buildDeps(overrides?: Partial<Parameters<typeof useWildActions>[0]>) {
  return {
    deps: {
      encounter: buildEncounter(),
      startEncounter: vi.fn(async () => {}),
      throwBall: vi.fn(),
      returnToMap: vi.fn(),
      addToBox: vi.fn(),
      removeFromBox: vi.fn(),
      moveToTeam: vi.fn(() => null) as (index: number) => { pokemon: Pokemon } | null,
      addBalls: vi.fn(),
      useBall: vi.fn(() => true),
      isAlreadyCaught: vi.fn(() => false),
      onAddToTeam: vi.fn(),
      markCaught: vi.fn(),
      incrementStat: vi.fn(),
      addUniqueBall: vi.fn(),
      addUniqueType: vi.fn(),
      addKantoSpecies: vi.fn(),
      spendMoney: vi.fn(),
      money: 1000,
      fossilInventory: {},
      setFossilInventory: vi.fn(),
      setBattleItemInventory: vi.fn(),
      setOwnedItems: vi.fn(),
      setIsSearching: vi.fn(),
      nuzlockeEnabled: false,
      isAreaEncountered: vi.fn(() => false),
      markAreaEncountered: vi.fn(),
      ...overrides,
    },
  };
}

/**
 * Wraps useWildActions with a REAL useState-backed fossilInventory (matching
 * production's usePersistedState) instead of a hand-rolled setter mock.
 * React's functional-updater setState callbacks are NOT guaranteed to run
 * synchronously — that only happens via an internal, undocumented
 * "eager bailout" when no other update is already pending on the fiber — so
 * a mock that always applies the updater immediately masks races that only
 * show up with real batching.
 */
function useFossilHarness(
  deps: ReturnType<typeof buildDeps>["deps"],
  initialFossils: Record<string, number>
) {
  const [fossilInventory, setFossilInventory] = useState(initialFossils);
  const actions = useWildActions({ ...deps, fossilInventory, setFossilInventory });
  return { ...actions, fossilInventory };
}

/** Same rationale as useFossilHarness, but for money/spendMoney — wired to
 * the real statsReducer so SPEND_MONEY's insufficient-funds guard applies. */
function usePokeMartHarness(
  deps: ReturnType<typeof buildDeps>["deps"],
  initialMoney: number
) {
  const [stats, dispatch] = useReducer(statsReducer, { ...DEFAULT_STATS, money: initialMoney });
  const spendMoney = useCallback((amount: number) => dispatch({ type: "SPEND_MONEY", amount }), []);
  const actions = useWildActions({ ...deps, money: stats.money, spendMoney });
  return { ...actions, money: stats.money };
}

describe("useWildActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Fix 1: ball-purchase desync
  // -------------------------------------------------------------------------
  describe("handlePokeMartBuy", () => {
    it("calls addBalls (React state) instead of writing localStorage directly", () => {
      const { deps } = buildDeps();
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      const { result } = renderHook(() => useWildActions(deps));

      let success = false;
      act(() => {
        success = result.current.handlePokeMartBuy(
          { id: "poke-ball", price: 200, category: "pokeball", ballType: "poke-ball" as BallType },
          3
        );
      });

      expect(success).toBe(true);
      expect(deps.addBalls).toHaveBeenCalledWith("poke-ball", 3);
      expect(deps.spendMoney).toHaveBeenCalledWith(600);
      // The dead "storage" event dispatch must be gone.
      expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "storage" }));
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
    });

    it("deducts money only when the item purchase succeeds (insufficient funds)", () => {
      const { deps } = buildDeps({ money: 100 });
      const { result } = renderHook(() => useWildActions(deps));

      let success = true;
      act(() => {
        success = result.current.handlePokeMartBuy(
          { id: "poke-ball", price: 200, category: "pokeball", ballType: "poke-ball" as BallType },
          3
        );
      });

      expect(success).toBe(false);
      expect(deps.addBalls).not.toHaveBeenCalled();
      expect(deps.spendMoney).not.toHaveBeenCalled();
    });

    it("routes non-ball items to the medicine/owned-item inventories", () => {
      const { deps } = buildDeps();
      const { result } = renderHook(() => useWildActions(deps));

      act(() => {
        result.current.handlePokeMartBuy({ id: "potion", price: 100, category: "medicine" }, 2);
      });
      expect(deps.setBattleItemInventory).toHaveBeenCalledTimes(1);
      expect(deps.addBalls).not.toHaveBeenCalled();

      act(() => {
        result.current.handlePokeMartBuy({ id: "repel", price: 50, category: "misc" }, 1);
      });
      expect(deps.setOwnedItems).toHaveBeenCalledTimes(1);
    });

    // Regression: a rapid double-submit (double-click/double-tap) dispatched both
    // purchases in the same React batch. Both read the same stale `money` value
    // and both added inventory, but statsReducer's SPEND_MONEY bails on the second
    // dispatch once the first has already brought the balance below the price —
    // the player kept items they didn't fully pay for.
    it("does not add inventory twice when a rapid double-submit can only afford one (real batching)", () => {
      const item = { id: "potion", price: 300, category: "medicine" };
      const { deps } = buildDeps();
      const { result } = renderHook(() => usePokeMartHarness(deps, 500));

      let r1 = false;
      let r2 = false;
      act(() => {
        r1 = result.current.handlePokeMartBuy(item, 1);
        r2 = result.current.handlePokeMartBuy(item, 1);
      });

      expect(r1).toBe(true);
      expect(r2).toBe(false);
      expect(deps.setBattleItemInventory).toHaveBeenCalledTimes(1);
      expect(result.current.money).toBe(200);
    });

    it("allows a later purchase once the reservation clears after a render (real batching)", () => {
      const item = { id: "potion", price: 300, category: "medicine" };
      const { deps } = buildDeps();
      const { result } = renderHook(() => usePokeMartHarness(deps, 500));

      act(() => {
        result.current.handlePokeMartBuy(item, 1); // succeeds, money -> 200
      });

      let r2 = false;
      act(() => {
        r2 = result.current.handlePokeMartBuy({ ...item, price: 150 }, 1); // affordable at 200
      });

      expect(r2).toBe(true);
      expect(result.current.money).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // Fix 4: moveToTeam should remove from the box, not copy
  // -------------------------------------------------------------------------
  describe("handleMoveToTeam", () => {
    it("adds to the team and removes the box entry on success", () => {
      const { deps } = buildDeps({
        moveToTeam: vi.fn(() => ({ pokemon: mockCharizard })),
      });
      const { result } = renderHook(() => useWildActions(deps));

      act(() => {
        result.current.handleMoveToTeam(2);
      });

      expect(deps.onAddToTeam).toHaveBeenCalledWith(mockCharizard);
      expect(deps.removeFromBox).toHaveBeenCalledWith(2);
    });

    it("does not touch the team or box when moveToTeam returns null", () => {
      const { deps } = buildDeps({ moveToTeam: vi.fn(() => null) });
      const { result } = renderHook(() => useWildActions(deps));

      act(() => {
        result.current.handleMoveToTeam(0);
      });

      expect(deps.onAddToTeam).not.toHaveBeenCalled();
      expect(deps.removeFromBox).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Fix 5: fossil revive atomic guard
  // -------------------------------------------------------------------------
  describe("handleReviveFossil", () => {
    it("revives only once when called twice back-to-back with a single fossil (real batching)", async () => {
      vi.mocked(fetchPokemonData).mockResolvedValue(mockCharizard);
      const { deps } = buildDeps();
      const { result } = renderHook(() => useFossilHarness(deps, { "helix-fossil": 1 }));

      let p1!: Promise<void>;
      let p2!: Promise<void>;
      await act(async () => {
        p1 = result.current.handleReviveFossil("helix-fossil");
        p2 = result.current.handleReviveFossil("helix-fossil");
        await Promise.all([p1, p2]);
      });

      expect(deps.addToBox).toHaveBeenCalledTimes(1);
      expect(result.current.fossilInventory["helix-fossil"]).toBe(0);
    });

    // Regression: with only the setState-updater guard, a rapid double-invoke's
    // SECOND call sees its updater deferred (not run eagerly, since a render is
    // already pending from the first call) — the synchronous `decremented` check
    // reads stale `false` and bails, even though a second fossil genuinely was
    // available. The fossil is silently consumed with nothing revived for it.
    it("revives both when two fossils are available for a rapid double-invoke (real batching)", async () => {
      vi.mocked(fetchPokemonData).mockResolvedValue(mockCharizard);
      const { deps } = buildDeps();
      const { result } = renderHook(() => useFossilHarness(deps, { "helix-fossil": 2 }));

      let p1!: Promise<void>;
      let p2!: Promise<void>;
      await act(async () => {
        p1 = result.current.handleReviveFossil("helix-fossil");
        p2 = result.current.handleReviveFossil("helix-fossil");
        await Promise.all([p1, p2]);
      });

      expect(deps.addToBox).toHaveBeenCalledTimes(2);
      expect(result.current.fossilInventory["helix-fossil"]).toBe(0);
    });

    it("does nothing when the fossil count is already zero", async () => {
      const { deps } = buildDeps();
      const { result } = renderHook(() => useFossilHarness(deps, { "helix-fossil": 0 }));

      await act(async () => {
        await result.current.handleReviveFossil("helix-fossil");
      });

      expect(deps.addToBox).not.toHaveBeenCalled();
      expect(fetchPokemonData).not.toHaveBeenCalled();
    });

    it("restores the fossil count if the revive fetch fails", async () => {
      vi.mocked(fetchPokemonData).mockRejectedValue(new Error("network error"));
      const { deps } = buildDeps();
      const { result } = renderHook(() => useFossilHarness(deps, { "helix-fossil": 1 }));

      await act(async () => {
        await result.current.handleReviveFossil("helix-fossil");
      });

      expect(deps.addToBox).not.toHaveBeenCalled();
      expect(result.current.fossilInventory["helix-fossil"]).toBe(1);
    });
  });
});
