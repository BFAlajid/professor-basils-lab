"use client";

import { useState, useEffect } from "react";
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
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      silentWarn(`usePersistedState: failed to write key "${key}"`, error);
    }
  }, [key, state]);

  return [state, setState];
}
