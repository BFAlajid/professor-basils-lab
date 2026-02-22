"use client";

import { useState, useEffect } from "react";
import { Pokemon } from "@/types";
import { getKnownVariants, formatFormeName } from "@/data/formes";

interface FormeSelectorProps {
  pokemon: Pokemon;
  value: string | null;
  onChange: (forme: string | null) => void;
}

export default function FormeSelector({ pokemon, value, onChange }: FormeSelectorProps) {
  const [formes, setFormes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // First check curated list
    const known = getKnownVariants(pokemon.name);
    if (known.length > 0) {
      setFormes(known);
      return;
    }

    // Then try PokeAPI species endpoint
    setLoading(true);
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.varieties) {
          const variants = data.varieties
            .filter((v: any) => !v.is_default)
            .map((v: any) => v.pokemon.name);
          setFormes(variants);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pokemon.id, pokemon.name]);

  if (formes.length === 0 && !loading) return null;

  return (
    <div>
      <h4 className="text-xs font-bold text-[#8b9bb4] mb-2 font-pixel">Alternate Forme</h4>
      {loading ? (
        <span className="text-[10px] text-[#8b9bb4]">Loading formes...</span>
      ) : (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8]"
        >
          <option value="">Default</option>
          {formes.map((f) => (
            <option key={f} value={f}>
              {formatFormeName(f)}
            </option>
          ))}
        </select>
      )}
      {value && (
        <p className="mt-1 text-[10px] text-[#8b9bb4]">
          Forme applied in battle
        </p>
      )}
    </div>
  );
}
