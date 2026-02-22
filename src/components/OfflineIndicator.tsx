"use client";

import { usePWA } from "@/hooks/usePWA";

export default function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-[#f7a838] text-[#1a1c2c] text-center py-1.5 text-xs font-pixel"
      role="status"
      aria-live="polite"
    >
      You&apos;re offline &mdash; cached data is available
    </div>
  );
}
