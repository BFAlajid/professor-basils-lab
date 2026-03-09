"use client";

import { useCallback } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { storeNDSSave } from "@/utils/ndsEmulatorStorage";
import type { NDSEmulatorWindow } from "@/types/emulator";

type Win = NDSEmulatorWindow;
const SAVE_DIR = "/home/web_user/retroarch/userdata/saves/";

/**
 * Sub-hook for NDS save file management (persist, export, import).
 */
export function useNDSSave(romNameRef: React.MutableRefObject<string | null>) {
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
  }, [romNameRef]);

  const exportSave = useCallback((): Uint8Array | null => {
    const win = window as unknown as Win;
    if (!win.Module || !win.FS) return null;
    try {
      win.Module._cmd_savefiles();
      const savePath = SAVE_DIR + "rom.srm";
      if (win.FS.analyzePath(savePath).exists) {
        return win.FS.readFile(savePath) as Uint8Array;
      }
    } catch (e) { silentWarn("extractNDSSave", e); }
    return null;
  }, []);

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
  }, [romNameRef]);

  return { persistSave, exportSave, importSave };
}
