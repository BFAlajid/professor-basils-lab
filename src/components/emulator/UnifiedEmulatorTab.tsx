"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const GBAEmulatorTab = dynamic(() => import("@/components/gba/GBAEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading GBA emulator...</p>
    </div>
  ),
});

const NDSEmulatorTab = dynamic(() => import("@/components/nds/NDSEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading NDS emulator...</p>
    </div>
  ),
});

type EmulatorMode = "select" | "gba" | "nds";

const GBA_EXTENSIONS = new Set(["gba", "gbc", "gb"]);
const NDS_EXTENSIONS = new Set(["nds", "ds"]);

function detectROMType(filename: string): EmulatorMode {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (GBA_EXTENSIONS.has(ext)) return "gba";
  if (NDS_EXTENSIONS.has(ext)) return "nds";
  return "select";
}

export default function UnifiedEmulatorTab() {
  const [mode, setMode] = useState<EmulatorMode>("select");
  const [romFile, setRomFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const romInputRef = useRef<HTMLInputElement>(null);

  // Prevent browser from navigating when files are dropped anywhere on the page
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    const detected = detectROMType(file.name);
    if (detected === "select") return; // unsupported format
    setRomFile(file);
    setMode(detected);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  // Back to selector (allows switching between emulators)
  const handleBack = useCallback(() => {
    setMode("select");
    setRomFile(null);
  }, []);

  // Once an emulator is active, render it and keep it mounted
  // The emulator tab handles subsequent ROM loads internally via its own drag-and-drop
  if (mode === "gba") {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-3 px-3 py-1.5 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors"
        >
          ← Switch Emulator
        </button>
        <GBAEmulatorTab initialFile={romFile} />
      </div>
    );
  }

  if (mode === "nds") {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-3 px-3 py-1.5 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors"
        >
          ← Switch Emulator
        </button>
        <NDSEmulatorTab initialFile={romFile} />
      </div>
    );
  }

  // ROM type selector — unified drop zone
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={`relative w-full max-w-lg rounded-lg overflow-hidden border-4 ${
          dragOver ? "border-[#e8433f]" : "border-[#3a4466]"
        } bg-black transition-colors`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-4">
          <p className="text-[#f0f0e8] font-pixel text-sm">Emulator</p>
          {/* Hide drag text on touch-only devices */}
          <p className="text-[#8b9bb4] text-xs text-center hidden sm:block">
            Drag & drop a ROM file here
          </p>
          <p className="text-[#8b9bb4] text-xs hidden sm:block">or</p>
          <button
            onClick={() => romInputRef.current?.click()}
            className="px-6 py-3 sm:px-4 sm:py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-sm sm:text-xs font-pixel hover:bg-[#f05050] active:bg-[#f05050] transition-colors"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            Choose ROM File
          </button>

          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-[#f0f0e8] font-pixel text-xs">GBA</p>
              <p className="text-[#8b9bb4] text-[10px]">.gba .gbc .gb</p>
            </div>
            <div className="w-px bg-[#3a4466]" />
            <div className="text-center">
              <p className="text-[#f0f0e8] font-pixel text-xs">NDS</p>
              <p className="text-[#8b9bb4] text-[10px]">.nds .ds</p>
            </div>
          </div>

          {/* Or pick an emulator directly */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setMode("gba")}
              className="px-4 py-2 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
            >
              Open GBA Emulator
            </button>
            <button
              onClick={() => setMode("nds")}
              className="px-4 py-2 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
            >
              Open NDS Emulator
            </button>
          </div>

          <p className="text-[#8b9bb4] text-[9px] italic mt-4 max-w-sm text-center">
            Load your own legally obtained ROM files. No ROMs are provided or distributed by this application.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={romInputRef}
        type="file"
        accept=".gba,.gbc,.gb,.nds,.ds"
        className="hidden"
        aria-label="Load ROM file"
        onChange={handleFileInput}
      />
    </div>
  );
}
