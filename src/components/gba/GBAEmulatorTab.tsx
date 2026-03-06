"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useGBAEmulator } from "@/hooks/useGBAEmulator";
import { useGamepad, type GBAButton } from "@/hooks/useGamepad";
import { usePCBox } from "@/hooks/usePCBox";
import { loadKeybinds, getButtonToKey } from "@/utils/keybinds";
import EmulatorControls from "./EmulatorControls";
import SaveImporter from "./SaveImporter";
import GBATouchControls from "./GBATouchControls";
import GBARomOverlay from "./GBARomOverlay";
import KeyRemapDialog from "@/components/emulator/KeyRemapDialog";
import type { PCBoxPokemon } from "@/types";

/** Map uppercase GBA button names from useGamepad to mGBA emulator button names */
const GBA_TO_EMULATOR: Record<GBAButton, string> = {
  A: "A",
  B: "B",
  L: "L",
  R: "R",
  START: "Start",
  SELECT: "Select",
  UP: "Up",
  DOWN: "Down",
  LEFT: "Left",
  RIGHT: "Right",
};

// Map EmulatorButton names to mGBA button names
const BUTTON_TO_MGBA: Record<string, string> = {
  UP: "Up", DOWN: "Down", LEFT: "Left", RIGHT: "Right",
  A: "A", B: "B", L: "L", R: "R",
  START: "Start", SELECT: "Select",
};

interface GBAEmulatorTabProps {
  initialFile?: File | null;
}

