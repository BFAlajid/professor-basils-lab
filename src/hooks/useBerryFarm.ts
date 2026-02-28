"use client";
import { useReducer, useEffect, useCallback } from "react";
import { BERRIES } from "@/data/berries";

export interface BerryPlot {
  id: number;
  berryType: string | null;
  plantedAt: number | null;
  growthDurationMs: number;
  waterLevel: number;
}

export interface BerryFarmState {
  plots: BerryPlot[];
  inventory: Record<string, number>;
}

type BerryFarmAction =
  | { type: "PLANT"; plotId: number; berryType: string }
  | { type: "WATER"; plotId: number }
  | { type: "HARVEST"; plotId: number }
  | { type: "LOAD"; state: BerryFarmState };

const STORAGE_KEY = "pokemon-berry-farm";
const PLOT_COUNT = 6;

function createEmptyPlots(): BerryPlot[] {
  return Array.from({ length: PLOT_COUNT }, (_, i) => ({
    id: i,
    berryType: null,
    plantedAt: null,
    growthDurationMs: 0,
    waterLevel: 0,
  }));
}

function initialState(): BerryFarmState {
  return { plots: createEmptyPlots(), inventory: {} };
}

function reducer(state: BerryFarmState, action: BerryFarmAction): BerryFarmState {
  switch (action.type) {
    case "PLANT": {
      const berry = BERRIES.find((b) => b.name === action.berryType);
      if (!berry) return state;
      const plots = state.plots.map((p) =>
        p.id === action.plotId && !p.berryType
          ? {
              ...p,
              berryType: berry.name,
              plantedAt: Date.now(),
              growthDurationMs: berry.growthTimeMinutes * 60 * 1000,
              waterLevel: 0,
            }
          : p
      );
      return { ...state, plots };
    }
    case "WATER": {
      const plots = state.plots.map((p) =>
        p.id === action.plotId && p.berryType && p.waterLevel < 3
          ? { ...p, waterLevel: p.waterLevel + 1 }
          : p
      );
      return { ...state, plots };
    }
    case "HARVEST": {
      const plot = state.plots.find((p) => p.id === action.plotId);
      if (!plot || !plot.berryType || !plot.plantedAt) return state;
      const speedMultiplier = plot.waterLevel > 0 ? 2 : 1;
      const elapsed = Date.now() - plot.plantedAt;
      const effectiveDuration = plot.growthDurationMs / speedMultiplier;
      if (elapsed < effectiveDuration) return state;
      const inventory = { ...state.inventory };
      inventory[plot.berryType] = (inventory[plot.berryType] || 0) + 1;
      const plots = state.plots.map((p) =>
        p.id === action.plotId
          ? { ...p, berryType: null, plantedAt: null, growthDurationMs: 0, waterLevel: 0 }
          : p
      );
      return { ...state, plots, inventory };
    }
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}

export function useBerryFarm() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BerryFarmState;
        if (parsed.plots && parsed.inventory) {
          dispatch({ type: "LOAD", state: parsed });
        }
      }
    } catch {
      /* corrupted data */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const plant = useCallback((plotId: number, berryType: string) => {
    dispatch({ type: "PLANT", plotId, berryType });
  }, []);

  const water = useCallback((plotId: number) => {
    dispatch({ type: "WATER", plotId });
  }, []);

  const harvest = useCallback((plotId: number) => {
    dispatch({ type: "HARVEST", plotId });
  }, []);

  const getGrowthProgress = useCallback((plot: BerryPlot): number => {
    if (!plot.plantedAt || !plot.berryType) return 0;
    const speedMultiplier = plot.waterLevel > 0 ? 2 : 1;
    const elapsed = Date.now() - plot.plantedAt;
    const effectiveDuration = plot.growthDurationMs / speedMultiplier;
    return Math.min(1, elapsed / effectiveDuration);
  }, []);

  const isReadyToHarvest = useCallback((plot: BerryPlot): boolean => {
    return getGrowthProgress(plot) >= 1;
  }, [getGrowthProgress]);

  return { state, plant, water, harvest, getGrowthProgress, isReadyToHarvest };
}
