"use client";

import { useState, useRef, useEffect } from "react";
import { DataManager } from "./DataManager";

export default function DataManagerButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Manage save data"
        aria-expanded={open}
        className="rounded-lg bg-[#3a4466] px-3 py-2 text-base text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
      >
        Data
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[320px] shadow-xl">
          <DataManager />
        </div>
      )}
    </div>
  );
}
