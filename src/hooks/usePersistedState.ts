"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { readStorage, readStorageValidated, writeStorage, type StorageKey } from "@/utils/persistence";

/**
 * `useState` + localStorage persistence, routed through persistence.ts's
 * registry-typed read/write primitives — same SSR guard, validate contract,
 * and error path as `usePersistedReducer`.
 */
export function usePersistedState<T>(
  key: StorageKey,
  defaultValue: T,
  validate?: (raw: unknown) => T | null,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const readValue = useCallback((): T => {
    return validate
      ? readStorageValidated(key, defaultValue, validate)
      : readStorage(key, defaultValue);
  // Only `key` should retrigger a read — `defaultValue`/`validate` are
  // expected to be referentially stable per call site (or the caller wants
  // the initial-mount value only, matching the previous behavior).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [state, setState] = useState<T>(readValue);

  const initialized = useRef(false);
  const prevKeyRef = useRef(key);

  // Reset state from storage when key changes
  useEffect(() => {
    if (prevKeyRef.current === key && initialized.current) return;
    prevKeyRef.current = key;
    initialized.current = false;
    setState(readValue());
    initialized.current = true;
  }, [key, readValue]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    writeStorage(key, state);
  }, [key, state]);

  return [state, setState];
}
