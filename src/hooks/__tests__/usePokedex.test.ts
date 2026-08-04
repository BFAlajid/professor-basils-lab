import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePokedex } from "../usePokedex";

// Build a real in-memory localStorage for these tests (the global setup.ts
// provides vi.fn() stubs with no backing store, which can't round-trip data).
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}

describe("usePokedex persistence debounce", () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    const memStorage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      value: memStorage,
      writable: true,
      configurable: true,
    });
    setItemSpy = vi.spyOn(window.localStorage, "setItem");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not write to localStorage synchronously on markSeen", () => {
    const { result } = renderHook(() => usePokedex());

    act(() => {
      result.current.markSeen(1, "bulbasaur", "wild");
    });

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("collapses rapid markSeen calls into a single debounced write", () => {
    const { result } = renderHook(() => usePokedex());

    act(() => {
      result.current.markSeen(1, "bulbasaur", "wild");
      result.current.markSeen(2, "ivysaur", "wild");
      result.current.markSeen(3, "venusaur", "wild");
    });

    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const payload = setItemSpy.mock.calls[0][1] as string;
    const saved = JSON.parse(payload);
    expect(Object.keys(saved.entries)).toHaveLength(3);
  });

  it("does not schedule a write when marking an already-seen entry", () => {
    const { result } = renderHook(() => usePokedex());

    act(() => result.current.markSeen(1, "bulbasaur", "wild"));
    act(() => vi.advanceTimersByTime(500));
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockClear();

    act(() => result.current.markSeen(1, "bulbasaur", "wild"));
    act(() => vi.advanceTimersByTime(500));

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("flushes a pending write immediately when the tab becomes hidden", () => {
    const { result } = renderHook(() => usePokedex());

    act(() => {
      result.current.markSeen(1, "bulbasaur", "wild");
    });
    expect(setItemSpy).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const payload = setItemSpy.mock.calls[0][1] as string;
    expect(JSON.parse(payload).entries[1]).toBeDefined();
  });

  it("flushes a pending write immediately on beforeunload", () => {
    const { result } = renderHook(() => usePokedex());

    act(() => {
      result.current.markCaught(4, "charmander", "wild");
    });
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it("flushes a pending write on unmount so no data is lost", () => {
    const { result, unmount } = renderHook(() => usePokedex());

    act(() => {
      result.current.markCaught(4, "charmander", "wild");
    });
    expect(setItemSpy).not.toHaveBeenCalled();

    unmount();

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const payload = setItemSpy.mock.calls[0][1] as string;
    expect(JSON.parse(payload).entries[4].caught).toBe(true);
  });
});
