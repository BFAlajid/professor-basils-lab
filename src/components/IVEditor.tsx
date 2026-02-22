"use client";

import { IVSpread } from "@/types";
import { MAX_IV } from "@/utils/stats";

interface IVEditorProps {
  ivs: IVSpread;
  onChange: (ivs: IVSpread) => void;
}

const STAT_LABELS: { key: keyof IVSpread; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAtk", label: "SpA" },
  { key: "spDef", label: "SpD" },
  { key: "speed", label: "Spe" },
];

export default function IVEditor({ ivs, onChange }: IVEditorProps) {
  const handleChange = (key: keyof IVSpread, value: number) => {
    onChange({ ...ivs, [key]: Math.max(0, Math.min(MAX_IV, value)) });
  };

  const setAll = (value: number) => {
    onChange({ hp: value, attack: value, defense: value, spAtk: value, spDef: value, speed: value });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-[#8b9bb4]">IVs</label>
        <div className="flex gap-1">
          <button
            onClick={() => setAll(31)}
            className="rounded px-2 py-0.5 text-[10px] bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            All 31
          </button>
          <button
            onClick={() => setAll(0)}
            className="rounded px-2 py-0.5 text-[10px] bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
          >
            All 0
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-8 text-xs text-[#8b9bb4]">{label}</span>
            <input
              type="number"
              min={0}
              max={MAX_IV}
              value={ivs[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
              className="w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1 text-xs text-[#f0f0e8] text-right outline-none focus:border-[#e8433f]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
