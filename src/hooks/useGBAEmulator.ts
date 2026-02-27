"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { storeSave, loadSave, storeROM, loadROM as loadROMFromDB, listROMs } from "@/utils/emulatorStorage";
import { registerEmulator, updateCallbacks, unregister } from "@/utils/emulatorManager";
import type { GBAEmulatorWindow } from "@/types/emulator";

// Dynamically import mGBA to avoid SSR issues
type mGBAEmulator = {
  FSInit(): Promise<void>;
  FSSync(): Promise<void>;
  filePaths(): { gamePath: string; savePath: string; saveStatePath: string };
  loadGame(romPath: string): boolean;
  quitGame(): void;
  quickReload(): void;
  pauseGame(): void;
  resumeGame(): void;
  setVolume(v: number): void;
  getVolume(): number;
  setFastForwardMultiplier(m: number): void;
  getFastForwardMultiplier(): number;
  saveState(slot: number): boolean;
  loadState(slot: number): boolean;
  getSave(): Uint8Array | null;
  uploadRom(file: File, cb?: () => void): void;
  uploadSaveOrSaveState(file: File, cb?: () => void): void;
  buttonPress(name: string): void;
  buttonUnpress(name: string): void;
  toggleInput(enabled: boolean): void;
  bindKey(binding: string, input: string): void;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    readdir(path: string): string[];
    unlink(path: string): void;
    mkdir(path: string): void;
  };
  version: { projectName: string; projectVersion: string };
  addCoreCallbacks(cb: Record<string, (() => void) | null | undefined>): void;
  setCoreSettings(settings: Record<string, unknown>): void;
};

export interface GBAEmulatorState {
  isReady: boolean;
  isLoading: boolean;
  isRunning: boolean;
  isPaused: boolean;
  romName: string | null;
  error: string | null;
  volume: number;
  speed: number;
  savedROMs: string[];
}

