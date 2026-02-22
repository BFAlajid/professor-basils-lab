"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RouteArea } from "@/types";
import { REGIONS, getAreasForRegion, RegionId } from "@/data/routes";
import MapArea from "./MapArea";

interface RegionMapProps {
  selectedArea: RouteArea | null;
  onSelectArea: (area: RouteArea) => void;
}

export default function RegionMap({ selectedArea, onSelectArea }: RegionMapProps) {
  const [activeRegion, setActiveRegion] = useState<RegionId>("kanto");
  const areas = getAreasForRegion(activeRegion);

  return (
    <div className="space-y-3">
      {/* Region tabs */}
      <div className="flex gap-1">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            onClick={() => setActiveRegion(region.id)}
            className={`px-3 py-1.5 text-[10px] font-pixel rounded-lg border transition-all ${
              activeRegion === region.id
                ? "text-[#f0f0e8] border-current"
                : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
            }`}
            style={activeRegion === region.id ? { color: region.color, borderColor: region.color } : undefined}
          >
            {region.name}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div className="relative bg-[#1a1c2c] border border-[#3a4466] rounded-xl overflow-hidden" style={{ height: "400px" }}>
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(#3a4466 1px, transparent 1px), linear-gradient(90deg, #3a4466 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Region label */}
        <div className="absolute top-3 left-3 z-10">
          <h3 className="text-sm font-pixel" style={{ color: REGIONS.find((r) => r.id === activeRegion)?.color }}>
            {REGIONS.find((r) => r.id === activeRegion)?.name}
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
