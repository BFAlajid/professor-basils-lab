import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock all side-effectful modules the hook imports.
vi.mock("@/utils/emulatorStorage", () => ({
  loadSave: vi.fn().mockResolvedValue(null),
  storeROM: vi.fn().mockResolvedValue(undefined),
  loadROM: vi.fn().mockResolvedValue(null),
  listROMs: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utils/emulatorManager", () => ({
  registerEmulator: vi.fn().mockResolvedValue(undefined),
  updateCallbacks: vi.fn(),
}));

vi.mock("@/utils/silentWarn", () => ({
  silentWarn: vi.fn(),
}));

vi.mock("../useGBASave", () => ({
  useGBASave: () => ({
    persistSave: vi.fn().mockResolvedValue(undefined),
    exportSave: vi.fn(),
    importSave: vi.fn(),
    startAutoSave: vi.fn(),
    clearAutoSave: vi.fn(),
  }),
}));

import { useGBAEmulator } from "../useGBAEmulator";

describe("useGBAEmulator preflight checks", () => {
  let originalCOI: PropertyDescriptor | undefined;
  let originalSAB: typeof SharedArrayBuffer | undefined;

  beforeEach(() => {
    originalCOI = Object.getOwnPropertyDescriptor(
      globalThis,
      "crossOriginIsolated"
    );
    originalSAB = globalThis.SharedArrayBuffer;
  });

  afterEach(() => {
    // Restore crossOriginIsolated descriptor.
    if (originalCOI) {
      Object.defineProperty(globalThis, "crossOriginIsolated", originalCOI);
    } else {
      try {
        // @ts-expect-error — cleanup test-only property
        delete globalThis.crossOriginIsolated;
      } catch {
        // ignore
      }
    }
    // Restore SharedArrayBuffer.
    if (originalSAB !== undefined) {
      (globalThis as unknown as { SharedArrayBuffer: typeof SharedArrayBuffer }).SharedArrayBuffer = originalSAB;
    }
  });

  // Regression: when headers are missing and the page is NOT cross-origin isolated,
  // mGBA's pthread pool load hangs forever. The preflight must reject immediately
  // with a message that points at COOP/COEP rather than silently waiting 30s.
  it("rejects with a COOP/COEP error when crossOriginIsolated is false", async () => {
    // Simulate a modern browser where SharedArrayBuffer exists but the page
    // is NOT cross-origin isolated (no COOP/COEP headers).
    Object.defineProperty(globalThis, "crossOriginIsolated", {
      value: false,
      configurable: true,
      writable: true,
    });

    // Canvas ref with a minimal stand-in element so the canvas-null guard passes.
    const canvas = document.createElement("canvas");
    const canvasRef = { current: canvas } as React.RefObject<HTMLCanvasElement | null>;

    const { result } = renderHook(() => useGBAEmulator(canvasRef));

    // Stub File.prototype.arrayBuffer because jsdom doesn't implement it.
    const file = new File([new Uint8Array([0])], "test.gba");
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    await act(async () => {
      await result.current.loadROMFile(file);
    });

    await waitFor(() => {
      expect(result.current.state.error).toBeTruthy();
    });

    expect(result.current.state.error).toMatch(/cross-origin isolation/i);
  });

  // Regression: pre-existing check — SAB undefined should still surface a
  // browser-specific message (iOS vs other) rather than timing out.
  it("rejects with a SharedArrayBuffer error when SAB is undefined", async () => {
    // Remove SharedArrayBuffer from the global scope.
    // @ts-expect-error — test-only delete
    delete (globalThis as unknown as { SharedArrayBuffer?: unknown }).SharedArrayBuffer;

    const canvas = document.createElement("canvas");
    const canvasRef = { current: canvas } as React.RefObject<HTMLCanvasElement | null>;

    const { result } = renderHook(() => useGBAEmulator(canvasRef));

    const file = new File([new Uint8Array([0])], "test.gba");
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    await act(async () => {
      await result.current.loadROMFile(file);
    });

    await waitFor(() => {
      expect(result.current.state.error).toBeTruthy();
    });

    expect(result.current.state.error).toMatch(/SharedArrayBuffer/i);
  });
});
