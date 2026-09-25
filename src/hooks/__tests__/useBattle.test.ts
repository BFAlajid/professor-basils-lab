import { renderHook, act } from "@testing-library/react";
import type { TeamSlot, BattleTurnAction, BattleAction } from "@/types";

// Shape of the fake state produced by the mocked battleReducer below (a subset
// of the real BattleState — only the fields the hook itself reads/writes, plus
// `lastAction` for asserting exactly what was dispatched).
interface MockBattleState {
  mode: string;
  format: string;
  phase: string;
  turn: number;
  winner: string | null;
  player1: { pokemon: unknown[]; activePokemonIndex: number; activePokemonIndex2: number | null };
  player2: { pokemon: unknown[]; activePokemonIndex: number; activePokemonIndex2: number | null };
  lastAction?: BattleAction;
}

function lastActionOf(state: unknown): BattleAction | undefined {
  return (state as MockBattleState).lastAction;
}

// ---------------------------------------------------------------------------
// useBattle.ts (test-gaps report Top 10 #4): mock every module boundary the
// hook imports, then drive behavior via renderHook/act — the established
// pattern from useTeam.test.ts / useWildEncounter.test.ts. The reducer itself
// is exhaustively covered elsewhere (battleReducer.test.ts, battleDoubles.test.ts,
// battleTurnOrder.test.ts); here we only verify the hook's own orchestration:
// the doubles action-buffering state machine, singles auto-dispatch, the
// reset-clears-buffer regression, and the generateOpponent loading flag.
// ---------------------------------------------------------------------------

const clearRecordingMock = vi.fn();

vi.mock("../useReplayRecorder", () => ({
  useReplayRecorder: () => ({
    startRecording: vi.fn(),
    recordSnapshot: vi.fn(),
    clearRecording: clearRecordingMock,
    saveReplay: vi.fn(),
    loadReplays: vi.fn(() => []),
    deleteReplay: vi.fn(),
  }),
}));

vi.mock("@/utils/battle", () => ({
  // A minimal fake reducer: START_BATTLE/RESET_BATTLE update the fields the
  // hook itself reads (mode/format/phase); every other action is recorded
  // verbatim as `lastAction` so tests can assert exactly what was dispatched
  // without depending on the real (separately-tested) turn-resolution logic.
  battleReducer: vi.fn((state: Record<string, unknown>, action: { type: string; mode?: string; format?: string }) => {
    if (action.type === "START_BATTLE") {
      return { ...state, mode: action.mode, format: action.format ?? "singles", phase: "action_select" };
    }
    if (action.type === "RESET_BATTLE") {
      return { ...state, lastAction: action, phase: "setup" };
    }
    return { ...state, lastAction: action };
  }),
  initialBattleState: {
    mode: "ai",
    format: "singles",
    phase: "setup",
    turn: 0,
    winner: null,
    player1: { pokemon: [], activePokemonIndex: 0, activePokemonIndex2: null },
    player2: { pokemon: [], activePokemonIndex: 0, activePokemonIndex2: 1 },
  },
}));

vi.mock("@/utils/battleHelpers", () => ({
  getActivePokemonBySlot: vi.fn(() => ({
    isFainted: false,
    slot: { selectedMoves: ["tackle", "quick-attack"] },
  })),
}));

vi.mock("@/utils/moveCache", () => ({
  fetchAndCacheMoves: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/utils/aiWasm", () => ({
  selectAIAction: vi.fn(() => ({ type: "MOVE", moveIndex: 0 })),
  generateRandomTeam: vi.fn(() => Promise.resolve([])),
  getBestSwitchIn: vi.fn(() => 0),
}));

vi.mock("@/data/megaStones", () => ({
  isMegaStone: vi.fn(() => false),
  getMegaStone: vi.fn(() => undefined),
}));

vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
}));

vi.mock("@/utils/audioManager", () => ({
  playTrack: vi.fn(),
}));

import { useBattle } from "../useBattle";
import { selectAIAction, generateRandomTeam } from "@/utils/aiWasm";
import { mockCharizard } from "@/test/mocks/pokemon";

