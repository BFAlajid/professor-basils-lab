"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// NDS bottom-screen coordinate window (internal coords: canvas is 256×384,
// bottom screen occupies y=192..383).
export const CURSOR_X_MIN = 0;
export const CURSOR_X_MAX = 255;
export const CURSOR_Y_MIN = 192;
export const CURSOR_Y_MAX = 383;
const CANVAS_W = 256;
const CANVAS_H = 384;

export const INITIAL_POS: CursorPos = { x: 128, y: 288 };
export const INITIAL_SPEED_PX = 2;
export const ACCEL_SPEED_PX = 5;
export const ACCEL_DELAY_MS = 100;

export type Direction = "up" | "down" | "left" | "right";
export interface CursorPos {
  x: number;
  y: number;
}

export interface UseNDSStylusCursorReturn {
  cursorMode: boolean;
  cursorPos: CursorPos;
  toggle: () => void;
  setCursorMode: (v: boolean) => void;
  handleDpad: (dir: Direction, pressed: boolean) => boolean;
  handleTap: (pressed: boolean) => boolean;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// melonDS Mouse mode reads relative movementX/Y from mouse events (like a
// trackpad). Some browsers accept movementX/Y in the MouseEventInit dict
// (Chrome 113+); for others, an own-property defineProperty shadows the
// prototype getter so SDL's handler reads our value.
function makeMouseEvent(
  type: string,
  opts: {
    clientX: number;
    clientY: number;
    movementX: number;
    movementY: number;
    button: number;
    buttons: number;
  },
): MouseEvent {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: opts.clientX,
    clientY: opts.clientY,
    button: opts.button,
    buttons: opts.buttons,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ movementX: opts.movementX, movementY: opts.movementY } as any),
  });
  Object.defineProperty(ev, "movementX", { value: opts.movementX, configurable: true });
  Object.defineProperty(ev, "movementY", { value: opts.movementY, configurable: true });
  return ev;
}

// Force the in-game stylus to the target pos by: (1) huge negative deltas to
// clamp it at canvas origin, (2) one positive delta that equals the target.
// Both channels (clientX/Y absolute AND movementX/Y relative) are exercised so
// SDL latches onto whichever it uses.
function walkStylusToTarget(canvas: HTMLCanvasElement, pos: CursorPos) {
  const rect = canvas.getBoundingClientRect();
  const farLeft = rect.left - 10000;
  const farTop = rect.top - 10000;

  for (let i = 0; i < 4; i++) {
    canvas.dispatchEvent(
      makeMouseEvent("mousemove", {
        clientX: farLeft,
        clientY: farTop,
        movementX: -10000,
        movementY: -10000,
        button: 0,
        buttons: 0,
      }),
    );
  }

  const targetDx = (pos.x / CANVAS_W) * rect.width;
  const targetDy = (pos.y / CANVAS_H) * rect.height;
  canvas.dispatchEvent(
    makeMouseEvent("mousemove", {
      clientX: rect.left + targetDx,
      clientY: rect.top + targetDy,
      movementX: targetDx,
      movementY: targetDy,
      button: 0,
      buttons: 0,
    }),
  );
}

function dispatchStylusAt(
  canvas: HTMLCanvasElement,
  pos: CursorPos,
  action: "press" | "release",
) {
  const rect = canvas.getBoundingClientRect();
  const clientX = rect.left + (pos.x / CANVAS_W) * rect.width;
  const clientY = rect.top + (pos.y / CANVAS_H) * rect.height;
  const isPress = action === "press";

  canvas.dispatchEvent(
    makeMouseEvent(isPress ? "mousedown" : "mouseup", {
      clientX,
      clientY,
      movementX: 0,
      movementY: 0,
      button: 0,
      buttons: isPress ? 1 : 0,
    }),
  );
}

