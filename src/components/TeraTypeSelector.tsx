"use client";

import { TypeName } from "@/types";
import { typeColors } from "@/data/typeColors";
import { TYPE_LIST } from "@/data/typeChart";

interface TeraTypeSelectorProps {
  value: TypeName | null;
  onChange: (type: TypeName) => void;
}

export default function TeraTypeSelector({ value, onChange }: TeraTypeSelectorProps) {
  return (
    <div>
      <h4 className="text-xs font-bold text-[#8b9bb4] mb-2 font-pixel">Tera Type</h4>
      <div className="grid grid-cols-6 gap-1.5">
        {TYPE_LIST.map((type) => {
          const color = typeColors[type];
          const isSelected = value === type;
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={`rounded px-1.5 py-1 text-[10px] font-medium capitalize transition-all ${
                isSelected ? "ring-2 ring-[#f0f0e8] scale-105" : "opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: color, color: "#fff" }}
            >
              {type}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="mt-1.5 text-[10px] text-[#8b9bb4]">
          Tera Type: <span className="capitalize font-bold" style={{ color: typeColors[value] }}>{value}</span>
        </p>
      )}
    </div>
  );
}
