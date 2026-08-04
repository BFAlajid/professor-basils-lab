"use client";
import { useCallback } from "react";
import { BERRIES } from "@/data/berries";
import { usePersistedReducer } from "@/hooks/usePersistedReducer";
import { STORAGE_KEYS } from "@/utils/persistence";

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

function validateBerryFarmState(raw: unknown): BerryFarmState | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<BerryFarmState>;
  if (!r.plots || !r.inventory) return null;
  return { plots: r.plots, inventory: r.inventory };
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
      const speedMultiplier = 1 + plot.waterLevel * 0.5;
      const elapsed = Date.now() - plot.plantedAt;
      const effectiveDuration = plot.growthDurationMs / speedMultiplier;
      if (elapsed < effectiveDuration) return state;
      const yieldCount = 1 + plot.waterLevel;
      const inventory = { ...state.inventory };
      inventory[plot.berryType] = (inventory[plot.berryType] || 0) + yieldCount;
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
  const [state, dispatch] = usePersistedReducer(
    STORAGE_KEYS.berryFarm,
    reducer,
    initialState(),
    validateBerryFarmState,
  );

  const plant = useCallback((plotId: number, berryType: string) => {
    dispatch({ type: "PLANT", plotId, berryType });
  }, [dispatch]);

  const water = useCallback((plotId: number) => {
    dispatch({ type: "WATER", plotId });
  }, [dispatch]);

  const harvest = useCallback((plotId: number) => {
    dispatch({ type: "HARVEST", plotId });
  }, [dispatch]);

  const getGrowthProgress = useCallback((plot: BerryPlot): number => {
    if (!plot.plantedAt || !plot.berryType) return 0;
    const speedMultiplier = 1 + plot.waterLevel * 0.5;
    const elapsed = Date.now() - plot.plantedAt;
    const effectiveDuration = plot.growthDurationMs / speedMultiplier;
    return Math.min(1, elapsed / effectiveDuration);
  }, []);

  const isReadyToHarvest = useCallback((plot: BerryPlot): boolean => {
    return getGrowthProgress(plot) >= 1;
  }, [getGrowthProgress]);

  return { state, plant, water, harvest, getGrowthProgress, isReadyToHarvest };
}
