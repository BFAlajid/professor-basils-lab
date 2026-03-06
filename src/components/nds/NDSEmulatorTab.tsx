"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useNDSEmulator, NDS_KEYS } from "@/hooks/useNDSEmulator";
import { useGamepad, type GBAButton } from "@/hooks/useGamepad";
import { loadKeybinds, getButtonToKey } from "@/utils/keybinds";
import NDSEmulatorControls from "./NDSEmulatorControls";
import NDSTouchControls from "./NDSTouchControls";
import NDSRomOverlay from "./NDSRomOverlay";
import KeyRemapDialog from "@/components/emulator/KeyRemapDialog";

/** Map GBA-style button names from useGamepad to NDS key bit positions */
const GAMEPAD_TO_NDS: Record<GBAButton, number> = {
  A: NDS_KEYS.A,
  B: NDS_KEYS.B,
  L: NDS_KEYS.L,
  R: NDS_KEYS.R,
  START: NDS_KEYS.START,
  SELECT: NDS_KEYS.SELECT,
  UP: NDS_KEYS.UP,
  DOWN: NDS_KEYS.DOWN,
  LEFT: NDS_KEYS.LEFT,
  RIGHT: NDS_KEYS.RIGHT,
};

// Map EmulatorButton name -> NDS bit for keyboard translation
const BUTTON_TO_NDS_BIT: Record<string, number> = {
  A: NDS_KEYS.A,
  B: NDS_KEYS.B,
  X: NDS_KEYS.X,
  Y: NDS_KEYS.Y,
  L: NDS_KEYS.L,
  R: NDS_KEYS.R,
  START: NDS_KEYS.START,
  SELECT: NDS_KEYS.SELECT,
  UP: NDS_KEYS.UP,
  DOWN: NDS_KEYS.DOWN,
  LEFT: NDS_KEYS.LEFT,
  RIGHT: NDS_KEYS.RIGHT,
};

interface NDSEmulatorTabProps {
  initialFile?: File | null;
}

