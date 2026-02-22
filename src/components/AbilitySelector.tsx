"use client";

import { Pokemon } from "@/types";
import { useAbility, getAbilityShortEffect } from "@/hooks/useAbility";

interface AbilitySelectorProps {
  pokemon: Pokemon;
  value: string | null;
  onChange: (ability: string) => void;
}

export default function AbilitySelector({ pokemon, value, onChange }: AbilitySelectorProps) {
  const abilities = pokemon.abilities ?? [];
  const { data: abilityData } = useAbility(value);

  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b9bb4]">Ability</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] outline-none focus:border-[#e8433f]"
      >
        <option value="">Select ability...</option>
        {abilities.map((a) => (
          <option key={a.ability.name} value={a.ability.name}>
            {a.ability.name.replace(/-/g, " ")}{a.is_hidden ? " (Hidden)" : ""}
          </option>
        ))}
      </select>
      {abilityData && (
        <p className="mt-1 text-[10px] text-[#8b9bb4] leading-tight">
          {getAbilityShortEffect(abilityData)}
        </p>
      )}
    </div>
  );
}
