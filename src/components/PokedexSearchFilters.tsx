"use client";

type FilterTab = "all" | "caught" | "seen" | "missing";

interface GenRange {
  label: string;
  start: number;
  end: number;
}

const GENERATIONS: GenRange[] = [
  { label: "Gen 1", start: 1, end: 151 },
  { label: "Gen 2", start: 152, end: 251 },
  { label: "Gen 3", start: 252, end: 386 },
  { label: "Gen 4", start: 387, end: 493 },
  { label: "Gen 5", start: 494, end: 649 },
  { label: "Gen 6", start: 650, end: 721 },
  { label: "Gen 7", start: 722, end: 809 },
  { label: "Gen 8", start: 810, end: 905 },
  { label: "Gen 9", start: 906, end: 1025 },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "caught", label: "Caught" },
  { key: "seen", label: "Seen" },
  { key: "missing", label: "Missing" },
];

interface PokedexSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  selectedGen: number | null;
  onGenChange: (gen: number | null) => void;
}

export type { FilterTab };
export { GENERATIONS };

export default function PokedexSearchFilters({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  selectedGen,
  onGenChange,
}: PokedexSearchFiltersProps) {
  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name or number..."
        className="mb-3 w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-4 py-2.5 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f] transition-colors"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-pixel transition-colors ${
              activeFilter === tab.key
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onGenChange(null)}
          className={`rounded px-2 py-1 text-[10px] font-pixel transition-colors ${
            selectedGen === null
              ? "bg-[#e8433f] text-[#f0f0e8]"
              : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
          }`}
        >
          All Gens
        </button>
        {GENERATIONS.map((gen, idx) => (
          <button
            key={gen.label}
            onClick={() => onGenChange(idx)}
            className={`rounded px-2 py-1 text-[10px] font-pixel transition-colors ${
              selectedGen === idx
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#1a1c2c] text-[#8b9bb4] hover:bg-[#3a4466] hover:text-[#f0f0e8]"
            }`}
            title={`${gen.start}-${gen.end}`}
          >
            {gen.label}
          </button>
        ))}
      </div>
    </div>
  );
}
