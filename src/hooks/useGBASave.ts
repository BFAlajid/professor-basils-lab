"use client";

import { useRef, useCallback } from "react";
import { storeSave, loadSave } from "@/utils/emulatorStorage";

type mGBAEmulator = {
  getSave(): Uint8Array | null;
  filePaths(): { gamePath: string; savePath: string; saveStatePath: string };
  loadGame(romPath: string): boolean;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  };
};

/**
 * Sub-hook for GBA save file management (persist, export, import, auto-save).
 */
export function useGBASave(
  emulatorRef: React.MutableRefObject<mGBAEmulator | null>,
  romNameRef: React.MutableRefObject<string | null>
) {
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistSave = useCallback(async () => {
    const emu = emulatorRef.current;
    const romName = romNameRef.current;
    if (!emu || !romName) return;
    const save = emu.getSave();
    if (save) {
      await storeSave(romName, save);
    }
  }, [emulatorRef, romNameRef]);

  const exportSave = useCallback((): Uint8Array | null => {
    return emulatorRef.current?.getSave() ?? null;
  }, [emulatorRef]);

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
  }, [emulatorRef, romNameRef]);

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
  }, [emulatorRef]);

  const clearAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  }, []);

  return { persistSave, exportSave, importSave, startAutoSave, clearAutoSave };
}
