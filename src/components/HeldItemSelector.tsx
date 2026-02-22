"use client";

import { useState, useMemo } from "react";
import { HELD_ITEMS } from "@/data/heldItems";

interface HeldItemSelectorProps {
  value: string | null;
  onChange: (item: string) => void;
}

export default function HeldItemSelector({ value, onChange }: HeldItemSelectorProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(
    () => HELD_ITEMS.find((i) => i.name === value),
    [value]
  );

  const filtered = useMemo(() => {
    if (!search) return HELD_ITEMS;
    const q = search.toLowerCase();
    return HELD_ITEMS.filter(
      (i) => i.displayName.toLowerCase().includes(q) || i.effect.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b9bb4]">Held Item</label>
      <div className="relative">
        <input
          type="text"
          value={open ? search : selectedItem?.displayName ?? ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search items..."
          className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f]"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-40 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#3a4466] transition-colors ${
                  value === item.name ? "bg-[#3a4466]" : ""
                }`}
              >
                <span className="text-[#f0f0e8]">{item.displayName}</span>
                <span className="ml-2 text-[10px] text-[#8b9bb4]">{item.effect}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedItem && !open && (
        <p className="mt-1 text-[10px] text-[#8b9bb4]">{selectedItem.effect}</p>
      )}
    </div>
  );
}
