"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ALL_BUTTONS,
  loadKeybinds,
  saveKeybinds,
  resetKeybinds,
  getButtonToKey,
  type EmulatorButton,
} from "@/utils/keybinds";

// Friendly display names for buttons
const BUTTON_LABELS: Record<EmulatorButton, string> = {
  UP: "D-Pad Up",
  DOWN: "D-Pad Down",
  LEFT: "D-Pad Left",
  RIGHT: "D-Pad Right",
  A: "A",
  B: "B",
  X: "X",
  Y: "Y",
  L: "L",
  R: "R",
  START: "Start",
  SELECT: "Select",
};

// Keys to ignore when listening for remap
const IGNORE_KEYS = new Set(["shift", "control", "alt", "meta", "tab"]);

interface KeyRemapDialogProps {
  onClose: () => void;
}

export default function KeyRemapDialog({ onClose }: KeyRemapDialogProps) {
  const [binds, setBinds] = useState(() => loadKeybinds());
  const [listeningFor, setListeningFor] = useState<EmulatorButton | null>(null);

  const buttonToKey = getButtonToKey(binds);

  // Listen for key press when remapping
  useEffect(() => {
    if (!listeningFor) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key.toLowerCase();
      if (IGNORE_KEYS.has(key)) return;

      // Remove old binding for this key and for this button
      const next: Record<string, EmulatorButton> = {};
      for (const [k, b] of Object.entries(binds)) {
        if (b !== listeningFor && k !== key) {
          next[k] = b;
        }
      }
      next[key] = listeningFor;

      setBinds(next);
      saveKeybinds(next);
      setListeningFor(null);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [listeningFor, binds]);

  // Close on Escape (only when not listening for a key)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !listeningFor) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, listeningFor]);

  const handleReset = useCallback(() => {
    const defaults = resetKeybinds();
    setBinds(defaults);
    setListeningFor(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1c2c] border-2 border-[#3a4466] rounded-lg p-5 w-full max-w-sm shadow-xl">
        <h2 className="text-[#f0f0e8] font-pixel text-sm mb-4 text-center">
          Remap Controls
        </h2>

        {/* Button grid */}
        <div className="space-y-1">
          {ALL_BUTTONS.map((button) => {
            const isListening = listeningFor === button;
            return (
              <div
                key={button}
                className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-[#262b44] transition-colors"
              >
                <span className="text-[#f0f0e8] font-pixel text-xs w-24">
                  {BUTTON_LABELS[button]}
                </span>
                <button
                  type="button"
                  onClick={() => setListeningFor(isListening ? null : button)}
                  className={`px-3 py-1 rounded text-xs font-pixel min-w-[80px] text-center transition-colors ${
                    isListening
                      ? "bg-[#e8433f] text-[#f0f0e8] animate-pulse"
                      : "bg-[#3a4466] text-[#f0f0e8] hover:bg-[#4a5577]"
                  }`}
                >
                  {isListening ? "Press key..." : buttonToKey[button] ?? "???"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#e8433f] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#f05050] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
