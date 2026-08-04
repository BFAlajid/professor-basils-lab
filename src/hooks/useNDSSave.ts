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
    // NOTE: _cmd_reset aborts the WASM runtime (abort(undefined)) on melonDS
    // libretro and there is no alternative soft-reset export. Writing the .srm
    // without resetting means the running core keeps its in-memory SRAM. We
    // persist the imported data to IndexedDB so it loads on the next page boot,
    // and prompt the user to reload so the imported save takes effect now.
    if (romNameRef.current) {
      await storeNDSSave(romNameRef.current, data);
    }
    if (typeof window !== "undefined") {
      const proceed = window.confirm(
        "Save imported. The NDS core cannot hot-swap SRAM, so a page reload is required for the imported save to take effect. Reload now?"
      );
      if (proceed) window.location.reload();
    }
  }, [romNameRef]);

  return { persistSave, exportSave, importSave };
}
