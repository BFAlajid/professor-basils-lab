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

const CitrineEmulatorTab = dynamic(() => import("@/components/ctr/CitrineEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading 3DS emulator...</p>
    </div>
  ),
});

type EmulatorMode = "select" | "gba" | "nds" | "ctr";

const GBA_EXTENSIONS = new Set(["gba", "gbc", "gb"]);
const NDS_EXTENSIONS = new Set(["nds", "ds"]);
const CTR_EXTENSIONS = new Set(["3dsx"]);

function detectROMType(filename: string): EmulatorMode {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (GBA_EXTENSIONS.has(ext)) return "gba";
  if (NDS_EXTENSIONS.has(ext)) return "nds";
  if (CTR_EXTENSIONS.has(ext)) return "ctr";
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
    if (detected === "select") return;
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

  const handleBack = useCallback(() => {
    setMode("select");
    setRomFile(null);
  }, []);

  const backButton = (
    <button
      onClick={handleBack}
      className="mb-3 px-3 py-1.5 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577] transition-colors"
    >
      ← Switch Emulator
    </button>
  );

  if (mode === "gba") {
    return (
      <div>
        {backButton}
        <GBAEmulatorTab initialFile={romFile} />
      </div>
    );
  }

  if (mode === "nds") {
    return (
      <div>
        {backButton}
        <NDSEmulatorTab initialFile={romFile} />
      </div>
    );
  }

  if (mode === "ctr") {
    return (
      <div>
        {backButton}
        <CitrineEmulatorTab initialFile={romFile} />
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
            <div className="w-px bg-[#3a4466]" />
            <div className="text-center">
              <p className="text-[#f0f0e8] font-pixel text-xs">3DS</p>
              <p className="text-[#8b9bb4] text-[10px]">.3dsx</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-2 justify-center">
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
            <button
              onClick={() => setMode("ctr")}
              className="px-4 py-2 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
            >
              Open 3DS Emulator
            </button>
          </div>

          <p className="text-[#8b9bb4] text-[9px] italic mt-4 max-w-sm text-center">
            Load your own legally obtained ROM files. No ROMs are provided or distributed by this application.
          </p>
        </div>
      </div>

      <input
        ref={romInputRef}
        type="file"
        accept=".gba,.gbc,.gb,.nds,.ds,.3dsx"
        className="hidden"
        aria-label="Load ROM file"
        onChange={handleFileInput}
      />
    </div>
  );
}
