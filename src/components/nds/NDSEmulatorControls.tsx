"use client";

import React from "react";

interface NDSEmulatorControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  volume: number;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onExportSave: () => void;
  onImportSave: () => void;
  onSetVolume: (v: number) => void;
  onScreenshot: () => void;
  onOpenKeyRemap: () => void;
  gamepadConnected?: boolean;
  gamepadName?: string | null;
}

export default function NDSEmulatorControls({
  isRunning,
  isPaused,
  volume,
  onPause,
  onResume,
  onReset,
  onExportSave,
  onImportSave,
  onSetVolume,
  onScreenshot,
  onOpenKeyRemap,
  gamepadConnected = false,
  gamepadName = null,
}: NDSEmulatorControlsProps) {
  if (!isRunning) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Play / Pause */}
      <button
        onClick={isPaused ? onResume : onPause}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        {isPaused ? "▶ Play" : "⏸ Pause"}
      </button>

      <button
        onClick={onReset}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        ↻ Reset
      </button>

      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Volume */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#8b9bb4] font-pixel">Vol:</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onSetVolume(Number(e.target.value) / 100)}
          className="w-16 h-1 accent-[#e8433f]"
          aria-label="Volume"
        />
      </div>

      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Save Management */}
      <button
        onClick={onExportSave}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        Export .sav
      </button>
      <button
        onClick={onImportSave}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        Import .sav
      </button>

      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Screenshot */}
      <button
        onClick={onScreenshot}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        Screenshot
      </button>

      {/* Remap Keys */}
      <button
        onClick={onOpenKeyRemap}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        Remap
      </button>

      {/* Gamepad indicator */}
      {gamepadConnected && (
        <>
          <div className="w-px h-6 bg-[#3a4466]" />
          <div className="flex items-center gap-1.5" title={gamepadName ?? "Controller connected"}>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-[#8b9bb4] font-pixel truncate max-w-[120px]">
              {gamepadName ?? "Controller"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
