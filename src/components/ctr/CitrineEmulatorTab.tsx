"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useCitrineEmulator, CTR_KEYS } from "@/hooks/useCitrineEmulator";
import { useGamepad, type GBAButton } from "@/hooks/useGamepad";
import CitrineControls from "./CitrineControls";

const GAMEPAD_TO_CTR: Record<GBAButton, number> = {
  A: CTR_KEYS.A,
  B: CTR_KEYS.B,
  L: CTR_KEYS.L,
  R: CTR_KEYS.R,
  START: CTR_KEYS.START,
  SELECT: CTR_KEYS.SELECT,
  UP: CTR_KEYS.UP,
  DOWN: CTR_KEYS.DOWN,
  LEFT: CTR_KEYS.LEFT,
  RIGHT: CTR_KEYS.RIGHT,
};

const DPAD_BUTTONS = [
  { bit: CTR_KEYS.UP, label: "▲", x: 1, y: 0 },
  { bit: CTR_KEYS.DOWN, label: "▼", x: 1, y: 2 },
  { bit: CTR_KEYS.LEFT, label: "◀", x: 0, y: 1 },
  { bit: CTR_KEYS.RIGHT, label: "▶", x: 2, y: 1 },
] as const;

interface CitrineEmulatorTabProps {
  initialFile?: File | null;
}

