"use client";

import { useState, useMemo } from "react";
import { getSmogonSets, SmogonSet } from "@/data/smogonSets";

interface SmogonSetLoaderProps {
  pokemonId: number;
  onApplySet: (set: {
    nature: string;
    ability: string;
    item: string;
    evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
    moves: string[];
  }) => void;
}

const FORMAT_ORDER = ["OU", "UU", "VGC"];

function formatEvSpread(evs: SmogonSet["evs"]): string {
  const parts: string[] = [];
  if (evs.hp) parts.push(`${evs.hp} HP`);
  if (evs.atk) parts.push(`${evs.atk} Atk`);
  if (evs.def) parts.push(`${evs.def} Def`);
  if (evs.spa) parts.push(`${evs.spa} SpA`);
  if (evs.spd) parts.push(`${evs.spd} SpD`);
  if (evs.spe) parts.push(`${evs.spe} Spe`);
  return parts.join(" / ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SmogonSetLoader({ pokemonId, onApplySet }: SmogonSetLoaderProps) {
  const [open, setOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  const allSets = useMemo(() => getSmogonSets(pokemonId), [pokemonId]);

  const availableFormats = useMemo(() => {
    const fmts = new Set(allSets.map((s) => s.format));
    return FORMAT_ORDER.filter((f) => fmts.has(f));
  }, [allSets]);

  // Auto-select first format when sets change
  const selectedFormat = activeFormat && availableFormats.includes(activeFormat)
    ? activeFormat
    : availableFormats[0] ?? null;

  const filteredSets = useMemo(
    () => (selectedFormat ? allSets.filter((s) => s.format === selectedFormat) : allSets),
    [allSets, selectedFormat],
  );

  if (allSets.length === 0 && !open) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#3a4466] bg-[#262b44]">
      {/* Header / Toggle */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold tracking-wide text-[#f0f0e8] hover:bg-[#3a4466]/40 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-[#e8433f]"
          >
            <path
              d="M7 1L9 5H13L10 8L11 12L7 10L3 12L4 8L1 5H5L7 1Z"
              fill="currentColor"
            />
          </svg>
          Competitive Sets
          {allSets.length > 0 && (
            <span className="ml-1 rounded bg-[#3a4466] px-1.5 py-0.5 text-[10px] font-normal text-[#8b9bb4]">
              {allSets.length}
            </span>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-[#8b9bb4] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsible Body */}
      {open && (
        <div className="border-t border-[#3a4466] px-3 py-2">
          {allSets.length === 0 ? (
            <p className="py-2 text-center text-xs text-[#8b9bb4]">No sets available</p>
          ) : (
            <>
              {/* Format Tabs */}
              {availableFormats.length > 1 && (
                <div className="mb-2 flex gap-1">
                  {availableFormats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setActiveFormat(fmt)}
                      className={`rounded px-2.5 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                        selectedFormat === fmt
                          ? "bg-[#e8433f] text-[#f0f0e8]"
                          : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}

              {/* Set Cards */}
              <div className="space-y-2">
                {filteredSets.map((set, idx) => (
                  <div
                    key={`${set.format}-${set.name}-${idx}`}
                    className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-2.5"
                  >
                    {/* Set Name + Format Badge */}
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#f0f0e8]">{set.name}</span>
                      <span className="rounded bg-[#3a4466] px-1.5 py-0.5 text-[10px] text-[#8b9bb4]">
                        {set.format}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="mb-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                      <div>
                        <span className="text-[#8b9bb4]">Nature: </span>
                        <span className="text-[#f0f0e8]">{capitalize(set.nature)}</span>
                      </div>
                      <div>
                        <span className="text-[#8b9bb4]">Item: </span>
                        <span className="text-[#f0f0e8]">{set.item}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#8b9bb4]">Ability: </span>
                        <span className="text-[#f0f0e8]">{set.ability}</span>
                      </div>
                    </div>

                    {/* EV Spread */}
                    <div className="mb-1.5 text-[11px]">
                      <span className="text-[#8b9bb4]">EVs: </span>
                      <span className="font-mono text-[#f7a838]">{formatEvSpread(set.evs)}</span>
                    </div>

                    {/* Moves */}
                    <div className="mb-2 flex flex-wrap gap-1">
                      {set.moves.map((move) => (
                        <span
                          key={move}
                          className="rounded bg-[#262b44] px-1.5 py-0.5 text-[10px] text-[#f0f0e8]"
                        >
                          {move}
                        </span>
                      ))}
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() =>
                        onApplySet({
                          nature: set.nature,
                          ability: set.ability,
                          item: set.item,
                          evs: { ...set.evs },
                          moves: [...set.moves],
                        })
                      }
                      className="w-full rounded bg-[#e8433f] py-1.5 text-[11px] font-bold text-[#f0f0e8] hover:bg-[#ff5a56] active:bg-[#c93835] transition-colors"
                    >
                      Apply Set
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
