"use client";

import { useReducer, useEffect, useRef } from "react";
import { readStorage, readStorageValidated, writeStorage } from "@/utils/persistence";
import { silentWarn } from "@/utils/silentWarn";

/**
 * `useReducer` + localStorage persistence.
 *
 * On mount, hydrates state from the given `key`. On every state change
 * after initialization, writes the new state back.
 *
 * An optional `validate` function can transform/coerce the stored data
 * back into the expected shape, returning `null` to fall back to
 * `initialState`.
 */
export function usePersistedReducer<S, A>(
  key: string,
  reducer: (state: S, action: A) => S,
  initialState: S,
  validate?: (data: unknown) => S | null,
): [S, React.Dispatch<A>] {
  // Lazy initializer — reads from storage exactly once
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    if (typeof window === "undefined") return initialState;
    try {
      if (validate) {
        return readStorageValidated(key, initialState, validate);
      }
      return readStorage(key, initialState);
    } catch (e) {
      silentWarn(`usePersistedReducer: init "${key}"`, e);
      return initialState;
    }
  });

  // Track whether the initial hydration has occurred so we don't
  // write the initialState back on mount.
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    writeStorage(key, state);
  }, [key, state]);

  return [state, dispatch];
}
