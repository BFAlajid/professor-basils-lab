"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TYPE_LIST, getEffectiveness } from "@/data/typeChart";
import type { TypeName } from "@/types";

const ABBREV: Record<TypeName, string> = {
  normal: "NOR", fire: "FIR", water: "WAT", electric: "ELE", grass: "GRA", ice: "ICE",
  fighting: "FIG", poison: "POI", ground: "GRO", flying: "FLY", psychic: "PSY", bug: "BUG",
  rock: "ROC", ghost: "GHO", dragon: "DRA", dark: "DAR", steel: "STE", fairy: "FAI",
};

function CellDisplay({ value }: { value: number }) {
  if (value === 1) return null;
  if (value === 2) return <span className="text-[#38b764] font-bold">2</span>;
  if (value === 0.5) return <span className="text-[#e8433f]">&frac12;</span>;
  if (value === 0) return <span className="text-[#f0f0e8] font-bold">0</span>;
  return <span>{value}</span>;
}

export default function TypeReference() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const matchedType = TYPE_LIST.find(
    (t) => t.toLowerCase().startsWith(search.toLowerCase()) && search.length > 0
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full bg-[#e8433f] text-[#f0f0e8] font-pixel text-sm font-bold shadow-lg hover:bg-[#c9362f] transition-colors flex items-center justify-center"
        aria-label="Open type effectiveness chart"
        title="Type Chart"
      >
        ?
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="relative max-h-[90vh] max-w-[95vw] overflow-auto rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#1a1c2c] z-10 pb-2">
              <h2 className="text-sm font-bold text-[#f0f0e8] font-pixel">Type Effectiveness</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded border border-[#3a4466] bg-[#262b44] px-2 py-1 text-[10px] text-[#f0f0e8] outline-none focus:border-[#e8433f] w-24 font-pixel"
                  autoFocus
                />
                <button
                  onClick={() => setOpen(false)}
                  className="rounded bg-[#3a4466] px-2 py-1 text-[10px] text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors font-pixel"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mb-2 text-[10px] font-pixel text-[#8b9bb4]">
              <span><span className="text-[#38b764] font-bold">2</span> = super effective</span>
              <span><span className="text-[#e8433f]">&frac12;</span> = not very effective</span>
              <span><span className="text-[#f0f0e8] font-bold">0</span> = immune</span>
              <span>Row = attacker, Col = defender</span>
            </div>

            {/* Chart */}
            <div className="overflow-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-20 bg-[#1a1c2c] p-0" />
                    {TYPE_LIST.map((defType) => (
                      <th
                        key={defType}
                        className={`p-1 text-[9px] font-pixel font-normal text-center min-w-[28px] sticky top-0 bg-[#1a1c2c] z-10 ${
                          matchedType === defType ? "text-[#f7a838]" : "text-[#8b9bb4]"
                        }`}
                      >
                        {ABBREV[defType]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TYPE_LIST.map((atkType) => (
                    <tr key={atkType}>
                      <td
                        className={`sticky left-0 z-10 bg-[#1a1c2c] px-1 py-0.5 text-[9px] font-pixel text-right min-w-[32px] ${
                          matchedType === atkType ? "text-[#f7a838]" : "text-[#8b9bb4]"
                        }`}
                      >
                        {ABBREV[atkType]}
                      </td>
                      {TYPE_LIST.map((defType) => {
                        const eff = getEffectiveness(atkType, defType);
                        const highlight = matchedType && (matchedType === atkType || matchedType === defType);
                        return (
                          <td
                            key={defType}
                            className={`p-0.5 text-center text-[9px] font-pixel border border-[#262b44] min-w-[28px] ${
                              eff === 0 ? "bg-[#0d0e14]" : highlight ? "bg-[#3a4466]" : "bg-[#262b44]"
                            }`}
                          >
                            <CellDisplay value={eff} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
