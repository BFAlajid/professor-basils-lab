"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RouteArea } from "@/types";
import { REGIONS, getAreasForRegion, RegionId } from "@/data/routes";
import MapArea from "./MapArea";

interface RegionMapProps {
  selectedArea: RouteArea | null;
  onSelectArea: (area: RouteArea) => void;
}

export default function RegionMap({ selectedArea, onSelectArea }: RegionMapProps) {
  const [activeRegion, setActiveRegion] = useState<RegionId>("kanto");
  const [mapLoaded, setMapLoaded] = useState<Record<string, boolean>>({});
  const [mapError, setMapError] = useState<Record<string, boolean>>({});
  const areas = getAreasForRegion(activeRegion);
  const region = REGIONS.find((r) => r.id === activeRegion);

  return (
    <div className="space-y-3">
      {/* Region tabs */}
      <div className="flex gap-1 flex-wrap">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRegion(r.id)}
            className={`px-3 py-1.5 text-[10px] font-pixel rounded-lg border transition-all ${
              activeRegion === r.id
                ? "text-[#f0f0e8] border-current"
                : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
            }`}
            style={activeRegion === r.id ? { color: r.color, borderColor: r.color } : undefined}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div className="relative bg-[#1a1c2c] border border-[#3a4466] rounded-xl overflow-hidden" style={{ height: "400px" }}>
        {/* Region map background image */}
        <AnimatePresence mode="wait">
          {region?.mapUrl && !mapError[activeRegion] && (
            <motion.img
              key={activeRegion}
              src={region.mapUrl}
              alt={`${region.name} region map`}
              initial={{ opacity: 0 }}
              animate={{ opacity: mapLoaded[activeRegion] ? 0.35 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onLoad={() => setMapLoaded((prev) => ({ ...prev, [activeRegion]: true }))}
              onError={() => setMapError((prev) => ({ ...prev, [activeRegion]: true }))}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none pixelated"
              draggable={false}
            />
          )}
        </AnimatePresence>

        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-[#1a1c2c]/50 pointer-events-none" />

        {/* Background grid pattern (subtle, on top of map) */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(#3a4466 1px, transparent 1px), linear-gradient(90deg, #3a4466 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Region label */}
        <div className="absolute top-3 left-3 z-10">
          <h3
            className="text-sm font-pixel drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            style={{ color: region?.color }}
          >
            {region?.name}
          </h3>
        </div>

        {/* Map areas */}
        {areas.map((area) => (
          <MapArea
            key={area.id}
            area={area}
            isSelected={selectedArea?.id === area.id}
            onClick={() => onSelectArea(area)}
          />
        ))}
      </div>
    </div>
  );
}
