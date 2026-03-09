import React from "react";

const DPAD_BUTTONS = [
  { name: "Up", label: "▲", x: 1, y: 0 },
  { name: "Down", label: "▼", x: 1, y: 2 },
  { name: "Left", label: "◀", x: 0, y: 1 },
  { name: "Right", label: "▶", x: 2, y: 1 },
] as const;

interface GBATouchControlsProps {
  onTouchStart: (btn: string) => (e: React.TouchEvent | React.MouseEvent) => void;
  onTouchEnd: (btn: string) => (e: React.TouchEvent | React.MouseEvent) => void;
}

export default function GBATouchControls({ onTouchStart, onTouchEnd }: GBATouchControlsProps) {
  return (
    <div
      className="w-full select-none space-y-3 px-2"
      style={{ WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
    >
      {/* L / R bumpers */}
      <div className="flex justify-between">
        {(["L", "R"] as const).map((btn) => (
          <button
            key={btn}
            onMouseDown={onTouchStart(btn)}
            onMouseUp={onTouchEnd(btn)}
            onMouseLeave={onTouchEnd(btn)}
            onTouchStart={onTouchStart(btn)}
            onTouchEnd={onTouchEnd(btn)}
            className="px-8 py-2 bg-[#3a4466] text-[#f0f0e8] rounded-lg font-pixel text-sm active:bg-[#4a5577] select-none"
          >
            {btn}
          </button>
        ))}
      </div>

      {/* D-Pad + A/B row */}
      <div className="flex items-center justify-between">
        {/* D-Pad */}
        <div className="grid grid-cols-3 grid-rows-3 w-[7.5rem] h-[7.5rem] gap-0.5">
          {DPAD_BUTTONS.map((btn) => (
            <button
              key={btn.name}
              onMouseDown={onTouchStart(btn.name)}
              onMouseUp={onTouchEnd(btn.name)}
              onMouseLeave={onTouchEnd(btn.name)}
              onTouchStart={onTouchStart(btn.name)}
              onTouchEnd={onTouchEnd(btn.name)}
              className="bg-[#3a4466] text-[#f0f0e8] rounded-lg text-xl active:bg-[#4a5577] select-none"
              style={{
                gridColumn: btn.x + 1,
                gridRow: btn.y + 1,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* A/B buttons — GBA layout: B left, A right, A slightly higher */}
        <div className="relative w-[7.5rem] h-[7.5rem]">
          <button
            onMouseDown={onTouchStart("B")}
            onMouseUp={onTouchEnd("B")}
            onMouseLeave={onTouchEnd("B")}
            onTouchStart={onTouchStart("B")}
            onTouchEnd={onTouchEnd("B")}
            className="absolute left-0 bottom-2 w-14 h-14 rounded-full bg-[#3a6050] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            B
          </button>
          <button
            onMouseDown={onTouchStart("A")}
            onMouseUp={onTouchEnd("A")}
            onMouseLeave={onTouchEnd("A")}
            onTouchStart={onTouchStart("A")}
            onTouchEnd={onTouchEnd("A")}
            className="absolute right-0 top-2 w-14 h-14 rounded-full bg-[#e8433f] text-[#f0f0e8] font-pixel text-base font-bold active:brightness-125 select-none"
          >
            A
          </button>
        </div>
      </div>

      {/* Start / Select — centered */}
      <div className="flex justify-center gap-6">
        {(["Select", "Start"] as const).map((btn) => (
          <button
            key={btn}
            onMouseDown={onTouchStart(btn)}
            onMouseUp={onTouchEnd(btn)}
            onMouseLeave={onTouchEnd(btn)}
            onTouchStart={onTouchStart(btn)}
            onTouchEnd={onTouchEnd(btn)}
            className="px-5 py-2 bg-[#3a4466] text-[#8b9bb4] rounded-full text-xs font-pixel active:bg-[#4a5577] select-none"
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
