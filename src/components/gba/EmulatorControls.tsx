"use client";

import React from "react";

interface EmulatorControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  volume: number;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSaveState: (slot: number) => void;
  onLoadState: (slot: number) => void;
  onExportSave: () => void;
  onImportSave: () => void;
  onSetSpeed: (s: number) => void;
  onSetVolume: (v: number) => void;
  onImportPokemon: () => void;
  onScreenshot: () => void;
  gamepadConnected?: boolean;
  gamepadName?: string | null;
}

export default function EmulatorControls({
  isRunning,
  isPaused,
  speed,
  volume,
  onPause,
  onResume,
  onReset,
  onSaveState,
  onLoadState,
  onExportSave,
  onImportSave,
  onSetSpeed,
  onSetVolume,
  onImportPokemon,
  onScreenshot,
  gamepadConnected = false,
  gamepadName = null,
}: EmulatorControlsProps) {
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

      {/* Divider */}
      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Save States */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#8b9bb4] font-pixel">Save:</span>
        {[1, 2, 3].map((slot) => (
          <button
            key={slot}
            onClick={() => onSaveState(slot)}
            className="w-6 h-6 rounded bg-[#2a5040] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#3a6050] transition-colors"
          >
            {slot}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#8b9bb4] font-pixel">Load:</span>
        {[1, 2, 3].map((slot) => (
          <button
            key={slot}
            onClick={() => onLoadState(slot)}
            className="w-6 h-6 rounded bg-[#2a3050] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#3a4060] transition-colors"
          >
            {slot}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Speed */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#8b9bb4] font-pixel">Speed:</span>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`px-2 py-1 rounded text-[10px] font-pixel transition-colors ${
              speed === s
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

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

      <div className="w-px h-6 bg-[#3a4466]" />

      {/* Import Pokemon */}
      <button
        onClick={onImportPokemon}
        className="px-3 py-1.5 rounded bg-[#e8433f] text-[#f0f0e8] text-xs font-pixel hover:bg-[#f05050] transition-colors"
      >
        Import Pokémon
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
