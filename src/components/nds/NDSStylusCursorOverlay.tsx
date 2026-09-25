"use client";

import React from "react";

interface NDSStylusCursorOverlayProps {
  visible: boolean;
  /** Cursor position in NDS internal coords: x 0..255, y 192..383. */
  x: number;
  y: number;
}

// NDS canvas dimensions used to map internal coords to overlay percentages.
const CANVAS_W = 256;
const CANVAS_H = 384;

export default function NDSStylusCursorOverlay({ visible, x, y }: NDSStylusCursorOverlayProps) {
  if (!visible) return null;

  const leftPct = (x / CANVAS_W) * 100;
  const topPct = (y / CANVAS_H) * 100;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none z-30"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, -50%)",
        width: 32,
        height: 32,
      }}
    >
      {/* Outer pulsing ring */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          border: "3px solid #e8433f",
          boxShadow: "0 0 0 2px #f0f0e8, inset 0 0 0 2px #f0f0e8",
        }}
      />
      {/* Crosshair lines */}
      <span
        className="absolute left-1/2 top-0 bottom-0"
        style={{
          width: 3,
          transform: "translateX(-50%)",
          backgroundColor: "#e8433f",
          boxShadow: "0 0 0 1px #f0f0e8",
        }}
      />
      <span
        className="absolute top-1/2 left-0 right-0"
        style={{
          height: 3,
          transform: "translateY(-50%)",
          backgroundColor: "#e8433f",
          boxShadow: "0 0 0 1px #f0f0e8",
        }}
      />
      {/* Center dot */}
      <span
        className="absolute left-1/2 top-1/2"
        style={{
          width: 6,
          height: 6,
          transform: "translate(-50%, -50%)",
          backgroundColor: "#f0f0e8",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
