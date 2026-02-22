"use client";

import { EVSpread } from "@/types";
import { MAX_SINGLE_EV, MAX_TOTAL_EVS, getTotalEVs, getRemainingEVs } from "@/utils/stats";

interface EVEditorProps {
  evs: EVSpread;
  onChange: (evs: EVSpread) => void;
}

const STAT_LABELS: { key: keyof EVSpread; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAtk", label: "SpA" },
  { key: "spDef", label: "SpD" },
  { key: "speed", label: "Spe" },
];

const PRESETS: { name: string; evs: EVSpread }[] = [
  { name: "Physical Sweeper", evs: { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 } },
  { name: "Special Sweeper", evs: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 } },
  { name: "Physical Wall", evs: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 } },
  { name: "Special Wall", evs: { hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 } },
  { name: "Balanced", evs: { hp: 84, attack: 84, defense: 84, spAtk: 84, spDef: 84, speed: 84 } },
];

export default function EVEditor({ evs, onChange }: EVEditorProps) {
  const total = getTotalEVs(evs);
  const remaining = getRemainingEVs(evs);

  const handleChange = (key: keyof EVSpread, value: number) => {
    const clamped = Math.max(0, Math.min(MAX_SINGLE_EV, value));
    const newEvs = { ...evs, [key]: clamped };
    const newTotal = getTotalEVs(newEvs);
    if (newTotal > MAX_TOTAL_EVS) {
      const overflow = newTotal - MAX_TOTAL_EVS;
      newEvs[key] = Math.max(0, clamped - overflow);
    }
    onChange(newEvs);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-[#8b9bb4]">EVs</label>
        <span className={`text-xs font-mono ${total >= MAX_TOTAL_EVS ? "text-[#e8433f]" : remaining < 100 ? "text-[#f7a838]" : "text-[#8b9bb4]"}`}>
          {total}/{MAX_TOTAL_EVS}
        </span>
      </div>

      <div className="space-y-2">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-8 text-xs text-[#8b9bb4]">{label}</span>
            <input
              type="range"
              min={0}
              max={MAX_SINGLE_EV}
              step={4}
              value={evs[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value))}
              className="flex-1 h-1.5 accent-[#e8433f] cursor-pointer"
            />
            <input
              type="number"
              min={0}
              max={MAX_SINGLE_EV}
              value={evs[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
              className="w-14 rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1 text-xs text-[#f0f0e8] text-right outline-none focus:border-[#e8433f]"
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => onChange(p.evs)}
            className="rounded px-2 py-0.5 text-[10px] bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
