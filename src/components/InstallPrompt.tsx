"use client";

import { usePWA } from "@/hooks/usePWA";

export default function InstallPrompt() {
  const { canInstall, promptInstall } = usePWA();

  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className="fixed bottom-4 right-4 z-50 rounded-lg bg-[#1a1c2c] border-2 border-[#3a4466] px-4 py-2 text-xs text-[#f0f0e8] font-pixel shadow-lg hover:bg-[#262b44] hover:border-[#5a6988] transition-colors"
    >
      Install App
    </button>
  );
}
