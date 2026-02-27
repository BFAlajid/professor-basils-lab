"use client";

import { memo } from "react";
import { TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";

interface TypeBadgeProps {
  type: TypeName;
  size?: "sm" | "md";
}

export default memo(function TypeBadge({ type, size = "md" }: TypeBadgeProps) {
  const color = typeColors[type];
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`${sizeClasses} rounded-full font-semibold uppercase tracking-wide text-[#f0f0e8]`}
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
});
