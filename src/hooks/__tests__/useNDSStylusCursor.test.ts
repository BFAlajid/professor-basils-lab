import { renderHook, act } from "@testing-library/react";

import {
  useNDSStylusCursor,
  INITIAL_POS,
  INITIAL_SPEED_PX,
  ACCEL_SPEED_PX,
  ACCEL_DELAY_MS,
  CURSOR_Y_MAX,
} from "../useNDSStylusCursor";

// Minimal stub of HTMLCanvasElement for dispatch tests — we only need
// getBoundingClientRect and dispatchEvent, both provided by jsdom's
// HTMLCanvasElement. We spy on dispatchEvent to capture synthetic mouse events.
function makeCanvasStub(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  // Override getBoundingClientRect to a known, simple rect.
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 256,
      bottom: 384,
      width: 256,
      height: 384,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return canvas;
}

describe("useNDSStylusCursor", () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let rafHandle: number;
  let nowValue: number;
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;
  let originalPerfNow: () => number;

  beforeEach(() => {
    rafCallbacks = [];
    rafHandle = 0;
    nowValue = 1000;

    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    originalPerfNow = performance.now.bind(performance);

    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafHandle;
    }) as typeof requestAnimationFrame;

    globalThis.cancelAnimationFrame = (() => {
      // Simplified: drop all pending. The hook cancels a single handle;
      // dropping the whole queue is fine because new requests queue afresh.
      rafCallbacks = [];
    }) as typeof cancelAnimationFrame;

    vi.spyOn(performance, "now").mockImplementation(() => nowValue);
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    (performance.now as unknown as { mockRestore?: () => void }).mockRestore?.();
    // restore manual spy fallback
    performance.now = originalPerfNow;
    vi.restoreAllMocks();
  });

  // Flush one RAF tick: advance time, run whatever is queued.
  const flushFrame = (deltaMs = 16) => {
    nowValue += deltaMs;
    const toRun = rafCallbacks;
    rafCallbacks = [];
    for (const cb of toRun) cb(nowValue);
  };

  // -------------------------------------------------------------------------
  // 1. handleDpad returns false when cursorMode=false; cursor doesn't move.
  // -------------------------------------------------------------------------
  it("handleDpad returns false and cursor does not move when cursorMode is off", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    let consumed: boolean | null = null;
    act(() => {
      consumed = result.current.handleDpad("down", true);
    });

    expect(consumed).toBe(false);
    expect(result.current.cursorPos).toEqual(INITIAL_POS);
    expect(result.current.cursorMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. Toggle on → first press moves by INITIAL_SPEED_PX.
  // -------------------------------------------------------------------------
  it("moves cursor by INITIAL_SPEED_PX on first press after toggle on", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    act(() => {
      result.current.setCursorMode(true);
    });
    expect(result.current.cursorMode).toBe(true);

    let consumed: boolean | null = null;
    act(() => {
      consumed = result.current.handleDpad("down", true);
    });

    expect(consumed).toBe(true);
    expect(result.current.cursorPos.y).toBe(INITIAL_POS.y + INITIAL_SPEED_PX);
    expect(result.current.cursorPos.x).toBe(INITIAL_POS.x);
  });

  // -------------------------------------------------------------------------
  // 3. After held >= ACCEL_DELAY_MS, speed becomes ACCEL_SPEED_PX per frame.
  // -------------------------------------------------------------------------
  it("uses ACCEL_SPEED_PX after direction held past ACCEL_DELAY_MS", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    act(() => {
      result.current.setCursorMode(true);
    });
    act(() => {
      result.current.handleDpad("down", true);
    });

    const afterInitial = result.current.cursorPos.y;
    expect(afterInitial).toBe(INITIAL_POS.y + INITIAL_SPEED_PX);

    // Advance time past the accel threshold and flush one frame.
    act(() => {
      flushFrame(ACCEL_DELAY_MS + 5);
    });

    // This frame should have moved by ACCEL_SPEED_PX (held duration >= 100ms).
    expect(result.current.cursorPos.y).toBe(afterInitial + ACCEL_SPEED_PX);
  });

  // -------------------------------------------------------------------------
  // 4. Clamps at Y_MAX when pressing down from edge.
  // -------------------------------------------------------------------------
  it("clamps cursor.y at CURSOR_Y_MAX when pressing down from the bottom edge", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    act(() => {
      result.current.setCursorMode(true);
    });

    // Move cursor down repeatedly until it reaches Y_MAX. Use accel path.
    act(() => {
      result.current.handleDpad("down", true);
    });
    // Keep pressing — push beyond clamp.
    for (let i = 0; i < 200; i++) {
      act(() => {
        flushFrame(ACCEL_DELAY_MS + 20);
      });
    }

    expect(result.current.cursorPos.y).toBe(CURSOR_Y_MAX);

    // One more frame while still held: should remain at max.
    act(() => {
      flushFrame(ACCEL_DELAY_MS + 20);
    });
    expect(result.current.cursorPos.y).toBe(CURSOR_Y_MAX);
  });

  // -------------------------------------------------------------------------
  // 5. handleTap(true) dispatches mousedown on canvas with correct
  //    clientX / clientY from cursor position.
  // -------------------------------------------------------------------------
  it("handleTap(true) walks stylus to target then dispatches mousedown", () => {
    const canvas = makeCanvasStub();
    const mouseEvents: MouseEvent[] = [];
    canvas.addEventListener("mousemove", (e) => mouseEvents.push(e));
    canvas.addEventListener("mousedown", (e) => mouseEvents.push(e));
    canvas.addEventListener("mouseup", (e) => mouseEvents.push(e));

    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    act(() => {
      result.current.setCursorMode(true);
    });
    expect(mouseEvents.length).toBe(0);

    // handleTap(true): 4 clamp mousemoves + 1 target mousemove + 1 mousedown = 6.
    let consumed: boolean | null = null;
    act(() => {
      consumed = result.current.handleTap(true);
    });
    expect(consumed).toBe(true);
    expect(mouseEvents.length).toBe(6);
    for (let i = 0; i < 5; i++) expect(mouseEvents[i].type).toBe("mousemove");
    const targetMove = mouseEvents[4];
    expect(targetMove.clientX).toBe(128);
    expect(targetMove.clientY).toBe(288);
    const down = mouseEvents[5];
    expect(down.type).toBe("mousedown");
    expect(down.clientX).toBe(128);
    expect(down.clientY).toBe(288);
    expect(down.button).toBe(0);
    expect(down.buttons).toBe(1);

    act(() => {
      consumed = result.current.handleTap(false);
    });
    expect(consumed).toBe(true);
    expect(mouseEvents.length).toBe(7);
    const up = mouseEvents[6];
    expect(up.type).toBe("mouseup");
    expect(up.clientX).toBe(128);
    expect(up.clientY).toBe(288);
    expect(up.buttons).toBe(0);
  });

  it("handleTap returns false when cursorMode is off", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );
    let consumed: boolean | null = null;
    act(() => {
      consumed = result.current.handleTap(true);
    });
    expect(consumed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Toggle off clears held directions — subsequent D-pad is not consumed.
  // -------------------------------------------------------------------------
  it("toggling off clears held directions and subsequent D-pad returns false", () => {
    const canvas = makeCanvasStub();
    const { result } = renderHook(() =>
      useNDSStylusCursor(() => canvas),
    );

    // Enter mode, hold a direction, then exit mode.
    act(() => {
      result.current.setCursorMode(true);
    });
    act(() => {
      result.current.handleDpad("down", true);
    });
    const yWhileHeld = result.current.cursorPos.y;

    act(() => {
      result.current.setCursorMode(false);
    });

    // Flushing a frame after exit should NOT move the cursor (RAF is canceled
    // and held set is empty).
    act(() => {
      flushFrame(ACCEL_DELAY_MS + 20);
    });
    expect(result.current.cursorPos.y).toBe(yWhileHeld);

    // D-pad after exit should not be consumed.
    let consumed: boolean | null = null;
    act(() => {
      consumed = result.current.handleDpad("down", true);
    });
    expect(consumed).toBe(false);
    // Position should remain unchanged (no movement in off state).
    expect(result.current.cursorPos.y).toBe(yWhileHeld);
  });
});
