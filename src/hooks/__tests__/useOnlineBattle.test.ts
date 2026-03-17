import { renderHook, act } from "@testing-library/react";
import { useOnlineBattle } from "../useOnlineBattle";
import type { BattleTurnAction } from "@/types";

// ---------------------------------------------------------------------------
// PeerJS mock
// ---------------------------------------------------------------------------

type EventHandler = (...args: unknown[]) => void;

/** Minimal DataConnection stub that captures event handlers and sent data. */
function createMockConnection() {
  const handlers: Record<string, EventHandler> = {};
  const sent: unknown[] = [];
  return {
    conn: {
      open: true,
      on: vi.fn((event: string, cb: EventHandler) => {
        handlers[event] = cb;
      }),
      send: vi.fn((data: unknown) => sent.push(data)),
      close: vi.fn(),
    },
    handlers,
    sent,
  };
}

let mockPeerHandlers: Record<string, EventHandler> = {};

vi.mock("peerjs", () => {
  function MockPeer() {
    mockPeerHandlers = {};
    return {
      on: vi.fn((event: string, cb: EventHandler) => {
        mockPeerHandlers[event] = cb;
      }),
      destroy: vi.fn(),
      connect: vi.fn(() => {
        // Returns a mock connection for joinLobby
        const handlers: Record<string, EventHandler> = {};
        return {
          open: true,
          on: vi.fn((event: string, cb: EventHandler) => {
            handlers[event] = cb;
          }),
          send: vi.fn(),
          close: vi.fn(),
        };
      }),
    };
  }
  return { default: MockPeer };
});

// Mock useOnlineTrade — return stable references so disconnect's deps don't churn
const mockTradeReturn = {
  setLinkMode: vi.fn(),
  shareMyBox: vi.fn(),
  sendTradeOffer: vi.fn(),
  acceptTrade: vi.fn(),
  rejectTrade: vi.fn(),
  confirmTrade: vi.fn(),
  completeTrade: vi.fn(),
  resetTrade: vi.fn(),
  resetEscrow: vi.fn(),
  handleTradeMessage: vi.fn(),
  handleConnectionClose: vi.fn(),
};
vi.mock("../useOnlineTrade", () => ({
  useOnlineTrade: () => mockTradeReturn,
}));

