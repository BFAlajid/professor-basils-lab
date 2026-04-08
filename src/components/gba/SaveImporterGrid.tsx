"use client";

import type { Gen3Pokemon } from "@/utils/gen3PokemonDecryptor";

interface PokemonPreview {
  gen3: Gen3Pokemon;
  selected: boolean;
  index: number;
  source: "party" | "box";
  boxIndex?: number;
}

interface SaveImporterGridProps {
  previews: PokemonPreview[];
  onToggle: (index: number) => void;
}

function PokemonCard({
  preview,
  onToggle,
}: {
  preview: PokemonPreview;
  onToggle: () => void;
}) {
  const { gen3 } = preview;
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${gen3.species}.png`;
  const nature = ["Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish", "Lax", "Timid", "Hasty", "Serious", "Jolly", "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", "Gentle", "Sassy", "Careful", "Quirky"][gen3.pid % 25];

  return (
    <button
      onClick={onToggle}
      className={`relative rounded-lg p-2 text-left transition-colors border ${
        preview.selected
          ? "border-[#e8433f] bg-[#e8433f]/10"
          : "border-[#3a4466] bg-[#262b44] hover:bg-[#2a3050]"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-1 right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
          preview.selected
            ? "border-[#e8433f] bg-[#e8433f] text-white"
            : "border-[#8b9bb4]"
        }`}
      >
        {preview.selected && "✓"}
      </div>

      {/* Sprite */}
      <div className="w-12 h-12 mx-auto">
        <img
          src={spriteUrl}
          alt={gen3.nickname}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          style={{ imageRendering: "pixelated" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Info */}
      <p className="text-[#f0f0e8] text-[10px] font-pixel truncate text-center">
        {gen3.nickname || `#${gen3.species}`}
      </p>
      <p className="text-[#8b9bb4] text-[9px] text-center">
        Lv.{gen3.level} {gen3.isShiny && "★"}
      </p>
      <p className="text-[#8b9bb4] text-[10px] text-center">{nature}</p>

      {/* IVs summary */}
      <div className="flex justify-center gap-0.5 mt-1">
        {Object.values(gen3.ivs).map((iv, i) => (
          <div
            key={i}
            className={`w-3 h-1 rounded-full ${
              iv >= 30 ? "bg-[#e8433f]" : iv >= 20 ? "bg-[#e8a33f]" : "bg-[#3a4466]"
            }`}
          />
        ))}
      </div>

      {preview.source === "box" && preview.boxIndex !== undefined && (
        <p className="text-[#8b9bb4] text-[10px] text-center mt-0.5">
          Box {preview.boxIndex + 1}
        </p>
      )}
    </button>
  );
}

export default function SaveImporterGrid({ previews, onToggle }: SaveImporterGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
      {previews.map((preview) => (
        <PokemonCard
          key={`${preview.source}-${preview.index}`}
          preview={preview}
          onToggle={() => onToggle(preview.index)}
        />
      ))}
      {previews.length === 0 && (
        <p className="col-span-full text-center text-[#8b9bb4] text-sm py-8">
          No Pokémon found
        </p>
      )}
    </div>
  );
}
