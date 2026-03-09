import React from "react";
import { NDS_KEYS } from "@/hooks/useNDSEmulator";

const DPAD_BUTTONS = [
  { bit: NDS_KEYS.UP, label: "▲", x: 1, y: 0 },
  { bit: NDS_KEYS.DOWN, label: "▼", x: 1, y: 2 },
  { bit: NDS_KEYS.LEFT, label: "◀", x: 0, y: 1 },
  { bit: NDS_KEYS.RIGHT, label: "▶", x: 2, y: 1 },
] as const;

interface NDSTouchControlsProps {
  onButtonDown: (bit: number) => (e: React.TouchEvent | React.MouseEvent) => void;
  onButtonUp: (bit: number) => (e: React.TouchEvent | React.MouseEvent) => void;
}

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
            onMouseDown={onButtonDown(btn.bit)}
            onMouseUp={onButtonUp(btn.bit)}
            onMouseLeave={onButtonUp(btn.bit)}
            onTouchStart={onButtonDown(btn.bit)}
            onTouchEnd={onButtonUp(btn.bit)}
            className="px-8 py-2 bg-[#3a4466] text-[#f0f0e8] rounded-lg font-pixel text-sm active:bg-[#4a5577] select-none"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 grid-rows-3 w-[7.5rem] h-[7.5rem] gap-0.5">
          {DPAD_BUTTONS.map((btn) => (
            <button
              key={btn.bit}
              onMouseDown={onButtonDown(btn.bit)}
              onMouseUp={onButtonUp(btn.bit)}
              onMouseLeave={onButtonUp(btn.bit)}
              onTouchStart={onButtonDown(btn.bit)}
              onTouchEnd={onButtonUp(btn.bit)}
              className="bg-[#3a4466] text-[#f0f0e8] rounded-lg text-xl active:bg-[#4a5577] select-none"
              style={{ gridColumn: btn.x + 1, gridRow: btn.y + 1 }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="relative w-[7.5rem] h-[7.5rem]">
          <button
            onMouseDown={onButtonDown(NDS_KEYS.Y)}
            onMouseUp={onButtonUp(NDS_KEYS.Y)}
            onMouseLeave={onButtonUp(NDS_KEYS.Y)}
            onTouchStart={onButtonDown(NDS_KEYS.Y)}
            onTouchEnd={onButtonUp(NDS_KEYS.Y)}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#4a6a8a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            Y
          </button>
          <button
            onMouseDown={onButtonDown(NDS_KEYS.X)}
            onMouseUp={onButtonUp(NDS_KEYS.X)}
            onMouseLeave={onButtonUp(NDS_KEYS.X)}
            onTouchStart={onButtonDown(NDS_KEYS.X)}
            onTouchEnd={onButtonUp(NDS_KEYS.X)}
            className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#6a6a3a] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            X
          </button>
          <button
            onMouseDown={onButtonDown(NDS_KEYS.A)}
            onMouseUp={onButtonUp(NDS_KEYS.A)}
            onMouseLeave={onButtonUp(NDS_KEYS.A)}
            onTouchStart={onButtonDown(NDS_KEYS.A)}
            onTouchEnd={onButtonUp(NDS_KEYS.A)}
            className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 rounded-full bg-[#e8433f] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            A
          </button>
          <button
            onMouseDown={onButtonDown(NDS_KEYS.B)}
            onMouseUp={onButtonUp(NDS_KEYS.B)}
            onMouseLeave={onButtonUp(NDS_KEYS.B)}
            onTouchStart={onButtonDown(NDS_KEYS.B)}
            onTouchEnd={onButtonUp(NDS_KEYS.B)}
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
            onMouseDown={onButtonDown(btn.bit)}
            onMouseUp={onButtonUp(btn.bit)}
            onMouseLeave={onButtonUp(btn.bit)}
            onTouchStart={onButtonDown(btn.bit)}
            onTouchEnd={onButtonUp(btn.bit)}
            className="px-5 py-2 bg-[#3a4466] text-[#8b9bb4] rounded-full text-xs font-pixel active:bg-[#4a5577] select-none"
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
