"use client";

interface RadarDataset {
  label: string;
  values: number[];
  color: string;
  visible: boolean;
}

interface SVGRadarProps {
  labels: string[];
  datasets: RadarDataset[];
  maxValue: number;
}

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 110;
const RINGS = 4;

function polarToCartesian(angle: number, r: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

export default function SVGRadar({ labels, datasets, maxValue }: SVGRadarProps) {
  const count = labels.length;
  const angleStep = 360 / count;

  const axisPoints = labels.map((_, i) => polarToCartesian(i * angleStep, RADIUS));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[350px] mx-auto">
      {/* Grid rings */}
      {Array.from({ length: RINGS }, (_, ring) => {
        const r = (RADIUS / RINGS) * (ring + 1);
        const points = labels.map((_, i) => polarToCartesian(i * angleStep, r));
        return (
          <polygon
            key={ring}
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="#3a4466"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map(([x, y], i) => (
        <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#3a4466" strokeWidth={0.5} />
      ))}

      {/* Data polygons */}
      {datasets.map((ds) => {
        if (!ds.visible) return null;
        const points = ds.values.map((v, i) => {
          const r = (Math.min(v, maxValue) / maxValue) * RADIUS;
          return polarToCartesian(i * angleStep, r);
        });
        return (
          <polygon
            key={ds.label}
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill={ds.color}
            fillOpacity={0.15}
            stroke={ds.color}
            strokeWidth={2}
          />
        );
      })}

      {/* Axis labels */}
      {labels.map((label, i) => {
        const [x, y] = polarToCartesian(i * angleStep, RADIUS + 18);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#8b9bb4"
            fontSize={11}
          >
            {label}
          </text>
        );
      })}

      {/* Legend */}
      {datasets.filter((d) => d.visible).map((ds, i) => (
        <g key={ds.label} transform={`translate(10, ${SIZE - 20 - i * 16})`}>
          <rect width={10} height={10} fill={ds.color} rx={2} />
          <text x={14} y={9} fill="#8b9bb4" fontSize={10} className="capitalize">
            {ds.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
