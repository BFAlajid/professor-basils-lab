"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBerryFarm, BerryPlot } from "@/hooks/useBerryFarm";
import { BERRIES, BERRY_CATEGORIES, type BerryCategory } from "@/data/berries";
import ItemSprite from "@/components/ItemSprite";

export default function BerryFarm() {
  const { state, plant, water, harvest, getGrowthProgress, isReadyToHarvest } =
    useBerryFarm();
  const [selectedBerry, setSelectedBerry] = useState<string | null>(null);
  const [berryCategory, setBerryCategory] = useState<BerryCategory>("status");
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlotClick = useCallback(
    (plot: BerryPlot) => {
      if (isReadyToHarvest(plot)) {
        harvest(plot.id);
      } else if (!plot.berryType && selectedBerry) {
        plant(plot.id, selectedBerry);
        setSelectedBerry(null);
      }
    },
    [selectedBerry, harvest, plant, isReadyToHarvest]
  );

  const getGrowthStage = (progress: number): string => {
    if (progress < 0.25) return "Seed";
    if (progress < 0.5) return "Sprout";
    if (progress < 0.75) return "Growth";
    if (progress < 1) return "Bloom";
    return "Ready!";
  };

  const getSeedlingColor = (plot: BerryPlot, progress: number): string => {
    const berry = BERRIES.find((b) => b.name === plot.berryType);
    if (!berry) return "#3a4466";
    if (progress < 0.25) return "#8b6b47";
    if (progress < 0.5) return "#38b764";
    return berry.color;
  };

  const filteredBerries = useMemo(
    () => BERRIES.filter((b) => b.category === berryCategory),
    [berryCategory]
  );

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
        Berry Farm
      </h3>

      {/* Berry Plots Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {state.plots.map((plot) => {
          const progress = getGrowthProgress(plot);
          const ready = isReadyToHarvest(plot);
          const stage = plot.berryType ? getGrowthStage(progress) : null;
          const seedColor = getSeedlingColor(plot, progress);

          return (
            <motion.div
              key={plot.id}
              className="relative rounded-lg border-2 bg-[#1a1c2c] p-3 flex flex-col items-center gap-2 min-h-[120px] justify-center"
              style={{
                borderColor: ready ? "#38b764" : "#3a4466",
              }}
              whileHover={{ scale: 1.02 }}
            >
              {plot.berryType ? (
                <>
                  {/* Plant visual */}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div
                      className="absolute bottom-0 w-full h-2 rounded-sm"
                      style={{ backgroundColor: "#5c3d2e" }}
                    />
                    <div
                      className="absolute bottom-2 w-1 rounded-sm"
                      style={{
                        backgroundColor: "#38b764",
                        height: `${Math.min(progress * 100, 100) * 0.3}px`,
                      }}
                    />
                    {ready ? (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <ItemSprite name={plot.berryType!} size={24} fallbackColor={seedColor} />
                      </motion.div>
                    ) : (
                      <div
                        className="rounded-full"
                        style={{
                          width: 8 + progress * 16,
                          height: 8 + progress * 16,
                          backgroundColor: seedColor,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-[9px] font-pixel text-[#f0f0e8]">
                    {BERRIES.find((b) => b.name === plot.berryType)?.displayName}
                  </p>
                  <p className="text-[8px] text-[#8b9bb4]">{stage}</p>

                  <div className="w-full h-1.5 rounded-full bg-[#262b44] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: ready ? "#38b764" : "#f7a838",
                      }}
                    />
                  </div>

                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            i < plot.waterLevel ? "#6390F0" : "#3a4466",
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-1">
                    {!ready && plot.waterLevel < 3 && (
                      <button
                        onClick={() => water(plot.id)}
                        aria-label={`Water plot ${plot.id + 1}`}
                        className="rounded bg-[#6390F0] px-2 py-0.5 text-[8px] font-pixel text-[#f0f0e8] hover:opacity-80 transition-opacity"
                      >
                        Water
                      </button>
                    )}
                    {ready && (
                      <button
                        onClick={() => handlePlotClick(plot)}
                        aria-label={`Harvest plot ${plot.id + 1}`}
                        className="rounded bg-[#38b764] px-2 py-0.5 text-[8px] font-pixel text-[#f0f0e8] hover:opacity-80 transition-opacity"
                      >
                        Harvest
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => handlePlotClick(plot)}
                  disabled={!selectedBerry}
                  aria-label={`Plant in plot ${plot.id + 1}`}
                  className="flex flex-col items-center gap-1 text-[#8b9bb4] disabled:opacity-40"
                >
                  <div className="w-8 h-8 rounded-lg border-2 border-dashed border-[#3a4466] flex items-center justify-center text-lg">
                    +
                  </div>
                  <span className="text-[8px] font-pixel">
                    {selectedBerry ? "Tap to plant" : "Empty"}
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Berry Selection with Category Tabs */}
      <div className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3 mb-4">
        <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Select Berry to Plant
        </h4>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {BERRY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setBerryCategory(cat.key)}
              className="px-2 py-0.5 text-[7px] font-pixel rounded border transition-colors"
              style={{
                color: berryCategory === cat.key ? cat.color : "#8b9bb4",
                borderColor: berryCategory === cat.key ? cat.color : "#3a4466",
                backgroundColor: berryCategory === cat.key ? `${cat.color}15` : "transparent",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Berry grid for selected category */}
        <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto">
          {filteredBerries.map((berry) => (
            <button
              key={berry.name}
              onClick={() =>
                setSelectedBerry(
                  selectedBerry === berry.name ? null : berry.name
                )
              }
              aria-label={`Select ${berry.displayName}`}
              title={berry.effect}
              className={`rounded-lg p-1.5 text-center transition-colors ${
                selectedBerry === berry.name
                  ? "ring-2 ring-[#f0f0e8]"
                  : "hover:bg-[#262b44]"
              }`}
              style={{
                backgroundColor:
                  selectedBerry === berry.name ? `${berry.color}30` : "transparent",
              }}
            >
              <ItemSprite name={berry.name} size={24} fallbackColor={berry.color} className="mx-auto mb-0.5" />
              <p className="text-[7px] font-pixel text-[#f0f0e8] truncate">
                {berry.displayName.replace(" Berry", "")}
              </p>
              <p className="text-[6px] text-[#8b9bb4]">
                {berry.growthTimeMinutes}m
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Inventory */}
      <div className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
        <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wider mb-2">
          Berry Inventory
        </h4>
        {Object.keys(state.inventory).length === 0 ? (
          <p className="text-[9px] text-[#8b9bb4]">No berries harvested yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(state.inventory).map(([name, count]) => {
              const berry = BERRIES.find((b) => b.name === name);
              if (!berry || count <= 0) return null;
              return (
                <AnimatePresence key={name}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 rounded bg-[#262b44] px-2 py-1"
                  >
                    <ItemSprite name={berry.name} size={16} fallbackColor={berry.color} />
                    <span className="text-[9px] font-pixel text-[#f0f0e8]">
                      {berry.displayName}
                    </span>
                    <span className="text-[9px] font-pixel text-[#f7a838]">
                      x{count}
                    </span>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
