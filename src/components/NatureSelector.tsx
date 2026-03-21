"use client";

import { Nature, StatKey } from "@/types";
import { NATURES, getNatureLabel } from "@/data/natures";

interface NatureSelectorProps {
  value: Nature | null;
  onChange: (nature: Nature) => void;
}

const STAT_DISPLAY: Record<StatKey, string> = {
  attack: "Atk",
  defense: "Def",
  spAtk: "SpA",
  spDef: "SpD",
  speed: "Spe",
};

export default function NatureSelector({ value, onChange }: NatureSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b9bb4]">Nature</label>
      <select
        value={value?.name ?? ""}
        onChange={(e) => {
          const nature = NATURES.find((n) => n.name === e.target.value);
          if (nature) onChange(nature);
        }}
        aria-label="Select nature"
        className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] outline-none focus:border-[#e8433f]"
      >
        <option value="">Select nature...</option>
        {NATURES.map((n) => (
          <option key={n.name} value={n.name}>
            {getNatureLabel(n)}
          </option>
        ))}
      </select>
      {value && (
        <div className="mt-1 text-[10px] font-pixel" aria-live="polite">
          {value.increased && value.decreased ? (
            <span>
              <span className="text-[#38b764]">+{STAT_DISPLAY[value.increased]}</span>
              {" / "}
              <span className="text-[#e8433f]">-{STAT_DISPLAY[value.decreased]}</span>
            </span>
          ) : (
            <span className="text-[#8b9bb4]">(Neutral)</span>
          )}
        </div>
      )}
    </div>
  );
}
