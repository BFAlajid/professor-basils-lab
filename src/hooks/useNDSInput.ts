"use client";

import { useCallback } from "react";

// Map NDS button bit → keyboard event props for dispatching to RetroArch
const BIT_TO_KEY: Record<number, { key: string; code: string; keyCode: number }> = {
  0:  { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }, // RIGHT
  1:  { key: "ArrowLeft",  code: "ArrowLeft",  keyCode: 37 }, // LEFT
  2:  { key: "ArrowDown",  code: "ArrowDown",  keyCode: 40 }, // DOWN
  3:  { key: "ArrowUp",    code: "ArrowUp",    keyCode: 38 }, // UP
  4:  { key: "Backspace",  code: "Backspace",  keyCode: 8  }, // SELECT
  5:  { key: "Enter",      code: "Enter",      keyCode: 13 }, // START
  6:  { key: "x",          code: "KeyX",       keyCode: 88 }, // B
  7:  { key: "z",          code: "KeyZ",       keyCode: 90 }, // A
  8:  { key: "v",          code: "KeyV",       keyCode: 86 }, // Y
  9:  { key: "c",          code: "KeyC",       keyCode: 67 }, // X
  10: { key: "a",          code: "KeyA",       keyCode: 65 }, // L
  11: { key: "s",          code: "KeyS",       keyCode: 83 }, // R
};

/**
 * Sub-hook for NDS virtual button input.
 * Dispatches keyboard events to the persistent canvas so RetroArch receives them.
 */
export function useNDSInput(canvasRef: { current: HTMLCanvasElement | null }) {
  const buttonPress = useCallback((bit: number) => {
    const kv = BIT_TO_KEY[bit];
    if (!kv) return;
    const target = canvasRef.current || document;
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: kv.key,
        code: kv.code,
        keyCode: kv.keyCode,
        bubbles: true,
        cancelable: true,
      })
    );
  }, [canvasRef]);

  const buttonUnpress = useCallback((bit: number) => {
    const kv = BIT_TO_KEY[bit];
    if (!kv) return;
    const target = canvasRef.current || document;
    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: kv.key,
        code: kv.code,
        keyCode: kv.keyCode,
        bubbles: true,
        cancelable: true,
      })
    );
  }, [canvasRef]);

  // RetroArch handles pointer events on canvas natively
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchStart = useCallback((_x: number, _y: number) => {}, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchMove = useCallback((_x: number, _y: number) => {}, []);
  const touchEnd = useCallback(() => {}, []);

  return { buttonPress, buttonUnpress, touchStart, touchMove, touchEnd };
}