export function useNDSStylusCursor(
  getCanvas: () => HTMLCanvasElement | null,
): UseNDSStylusCursorReturn {
  const [cursorMode, setCursorModeState] = useState(false);
  const [cursorPos, setCursorPos] = useState<CursorPos>(INITIAL_POS);

  const heldDirsRef = useRef<Set<Direction>>(new Set());
  const heldSinceRef = useRef<Map<Direction, number>>(new Map());
  const posRef = useRef<CursorPos>(INITIAL_POS);
  const rafRef = useRef<number | null>(null);
  const cursorModeRef = useRef(false);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const stepOnce = function step() {
      const held = heldDirsRef.current;
      if (held.size === 0) {
        rafRef.current = null;
        return;
      }
      const now = performance.now();
      let { x, y } = posRef.current;

      for (const dir of held) {
        const since = heldSinceRef.current.get(dir) ?? now;
        const speed = now - since >= ACCEL_DELAY_MS ? ACCEL_SPEED_PX : INITIAL_SPEED_PX;
        if (dir === "up") y -= speed;
        else if (dir === "down") y += speed;
        else if (dir === "left") x -= speed;
        else if (dir === "right") x += speed;
      }

      x = clamp(x, CURSOR_X_MIN, CURSOR_X_MAX);
      y = clamp(y, CURSOR_Y_MIN, CURSOR_Y_MAX);

      if (x !== posRef.current.x || y !== posRef.current.y) {
        posRef.current = { x, y };
        setCursorPos(posRef.current);
      }

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(stepOnce);
  }, []);

  const cancelLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearHeld = useCallback(() => {
    heldDirsRef.current.clear();
    heldSinceRef.current.clear();
    cancelLoop();
  }, [cancelLoop]);

  const setCursorMode = useCallback(
    (v: boolean) => {
      cursorModeRef.current = v;
      setCursorModeState(v);
      if (!v) clearHeld();
    },
    [clearHeld],
  );

  const toggle = useCallback(() => {
    setCursorMode(!cursorModeRef.current);
  }, [setCursorMode]);

  const handleDpad = useCallback<UseNDSStylusCursorReturn["handleDpad"]>(
    (dir, pressed) => {
      if (!cursorModeRef.current) return false;
      if (pressed) {
        if (!heldDirsRef.current.has(dir)) {
          heldDirsRef.current.add(dir);
          heldSinceRef.current.set(dir, performance.now());
          const now = performance.now();
          let { x, y } = posRef.current;
          if (dir === "up") y -= INITIAL_SPEED_PX;
          else if (dir === "down") y += INITIAL_SPEED_PX;
          else if (dir === "left") x -= INITIAL_SPEED_PX;
          else if (dir === "right") x += INITIAL_SPEED_PX;
          x = clamp(x, CURSOR_X_MIN, CURSOR_X_MAX);
          y = clamp(y, CURSOR_Y_MIN, CURSOR_Y_MAX);
          if (x !== posRef.current.x || y !== posRef.current.y) {
            posRef.current = { x, y };
            setCursorPos(posRef.current);
          }
          heldSinceRef.current.set(dir, now);
          startLoop();
        }
      } else {
        heldDirsRef.current.delete(dir);
        heldSinceRef.current.delete(dir);
        if (heldDirsRef.current.size === 0) cancelLoop();
      }
      return true;
    },
    [cancelLoop, startLoop],
  );

  const handleTap = useCallback(
    (pressed: boolean): boolean => {
      if (!cursorModeRef.current) return false;
      const canvas = getCanvas();
      if (!canvas) return true;
      // Pin the melonDS Mouse-mode stylus onto our overlay position via a
      // walk (negative clamps then positive to target) before firing the
      // click. Run on every press because relative-delta drift can happen
      // between taps from real mouse motion over the canvas.
      if (pressed) {
        walkStylusToTarget(canvas, posRef.current);
        dispatchStylusAt(canvas, posRef.current, "press");
      } else {
        dispatchStylusAt(canvas, posRef.current, "release");
      }
      return true;
    },
    [getCanvas],
  );

  useEffect(() => {
    const held = heldDirsRef.current;
    const heldSince = heldSinceRef.current;
    return () => {
      cancelLoop();
      held.clear();
      heldSince.clear();
    };
  }, [cancelLoop]);

  return {
    cursorMode,
    cursorPos,
    toggle,
    setCursorMode,
    handleDpad,
    handleTap,
  };
}
