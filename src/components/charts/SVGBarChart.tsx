"use client";

import { useState } from "react";

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface SVGBarChartProps {
  data: BarData[];
  height?: number;
}

const PADDING = { top: 10, right: 10, bottom: 30, left: 30 };

export default function SVGBarChart({ data, height = 200 }: SVGBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const width = 400;
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(plotW / data.length - 4, 36);

  const yTicks = Array.from({ length: maxVal + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Y axis ticks */}
      {yTicks.map((tick) => {
        const y = PADDING.top + plotH - (tick / maxVal) * plotH;
        return (
          <g key={tick}>
            <line x1={PADDING.left} y1={y} x2={width - PADDING.right} y2={y} stroke="#3a4466" strokeWidth={0.5} />
            <text x={PADDING.left - 4} y={y + 3} textAnchor="end" fill="#8b9bb4" fontSize={9}>
              {tick}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * plotH;
        const x = PADDING.left + (plotW / data.length) * i + (plotW / data.length - barWidth) / 2;
        const y = PADDING.top + plotH - barH;

        return (
          <g key={d.label} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={d.color}
              rx={3}
              ry={3}
              opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.5}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {/* X axis label */}
            <text
              x={x + barWidth / 2}
              y={PADDING.top + plotH + 14}
              textAnchor="middle"
              fill="#8b9bb4"
              fontSize={9}
            >
              {d.label.slice(0, 3).toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <g>
          <rect
            x={PADDING.left + (plotW / data.length) * hoveredIndex + (plotW / data.length) / 2 - 30}
            y={PADDING.top + plotH - (data[hoveredIndex].value / maxVal) * plotH - 22}
            width={60}
            height={18}
            fill="#262b44"
            stroke="#3a4466"
            rx={4}
          />
          <text
            x={PADDING.left + (plotW / data.length) * hoveredIndex + (plotW / data.length) / 2}
            y={PADDING.top + plotH - (data[hoveredIndex].value / maxVal) * plotH - 10}
            textAnchor="middle"
            fill="#f0f0e8"
            fontSize={10}
            className="capitalize"
          >
            {data[hoveredIndex].label}: {data[hoveredIndex].value}
          </text>
        </g>
      )}
    </svg>
  );
}
