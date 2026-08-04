import React from "react";
import { NDS_KEYS } from "@/hooks/useNDSEmulator";

const DPAD_BUTTONS = [
  { bit: NDS_KEYS.UP, label: "▲", x: 1, y: 0 },
  { bit: NDS_KEYS.DOWN, label: "▼", x: 1, y: 2 },
  { bit: NDS_KEYS.LEFT, label: "◀", x: 0, y: 1 },
  { bit: NDS_KEYS.RIGHT, label: "▶", x: 2, y: 1 },
] as const;

interface NDSTouchControlsProps {
  // Receives React.PointerEvent; curried on bit.
  onButtonDown: (bit: number) => (e: React.PointerEvent) => void;
  onButtonUp: (bit: number) => (e: React.PointerEvent) => void;
}

// Prevent long-press context menu on held D-pad.
const preventContextMenu = (e: React.MouseEvent) => e.preventDefault();

// touchAction:"none" stops the browser from stealing pointerdown for scroll/pinch.
const BUTTON_POINTER_STYLE = { touchAction: "none" } as React.CSSProperties;

export default function NDSTouchControls({ onButtonDown, onButtonUp }: NDSTouchControlsProps) {
  return (
    <div
      className="w-full select-none space-y-3 px-2"
      style={{ WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
    >
      <div className="flex justify-between">
        {([
          { bit: NDS_KEYS.L, label: "L" },
          { bit: NDS_KEYS.R, label: "R" },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            type="button"
            aria-label={btn.label}
            onPointerDown={onButtonDown(btn.bit)}
            onPointerUp={onButtonUp(btn.bit)}
            onPointerLeave={onButtonUp(btn.bit)}
            onPointerCancel={onButtonUp(btn.bit)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="flex min-w-[44px] min-h-[44px] items-center justify-center px-8 bg-[#3a4466] text-[#f0f0e8] rounded-lg font-pixel text-sm active:bg-[#4a5577] select-none"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 grid-rows-3 w-36 h-36 gap-0.5">
          {DPAD_BUTTONS.map((btn) => (
            <button
              key={btn.bit}
              type="button"
              aria-label={btn.label}
              onPointerDown={onButtonDown(btn.bit)}
              onPointerUp={onButtonUp(btn.bit)}
              onPointerLeave={onButtonUp(btn.bit)}
              onPointerCancel={onButtonUp(btn.bit)}
              onContextMenu={preventContextMenu}
              className="min-w-[44px] min-h-[44px] bg-[#3a4466] text-[#f0f0e8] rounded-lg text-xl active:bg-[#4a5577] select-none"
              style={{ gridColumn: btn.x + 1, gridRow: btn.y + 1, touchAction: "none" }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="relative w-36 h-36">
          <button
            type="button"
            aria-label="Y"
            onPointerDown={onButtonDown(NDS_KEYS.Y)}
            onPointerUp={onButtonUp(NDS_KEYS.Y)}
            onPointerLeave={onButtonUp(NDS_KEYS.Y)}
            onPointerCancel={onButtonUp(NDS_KEYS.Y)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#4a6a8a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            Y
          </button>
          <button
            type="button"
            aria-label="X"
            onPointerDown={onButtonDown(NDS_KEYS.X)}
            onPointerUp={onButtonUp(NDS_KEYS.X)}
            onPointerLeave={onButtonUp(NDS_KEYS.X)}
            onPointerCancel={onButtonUp(NDS_KEYS.X)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#6a6a3a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            X
          </button>
          <button
            type="button"
            aria-label="A"
            onPointerDown={onButtonDown(NDS_KEYS.A)}
            onPointerUp={onButtonUp(NDS_KEYS.A)}
            onPointerLeave={onButtonUp(NDS_KEYS.A)}
            onPointerCancel={onButtonUp(NDS_KEYS.A)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#e8433f] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            A
          </button>
          <button
            type="button"
            aria-label="B"
            onPointerDown={onButtonDown(NDS_KEYS.B)}
            onPointerUp={onButtonUp(NDS_KEYS.B)}
            onPointerLeave={onButtonUp(NDS_KEYS.B)}
            onPointerCancel={onButtonUp(NDS_KEYS.B)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#3a6050] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            B
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-6">
        {([
          { bit: NDS_KEYS.SELECT, label: "Select" },
          { bit: NDS_KEYS.START, label: "Start" },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            type="button"
            aria-label={btn.label}
            onPointerDown={onButtonDown(btn.bit)}
            onPointerUp={onButtonUp(btn.bit)}
            onPointerLeave={onButtonUp(btn.bit)}
            onPointerCancel={onButtonUp(btn.bit)}
            onContextMenu={preventContextMenu}
            style={BUTTON_POINTER_STYLE}
            className="flex min-w-[44px] min-h-[44px] items-center justify-center px-5 bg-[#3a4466] text-[#8b9bb4] rounded-full text-xs font-pixel active:bg-[#4a5577] select-none"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
