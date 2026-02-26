"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ensureWasmReady, getWasm } from "@/utils/citrineWasm";
import {
  storeCTRROM,
  loadCTRROM,
  listCTRROMs,
} from "@/utils/citrineStorage";
import { registerEmulator, updateCallbacks } from "@/utils/emulatorManager";
import { loadKeybinds } from "@/utils/keybinds";

// 3DS HID button bit positions (matches rust/citrine/src/services/hid.rs)
export const CTR_KEYS = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  RIGHT: 4,
  LEFT: 5,
  UP: 6,
  DOWN: 7,
  R: 8,
  L: 9,
  X: 10,
  Y: 11,
} as const;

export type CTRButtonName = keyof typeof CTR_KEYS;

export interface CTREmulatorState {
  isReady: boolean;
  isLoading: boolean;
  isRunning: boolean;
  isPaused: boolean;
  romName: string | null;
  error: string | null;
  savedROMs: string[];
  debugInfo: string | null;
}

// Map EmulatorButton name -> CTR bit
const BUTTON_TO_BIT: Record<string, number> = {
  A: CTR_KEYS.A,
  B: CTR_KEYS.B,
  X: CTR_KEYS.X,
  Y: CTR_KEYS.Y,
  L: CTR_KEYS.L,
  R: CTR_KEYS.R,
  START: CTR_KEYS.START,
  SELECT: CTR_KEYS.SELECT,
  UP: CTR_KEYS.UP,
  DOWN: CTR_KEYS.DOWN,
  LEFT: CTR_KEYS.LEFT,
  RIGHT: CTR_KEYS.RIGHT,
};

// Top: 400×240, Bottom: 320×240
const TOP_W = 400;
const TOP_H = 240;
const BOT_W = 320;
const BOT_H = 240;

