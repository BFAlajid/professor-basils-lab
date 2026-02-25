"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  storeNDSSave,
  loadNDSSave,
  storeNDSROM,
  loadNDSROM,
  listNDSROMs,
} from "@/utils/ndsEmulatorStorage";

// NDS button bit positions (kept for NDSEmulatorTab compatibility)
export const NDS_KEYS = {
  RIGHT: 0,
  LEFT: 1,
  DOWN: 2,
  UP: 3,
  SELECT: 4,
  START: 5,
  B: 6,
  A: 7,
  Y: 8,
  X: 9,
  L: 10,
  R: 11,
} as const;

export type NDSButtonName = keyof typeof NDS_KEYS;

export interface NDSEmulatorState {
  isReady: boolean;
  isLoading: boolean;
  isRunning: boolean;
  isPaused: boolean;
  romName: string | null;
  error: string | null;
  volume: number;
  savedROMs: string[];
}

// Map NDS button bit → keyboard event props for dispatching to RetroArch
const BIT_TO_KEY: Record<number, { key: string; code: string; keyCode: number }> = {
  [NDS_KEYS.A]:      { key: "z",          code: "KeyZ",       keyCode: 90 },
  [NDS_KEYS.B]:      { key: "x",          code: "KeyX",       keyCode: 88 },
  [NDS_KEYS.X]:      { key: "c",          code: "KeyC",       keyCode: 67 },
  [NDS_KEYS.Y]:      { key: "v",          code: "KeyV",       keyCode: 86 },
  [NDS_KEYS.L]:      { key: "a",          code: "KeyA",       keyCode: 65 },
  [NDS_KEYS.R]:      { key: "s",          code: "KeyS",       keyCode: 83 },
  [NDS_KEYS.START]:  { key: "Enter",      code: "Enter",      keyCode: 13 },
  [NDS_KEYS.SELECT]: { key: "Backspace",  code: "Backspace",  keyCode: 8  },
  [NDS_KEYS.UP]:     { key: "ArrowUp",    code: "ArrowUp",    keyCode: 38 },
  [NDS_KEYS.DOWN]:   { key: "ArrowDown",  code: "ArrowDown",  keyCode: 40 },
  [NDS_KEYS.LEFT]:   { key: "ArrowLeft",  code: "ArrowLeft",  keyCode: 37 },
  [NDS_KEYS.RIGHT]:  { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
};

// RetroArch config: our keybinds + disable all hotkeys + melonDS touch
const RETROARCH_CFG = [
  'input_player1_a = "z"',
  'input_player1_b = "x"',
  'input_player1_x = "c"',
  'input_player1_y = "v"',
  'input_player1_l = "a"',
  'input_player1_r = "s"',
  'input_player1_start = "enter"',
  'input_player1_select = "backspace"',
  'input_player1_up = "up"',
  'input_player1_down = "down"',
  'input_player1_left = "left"',
  'input_player1_right = "right"',
  'input_menu_toggle = "nul"',
  'input_save_state = "nul"',
  'input_load_state = "nul"',
  'input_screenshot = "nul"',
  'input_exit_emulator = "nul"',
  'input_toggle_fullscreen = "nul"',
  'input_hold_fast_forward = "nul"',
  'input_toggle_fast_forward = "nul"',
  'input_hold_slowmotion = "nul"',
  'input_toggle_slowmotion = "nul"',
  'input_rewind = "nul"',
  'input_pause_toggle = "nul"',
  'input_reset = "nul"',
  'input_grab_mouse_toggle = "nul"',
  'input_game_focus_toggle = "nul"',
  'input_volume_up = "nul"',
  'input_volume_down = "nul"',
  'rgui_show_start_screen = "false"',
  'notification_show_remap_load = "false"',
  'menu_mouse_enable = "true"',
  'menu_pointer_enable = "true"',
].join("\n") + "\n";

const MELONDS_OPT = 'melonds_touch_mode = "Touch"\n';
const SAVE_DIR = "/home/web_user/retroarch/userdata/saves/";
const SRAM_EXTS = [".srm", ".sram", ".ram", ".sav", ".dsv", ".nvr"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Win = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ────────────────────────────────────────────────────────────
// Module-level singletons — persist across React mount/unmount
// Emscripten's WASM cannot be re-initialized in the same page,
// so we keep the canvas and module alive forever.
// ────────────────────────────────────────────────────────────
let persistentCanvas: HTMLCanvasElement | null = null;
let moduleLoaded = false;
let moduleRunning = false;
let currentRomName: string | null = null;

function getOrCreateCanvas(): HTMLCanvasElement {
  if (!persistentCanvas) {
    persistentCanvas = document.createElement("canvas");
    persistentCanvas.id = "canvas";
    persistentCanvas.width = 256;
    persistentCanvas.height = 384;
    persistentCanvas.style.display = "block";
    persistentCanvas.style.width = "100%";
    persistentCanvas.style.aspectRatio = "2/3";
    persistentCanvas.tabIndex = 0;
    persistentCanvas.style.outline = "none";
    // Re-focus canvas on click so keyboard input resumes after interacting elsewhere
    persistentCanvas.addEventListener("mousedown", () => persistentCanvas?.focus());
  }
  return persistentCanvas;
}

export function useNDSEmulator() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const romNameRef = useRef<string | null>(currentRomName);

  const [state, setState] = useState<NDSEmulatorState>({
    isReady: false,
    isLoading: false,
    isRunning: moduleRunning,
    isPaused: false,
    romName: currentRomName,
    error: null,
    volume: 1.0,
    savedROMs: [],
  });

  // ── Attach persistent canvas to container on mount ──
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      const canvas = getOrCreateCanvas();
      if (canvas.parentNode !== node) {
        node.appendChild(canvas);
      }
    }
  }, []);

  // ── Initialize: list saved ROMs, restore running state if module still alive ──
  const initialize = useCallback(async () => {
    try {
      const roms = await listNDSROMs();
      if (moduleLoaded && moduleRunning) {
        // Module survived tab switch — resume
        const win = window as unknown as Win;
        win.Module?.resumeMainLoop?.();
        setState((s) => ({
          ...s,
          isReady: true,
          isRunning: true,
          isPaused: false,
          romName: currentRomName,
          savedROMs: roms,
        }));
      } else {
        setState((s) => ({ ...s, isReady: true, savedROMs: roms }));
      }
    } catch {
      setState((s) => ({ ...s, isReady: true, savedROMs: [] }));
    }
  }, []);

  // ── Persist save from FS → IndexedDB ──
  const persistSave = useCallback(async () => {
    const win = window as unknown as Win;
    const romName = romNameRef.current;
    if (!romName || !win.Module || !win.FS) return;
    try {
      win.Module._cmd_savefiles?.();
      const savePath = SAVE_DIR + "rom.srm";
      if (win.FS.analyzePath(savePath).exists) {
        const data: Uint8Array = win.FS.readFile(savePath);
        await storeNDSSave(romName, data);
      }
    } catch (e) {
      console.warn("[NDS] persistSave failed:", e);
    }
  }, []);

  // ── Core boot: set up Module, load script, write FS, callMain ──
  const startEmulation = useCallback(
    (romData: Uint8Array, romExt: string, saveData: Uint8Array | null): Promise<void> => {
      return new Promise((resolve, reject) => {
        const canvas = getOrCreateCanvas();
        const win = window as unknown as Win;

        // Timeout so we don't hang forever
        const timeout = setTimeout(() => {
          reject(new Error("Emulator initialization timed out (30s)"));
        }, 30000);

        win.Module = {
          canvas,
          noInitialRun: true,
          arguments: [`/rom/rom.${romExt}`, "--verbose"],
          locateFile: (path: string) => `/nds/${path}`,

          onRuntimeInitialized: () => {
            try {
              clearTimeout(timeout);
              const FS = win.FS;

              // Create directory tree
              const mkdirp = (p: string) => {
                const parts = p.replace(/^\//, "").split("/");
                let cur = "";
                for (const part of parts) {
                  cur += "/" + part;
                  if (!FS.analyzePath(cur).exists) FS.mkdir(cur);
                }
              };
              mkdirp("/rom");
              mkdirp("/home/web_user/retroarch/userdata/config/melonDS");
              mkdirp("/home/web_user/retroarch/userdata/saves");
              mkdirp("/home/web_user/retroarch/userdata/states");

              // Write config
              FS.writeFile("/home/web_user/retroarch/userdata/retroarch.cfg", RETROARCH_CFG);
              FS.writeFile(
                "/home/web_user/retroarch/userdata/config/melonDS/melonDS.opt",
                MELONDS_OPT
              );

              // Write ROM
              FS.writeFile(`/rom/rom.${romExt}`, romData);

              // Restore save if we have one
              if (saveData && saveData.length > 0) {
                FS.writeFile(SAVE_DIR + "rom.srm", saveData);
              }

              // Start RetroArch
              win.Module.callMain(win.Module.arguments);

              // Focus canvas so it receives keyboard events
              canvas.focus();

              // Track save writes for auto-persist
              try {
                FS.trackingDelegate.onWriteToFile = (path: string) => {
                  if (SRAM_EXTS.some((ext) => path.endsWith(ext))) {
                    const romName = romNameRef.current;
                    if (romName) {
                      try {
                        const data: Uint8Array = FS.readFile(path);
                        storeNDSSave(romName, data);
                      } catch { /* best effort */ }
                    }
                  }
                };
              } catch { /* tracking delegate not available */ }

              moduleLoaded = true;
              moduleRunning = true;
              resolve();
            } catch (err) {
              clearTimeout(timeout);
              reject(err);
            }
          },

          onAbort: (what: unknown) => {
            clearTimeout(timeout);
            reject(new Error(`Emulator aborted: ${what}`));
          },

          print: (...args: unknown[]) => console.log("[NDS]", ...args),
          printErr: (...args: unknown[]) => console.warn("[NDS]", ...args),
        };

        // Load the melonDS RetroArch core script
        const script = document.createElement("script");
        script.src = "/nds/melonds_libretro.js";
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Failed to load melonDS core"));
        };
        document.head.appendChild(script);
      });
    },
    []
  );

  // ── Load ROM from File ──
  const loadROMFile = useCallback(
    async (file: File) => {
      if (moduleLoaded) {
        setState((s) => ({
          ...s,
          error: "A ROM is already running. Refresh the page to load a different ROM.",
        }));
        return;
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const buffer = await file.arrayBuffer();
        await storeNDSROM(file.name, buffer);

        const romData = new Uint8Array(buffer);
        const ext = file.name.split(".").pop()?.toLowerCase() || "nds";
        romNameRef.current = file.name;
        currentRomName = file.name;

        const saveData = await loadNDSSave(file.name);
        await startEmulation(romData, ext, saveData);

        const roms = await listNDSROMs();
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
    [startEmulation]
  );

  // ── Load ROM from IndexedDB ──
  const loadSavedROM = useCallback(
    async (romName: string) => {
      if (moduleLoaded) {
        setState((s) => ({
          ...s,
          error: "A ROM is already running. Refresh the page to load a different ROM.",
        }));
        return;
      }

      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const buffer = await loadNDSROM(romName);
        if (!buffer) {
          setState((s) => ({ ...s, isLoading: false, error: "ROM not found in storage" }));
          return;
        }

        const romData = new Uint8Array(buffer);
        const ext = romName.split(".").pop()?.toLowerCase() || "nds";
        romNameRef.current = romName;
        currentRomName = romName;

        const saveData = await loadNDSSave(romName);
        await startEmulation(romData, ext, saveData);

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
    [startEmulation]
  );

  // ── Pause / Resume ──
  const pause = useCallback(() => {
    const win = window as unknown as Win;
    win.Module?.pauseMainLoop?.();
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    const win = window as unknown as Win;
    win.Module?.resumeMainLoop?.();
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // ── Reset ──
  const reset = useCallback(() => {
    const win = window as unknown as Win;
    win.Module?._cmd_reset?.();
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // Dispatch to the canvas element so Emscripten's keyboard handler receives it
  const buttonPress = useCallback((bit: number) => {
    const kv = BIT_TO_KEY[bit];
    if (!kv) return;
    const target = persistentCanvas || document;
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: kv.key,
        code: kv.code,
        keyCode: kv.keyCode,
        bubbles: true,
        cancelable: true,
      })
    );
  }, []);

  const buttonUnpress = useCallback((bit: number) => {
    const kv = BIT_TO_KEY[bit];
    if (!kv) return;
    const target = persistentCanvas || document;
    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: kv.key,
        code: kv.code,
        keyCode: kv.keyCode,
        bubbles: true,
        cancelable: true,
      })
    );
  }, []);

  // ── Touch input — RetroArch handles pointer events on canvas natively ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchStart = useCallback((_x: number, _y: number) => {}, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const touchMove = useCallback((_x: number, _y: number) => {}, []);
  const touchEnd = useCallback(() => {}, []);

  // ── Export save ──
  const exportSave = useCallback((): Uint8Array | null => {
    const win = window as unknown as Win;
    if (!win.Module || !win.FS) return null;
    try {
      win.Module._cmd_savefiles();
      const savePath = SAVE_DIR + "rom.srm";
      if (win.FS.analyzePath(savePath).exists) {
        return win.FS.readFile(savePath) as Uint8Array;
      }
    } catch { /* no save */ }
    return null;
  }, []);

  // ── Import save ──
  const importSave = useCallback(async (file: File) => {
    const win = window as unknown as Win;
    if (!win.Module || !win.FS) return;
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    win.FS.writeFile(SAVE_DIR + "rom.srm", data);
    win.Module._cmd_reset?.();
    if (romNameRef.current) {
      await storeNDSSave(romNameRef.current, data);
    }
  }, []);

  // ── Volume ──
  const setVolume = useCallback((_v: number) => {
    setState((s) => ({ ...s, volume: _v }));
  }, []);

  // ── Screenshot ──
  const takeScreenshot = useCallback((): string | null => {
    const canvas = persistentCanvas;
    if (!canvas) return null;
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  // ── On unmount: pause (don't destroy), persist save ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) persistSave();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      // Pause main loop so the emulator doesn't run in background
      const win = window as unknown as Win;
      win.Module?.pauseMainLoop?.();
      persistSave();
      // Do NOT destroy Module/FS — they can't be re-initialized
    };
  }, [persistSave]);

  return {
    state,
    initialize,
    loadROMFile,
    loadSavedROM,
    pause,
    resume,
    reset,
    exportSave,
    importSave,
    setVolume,
    buttonPress,
    buttonUnpress,
    touchStart,
    touchMove,
    touchEnd,
    takeScreenshot,
    persistSave,
    setContainerRef,
  };
}
