"use client";

import { useMemo } from "react";

interface StatRadarChartProps {
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  calculatedStats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
  size?: number;
}

const STAT_KEYS = ["hp", "attack", "defense", "spAtk", "spDef", "speed"] as const;
const STAT_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

const BASE_MAX = 255;
const CALC_MAX = 500;

/**
 * Returns the (x, y) point on the radar for a given axis index and radius fraction (0..1).
 * Axis 0 (HP) points straight up; axes proceed clockwise.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number
): [number, number] {
  // Start at -90deg (top) and go clockwise
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

/**
 * Build an SVG polygon points string from an array of values normalized to [0, max].
 */
function buildPolygon(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  max: number
): string {
  return values
    .map((v, i) => {
      const fraction = Math.min(v / max, 1);
      const [x, y] = polarToCartesian(cx, cy, radius * fraction, i, values.length);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function StatRadarChart({
  baseStats,
  calculatedStats,
  size = 200,
}: StatRadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  // Leave room for labels around the outside
  const radius = size / 2 - 28;

  const baseValues = useMemo(
    () => STAT_KEYS.map((k) => baseStats[k]),
    [baseStats]
  );
  const calcValues = useMemo(
    () => STAT_KEYS.map((k) => calculatedStats[k]),
    [calculatedStats]
  );

  // Concentric guide hexagons at 25%, 50%, 75%, 100%
  const guides = useMemo(() => {
    return [0.25, 0.5, 0.75, 1].map((frac) => {
      const points = STAT_KEYS.map((_, i) => {
        const [x, y] = polarToCartesian(cx, cy, radius * frac, i, STAT_KEYS.length);
        return `${x},${y}`;
      }).join(" ");
      return points;
    });
  }, [cx, cy, radius]);

  // Axis lines from center to each vertex
  const axes = useMemo(() => {
    return STAT_KEYS.map((_, i) =>
      polarToCartesian(cx, cy, radius, i, STAT_KEYS.length)
    );
  }, [cx, cy, radius]);

  // Label positions: push them slightly past the outer edge
  const labelPositions = useMemo(() => {
    const labelRadius = radius + 16;
    return STAT_KEYS.map((_, i) =>
      polarToCartesian(cx, cy, labelRadius, i, STAT_KEYS.length)
    );
  }, [cx, cy, radius]);

  const basePolygon = useMemo(
    () => buildPolygon(cx, cy, radius, baseValues, BASE_MAX),
    [cx, cy, radius, baseValues]
  );

  const calcPolygon = useMemo(
    () => buildPolygon(cx, cy, radius, calcValues, CALC_MAX),
    [cx, cy, radius, calcValues]
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#1a1c2c", borderRadius: 4 }}
    >
      {/* Concentric guide hexagons */}
      {guides.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#3a4466"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axes.map(([x, y], i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#3a4466"
          strokeWidth={1}
        />
      ))}

      {/* Base stats polygon */}
      <polygon
        points={basePolygon}
        fill="#3a4466"
        fillOpacity={0.3}
        stroke="none"
      />

      {/* Calculated stats polygon */}
      <polygon
        points={calcPolygon}
        fill="#e8433f"
        fillOpacity={0.4}
        stroke="#e8433f"
        strokeWidth={1.5}
      />

      {/* Axis labels */}
      {labelPositions.map(([x, y], i) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#8b9bb4"
          fontSize={9}
          fontFamily="font-pixel, monospace"
        >
          {STAT_LABELS[i]}
        </text>
      ))}
    </svg>
  );
}
