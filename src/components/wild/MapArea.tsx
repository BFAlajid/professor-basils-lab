"use client";

import { motion } from "framer-motion";
import { RouteArea } from "@/types";

const THEME_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  grass: { bg: "rgba(56, 183, 100, 0.25)", border: "#38b764", label: "Grass" },
  cave: { bg: "rgba(139, 90, 43, 0.25)", border: "#8b5a2b", label: "Cave" },
  water: { bg: "rgba(59, 130, 246, 0.25)", border: "#3b82f6", label: "Water" },
  forest: { bg: "rgba(34, 139, 34, 0.25)", border: "#228b22", label: "Forest" },
  mountain: { bg: "rgba(139, 137, 137, 0.25)", border: "#8b8989", label: "Mountain" },
  urban: { bg: "rgba(200, 200, 200, 0.25)", border: "#c8c8c8", label: "Urban" },
  desert: { bg: "rgba(210, 180, 100, 0.25)", border: "#d2b464", label: "Desert" },
};

interface MapAreaProps {
  area: RouteArea;
  isSelected: boolean;
  onClick: () => void;
}

export default function MapArea({ area, isSelected, onClick }: MapAreaProps) {
  const theme = THEME_COLORS[area.theme] ?? THEME_COLORS.grass;
  const minLevel = area.encounterPool.length > 0 ? Math.min(...area.encounterPool.map((p) => p.minLevel)) : 1;
  const maxLevel = area.encounterPool.length > 0 ? Math.max(...area.encounterPool.map((p) => p.maxLevel)) : 1;

  return (
    <motion.button
      onClick={onClick}
      className="absolute group cursor-pointer"
      style={{
        left: `${area.position.x}%`,
        top: `${area.position.y}%`,
        width: `${area.position.width}%`,
        height: `${area.position.height}%`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-full h-full rounded-lg border-2 transition-all duration-200 ${
          isSelected ? "ring-2 ring-[#f0f0e8]" : ""
        }`}
        style={{
          backgroundColor: isSelected ? theme.bg.replace("0.25", "0.5") : theme.bg,
          borderColor: theme.border,
        }}
      >
        <span className="text-[8px] font-pixel text-[#f0f0e8] drop-shadow-md leading-tight block p-1 truncate">
          {area.name}
        </span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-lg px-2 py-1 whitespace-nowrap">
          <p className="text-[9px] font-pixel text-[#f0f0e8]">{area.name}</p>
          <p className="text-[8px] text-[#8b9bb4]">
            Lv. {minLevel}-{maxLevel} · {theme.label}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
