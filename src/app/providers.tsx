"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { PokedexProvider } from "@/contexts/PokedexContext";
import { AchievementsProvider } from "@/contexts/AchievementsContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import LocalErrorBoundary from "@/components/LocalErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  );

  return (
    <LocalErrorBoundary>
      <MotionConfig reducedMotion="user">
        <FeatureFlagsProvider>
          <QueryClientProvider client={queryClient}>
            <PokedexProvider>
              <AchievementsProvider>
                {children}
              </AchievementsProvider>
            </PokedexProvider>
          </QueryClientProvider>
        </FeatureFlagsProvider>
      </MotionConfig>
    </LocalErrorBoundary>
  );
}