export default function GBAEmulatorTab({ initialFile }: GBAEmulatorTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const romInputRef = useRef<HTMLInputElement>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importSaveData, setImportSaveData] = useState<Uint8Array | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showRemap, setShowRemap] = useState(false);
  const [keybindDisplay, setKeybindDisplay] = useState(() => getButtonToKey(loadKeybinds()));
  const { addToBox } = usePCBox();

  const onImportPokemon = useCallback(
    (pokemon: PCBoxPokemon) => addToBox(pokemon),
    [addToBox]
  );

  const {
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
  } = useGBAEmulator(canvasRef);

  // Gamepad support — only active when emulator is running
  const handleGamepadPress = useCallback(
    (button: GBAButton) => {
      buttonPress(GBA_TO_EMULATOR[button]);
    },
    [buttonPress]
  );

  const handleGamepadRelease = useCallback(
    (button: GBAButton) => {
      buttonUnpress(GBA_TO_EMULATOR[button]);
    },
    [buttonUnpress]
  );

  const { connected: gamepadConnected, controllerName: gamepadName } =
    useGamepad({
      onButtonPress: handleGamepadPress,
      onButtonRelease: handleGamepadRelease,
      enabled: state.isRunning && !state.isPaused,
    });

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-load ROM passed from parent (unified emulator tab)
  const initialFileLoadedRef = useRef(false);
  useEffect(() => {
    if (initialFile && state.isReady && !state.isRunning && !initialFileLoadedRef.current) {
      initialFileLoadedRef.current = true;
      loadROMFile(initialFile);
    }
  }, [initialFile, state.isReady, state.isRunning, loadROMFile]);

  // Keyboard bindings — dynamic from keybinds utility
  const pressedKeysRef = useRef(new Set<string>());
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
        const mgbaBtn = BUTTON_TO_MGBA[emButton];
        if (mgbaBtn && !pressedKeysRef.current.has(mgbaBtn)) {
          e.preventDefault();
          pressedKeysRef.current.add(mgbaBtn);
          buttonPress(mgbaBtn);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const emButton = binds[e.key.toLowerCase()];
      if (emButton) {
        const mgbaBtn = BUTTON_TO_MGBA[emButton];
        if (mgbaBtn) {
          e.preventDefault();
          pressedKeysRef.current.delete(mgbaBtn);
          buttonUnpress(mgbaBtn);
        }
      }
    };

    const onKeybindsChanged = () => {
      binds = loadKeybinds();
      setKeybindDisplay(getButtonToKey(binds));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keybinds-changed", onKeybindsChanged);
    return () => {
      pressedKeysRef.current.forEach((btn) => buttonUnpress(btn));
      pressedKeysRef.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keybinds-changed", onKeybindsChanged);
    };
  }, [state.isRunning, state.isPaused, buttonPress, buttonUnpress]);

  // Refresh keybind display when remap dialog closes
  const handleCloseRemap = useCallback(() => {
    setShowRemap(false);
    setKeybindDisplay(getButtonToKey(loadKeybinds()));
  }, []);

  // ROM file handler
  const handleROMFile = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (["gba", "gbc", "gb"].includes(ext ?? "")) {
        loadROMFile(file);
      }
    },
    [loadROMFile]
  );

  // Drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleROMFile(file);
    },
    [handleROMFile]
  );

  // Export save as download
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

  // Import save handler
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

  // Screenshot handler
  const handleScreenshot = useCallback(() => {
    const dataUrl = takeScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
  }, [takeScreenshot]);

  // Import Pokemon flow
  const handleImportPokemon = useCallback(() => {
    const data = exportSave();
    if (data) {
      setImportSaveData(data);
      setShowImporter(true);
    }
  }, [exportSave]);

  // Touch controls
  const handleTouchStart = useCallback(
    (btn: string) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      buttonPress(btn);
    },
    [buttonPress]
  );

  const handleTouchEnd = useCallback(
    (btn: string) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      buttonUnpress(btn);
    },
    [buttonUnpress]
  );

  if (showImporter && importSaveData) {
    return (
      <SaveImporter
        saveData={importSaveData}
        onImport={onImportPokemon}
        onClose={() => {
          setShowImporter(false);
          setImportSaveData(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Remap Dialog */}
      {showRemap && <KeyRemapDialog onClose={handleCloseRemap} />}

      {/* Error display */}
      {state.error && (
        <div className="bg-[#e8433f]/20 border border-[#e8433f] rounded-lg p-3 text-sm text-[#f0f0e8] font-pixel">
          {state.error}
        </div>
      )}

      {/* Controls toolbar */}
      <EmulatorControls
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        speed={state.speed}
        volume={state.volume}
        onPause={pause}
        onResume={resume}
        onReset={reset}
        onSaveState={saveStateSlot}
        onLoadState={loadStateSlot}
        onExportSave={handleExportSave}
        onImportSave={handleImportSave}
        onSetSpeed={setSpeed}
        onSetVolume={setVolume}
        onImportPokemon={handleImportPokemon}
        onScreenshot={handleScreenshot}
        onOpenKeyRemap={() => setShowRemap(true)}
        gamepadConnected={gamepadConnected}
        gamepadName={gamepadName}
      />

      {/* Canvas + ROM loader */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative w-full rounded-lg overflow-hidden border-4 ${
            dragOver ? "border-[#e8433f]" : "border-[#3a4466]"
          } bg-black transition-colors`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            width={240}
            height={160}
            style={{
              imageRendering: "pixelated",
              WebkitImageRendering: "crisp-edges",
            } as React.CSSProperties}
            className="block w-full aspect-[3/2]"
          />

          <GBARomOverlay
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
              <span className="text-[#f0f0e8]">{keybindDisplay.START}</span> = Start
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.SELECT}</span> = Select
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.L}</span> = L
              {" | "}
              <span className="text-[#f0f0e8]">{keybindDisplay.R}</span> = R
            </p>
          </div>
        )}

        {/* On-screen controls for mobile */}
        {state.isRunning && (
          <GBATouchControls onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={romInputRef}
        type="file"
        accept=".gba,.gbc,.gb"
        className="hidden"
        aria-label="Load ROM file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleROMFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={saveInputRef}
        type="file"
        accept=".sav"
        className="hidden"
        aria-label="Load save file"
        onChange={onSaveFileSelected}
      />
    </div>
  );
}
