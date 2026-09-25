"use client";

import { useEffect, useRef, useCallback } from "react";

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Debounces a save callback: fires `delayMs` after `value` last changed, and
 * guarantees a final flush before the tab hides/closes or the caller
 * unmounts, so a pending write never gets silently dropped.
 *
 * Extracted from usePokedex's debounced-persist pattern so hooks with
 * high-frequency state changes (PC box catches, day care egg ticks, stat
 * increments) don't each re-serialize their full state on every change.
 *
 * @param enabled Gate for the debounce timer — pass `false` while an initial
 *   async hydration is still in flight so this doesn't schedule a write of
 *   placeholder/empty state that could race ahead of (and clobber) the real
 *   loaded data. Defaults to `true` for hooks with synchronous hydration.
 */
export function useDebouncedPersist<T>(
  value: T,
  save: (value: T) => void,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
  enabled: boolean = true,
): void {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Mirrors `enabled` so the beforeunload/visibilitychange/unmount flush below
  // (which only runs once, on mount) always reads the latest gate value instead
  // of the one captured when that effect first ran.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const flush = useCallback(() => {
    if (!enabledRef.current) return;
    save(valueRef.current);
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const timeoutId = setTimeout(flush, delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, enabled, delayMs, flush]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, [flush]);
}
