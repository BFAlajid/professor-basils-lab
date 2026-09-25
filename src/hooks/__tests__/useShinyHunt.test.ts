import { renderHook, act } from "@testing-library/react";
import { useShinyHunt } from "../useShinyHunt";
import { STORAGE_KEYS } from "@/utils/persistence";
import type { ShinyHuntState } from "@/types/shinyHunt";

// A real in-memory localStorage so writes round-trip (the global setup.ts
// stub has no backing store) — same pattern as useDailyChallenge.test.ts.
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

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
});

describe("useShinyHunt — startHunt", () => {
  it("begins a fresh hunt with zeroed counters and no foundAt", () => {
    const { result } = renderHook(() => useShinyHunt());

    act(() => result.current.startHunt("pikachu", "full-odds"));

    expect(result.current.state.active).toMatchObject({
      species: "pikachu",
      method: "full-odds",
      encounters: 0,
      chain: 0,
      foundAt: null,
    });
    expect(result.current.state.phases).toEqual([]);
  });

  it("is a no-op when a hunt is already active", () => {
    const { result } = renderHook(() => useShinyHunt());

    act(() => result.current.startHunt("pikachu", "full-odds"));
    const firstId = result.current.state.active?.id;

    act(() => result.current.startHunt("eevee", "masuda"));

    expect(result.current.state.active?.id).toBe(firstId);
    expect(result.current.state.active?.species).toBe("pikachu");
  });
});

describe("useShinyHunt — recordEncounter", () => {
  it("is a no-op when nothing is active", () => {
    const { result } = renderHook(() => useShinyHunt());
    const before = result.current.state;

    act(() => result.current.recordEncounter("pikachu", false));

    expect(result.current.state).toBe(before);
  });

  it("increments the chain and encounters when the target species is seen", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));

    act(() => result.current.recordEncounter("pikachu", false));
    expect(result.current.state.active?.encounters).toBe(1);
    expect(result.current.state.active?.chain).toBe(1);

    act(() => result.current.recordEncounter("pikachu", false));
    expect(result.current.state.active?.encounters).toBe(2);
    expect(result.current.state.active?.chain).toBe(2);
  });

  it("breaks the chain back to 0 when a different species is seen, but still counts the encounter", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));

    act(() => result.current.recordEncounter("pikachu", false));
    act(() => result.current.recordEncounter("rattata", false));

    expect(result.current.state.active?.encounters).toBe(2);
    expect(result.current.state.active?.chain).toBe(0);
  });

  it("completes the hunt when the target species is shiny — archives to history and clears active/phases", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));
    act(() => result.current.recordEncounter("pikachu", false));

    act(() => result.current.recordEncounter("pikachu", true));

    expect(result.current.state.active).toBeNull();
    expect(result.current.state.phases).toEqual([]);
    expect(result.current.state.history).toHaveLength(1);
    expect(result.current.state.history[0]).toMatchObject({
      species: "pikachu",
      encounters: 2,
      chain: 2,
    });
    expect(result.current.state.history[0].foundAt).not.toBeNull();
  });

  it("logs a phase (and keeps hunting) when a different species turns up shiny", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));
    act(() => result.current.recordEncounter("pikachu", false));

    act(() => result.current.recordEncounter("zubat", true));

    expect(result.current.state.active).not.toBeNull();
    expect(result.current.state.active?.foundAt).toBeNull();
    expect(result.current.state.phases).toHaveLength(1);
    expect(result.current.state.phases[0]).toMatchObject({
      species: "zubat",
      encounterOfHunt: 2,
    });
    expect(result.current.state.history).toEqual([]);
  });

  it("caps phases at 50 entries, dropping the oldest first", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));

    act(() => {
      for (let i = 0; i < 51; i++) {
        result.current.recordEncounter(`decoy-${i}`, true);
      }
    });

    expect(result.current.state.phases).toHaveLength(50);
    // Newest phase (51st call, encounterOfHunt === 51) is unshifted to the front.
    expect(result.current.state.phases[0]).toMatchObject({ species: "decoy-50", encounterOfHunt: 51 });
    // Oldest phase (encounterOfHunt === 1) was dropped.
    expect(result.current.state.phases.some((p) => p.encounterOfHunt === 1)).toBe(false);
  });
});

describe("useShinyHunt — switchTarget", () => {
  it("archives the active hunt to history and starts a new one for a different species", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));
    act(() => result.current.recordEncounter("pikachu", false));

    act(() => result.current.switchTarget("eevee", "masuda"));

    expect(result.current.state.active).toMatchObject({ species: "eevee", method: "masuda", encounters: 0, chain: 0 });
    expect(result.current.state.phases).toEqual([]);
    expect(result.current.state.history).toHaveLength(1);
    expect(result.current.state.history[0]).toMatchObject({ species: "pikachu", encounters: 1, foundAt: null });
  });

  it("starts a fresh hunt without touching history when nothing was active", () => {
    const { result } = renderHook(() => useShinyHunt());

    act(() => result.current.switchTarget("eevee", "masuda"));

    expect(result.current.state.active?.species).toBe("eevee");
    expect(result.current.state.history).toEqual([]);
  });
});

describe("useShinyHunt — abandonHunt", () => {
  it("archives the active hunt (foundAt stays null) and clears active/phases", () => {
    const { result } = renderHook(() => useShinyHunt());
    act(() => result.current.startHunt("pikachu", "full-odds"));
    act(() => result.current.recordEncounter("pikachu", false));

    act(() => result.current.abandonHunt());

    expect(result.current.state.active).toBeNull();
    expect(result.current.state.phases).toEqual([]);
    expect(result.current.state.history).toHaveLength(1);
    expect(result.current.state.history[0]).toMatchObject({ species: "pikachu", foundAt: null });
  });

  it("is a no-op when nothing is active", () => {
    const { result } = renderHook(() => useShinyHunt());
    const before = result.current.state;

    act(() => result.current.abandonHunt());

    expect(result.current.state).toBe(before);
  });
});

describe("useShinyHunt — persistence", () => {
  it("persists state to localStorage under STORAGE_KEYS.shinyHunts", () => {
    const { result } = renderHook(() => useShinyHunt());

    act(() => result.current.startHunt("pikachu", "chain"));

    const raw = window.localStorage.getItem(STORAGE_KEYS.shinyHunts);
    expect(raw).toBeTruthy();
    const persisted: ShinyHuntState = JSON.parse(raw!);
    expect(persisted.active?.species).toBe("pikachu");
  });

  it("hydrates state from a previously-persisted value on mount", () => {
    const seeded: ShinyHuntState = {
      active: { id: "hunt-seed", species: "gengar", method: "radar", encounters: 5, chain: 3, startedAt: new Date().toISOString(), foundAt: null },
      phases: [],
      history: [],
    };
    window.localStorage.setItem(STORAGE_KEYS.shinyHunts, JSON.stringify(seeded));

    const { result } = renderHook(() => useShinyHunt());

    expect(result.current.state.active?.species).toBe("gengar");
    expect(result.current.state.active?.encounters).toBe(5);
  });

  it("falls back to the initial state when persisted data is malformed", () => {
    window.localStorage.setItem(STORAGE_KEYS.shinyHunts, "not valid json");

    const { result } = renderHook(() => useShinyHunt());

    expect(result.current.state.active).toBeNull();
    expect(result.current.state.phases).toEqual([]);
    expect(result.current.state.history).toEqual([]);
  });
});
