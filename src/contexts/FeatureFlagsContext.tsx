"use client";

import { createContext, useContext } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type FeatureFlagsContextType = ReturnType<typeof useFeatureFlags>;

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  features: {
    enableSharing: true,
    enableLeaderboards: true,
    enableEmulator: true,
    enableCitrine: false,
    enableMultiplayer: false,
    maintenanceMode: false,
  },
  announcement: { banner: null, bannerType: "info" },
  isLoading: true,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const flags = useFeatureFlags();
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlagsContext() {
  return useContext(FeatureFlagsContext);
}
