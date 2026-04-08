"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WeatherType } from "@/types";

type TerrainType = "electric" | "grassy" | "misty" | "psychic";

const selectCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const lblCls = "block text-[10px] text-[#8b9bb4] mb-0.5";

const WEATHER_OPTIONS: { value: WeatherType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "sun", label: "Sun" },
  { value: "rain", label: "Rain" },
  { value: "sandstorm", label: "Sandstorm" },
  { value: "hail", label: "Hail" },
];

const TERRAIN_OPTIONS: { value: TerrainType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "electric", label: "Electric" },
  { value: "grassy", label: "Grassy" },
  { value: "psychic", label: "Psychic" },
  { value: "misty", label: "Misty" },
];

const STAT_STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

interface FieldConditionsProps {
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  attackerStatStage: number;
  setAttackerStatStage: (v: number) => void;
  defenderStatStage: number;
  setDefenderStatStage: (v: number) => void;
  weather: WeatherType | "";
  setWeather: (v: WeatherType | "") => void;
  terrain: TerrainType | "";
  setTerrain: (v: TerrainType | "") => void;
  reflect: boolean;
  setReflect: (v: boolean) => void;
  lightScreen: boolean;
  setLightScreen: (v: boolean) => void;
  criticalHit: boolean;
  setCriticalHit: (v: boolean) => void;
}

export type { TerrainType };

export default function FieldConditions({
  showAdvanced,
  setShowAdvanced,
  attackerStatStage,
  setAttackerStatStage,
  defenderStatStage,
  setDefenderStatStage,
  weather,
  setWeather,
  terrain,
  setTerrain,
  reflect,
  setReflect,
  lightScreen,
  setLightScreen,
  criticalHit,
  setCriticalHit,
}: FieldConditionsProps) {
  return (
    <>
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
        aria-expanded={showAdvanced}
        aria-controls="advanced-options"
      >
        <span>Advanced Options</span>
        <span className="text-[10px]">
          {showAdvanced ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            id="advanced-options"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lblCls}>Atk Stage</label>
                  <select
                    value={attackerStatStage}
                    onChange={(e) =>
                      setAttackerStatStage(parseInt(e.target.value))
                    }
                    className={selectCls}
                    aria-label="Attacker stat stage"
                  >
                    {STAT_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s > 0 ? `+${s}` : `${s}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lblCls}>Def Stage</label>
                  <select
                    value={defenderStatStage}
                    onChange={(e) =>
                      setDefenderStatStage(parseInt(e.target.value))
                    }
                    className={selectCls}
                    aria-label="Defender stat stage"
                  >
                    {STAT_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s > 0 ? `+${s}` : `${s}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lblCls}>Weather</label>
                  <select
                    value={weather}
                    onChange={(e) =>
                      setWeather(e.target.value as WeatherType | "")
                    }
                    className={selectCls}
                    aria-label="Weather condition"
                  >
                    {WEATHER_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lblCls}>Terrain</label>
                  <select
                    value={terrain}
                    onChange={(e) =>
                      setTerrain(e.target.value as TerrainType | "")
                    }
                    className={selectCls}
                    aria-label="Terrain condition"
                  >
                    {TERRAIN_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reflect}
                    onChange={(e) => setReflect(e.target.checked)}
                    className="accent-[#e8433f]"
                  />
                  Reflect
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightScreen}
                    onChange={(e) => setLightScreen(e.target.checked)}
                    className="accent-[#e8433f]"
                  />
                  Light Screen
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criticalHit}
                    onChange={(e) => setCriticalHit(e.target.checked)}
                    className="accent-[#e8433f]"
                  />
                  Critical Hit
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
