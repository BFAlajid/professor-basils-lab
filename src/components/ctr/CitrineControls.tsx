"use client";

import React from "react";

interface CitrineControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onScreenshot: () => void;
  debugInfo: string | null;
  onToggleDebug: () => void;
  showDebug: boolean;
  gamepadConnected?: boolean;
  gamepadName?: string | null;
}

export default function CitrineControls({
  isRunning,
  isPaused,
  onPause,
  onResume,
  onReset,
  onScreenshot,
  onToggleDebug,
  showDebug,
  gamepadConnected = false,
  gamepadName = null,
}: CitrineControlsProps) {
  if (!isRunning) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
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

      <button
        onClick={onScreenshot}
        className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
      >
        Screenshot
      </button>

      <div className="w-px h-6 bg-[#3a4466]" />

      <button
        onClick={onToggleDebug}
        className={`px-3 py-1.5 rounded text-xs font-pixel transition-colors ${
          showDebug
            ? "bg-[#e8433f] text-[#f0f0e8]"
            : "bg-[#3a4466] text-[#f0f0e8] hover:bg-[#4a5577]"
        }`}
      >
        Debug
      </button>

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
