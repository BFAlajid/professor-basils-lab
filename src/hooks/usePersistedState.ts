"use client";

import { useState, useEffect, useRef } from "react";
import { silentWarn } from "@/utils/silentWarn";

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  validate?: (raw: unknown) => T | null,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      const parsed = JSON.parse(saved);
      if (validate) {
        const validated = validate(parsed);
        return validated !== null ? validated : defaultValue;
      }
      return parsed;
    } catch (e) {
      silentWarn(`usePersistedState: failed to read key "${key}"`, e);
      return defaultValue;
    }
  });

  const initialized = useRef(false);
  const prevKeyRef = useRef(key);

  // Reset state from localStorage when key changes
  useEffect(() => {
    if (prevKeyRef.current === key && initialized.current) return;
    prevKeyRef.current = key;
    initialized.current = false;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validate) {
          const validated = validate(parsed);
          setState(validated !== null ? validated : defaultValue);
        } else {
          setState(parsed);
        }
      } else {
        setState(defaultValue);
      }
    } catch (e) {
      silentWarn(`usePersistedState: failed to read key "${key}"`, e);
      setState(defaultValue);
    }

    initialized.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      silentWarn(`usePersistedState: failed to write key "${key}"`, error);
    }
  }, [key, state]);

  return [state, setState];
}
