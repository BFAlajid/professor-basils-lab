import React from "react";

interface NDSRomOverlayProps {
  isReady: boolean;
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  savedROMs: string[];
  onChooseROM: () => void;
  onLoadSavedROM: (name: string) => void;
}

export default function NDSRomOverlay({
  isReady,
  isRunning,
  isLoading,
  error,
  savedROMs,
  onChooseROM,
  onLoadSavedROM,
}: NDSRomOverlayProps) {
  return (
    <>
      {!isRunning && isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <div className="text-center space-y-2">
            <p className="text-[#f0f0e8] font-pixel text-sm">NDS Emulator</p>
            <p className="text-[#8b9bb4] text-xs hidden sm:block">Drag & drop a .nds ROM file here</p>
            <p className="text-[#8b9bb4] text-xs hidden sm:block">or</p>
            <button
              onClick={onChooseROM}
              className="px-6 py-3 sm:px-4 sm:py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-sm sm:text-xs font-pixel hover:bg-[#f05050] active:bg-[#f05050] transition-colors"
            >
              Choose ROM File
            </button>
          </div>

          {savedROMs.length > 0 && (
            <div className="space-y-2 text-center">
              <p className="text-[#8b9bb4] text-[10px] font-pixel">Previously loaded:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {savedROMs.map((rom) => (
                  <button
                    key={rom}
                    onClick={() => onLoadSavedROM(rom)}
                    className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors truncate max-w-[200px]"
                  >
                    {rom}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[#8b9bb4] text-[9px] italic mt-4 max-w-sm text-center">
            Load your own legally obtained ROM files. No ROMs are provided or distributed by this application.
          </p>
        </div>
      )}

      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading NDS emulator...</p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <p className="text-[#f0f0e8] font-pixel text-xs animate-pulse">Loading ROM...</p>
        </div>
      )}
    </>
  );
}
