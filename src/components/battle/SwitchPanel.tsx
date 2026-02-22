"use client";

import Image from "next/image";
import { BattleTeam } from "@/types";
import HealthBar from "./HealthBar";
import StatusIcon from "./StatusIcon";

interface SwitchPanelProps {
  team: BattleTeam;
  onSwitch: (pokemonIndex: number) => void;
  forced: boolean;
  onCancel?: () => void;
}

export default function SwitchPanel({ team, onSwitch, forced, onCancel }: SwitchPanelProps) {
  const switchOptions = team.pokemon
    .map((p, i) => ({ pokemon: p, index: i }))
    .filter((p) => !p.pokemon.isFainted && p.index !== team.activePokemonIndex);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold font-pixel">
          {forced ? "Choose next Pokemon" : "Switch Pokemon"}
        </h4>
        {!forced && onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {switchOptions.length === 0 ? (
        <p className="text-sm text-[#8b9bb4]">No Pokemon available to switch in</p>
      ) : (
        <div className="space-y-2">
          {switchOptions.map(({ pokemon, index }) => {
            const sprite = pokemon.slot.pokemon.sprites.front_default;
            const hpPercent = Math.round((pokemon.currentHp / pokemon.maxHp) * 100);

            return (
              <button
                key={index}
                onClick={() => onSwitch(index)}
                className="flex w-full items-center gap-3 rounded-lg bg-[#1a1c2c] px-3 py-2 text-left hover:bg-[#3a4466] transition-colors"
              >
                {sprite && (
                  <Image
                    src={sprite}
                    alt={pokemon.slot.pokemon.name}
                    width={40}
                    height={40}
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize truncate font-pixel">
                      {pokemon.slot.pokemon.name}
                    </span>
                    <StatusIcon status={pokemon.status} />
                  </div>
                  <div className="mt-1 w-full">
                    <HealthBar current={pokemon.currentHp} max={pokemon.maxHp} />
                  </div>
                </div>
                <span className="text-xs text-[#8b9bb4] tabular-nums">{hpPercent}%</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