export default function CitrineEmulatorTab({ initialFile }: CitrineEmulatorTabProps) {
  const romInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const {
    state,
    initialize,
    loadROMFile,
    loadSavedROM,
    pause,
    resume,
    reset,
    buttonPress,
    buttonUnpress,
    takeScreenshot,
    toggleDebug,
    topCanvasRef,
    botCanvasRef,
  } = useCitrineEmulator();

  // Gamepad support
  const handleGamepadPress = useCallback(
    (button: GBAButton) => buttonPress(GAMEPAD_TO_CTR[button]),
    [buttonPress]
  );
  const handleGamepadRelease = useCallback(
    (button: GBAButton) => buttonUnpress(GAMEPAD_TO_CTR[button]),
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

  // Auto-load ROM from parent
  const initialFileLoadedRef = useRef(false);
  useEffect(() => {
    if (initialFile && state.isReady && !state.isRunning && !initialFileLoadedRef.current) {
      initialFileLoadedRef.current = true;
      loadROMFile(initialFile);
    }
  }, [initialFile, state.isReady, state.isRunning, loadROMFile]);

  const handleROMFile = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "3dsx") loadROMFile(file);
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

  const handleScreenshot = useCallback(() => {
    const dataUrl = takeScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ctr-screenshot-${Date.now()}.png`;
    a.click();
  }, [takeScreenshot]);

  const handleToggleDebug = useCallback(() => {
    setShowDebug((s) => !s);
    toggleDebug();
  }, [toggleDebug]);

  // On-screen button handlers
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
      {state.error && (
        <div className="bg-[#e8433f]/20 border border-[#e8433f] rounded-lg p-3 text-sm text-[#f0f0e8] font-pixel">
          {state.error}
        </div>
      )}

      <CitrineControls
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        onPause={pause}
        onResume={resume}
        onReset={reset}
        onScreenshot={handleScreenshot}
        debugInfo={state.debugInfo}
        onToggleDebug={handleToggleDebug}
        showDebug={showDebug}
        gamepadConnected={gamepadConnected}
        gamepadName={gamepadName}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative rounded-lg overflow-hidden border-4 ${
            dragOver ? "border-[#e8433f]" : "border-[#3a4466]"
          } bg-black transition-colors`}
          style={{ width: "100%", maxWidth: 400 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Dual-screen canvas area */}
          <div className="flex flex-col items-center bg-black">
            {/* Top screen: 400×240 (5:3) */}
            <canvas
              ref={topCanvasRef}
              width={400}
              height={240}
              className="w-full block"
              style={{ imageRendering: "pixelated", aspectRatio: "400/240" } as React.CSSProperties}
            />
            {/* Screen divider */}
            <div className="w-full h-px bg-[#3a4466]" />
            {/* Bottom screen: 320×240 (4:3) — centered with black bars */}
            <div className="w-full flex justify-center bg-black" style={{ aspectRatio: "400/240" }}>
              <canvas
                ref={botCanvasRef}
                width={320}
                height={240}
                className="block h-full"
                style={{ imageRendering: "pixelated", aspectRatio: "320/240" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* No ROM overlay */}
          {!state.isRunning && state.isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
              <div className="text-center space-y-2">
                <p className="text-[#f0f0e8] font-pixel text-sm">3DS Emulator</p>
                <p className="text-[#8b9bb4] text-xs hidden sm:block">Drag & drop a .3dsx homebrew file here</p>
                <p className="text-[#8b9bb4] text-xs hidden sm:block">or</p>
                <button
                  onClick={() => romInputRef.current?.click()}
                  className="px-6 py-3 sm:px-4 sm:py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-sm sm:text-xs font-pixel hover:bg-[#f05050] active:bg-[#f05050] transition-colors"
                >
                  Choose .3DSX File
                </button>
              </div>

              {state.savedROMs.length > 0 && (
                <div className="space-y-2 text-center">
                  <p className="text-[#8b9bb4] text-[10px] font-pixel">Previously loaded:</p>
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
                Load your own legally obtained homebrew files. No ROMs are provided or distributed by this application.
              </p>
            </div>
          )}

          {/* Loading overlays */}
          {!state.isReady && !state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading emulator core...</p>
            </div>
          )}
          {state.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <p className="text-[#f0f0e8] font-pixel text-xs animate-pulse">Loading homebrew...</p>
            </div>
          )}
        </div>

        {/* Debug panel */}
        {showDebug && state.debugInfo && (
          <pre className="w-full max-w-[400px] bg-[#1a1c2c] border border-[#3a4466] rounded p-3 text-[10px] text-[#8b9bb4] font-mono overflow-x-auto whitespace-pre">
            {state.debugInfo}
          </pre>
        )}

        {/* Keyboard info */}
        {state.isRunning && (
          <div className="text-[10px] text-[#8b9bb4] text-center space-y-1">
            <p>
              <span className="text-[#f0f0e8]">Arrow Keys</span> = D-Pad
              {" | "}
              <span className="text-[#f0f0e8]">Z</span> = A
              {" | "}
              <span className="text-[#f0f0e8]">X</span> = B
              {" | "}
              <span className="text-[#f0f0e8]">C</span> = X
              {" | "}
              <span className="text-[#f0f0e8]">V</span> = Y
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

        {/* Mobile on-screen controls */}
        {state.isRunning && (
          <div
            className="w-full select-none space-y-3 px-2"
            style={{ WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
          >
            {/* L / R bumpers */}
            <div className="flex justify-between">
              {([
                { bit: CTR_KEYS.L, label: "L" },
                { bit: CTR_KEYS.R, label: "R" },
              ] as const).map((btn) => (
                <button
                  key={btn.label}
                  onMouseDown={handleBtnDown(btn.bit)}
                  onMouseUp={handleBtnUp(btn.bit)}
                  onMouseLeave={handleBtnUp(btn.bit)}
                  onTouchStart={handleBtnDown(btn.bit)}
                  onTouchEnd={handleBtnUp(btn.bit)}
                  className="px-8 py-2 bg-[#3a4466] text-[#f0f0e8] rounded-lg font-pixel text-sm active:bg-[#4a5577] select-none"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* D-Pad + A/B/X/Y */}
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 grid-rows-3 w-[7.5rem] h-[7.5rem] gap-0.5">
                {DPAD_BUTTONS.map((btn) => (
                  <button
                    key={btn.bit}
                    onMouseDown={handleBtnDown(btn.bit)}
                    onMouseUp={handleBtnUp(btn.bit)}
                    onMouseLeave={handleBtnUp(btn.bit)}
                    onTouchStart={handleBtnDown(btn.bit)}
                    onTouchEnd={handleBtnUp(btn.bit)}
                    className="bg-[#3a4466] text-[#f0f0e8] rounded-lg text-xl active:bg-[#4a5577] select-none"
                    style={{ gridColumn: btn.x + 1, gridRow: btn.y + 1 }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* A/B/X/Y diamond */}
              <div className="relative w-[7.5rem] h-[7.5rem]">
                <button
                  onMouseDown={handleBtnDown(CTR_KEYS.X)}
                  onMouseUp={handleBtnUp(CTR_KEYS.X)}
                  onMouseLeave={handleBtnUp(CTR_KEYS.X)}
                  onTouchStart={handleBtnDown(CTR_KEYS.X)}
                  onTouchEnd={handleBtnUp(CTR_KEYS.X)}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#4a6a8a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
                >
                  X
                </button>
                <button
                  onMouseDown={handleBtnDown(CTR_KEYS.Y)}
                  onMouseUp={handleBtnUp(CTR_KEYS.Y)}
                  onMouseLeave={handleBtnUp(CTR_KEYS.Y)}
                  onTouchStart={handleBtnDown(CTR_KEYS.Y)}
                  onTouchEnd={handleBtnUp(CTR_KEYS.Y)}
                  className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#6a6a3a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
                >
                  Y
                </button>
                <button
                  onMouseDown={handleBtnDown(CTR_KEYS.A)}
                  onMouseUp={handleBtnUp(CTR_KEYS.A)}
                  onMouseLeave={handleBtnUp(CTR_KEYS.A)}
                  onTouchStart={handleBtnDown(CTR_KEYS.A)}
                  onTouchEnd={handleBtnUp(CTR_KEYS.A)}
                  className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#e8433f] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
                >
                  A
                </button>
                <button
                  onMouseDown={handleBtnDown(CTR_KEYS.B)}
                  onMouseUp={handleBtnUp(CTR_KEYS.B)}
                  onMouseLeave={handleBtnUp(CTR_KEYS.B)}
                  onTouchStart={handleBtnDown(CTR_KEYS.B)}
                  onTouchEnd={handleBtnUp(CTR_KEYS.B)}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#3a6050] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
                >
                  B
                </button>
              </div>
            </div>

            {/* Start / Select */}
            <div className="flex justify-center gap-6">
              {([
                { bit: CTR_KEYS.SELECT, label: "Select" },
                { bit: CTR_KEYS.START, label: "Start" },
              ] as const).map((btn) => (
                <button
                  key={btn.label}
                  onMouseDown={handleBtnDown(btn.bit)}
                  onMouseUp={handleBtnUp(btn.bit)}
                  onMouseLeave={handleBtnUp(btn.bit)}
                  onTouchStart={handleBtnDown(btn.bit)}
                  onTouchEnd={handleBtnUp(btn.bit)}
                  className="px-5 py-2 bg-[#3a4466] text-[#8b9bb4] rounded-full text-xs font-pixel active:bg-[#4a5577] select-none"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <input
        ref={romInputRef}
        type="file"
        accept=".3dsx"
        className="hidden"
        aria-label="Load 3DSX homebrew file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleROMFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