export function useCitrineEmulator() {
  const topCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const botCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const createdRef = useRef(false);
  const rafRef = useRef<number>(0);
  const buttonsRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const showDebugRef = useRef(false);
  const frameCountRef = useRef(0);

  const [state, setState] = useState<CTREmulatorState>({
    isReady: false,
    isLoading: false,
    isRunning: false,
    isPaused: false,
    romName: null,
    error: null,
    savedROMs: [],
    debugInfo: null,
  });

  // Initialize WASM + list saved ROMs
  const initialize = useCallback(async () => {
    try {
      const ready = await ensureWasmReady();
      const roms = await listCTRROMs();
      setState((s) => ({
        ...s,
        isReady: ready,
        savedROMs: roms,
        error: ready ? null : "WASM module failed to load",
      }));
    } catch {
      setState((s) => ({ ...s, isReady: false, error: "Failed to initialize emulator" }));
    }
  }, []);

  // Frame loop: run one frame, blit framebuffers to canvases
  const frameLoop = useCallback(() => {
    const wasm = getWasm();
    if (!wasm || !createdRef.current || pausedRef.current) {
      rafRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    try {
      wasm.citrine_set_buttons(buttonsRef.current);
      wasm.citrine_run_frame();
      frameCountRef.current++;

      // Top screen
      const topCanvas = topCanvasRef.current;
      if (topCanvas) {
        const ctx = topCanvas.getContext("2d");
        if (ctx) {
          const rgba = wasm.citrine_get_fb_top();
          if (rgba.length === TOP_W * TOP_H * 4) {
            const clamped = new Uint8ClampedArray(rgba.length);
            clamped.set(rgba);
            const img = new ImageData(clamped, TOP_W, TOP_H);
            ctx.putImageData(img, 0, 0);
          }
        }
      }

      // Bottom screen
      const botCanvas = botCanvasRef.current;
      if (botCanvas) {
        const ctx = botCanvas.getContext("2d");
        if (ctx) {
          const rgba = wasm.citrine_get_fb_bottom();
          if (rgba.length === BOT_W * BOT_H * 4) {
            const clamped = new Uint8ClampedArray(rgba.length);
            clamped.set(rgba);
            const img = new ImageData(clamped, BOT_W, BOT_H);
            ctx.putImageData(img, 0, 0);
          }
        }
      }

      // Debug info (throttled — every 30 frames)
      if (showDebugRef.current && frameCountRef.current % 30 === 0) {
        const info = wasm.citrine_get_debug_info();
        setState((s) => ({ ...s, debugInfo: info }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[citrine] Frame error:", msg);
      try {
        const wasm2 = getWasm();
        const info = wasm2?.citrine_get_debug_info();
        setState((s) => ({
          ...s,
          error: `Emulator crash: ${msg}`,
          debugInfo: info ?? null,
          isPaused: true,
        }));
      } catch {
        setState((s) => ({
          ...s,
          error: `Emulator crash: ${msg}`,
          isPaused: true,
        }));
      }
      pausedRef.current = true;
      return;
    }

    rafRef.current = requestAnimationFrame(frameLoop);
  }, []);

  // Shutdown callback for emulator manager
  const shutdown = useCallback(async () => {
    cancelAnimationFrame(rafRef.current);
    const wasm = getWasm();
    if (wasm && createdRef.current) {
      wasm.citrine_destroy();
      createdRef.current = false;
    }
    pausedRef.current = false;
    setState((s) => ({
      ...s,
      isRunning: false,
      isPaused: false,
      romName: null,
      debugInfo: null,
    }));
  }, []);

  // Register with emulator manager
  const registerWithManager = useCallback(async () => {
    await registerEmulator("ctr", {
      shutdown,
      pause: () => {
        pausedRef.current = true;
        setState((s) => ({ ...s, isPaused: true }));
      },
      resume: () => {
        pausedRef.current = false;
        setState((s) => ({ ...s, isPaused: false }));
      },
    });
  }, [shutdown]);

  // Load ROM from File
  const loadROMFile = useCallback(
    async (file: File) => {
      const wasm = getWasm();
      if (!wasm) {
        setState((s) => ({ ...s, error: "WASM not initialized" }));
        return;
      }

      // Register with manager (shuts down other emulators)
      await registerWithManager();

      // Destroy previous instance
      if (createdRef.current) {
        cancelAnimationFrame(rafRef.current);
        wasm.citrine_destroy();
        createdRef.current = false;
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const buffer = await file.arrayBuffer();
        await storeCTRROM(file.name, buffer);

        const ok = wasm.citrine_create();
        if (!ok) {
          setState((s) => ({ ...s, isLoading: false, error: "Failed to create emulator instance" }));
          return;
        }
        createdRef.current = true;

        const romData = new Uint8Array(buffer);
        const loaded = wasm.citrine_load_3dsx(romData);
        if (!loaded) {
          wasm.citrine_destroy();
          createdRef.current = false;
          setState((s) => ({ ...s, isLoading: false, error: "Failed to load ROM — unsupported format?" }));
          return;
        }

        pausedRef.current = false;
        frameCountRef.current = 0;
        rafRef.current = requestAnimationFrame(frameLoop);

        const roms = await listCTRROMs();
        setState((s) => ({
          ...s,
          isLoading: false,
          isRunning: true,
          isPaused: false,
          romName: file.name,
          error: null,
          savedROMs: roms,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load ROM";
        setState((s) => ({ ...s, isLoading: false, error: msg }));
      }
    },
    [frameLoop, registerWithManager]
  );

  // Load ROM from IndexedDB
  const loadSavedROM = useCallback(
    async (romName: string) => {
      const wasm = getWasm();
      if (!wasm) {
        setState((s) => ({ ...s, error: "WASM not initialized" }));
        return;
      }

      await registerWithManager();

      if (createdRef.current) {
        cancelAnimationFrame(rafRef.current);
        wasm.citrine_destroy();
        createdRef.current = false;
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const buffer = await loadCTRROM(romName);
        if (!buffer) {
          setState((s) => ({ ...s, isLoading: false, error: "ROM not found in storage" }));
          return;
        }

        const ok = wasm.citrine_create();
        if (!ok) {
          setState((s) => ({ ...s, isLoading: false, error: "Failed to create emulator instance" }));
          return;
        }
        createdRef.current = true;

        const loaded = wasm.citrine_load_3dsx(new Uint8Array(buffer));
        if (!loaded) {
          wasm.citrine_destroy();
          createdRef.current = false;
          setState((s) => ({ ...s, isLoading: false, error: "Failed to load ROM" }));
          return;
        }

        pausedRef.current = false;
        frameCountRef.current = 0;
        rafRef.current = requestAnimationFrame(frameLoop);

        setState((s) => ({
          ...s,
          isLoading: false,
          isRunning: true,
          isPaused: false,
          romName,
          error: null,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load ROM";
        setState((s) => ({ ...s, isLoading: false, error: msg }));
      }
    },
    [frameLoop, registerWithManager]
  );

  // Pause / Resume
  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    const wasm = getWasm();
    if (wasm && createdRef.current) {
      wasm.citrine_reset();
      pausedRef.current = false;
      setState((s) => ({ ...s, isPaused: false }));
    }
  }, []);

  // Button press/unpress (for on-screen controls)
  const buttonPress = useCallback((bit: number) => {
    buttonsRef.current |= 1 << bit;
  }, []);

  const buttonUnpress = useCallback((bit: number) => {
    buttonsRef.current &= ~(1 << bit);
  }, []);

  // Touch input on bottom screen
  const touchStart = useCallback((_x: number, _y: number) => {
    // TODO Phase 2: pass touch coords to WASM
  }, []);

  const touchMove = useCallback((_x: number, _y: number) => {}, []);
  const touchEnd = useCallback(() => {}, []);

  // Screenshot — composite both screens (Canvas 2D, works without pause)
  const takeScreenshot = useCallback((): string | null => {
    const top = topCanvasRef.current;
    const bot = botCanvasRef.current;
    if (!top || !bot) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = TOP_W;
      canvas.height = TOP_H + BOT_H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(top, 0, 0);
      ctx.drawImage(bot, (TOP_W - BOT_W) / 2, TOP_H);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  // Debug toggle
  const toggleDebug = useCallback(() => {
    showDebugRef.current = !showDebugRef.current;
    if (!showDebugRef.current) {
      setState((s) => ({ ...s, debugInfo: null }));
    }
  }, []);

  // Keyboard handler — uses dynamic keybinds from localStorage
  useEffect(() => {
    let binds = loadKeybinds();

    // Build key -> bit map
    const buildKeyToBit = () => {
      const map: Record<string, number> = {};
      for (const [key, button] of Object.entries(binds)) {
        const bit = BUTTON_TO_BIT[button];
        if (bit !== undefined) {
          map[key] = bit;
        }
      }
      return map;
    };

    let keyToBit = buildKeyToBit();

    const onKeybindsChanged = () => {
      binds = loadKeybinds();
      keyToBit = buildKeyToBit();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const bit = keyToBit[e.key.toLowerCase()];
      if (bit !== undefined) {
        e.preventDefault();
        buttonsRef.current |= 1 << bit;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const bit = keyToBit[e.key.toLowerCase()];
      if (bit !== undefined) {
        e.preventDefault();
        buttonsRef.current &= ~(1 << bit);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keybinds-changed", onKeybindsChanged);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keybinds-changed", onKeybindsChanged);
    };
  }, []);

  // Keep manager callbacks up to date
  useEffect(() => {
    if (state.isRunning) {
      updateCallbacks("ctr", {
        shutdown,
        pause,
        resume,
      });
    }
  }, [state.isRunning, shutdown, pause, resume]);

  // Cleanup on unmount — just pause, don't destroy (persistence)
  useEffect(() => {
    return () => {
      pausedRef.current = true;
    };
  }, []);

  return {
    state,
    initialize,
    loadROMFile,
    loadSavedROM,
    pause,
    resume,
    reset,
    buttonPress,
    buttonUnpress,
    touchStart,
    touchMove,
    touchEnd,
    takeScreenshot,
    toggleDebug,
    topCanvasRef,
    botCanvasRef,
  };
}