function fakeSlot(): TeamSlot {
  return {
    pokemon: mockCharizard,
    position: 0,
    selectedMoves: ["tackle"],
    nature: null,
    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: null,
    heldItem: null,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useBattle — submitPlayerAction", () => {
  it("singles: a single call immediately dispatches EXECUTE_TURN with an AI-selected player2Action", async () => {
    const aiAction: BattleTurnAction = { type: "MOVE", moveIndex: 2 };
    vi.mocked(selectAIAction).mockReturnValue(aiAction);

    const { result } = renderHook(() => useBattle());
    await act(async () => {
      await result.current.startBattle([fakeSlot()], [fakeSlot()], "ai");
    });

    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 0 });
    });

    expect(lastActionOf(result.current.state)).toEqual({
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: aiAction,
    });
  });

  it("doubles: the first call buffers the action (slot 0) and does not dispatch", async () => {
    const { result } = renderHook(() => useBattle());
    await act(async () => {
      await result.current.startBattle([fakeSlot()], [fakeSlot()], "ai", null, null, "normal", "doubles");
    });

    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 0, target: "opp0" });
    });

    expect(lastActionOf(result.current.state)).toBeUndefined();
  });

  it("doubles: the second call dispatches EXECUTE_TURN with both player actions tagged by slot", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const aiAction1: BattleTurnAction = { type: "MOVE", moveIndex: 3 };
    vi.mocked(selectAIAction).mockReturnValue(aiAction1);

    const { result } = renderHook(() => useBattle());
    await act(async () => {
      await result.current.startBattle([fakeSlot()], [fakeSlot()], "ai", null, null, "normal", "doubles");
    });

    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 0, target: "opp0" });
    });
    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 1, target: "opp1" });
    });

    const lastAction = lastActionOf(result.current.state);
    expect(lastAction.type).toBe("EXECUTE_TURN");
    expect(lastAction.player1Action).toEqual({ type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 });
    expect(lastAction.player1Action2).toEqual({ type: "MOVE", moveIndex: 1, target: "opp1", slot: 1 });
    expect(lastAction.player2Action).toEqual({ type: "MOVE", moveIndex: 3, slot: 0 });
    // aiAction2 derived from getActivePokemonBySlot (mocked, not fainted) + Math.random pinned to 0.5
    expect(lastAction.player2Action2).toEqual({ type: "MOVE", moveIndex: 1, target: "opp1", slot: 1 });

    vi.restoreAllMocks();
  });
});

describe("useBattle — resetBattle", () => {
  it("clears the doubles action buffer so a stale buffered action does not leak into the next battle", async () => {
    const { result } = renderHook(() => useBattle());
    await act(async () => {
      await result.current.startBattle([fakeSlot()], [fakeSlot()], "ai", null, null, "normal", "doubles");
    });

    // Buffer a slot-0 action but never submit the matching slot-1 action.
    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 0, target: "opp0" });
    });
    expect(lastActionOf(result.current.state)).toBeUndefined();

    act(() => {
      result.current.resetBattle();
    });
    expect(clearRecordingMock).toHaveBeenCalled();

    await act(async () => {
      await result.current.startBattle([fakeSlot()], [fakeSlot()], "ai", null, null, "normal", "doubles");
    });

    // If the buffer had leaked, this "first" call would actually be treated as the
    // second and fire EXECUTE_TURN immediately instead of buffering again.
    act(() => {
      result.current.submitPlayerAction({ type: "MOVE", moveIndex: 0, target: "opp0" });
    });

    expect(lastActionOf(result.current.state)?.type).not.toBe("EXECUTE_TURN");
  });
});

describe("useBattle — generateOpponent", () => {
  it("sets isLoadingOpponent true while pending and back to false once resolved", async () => {
    let resolveFn!: (v: TeamSlot[]) => void;
    const pending = new Promise<TeamSlot[]>((resolve) => { resolveFn = resolve; });
    vi.mocked(generateRandomTeam).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useBattle());
    expect(result.current.isLoadingOpponent).toBe(false);

    let genPromise!: Promise<TeamSlot[]>;
    act(() => {
      genPromise = result.current.generateOpponent();
    });
    expect(result.current.isLoadingOpponent).toBe(true);

    await act(async () => {
      resolveFn([]);
      await genPromise;
    });
    expect(result.current.isLoadingOpponent).toBe(false);
  });

  it("resolves isLoadingOpponent back to false even when generateRandomTeam rejects, and propagates the rejection", async () => {
    vi.mocked(generateRandomTeam).mockRejectedValueOnce(new Error("network fail"));

    const { result } = renderHook(() => useBattle());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.generateOpponent();
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(result.current.isLoadingOpponent).toBe(false);
  });
});
