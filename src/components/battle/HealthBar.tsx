"use client";

interface HealthBarProps {
  current: number;
  max: number;
}

function getHpColor(percent: number): string {
  if (percent > 50) return "#38b764";
  if (percent > 25) return "#f7a838";
  return "#e8433f";
}

export default function HealthBar({ current, max }: HealthBarProps) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  const color = getHpColor(percent);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-[#8b9bb4] font-pixel">HP</span>
        <span className="tabular-nums text-[#f0f0e8]">
          {current}/{max}
        </span>
      </div>
      <div className="h-2 w-full bg-[#1a1c2c] border-2 border-[#5a6988] overflow-hidden" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max} aria-label="Hit points">
        <div
          className="h-full"
          style={{ backgroundColor: color, width: `${percent}%`, transition: "width 0.5s ease-out" }}
        />
      </div>
    </div>
  );
}
