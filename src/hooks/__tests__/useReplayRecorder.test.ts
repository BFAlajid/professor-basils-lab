import { renderHook, act } from "@testing-library/react";
import { useReplayRecorder } from "../useReplayRecorder";
import { createMockBattleState } from "@/test/mocks/pokemon";
import type { BattleLogEntry, BattleState } from "@/types";

/** Real in-memory localStorage so readStorage/writeStorage actually round-trip
 * data — the global test setup's default localStorage is a bare vi.fn() stub
 * with no backing store. */
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

// Mirrors battleReducer's capLog (MAX_LOG_ENTRIES = 200) so the test
// reproduces the real shape of a long battle's BattleState: `state.log` only
// ever holds the most recent 200 entries — see battleReducer.ts.
const MAX_LOG_ENTRIES = 200;
function capLog(log: BattleLogEntry[]): BattleLogEntry[] {
  return log.length > MAX_LOG_ENTRIES ? log.slice(log.length - MAX_LOG_ENTRIES) : log;
}

describe("useReplayRecorder", () => {
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

  it("saves a replay with the full log when the battle never approaches the cap", () => {
    const { result } = renderHook(() => useReplayRecorder());

    act(() => {
      result.current.startRecording(createMockBattleState({ turn: 0, log: [] }));
    });

    const turn1Log: BattleLogEntry[] = [{ turn: 1, message: "--- Turn 1 ---", kind: "info" }];
    const state = createMockBattleState({ turn: 1, log: turn1Log });
    act(() => {
      result.current.recordSnapshot(state);
    });

    let replay: ReturnType<typeof result.current.saveReplay>;
    act(() => {
      replay = result.current.saveReplay(state);
    });

    expect(replay).not.toBeNull();
    expect(replay!.fullLog).toEqual(turn1Log);
  });

  // Regression (Wave 7 re-review MINOR #9): battleReducer's capLog trims
  // BattleState.log to the last 200 entries for the live UI. useReplayRecorder
  // used to snapshot that same capped array with nothing else backing it up,
  // so a saved replay of a battle long enough to hit the cap permanently lost
  // its opening turns. The recorder must accumulate a full, untruncated log
  // independent of the per-turn cap.
  it("preserves the full log across a battle long enough to exceed the live 200-entry cap", () => {
    const { result } = renderHook(() => useReplayRecorder());

    act(() => {
      result.current.startRecording(createMockBattleState({ turn: 0, log: [] }));
    });

    let fullHistory: BattleLogEntry[] = [];
    let state: BattleState = createMockBattleState({ turn: 0, log: [] });

    // 80 turns * 3 entries/turn = 240 entries, comfortably past the 200 cap.
    for (let turn = 1; turn <= 80; turn++) {
      fullHistory = [
        ...fullHistory,
        { turn, message: `--- Turn ${turn} ---`, kind: "info" },
        { turn, message: "pikachu used tackle!", kind: "info" },
        { turn, message: "squirtle used tackle!", kind: "info" },
      ];
      // Simulate battleReducer handing back a state whose own log is already
      // capped, exactly like the real reducer does at the end of executeTurn.
      state = createMockBattleState({ turn, log: capLog(fullHistory) });
      act(() => {
        result.current.recordSnapshot(state);
      });
    }

    let replay: ReturnType<typeof result.current.saveReplay>;
    act(() => {
      replay = result.current.saveReplay(state);
    });

    expect(replay).not.toBeNull();
    // The final snapshot's own (live, capped) log has already lost turn 1 —
    // that part is the pre-existing, correct cap behavior for the LIVE UI.
    expect(state.log.some((e) => e.message === "--- Turn 1 ---")).toBe(false);
    // But the saved replay's full log must still have it.
    expect(replay!.fullLog?.some((e) => e.message === "--- Turn 1 ---")).toBe(true);
    expect(replay!.fullLog!.length).toBe(fullHistory.length);
    expect(replay!.fullLog!.length).toBeGreaterThan(MAX_LOG_ENTRIES);
  });
});