export function useGBAEmulator(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const emulatorRef = useRef<mGBAEmulator | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const romNameRef = useRef<string | null>(null);
  const [state, setState] = useState<GBAEmulatorState>({
    isReady: false,
    isLoading: false,
    isRunning: false,
    isPaused: false,
    romName: null,
    error: null,
    volume: 1.0,
    speed: 1,
    savedROMs: [],
  });

  // Lightweight init: just list saved ROMs so the UI can render immediately
  const initialize = useCallback(async () => {
    try {
      const roms = await listROMs();
      setState((s) => ({ ...s, isReady: true, savedROMs: roms }));
    } catch {
      setState((s) => ({ ...s, isReady: true, savedROMs: [] }));
    }
  }, []);

  // Heavy init: download and compile mGBA WASM (called lazily on first ROM load)
  const ensureModule = useCallback(async () => {
    if (emulatorRef.current) return true;
    if (!canvasRef.current) return false;

    try {
      setState((s) => ({ ...s, isLoading: true }));

      // mGBA uses pthreads (Web Workers + SharedArrayBuffer).
      if (typeof SharedArrayBuffer === "undefined") {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        throw new Error(
          isIOS
            ? "GBA emulator requires features not available in this browser. On iOS, please use Safari instead."
            : "GBA emulator requires SharedArrayBuffer which is not available in this browser. Try Chrome, Firefox, or Safari."
        );
      }

      // Load mGBA factory via inline <script type="module">.
      const mGBA = await new Promise<(opts: Record<string, unknown>) => Promise<mGBAEmulator>>((resolve, reject) => {
        const cbName = `__mGBA_${Date.now()}`;
        const win = window as unknown as GBAEmulatorWindow;
        const timeout = setTimeout(() => {
          delete win[cbName];
          reject(new Error("mGBA script load timed out (30s)"));
        }, 30000);
        win[cbName] = (factory: (opts: Record<string, unknown>) => Promise<mGBAEmulator>) => {
          clearTimeout(timeout);
          delete win[cbName];
          resolve(factory);
        };
        const script = document.createElement("script");
        script.type = "module";
        script.textContent = `import m from"/mgba/mgba.js";window["${cbName}"](m);`;
        script.onerror = () => {
          clearTimeout(timeout);
          delete win[cbName];
          reject(new Error("Failed to load mGBA script"));
        };
        document.head.appendChild(script);
      });

      const Module = await Promise.race([
        mGBA({ canvas: canvasRef.current }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(
            "GBA emulator initialization timed out. This browser may not support " +
            "the required WebAssembly threading features."
          )), 30000)
        ),
      ]) as unknown as mGBAEmulator;

      await Module.FSInit();

      // Disable mGBA's built-in Emscripten keyboard handlers
      Module.toggleInput(false);

      emulatorRef.current = Module;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize emulator";
      setState((s) => ({ ...s, isLoading: false, error: msg }));
      return false;
    }
  }, [canvasRef]);

  // Persist save to IndexedDB
  const persistSave = useCallback(async () => {
    const emu = emulatorRef.current;
    const romName = romNameRef.current;
    if (!emu || !romName) return;
    const save = emu.getSave();
    if (save) {
      await storeSave(romName, save);
    }
  }, []);

  // Shutdown callback for emulatorManager
  const shutdown = useCallback(async () => {
    await persistSave();
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
    emulatorRef.current?.quitGame();
    pausedRef.current = false;
    romNameRef.current = null;
    setState((s) => ({
      ...s,
      isRunning: false,
      isPaused: false,
      romName: null,
    }));
  }, [persistSave]);

  const startAutoSave = useCallback((romName: string) => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(async () => {
      const emu = emulatorRef.current;
      if (!emu) return;
      const save = emu.getSave();
      if (save) {
        await storeSave(romName, save);
      }
    }, 30000);
  }, []);

  // Register with emulator manager (called after ROM loads)
  const registerWithManager = useCallback(async () => {
    await registerEmulator("gba", {
      shutdown,
      pause: () => {
        emulatorRef.current?.pauseGame();
        pausedRef.current = true;
        setState((s) => ({ ...s, isPaused: true }));
      },
      resume: () => {
        emulatorRef.current?.resumeGame();
        pausedRef.current = false;
        setState((s) => ({ ...s, isPaused: false }));
      },
    });
  }, [shutdown]);

  // Load ROM from File
  const loadROMFile = useCallback(async (file: File) => {
    if (!emulatorRef.current) {
      const ok = await ensureModule();
      if (!ok) return;
    }
    const emu = emulatorRef.current!;

    // Register with manager (shuts down other emulators)
    await registerWithManager();

    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const buffer = await file.arrayBuffer();
      await storeROM(file.name, buffer);

      const paths = emu.filePaths();
      const romPath = `${paths.gamePath}/${file.name}`;

      emu.FS.writeFile(romPath, new Uint8Array(buffer));

      const savedData = await loadSave(file.name);
      if (savedData) {
        const saveName = file.name.replace(/\.[^.]+$/, ".sav");
        const savePath = `${paths.savePath}/${saveName}`;
        emu.FS.writeFile(savePath, savedData);
      }

      const success = emu.loadGame(romPath);
      if (!success) {
        setState((s) => ({ ...s, isLoading: false, error: "Failed to load ROM" }));
        return;
      }

      romNameRef.current = file.name;
      pausedRef.current = false;
      const roms = await listROMs();
      setState((s) => ({
        ...s,
        isLoading: false,
        isRunning: true,
        isPaused: false,
        romName: file.name,
        error: null,
        savedROMs: roms,
      }));

      startAutoSave(file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load ROM";
      setState((s) => ({ ...s, isLoading: false, error: msg }));
    }
  }, [ensureModule, registerWithManager, startAutoSave]);

  // Load ROM from IndexedDB (previously stored)
  const loadSavedROM = useCallback(async (romName: string) => {
    if (!emulatorRef.current) {
      const ok = await ensureModule();
      if (!ok) return;
    }
    const emu = emulatorRef.current!;

    await registerWithManager();

    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const buffer = await loadROMFromDB(romName);
      if (!buffer) {
        setState((s) => ({ ...s, isLoading: false, error: "ROM not found in storage" }));
        return;
      }

      const paths = emu.filePaths();
      const romPath = `${paths.gamePath}/${romName}`;
      emu.FS.writeFile(romPath, new Uint8Array(buffer));

      const savedData = await loadSave(romName);
      if (savedData) {
        const saveName = romName.replace(/\.[^.]+$/, ".sav");
        const savePath = `${paths.savePath}/${saveName}`;
        emu.FS.writeFile(savePath, savedData);
      }

      const success = emu.loadGame(romPath);
      if (!success) {
        setState((s) => ({ ...s, isLoading: false, error: "Failed to load ROM" }));
        return;
      }

      romNameRef.current = romName;
      pausedRef.current = false;
      setState((s) => ({
        ...s,
        isLoading: false,
        isRunning: true,
        isPaused: false,
        romName,
        error: null,
      }));

      startAutoSave(romName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load ROM";
      setState((s) => ({ ...s, isLoading: false, error: msg }));
    }
  }, [ensureModule, registerWithManager, startAutoSave]);

  // Pause / Resume
  const pause = useCallback(() => {
    emulatorRef.current?.pauseGame();
    pausedRef.current = true;
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    emulatorRef.current?.resumeGame();
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    emulatorRef.current?.quickReload();
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // Save/Load states
  const saveStateSlot = useCallback((slot: number) => {
    return emulatorRef.current?.saveState(slot) ?? false;
  }, []);

  const loadStateSlot = useCallback((slot: number) => {
    return emulatorRef.current?.loadState(slot) ?? false;
  }, []);

  // Export save (.sav file)
  const exportSave = useCallback((): Uint8Array | null => {
    return emulatorRef.current?.getSave() ?? null;
  }, []);

  // Import save (.sav file)
  const importSave = useCallback(async (file: File) => {
    const emu = emulatorRef.current;
    const romName = romNameRef.current;
    if (!emu || !romName) return;
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    const paths = emu.filePaths();
    const saveName = romName.replace(/\.[^.]+$/, ".sav");
    emu.FS.writeFile(`${paths.savePath}/${saveName}`, data);
    await storeSave(romName, data);

    const romPath = `${paths.gamePath}/${romName}`;
    emu.loadGame(romPath);
  }, []);

  // Volume
  const setVolume = useCallback((v: number) => {
    emulatorRef.current?.setVolume(v);
    setState((s) => ({ ...s, volume: v }));
  }, []);

  // Speed
  const setSpeed = useCallback((multiplier: number) => {
    emulatorRef.current?.setFastForwardMultiplier(multiplier);
    setState((s) => ({ ...s, speed: multiplier }));
  }, []);

  // Virtual button press/release (for on-screen controls)
  const buttonPress = useCallback((btn: string) => {
    emulatorRef.current?.buttonPress(btn);
  }, []);

  const buttonUnpress = useCallback((btn: string) => {
    emulatorRef.current?.buttonUnpress(btn);
  }, []);

  // Screenshot — pause to preserve WebGL framebuffer, capture, resume
  const takeScreenshot = useCallback((): string | null => {
    const canvas = canvasRef.current;
    const emu = emulatorRef.current;
    if (!canvas) return null;

    const wasPaused = pausedRef.current;
    if (emu && !wasPaused) {
      emu.pauseGame();
    }

    let dataUrl: string | null = null;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      dataUrl = null;
    }

    if (emu && !wasPaused) {
      emu.resumeGame();
    }

    return dataUrl;
  }, [canvasRef]);

  // Keep manager callbacks up to date
  useEffect(() => {
    if (state.isRunning) {
      updateCallbacks("gba", {
        shutdown,
        pause,
        resume,
      });
    }
  }, [state.isRunning, shutdown, pause, resume]);

  // Persist save on visibility change; on unmount: pause + persist (don't quit)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        persistSave();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      emulatorRef.current?.pauseGame();
      persistSave();
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
    saveStateSlot,
    loadStateSlot,
    exportSave,
    importSave,
    setVolume,
    setSpeed,
    buttonPress,
    buttonUnpress,
    takeScreenshot,
    persistSave,
  };
}