// Stub crypto.getRandomValues (used by generateRoomCode)
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i + 65;
      return arr;
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Renders the hook and creates a lobby so setupConnection has run. */
async function setupWithConnection() {
  const { result } = renderHook(() => useOnlineBattle());
  const mock = createMockConnection();

  // createLobby triggers new Peer() and listens for "connection"
  await act(async () => {
    await result.current.createLobby();
  });

  // Simulate peer "open" then incoming connection
  await act(async () => {
    if (mockPeerHandlers["open"]) mockPeerHandlers["open"]();
    if (mockPeerHandlers["connection"]) mockPeerHandlers["connection"](mock.conn);
  });

  // Simulate the connection opening
  await act(async () => {
    if (mock.handlers["open"]) mock.handlers["open"]();
  });

  return { result, mock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useOnlineBattle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. waitForOpponentAction timeout
  // -----------------------------------------------------------------------
  describe("waitForOpponentAction timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects with timeout error after 30 seconds", async () => {
      const { result, mock: _mock } = await setupWithConnection();

      let rejection: Error | null = null;

      // Start waiting (do NOT await -- we need to advance timers first)
      const promise = result.current.waitForOpponentAction().catch((err) => {
        rejection = err;
      });

      // Advance to just before timeout -- should still be pending
      await act(async () => {
        vi.advanceTimersByTime(29_999);
      });
      expect(rejection).toBeNull();

      // Advance past the 30s mark
      await act(async () => {
        vi.advanceTimersByTime(2);
      });
      await promise;

      expect(rejection).toBeInstanceOf(Error);
      expect(rejection!.message).toBe("Opponent action timeout");
    });
  });

  // -----------------------------------------------------------------------
  // 2. waitForOpponentAction resolves when action received
  // -----------------------------------------------------------------------
  it("resolves when opponent sends an ACTION message", async () => {
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "MOVE", moveIndex: 2 };

    const promise = result.current.waitForOpponentAction();

    // Simulate receiving a valid ACTION message via the data handler
    await act(async () => {
      mock.handlers["data"]({
        type: "ACTION",
        payload: action,
        timestamp: Date.now(),
      });
    });

    const received = await promise;
    expect(received).toEqual(action);
  });

  // -----------------------------------------------------------------------
  // 3. waitForOpponentAction resolves for FORCE_SWITCH_ACTION too
  // -----------------------------------------------------------------------
  it("resolves when opponent sends a FORCE_SWITCH_ACTION message", async () => {
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "SWITCH", pokemonIndex: 3 };

    const promise = result.current.waitForOpponentAction();

    await act(async () => {
      mock.handlers["data"]({
        type: "FORCE_SWITCH_ACTION",
        payload: action,
        timestamp: Date.now(),
      });
    });

    const received = await promise;
    expect(received).toEqual(action);
  });

  // -----------------------------------------------------------------------
  // 4. waitForOpponentAction disconnect rejection
  // -----------------------------------------------------------------------
  it("rejects immediately when connection closes while waiting", async () => {
    const { result, mock } = await setupWithConnection();

    let rejection: Error | null = null;

    const promise = result.current.waitForOpponentAction().catch((err) => {
      rejection = err;
    });

    // Simulate connection close
    await act(async () => {
      mock.handlers["close"]();
    });

    await promise;

    expect(rejection).toBeInstanceOf(Error);
    expect(rejection!.message).toBe("Opponent disconnected");
  });

  // -----------------------------------------------------------------------
  // 5. submitForceSwitch sends correct message format
  // -----------------------------------------------------------------------
  it("sends FORCE_SWITCH_ACTION with correct payload", async () => {
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "SWITCH", pokemonIndex: 4 };

    const sentBefore = mock.sent.length;
    act(() => {
      result.current.submitForceSwitch(action);
    });

    const msg = mock.sent[sentBefore] as Record<string, unknown>;
    expect(msg.type).toBe("FORCE_SWITCH_ACTION");
    expect(msg.payload).toEqual(action);
    expect(typeof msg.timestamp).toBe("number");
  });

  // -----------------------------------------------------------------------
  // 6. submitAction sends correct message format
  // -----------------------------------------------------------------------
  it("sends ACTION with correct payload", async () => {
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "MOVE", moveIndex: 0 };

    const sentBefore = mock.sent.length;
    act(() => {
      result.current.submitAction(action);
    });

    const msg = mock.sent[sentBefore] as Record<string, unknown>;
    expect(msg.type).toBe("ACTION");
    expect(msg.payload).toEqual(action);
    expect(typeof msg.timestamp).toBe("number");
  });

  // -----------------------------------------------------------------------
  // 7. submitAction is a no-op when connection is closed
  // -----------------------------------------------------------------------
  it("does not send when connection is not open", async () => {
    const { result, mock } = await setupWithConnection();

    // Close the connection
    mock.conn.open = false;

    const sentBefore = mock.sent.length;
    act(() => {
      result.current.submitAction({ type: "MOVE", moveIndex: 1 });
    });

    expect(mock.sent.length).toBe(sentBefore);
  });

  // -----------------------------------------------------------------------
  // 8. submitForceSwitch is a no-op when connection is closed
  // -----------------------------------------------------------------------
  it("submitForceSwitch does not send when connection is not open", async () => {
    const { result, mock } = await setupWithConnection();

    mock.conn.open = false;

    const sentBefore = mock.sent.length;
    act(() => {
      result.current.submitForceSwitch({ type: "SWITCH", pokemonIndex: 0 });
    });

    expect(mock.sent.length).toBe(sentBefore);
  });

  // -----------------------------------------------------------------------
  // 9. Action ordering: host vs guest distinction
  // -----------------------------------------------------------------------
  describe("action ordering (host vs guest)", () => {
    it("host state is set when creating a lobby", async () => {
      const { result } = renderHook(() => useOnlineBattle());

      await act(async () => {
        await result.current.createLobby();
      });

      // Simulate peer registering with signaling server
      await act(async () => {
        if (mockPeerHandlers["open"]) mockPeerHandlers["open"]();
      });

      expect(result.current.state.isHost).toBe(true);
    });

    it("guest state is set when joining a lobby", async () => {
      const { result } = renderHook(() => useOnlineBattle());

      await act(async () => {
        await result.current.joinLobby("TESTCODE");
      });

      expect(result.current.state.isHost).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 10. Timeout is cleared when action arrives before 30s
  // -----------------------------------------------------------------------
  describe("timeout cleared on successful resolve", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not reject after action is received within timeout window", async () => {
      const { result, mock } = await setupWithConnection();

      const action: BattleTurnAction = { type: "MOVE", moveIndex: 1 };

      const promise = result.current.waitForOpponentAction();

      // Action arrives at 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5_000);
      });

      await act(async () => {
        mock.handlers["data"]({
          type: "ACTION",
          payload: action,
          timestamp: Date.now(),
        });
      });

      const received = await promise;
      expect(received).toEqual(action);

      // Advance well past 30s -- should NOT throw
      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      // If the timer weren't cleared, an unhandled rejection would fail the test
    });
  });

  // -----------------------------------------------------------------------
  // 12. Action buffer: action arrives before waitForOpponentAction
  // -----------------------------------------------------------------------
  it("resolves immediately from buffer when action arrived before wait", async () => {
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "MOVE", moveIndex: 3 };

    // Action arrives BEFORE waitForOpponentAction is called
    await act(async () => {
      mock.handlers["data"]({
        type: "ACTION",
        payload: action,
        timestamp: Date.now(),
      });
    });

    // Now call wait — should resolve immediately from the buffer
    const received = await result.current.waitForOpponentAction();
    expect(received).toEqual(action);
  });

  // -----------------------------------------------------------------------
  // 13. Buffer is cleared after consumption
  // -----------------------------------------------------------------------
  it("buffer is consumed only once", async () => {
    vi.useFakeTimers();
    const { result, mock } = await setupWithConnection();

    const action: BattleTurnAction = { type: "SWITCH", pokemonIndex: 2 };

    // Buffer an action
    await act(async () => {
      mock.handlers["data"]({
        type: "ACTION",
        payload: action,
        timestamp: Date.now(),
      });
    });

    // First wait resolves from buffer
    const first = await result.current.waitForOpponentAction();
    expect(first).toEqual(action);

    // Second wait should NOT resolve from buffer — should timeout
    let rejection: Error | null = null;
    const promise = result.current.waitForOpponentAction().catch((err) => {
      rejection = err;
    });

    await act(async () => {
      vi.advanceTimersByTime(30_001);
    });
    await promise;

    expect(rejection).toBeInstanceOf(Error);
    expect(rejection!.message).toBe("Opponent action timeout");
    vi.useRealTimers();
  });
});
