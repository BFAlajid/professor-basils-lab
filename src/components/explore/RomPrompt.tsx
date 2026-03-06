"use client";

import { useCallback, useState, useRef } from "react";

interface RomPromptProps {
  onRomLoaded: (buffer: Uint8Array, name: string) => Promise<boolean>;
}

export default function RomPrompt({ onRomLoaded }: RomPromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".gba")) {
        setError("Please select a .gba ROM file");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        const success = await onRomLoaded(buffer, file.name);
        if (!success) {
          setError("Unsupported ROM. Please use Pokemon FireRed or Emerald.");
        }
      } catch {
        setError("Failed to load ROM file");
      } finally {
        setLoading(false);
      }
    },
    [onRomLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <h2
        className="text-2xl font-bold"
        style={{ color: "#f0f0e8" }}
      >
        Explore
      </h2>
      <p style={{ color: "#8b9bb4" }} className="text-center max-w-md">
        Load a Pokemon GBA ROM to explore the world. Your ROM is stored locally
        and never uploaded.
      </p>

      <div
        role="button"
        tabIndex={0}
        className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors w-full max-w-md"
        style={{
          borderColor: dragOver ? "#f7a838" : "#3a4466",
          backgroundColor: dragOver ? "rgba(247,168,56,0.1)" : "#262b44",
          color: "#8b9bb4",
        }}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
        aria-label="Load ROM file"
      >
        {loading ? (
          <span style={{ color: "#f7a838" }}>Loading ROM...</span>
        ) : (
          <>
            <p className="text-lg mb-2" style={{ color: "#f0f0e8" }}>
              Drop .gba file here
            </p>
            <p className="text-sm">or click to browse</p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".gba"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && (
        <p style={{ color: "#e8433f" }} className="text-sm">
          {error}
        </p>
      )}

      <p className="text-xs" style={{ color: "#8b9bb4" }}>
        Supported: Pokemon FireRed, LeafGreen, Emerald
      </p>
    </div>
  );
}