export default function NDSEmulatorTab({ initialFile }: NDSEmulatorTabProps) {
  const saveInputRef = useRef<HTMLInputElement>(null);
  const romInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showRemap, setShowRemap] = useState(false);
  const [keybindDisplay, setKeybindDisplay] = useState(() => getButtonToKey(loadKeybinds()));

  const {
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
    takeScreenshot,
    setContainerRef,
  } = useNDSEmulator();

  // Gamepad support
  const handleGamepadPress = useCallback(
    (button: GBAButton) => buttonPress(GAMEPAD_TO_NDS[button]),
    [buttonPress]
  );

  const handleGamepadRelease = useCallback(
    (button: GBAButton) => buttonUnpress(GAMEPAD_TO_NDS[button]),
    [buttonUnpress]
  );

  const { connected: gamepadConnected, controllerName: gamepadName } = useGamepad({
    onButtonPress: handleGamepadPress,
    onButtonRelease: handleGamepadRelease,
    enabled: state.isRunning && !state.isPaused,
  });

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-load ROM passed from parent
  const initialFileLoadedRef = useRef(false);
  useEffect(() => {
    if (initialFile && state.isReady && !state.isRunning && !initialFileLoadedRef.current) {
      initialFileLoadedRef.current = true;
      loadROMFile(initialFile);
    }
  }, [initialFile, state.isReady, state.isRunning, loadROMFile]);

  // Keyboard translation layer: intercept user keypresses and dispatch
  // synthetic events with the keys RetroArch expects.
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;

    let binds = loadKeybinds();

    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const emButton = binds[e.key.toLowerCase()];
      if (emButton) {
        const bit = BUTTON_TO_NDS_BIT[emButton];
        if (bit !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          buttonPress(bit);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const emButton = binds[e.key.toLowerCase()];
      if (emButton) {
        const bit = BUTTON_TO_NDS_BIT[emButton];
        if (bit !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          buttonUnpress(bit);
        }
      }
    };

    const onKeybindsChanged = () => {
      binds = loadKeybinds();
      setKeybindDisplay(getButtonToKey(binds));
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("keybinds-changed", onKeybindsChanged);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("keybinds-changed", onKeybindsChanged);
    };
  }, [state.isRunning, state.isPaused, buttonPress, buttonUnpress]);

  const handleCloseRemap = useCallback(() => {
    setShowRemap(false);
    setKeybindDisplay(getButtonToKey(loadKeybinds()));
  }, []);

  const handleROMFile = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "nds" || ext === "ds") {
        loadROMFile(file);
      }
    },
    [loadROMFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleROMFile(file);
    },
    [handleROMFile]
  );

  const handleExportSave = useCallback(() => {
    const data = exportSave();
    if (!data) return;
    const blob = new Blob([new Uint8Array(data)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (state.romName ?? "game").replace(/\.[^.]+$/, ".sav");
    a.click();
    URL.revokeObjectURL(url);
  }, [exportSave, state.romName]);

  const handleImportSave = useCallback(() => {
    saveInputRef.current?.click();
  }, []);

  const onSaveFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) importSave(file);
      e.target.value = "";
    },
    [importSave]
  );

  const handleScreenshot = useCallback(() => {
    const dataUrl = takeScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `nds-screenshot-${Date.now()}.png`;
    a.click();
  }, [takeScreenshot]);

  const handleBtnDown = useCallback(
    (bit: number) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      buttonPress(bit);
    },
    [buttonPress]
  );

  const handleBtnUp = useCallback(
    (bit: number) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      buttonUnpress(bit);
    },
    [buttonUnpress]
  );

  return (
    <div className="space-y-4">
      {showRemap && <KeyRemapDialog onClose={handleCloseRemap} />}

      {state.error && (
        <div className="bg-[#e8433f]/20 border border-[#e8433f] rounded-lg p-3 text-sm text-[#f0f0e8] font-pixel">
          {state.error}
        </div>
      )}

      <NDSEmulatorControls
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        volume={state.volume}
        onPause={pause}
        onResume={resume}
        onReset={reset}
        onExportSave={handleExportSave}
        onImportSave={handleImportSave}
        onSetVolume={setVolume}
        onScreenshot={handleScreenshot}
        onOpenKeyRemap={() => setShowRemap(true)}
        gamepadConnected={gamepadConnected}
        gamepadName={gamepadName}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative rounded-lg overflow-hidden border-4 ${
            dragOver ? "border-[#e8433f]" : "border-[#3a4466]"
          } bg-black transition-colors`}
          style={{ width: "100%", maxWidth: 512 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {state.isRunning && (
            <div
              className="absolute left-0 right-0 h-px bg-[#3a4466] z-10 pointer-events-none"
              style={{ top: "50%" }}
            />
          )}

          <div
            ref={setContainerRef}
            className="block w-full aspect-[2/3]"
            style={{
              imageRendering: "pixelated",
            } as React.CSSProperties}
          />

          <NDSRomOverlay
            isReady={state.isReady}
            isRunning={state.isRunning}
            isLoading={state.isLoading}
            error={state.error}
            savedROMs={state.savedROMs}
            onChooseROM={() => romInputRef.current?.click()}
            onLoadSavedROM={loadSavedROM}
          />
        </div>

        {/* Dynamic keyboard mapping info */}
        {state.isRunning && (
          <div className="text-[10px] text-[#8b9bb4] text-center space-y-1">
            <p>
              <span className="text-[#f0f0e8]">{keybindDisplay.UP}/{keybindDisplay.DOWN}/{keybindDisplay.LEFT}/{keybindDisplay.RIGHT}</span> = D-Pad
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.A}</span> = A
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.B}</span> = B
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.X}</span> = X
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.Y}</span> = Y
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.START}</span> = Start
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.SELECT}</span> = Select
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.L}</span> = L
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.R}</span> = R
            </p>
            <p className="text-[#8b9bb4]/60">Click or tap bottom screen for touch input</p>
          </div>
        )}

        {state.isRunning && (
          <NDSTouchControls onButtonDown={handleBtnDown} onButtonUp={handleBtnUp} />
        )}
      </div>

      <input
        ref={romInputRef}
        type="file"
        accept=".nds,.ds"
        className="hidden"
        aria-label="Load NDS ROM file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleROMFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={saveInputRef}
        type="file"
        accept=".sav,.dsv"
        className="hidden"
        aria-label="Load NDS save file"
        onChange={onSaveFileSelected}
      />
    </div>
  );
}
