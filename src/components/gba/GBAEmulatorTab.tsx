"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useGBAEmulator } from "@/hooks/useGBAEmulator";
import { useGamepad, type GBAButton } from "@/hooks/useGamepad";
import { usePCBox } from "@/hooks/usePCBox";
import EmulatorControls from "./EmulatorControls";
import SaveImporter from "./SaveImporter";
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

interface GBAEmulatorTabProps {
  initialFile?: File | null;
}

const DPAD_BUTTONS = [
  { name: "Up", label: "▲", x: 1, y: 0 },
  { name: "Down", label: "▼", x: 1, y: 2 },
  { name: "Left", label: "◀", x: 0, y: 1 },
  { name: "Right", label: "▶", x: 2, y: 1 },
] as const;

const ACTION_BUTTONS = [
  { name: "A", label: "A", color: "bg-[#e8433f]" },
  { name: "B", label: "B", color: "bg-[#3a6050]" },
] as const;

export default function GBAEmulatorTab({ initialFile }: GBAEmulatorTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const romInputRef = useRef<HTMLInputElement>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importSaveData, setImportSaveData] = useState<Uint8Array | null>(null);
  const [dragOver, setDragOver] = useState(false);
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

  // Keyboard bindings
  const pressedKeysRef = useRef(new Set<string>());
  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;

    const keyMap: Record<string, string> = {
      arrowup: "Up",
      arrowdown: "Down",
      arrowleft: "Left",
      arrowright: "Right",
      z: "A",
      x: "B",
      enter: "Start",
      backspace: "Select",
      a: "L",
      s: "R",
    };

    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const btn = keyMap[e.key.toLowerCase()];
      if (btn && !pressedKeysRef.current.has(btn)) {
        e.preventDefault();
        pressedKeysRef.current.add(btn);
        buttonPress(btn);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const btn = keyMap[e.key.toLowerCase()];
      if (btn) {
        e.preventDefault();
        pressedKeysRef.current.delete(btn);
        buttonUnpress(btn);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      // Release all pressed keys on cleanup
      pressedKeysRef.current.forEach((btn) => buttonUnpress(btn));
      pressedKeysRef.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [state.isRunning, state.isPaused, buttonPress, buttonUnpress]);

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

          {/* Overlay when no ROM loaded */}
          {!state.isRunning && state.isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
              <div className="text-center space-y-2">
                <p className="text-[#f0f0e8] font-pixel text-sm">
                  GBA Emulator
                </p>
                <p className="text-[#8b9bb4] text-xs hidden sm:block">
                  Drag & drop a .gba ROM file here
                </p>
                <p className="text-[#8b9bb4] text-xs hidden sm:block">or</p>
                <button
                  onClick={() => romInputRef.current?.click()}
                  className="px-6 py-3 sm:px-4 sm:py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-sm sm:text-xs font-pixel hover:bg-[#f05050] active:bg-[#f05050] transition-colors"
                >
                  Choose ROM File
                </button>
              </div>

              {/* Previously loaded ROMs */}
              {state.savedROMs.length > 0 && (
                <div className="space-y-2 text-center">
                  <p className="text-[#8b9bb4] text-[10px] font-pixel">
                    Previously loaded:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {state.savedROMs.map((rom) => (
                      <button
                        key={rom}
                        onClick={() => loadSavedROM(rom)}
                        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors truncate max-w-[200px]"
                      >
                        {rom}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[#8b9bb4] text-[9px] italic mt-4 max-w-sm text-center">
                Load your own legally obtained ROM files.
                No ROMs are provided or distributed by this application.
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {!state.isReady && !state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">
                Loading emulator...
              </p>
            </div>
          )}

          {/* ROM / emulator loading overlay */}
          {state.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">
                Loading emulator...
              </p>
            </div>
          )}
        </div>

        {/* Keyboard mapping info */}
        {state.isRunning && (
          <div className="text-[10px] text-[#8b9bb4] text-center space-y-1">
            <p>
              <span className="text-[#f0f0e8]">Arrow Keys</span> = D-Pad
              {" | "}
              <span className="text-[#f0f0e8]">Z</span> = A
              {" | "}
              <span className="text-[#f0f0e8]">X</span> = B
              {" | "}
              <span className="text-[#f0f0e8]">Enter</span> = Start
              {" | "}
              <span className="text-[#f0f0e8]">Backspace</span> = Select
              {" | "}
              <span className="text-[#f0f0e8]">A</span> = L
              {" | "}
              <span className="text-[#f0f0e8]">S</span> = R
            </p>
          </div>
        )}

        {/* On-screen controls for mobile */}
        {state.isRunning && (
          <div
            className="flex items-center justify-between w-full px-4 select-none"
            style={{ WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
          >
            {/* D-Pad */}
            <div className="grid grid-cols-3 grid-rows-3 w-28 h-28 gap-0.5">
              {DPAD_BUTTONS.map((btn) => (
                <button
                  key={btn.name}
                  onMouseDown={handleTouchStart(btn.name)}
                  onMouseUp={handleTouchEnd(btn.name)}
                  onMouseLeave={handleTouchEnd(btn.name)}
                  onTouchStart={handleTouchStart(btn.name)}
                  onTouchEnd={handleTouchEnd(btn.name)}
                  className="bg-[#3a4466] text-[#f0f0e8] rounded text-lg active:bg-[#4a5577] select-none"
                  style={{
                    gridColumn: btn.x + 1,
                    gridRow: btn.y + 1,
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Start / Select */}
            <div className="flex gap-2">
              {(["Select", "Start"] as const).map((btn) => (
                <button
                  key={btn}
                  onMouseDown={handleTouchStart(btn)}
                  onMouseUp={handleTouchEnd(btn)}
                  onMouseLeave={handleTouchEnd(btn)}
                  onTouchStart={handleTouchStart(btn)}
                  onTouchEnd={handleTouchEnd(btn)}
                  className="px-3 py-1.5 bg-[#3a4466] text-[#8b9bb4] rounded text-[10px] font-pixel active:bg-[#4a5577] select-none"
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* A/B buttons */}
            <div className="flex gap-3 items-center">
              {ACTION_BUTTONS.map((btn) => (
                <button
                  key={btn.name}
                  onMouseDown={handleTouchStart(btn.name)}
                  onMouseUp={handleTouchEnd(btn.name)}
                  onMouseLeave={handleTouchEnd(btn.name)}
                  onTouchStart={handleTouchStart(btn.name)}
                  onTouchEnd={handleTouchEnd(btn.name)}
                  className={`w-12 h-12 rounded-full ${btn.color} text-[#f0f0e8] font-pixel text-sm font-bold active:brightness-125 select-none`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* L/R bumpers */}
            <div className="flex flex-col gap-1">
              {(["L", "R"] as const).map((btn) => (
                <button
                  key={btn}
                  onMouseDown={handleTouchStart(btn)}
                  onMouseUp={handleTouchEnd(btn)}
                  onMouseLeave={handleTouchEnd(btn)}
                  onTouchStart={handleTouchStart(btn)}
                  onTouchEnd={handleTouchEnd(btn)}
                  className="px-4 py-2 bg-[#3a4466] text-[#f0f0e8] rounded font-pixel text-xs active:bg-[#4a5577] select-none"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
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
