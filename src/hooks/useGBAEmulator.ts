"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { storeSave, loadSave, storeROM, loadROM as loadROMFromDB, listROMs } from "@/utils/emulatorStorage";

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
  const [state, setState] = useState<GBAEmulatorState>({
    isReady: false,
    isRunning: false,
    isPaused: false,
    romName: null,
    error: null,
    volume: 1.0,
    speed: 1,
    savedROMs: [],
  });

  // Initialize emulator
  const initialize = useCallback(async () => {
    if (emulatorRef.current || !canvasRef.current) return;

    try {
      // Load mGBA from public/ at runtime to bypass Turbopack bundling the WASM
      const scriptUrl = "/mgba/mgba.js";
      const mod = await (new Function("url", "return import(url)")(scriptUrl));
      const mGBA = mod.default;
      const Module = await mGBA({ canvas: canvasRef.current }) as unknown as mGBAEmulator;

      await Module.FSInit();
      emulatorRef.current = Module;

      // Load list of saved ROMs from IndexedDB
      const roms = await listROMs();

      setState((s) => ({ ...s, isReady: true, savedROMs: roms }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize emulator";
      setState((s) => ({ ...s, error: msg }));
    }
  }, [canvasRef]);

  // Load ROM from File
  const loadROMFile = useCallback(async (file: File) => {
    const emu = emulatorRef.current;
    if (!emu) return;

    try {
      // Store ROM in IndexedDB for later use
      const buffer = await file.arrayBuffer();
      await storeROM(file.name, buffer);

      const paths = emu.filePaths();
      const romPath = `${paths.gamePath}/${file.name}`;

      // Write ROM to emulator filesystem
      emu.FS.writeFile(romPath, new Uint8Array(buffer));

      // Check if we have a saved .sav for this ROM
      const savedData = await loadSave(file.name);
      if (savedData) {
        const saveName = file.name.replace(/\.[^.]+$/, ".sav");
        const savePath = `${paths.savePath}/${saveName}`;
        emu.FS.writeFile(savePath, savedData);
      }

      const success = emu.loadGame(romPath);
      if (!success) {
        setState((s) => ({ ...s, error: "Failed to load ROM" }));
        return;
      }

      const roms = await listROMs();
      setState((s) => ({
        ...s,
        isRunning: true,
        isPaused: false,
        romName: file.name,
        error: null,
        savedROMs: roms,
      }));

      // Start auto-save interval (every 30s)
      startAutoSave(file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load ROM";
      setState((s) => ({ ...s, error: msg }));
    }
  }, []);

  // Load ROM from IndexedDB (previously stored)
  const loadSavedROM = useCallback(async (romName: string) => {
    const emu = emulatorRef.current;
    if (!emu) return;

    try {
      const buffer = await loadROMFromDB(romName);
      if (!buffer) {
        setState((s) => ({ ...s, error: "ROM not found in storage" }));
        return;
      }

      const paths = emu.filePaths();
      const romPath = `${paths.gamePath}/${romName}`;
      emu.FS.writeFile(romPath, new Uint8Array(buffer));

      // Load save if exists
      const savedData = await loadSave(romName);
      if (savedData) {
        const saveName = romName.replace(/\.[^.]+$/, ".sav");
        const savePath = `${paths.savePath}/${saveName}`;
        emu.FS.writeFile(savePath, savedData);
      }

      const success = emu.loadGame(romPath);
      if (!success) {
        setState((s) => ({ ...s, error: "Failed to load ROM" }));
        return;
      }

      setState((s) => ({
        ...s,
        isRunning: true,
        isPaused: false,
        romName,
        error: null,
      }));

      startAutoSave(romName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load ROM";
      setState((s) => ({ ...s, error: msg }));
    }
  }, []);

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

  // Pause / Resume
  const pause = useCallback(() => {
    emulatorRef.current?.pauseGame();
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    emulatorRef.current?.resumeGame();
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    emulatorRef.current?.quickReload();
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
    if (!emu || !state.romName) return;
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    const paths = emu.filePaths();
    const saveName = state.romName.replace(/\.[^.]+$/, ".sav");
    emu.FS.writeFile(`${paths.savePath}/${saveName}`, data);
    await storeSave(state.romName, data);

    // Reload game to pick up new save
    const romPath = `${paths.gamePath}/${state.romName}`;
    emu.loadGame(romPath);
  }, [state.romName]);

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

  // Screenshot — capture canvas as PNG blob
  const takeScreenshot = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }, [canvasRef]);

  // Persist save on unmount / tab switch
  const persistSave = useCallback(async () => {
    const emu = emulatorRef.current;
    if (!emu || !state.romName) return;
    const save = emu.getSave();
    if (save) {
      await storeSave(state.romName, save);
    }
  }, [state.romName]);

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
