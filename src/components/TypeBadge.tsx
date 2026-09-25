"use client";

import { memo } from "react";
import { TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";

function getContrastText(bgHex: string): string {
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1a1c2c" : "#f0f0e8";
}

interface TypeBadgeProps {
  type: TypeName;
  size?: "sm" | "md";
}

export default memo(function TypeBadge({ type, size = "md" }: TypeBadgeProps) {
  const color = typeColors[type];
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`${sizeClasses} rounded-full font-semibold uppercase tracking-wide`}
      style={{ backgroundColor: color, color: getContrastText(color) }}
    >
      {type}
    </span>
  );
});
