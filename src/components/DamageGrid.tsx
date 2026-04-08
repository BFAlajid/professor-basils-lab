"use client";

import { motion } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot, Pokemon, Move } from "@/types";
import { calculateDamage, extractBaseStats } from "@/utils/damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import { formatName } from "@/utils/format";

interface ThreatEntry {
  pokemon: Pokemon;
  moves: Move[];
}

interface DamageGridProps {
  team: TeamSlot[];
  threats: ThreatEntry[];
  teamMoves: Map<number, Move[]>;
}

function calcBestDamagePercent(
  attacker: TeamSlot,
  defender: Pokemon,
  attackerMoves: Move[]
): { percent: number; moveName: string } {
  const defenderBase = extractBaseStats(defender);
  const defenderStats = calculateAllStats(defenderBase, DEFAULT_IVS, DEFAULT_EVS, null);
  const defenderMaxHp = defenderStats.hp;

  let bestPercent = 0;
  let bestMoveName = "";

  for (const move of attackerMoves) {
    if (!move.power || move.damage_class.name === "status") continue;

    const result = calculateDamage(attacker.pokemon, defender, move, {
      attackerEvs: attacker.evs ?? DEFAULT_EVS,
      attackerIvs: attacker.ivs ?? DEFAULT_IVS,
      attackerNature: attacker.nature ?? null,
      attackerItem: attacker.heldItem ?? null,
      defenderEvs: DEFAULT_EVS,
      defenderIvs: DEFAULT_IVS,
      defenderNature: null,
    });

    const pct = defenderMaxHp > 0 ? (result.max / defenderMaxHp) * 100 : 0;
    if (pct > bestPercent) {
      bestPercent = pct;
      bestMoveName = move.name;
    }
  }

  return { percent: Math.round(bestPercent), moveName: bestMoveName };
}

function getDamageColor(percent: number): string {
  if (percent >= 100) return "#38b764";
  if (percent >= 50) return "#f7a838";
  return "#e8433f";
}

function getDamageLabel(percent: number): string {
  if (percent >= 100) return "OHKO";
  if (percent >= 50) return "2HKO";
  return "3HKO+";
}

export default function DamageGrid({ team, threats, teamMoves }: DamageGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="text-left text-[#8b9bb4] px-2 py-1.5 border-b border-[#3a4466] min-w-[100px]">
              Attacker
            </th>
            {threats.map((t) => (
              <th
                key={t.pokemon.id}
                className="text-center text-[#8b9bb4] px-2 py-1.5 border-b border-[#3a4466] min-w-[80px]"
              >
                <div className="flex flex-col items-center gap-0.5">
                  {t.pokemon.sprites.front_default && (
                    <Image
                      src={t.pokemon.sprites.front_default}
                      alt={t.pokemon.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="pixelated"
                    />
                  )}
                  <span className="capitalize text-[10px] truncate max-w-[70px]">
                    {formatName(t.pokemon.name)}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.map((slot) => {
            const moves = teamMoves.get(slot.pokemon.id) ?? [];
            const hasMoves =
              slot.selectedMoves && slot.selectedMoves.length > 0;

            return (
              <tr key={slot.pokemon.id}>
                <td className="px-2 py-1.5 border-b border-[#3a4466]/40">
                  <div className="flex items-center gap-1.5">
                    {slot.pokemon.sprites.front_default && (
                      <Image
                        src={slot.pokemon.sprites.front_default}
                        alt={slot.pokemon.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="pixelated"
                      />
                    )}
                    <span className="capitalize text-[#f0f0e8] truncate">
                      {formatName(slot.pokemon.name)}
                    </span>
                  </div>
                </td>
                {threats.map((threat) => {
                  if (!hasMoves || moves.length === 0) {
                    return (
                      <td
                        key={threat.pokemon.id}
                        className="text-center px-2 py-1.5 border-b border-[#3a4466]/40 text-[#8b9bb4]"
                      >
                        --
                      </td>
                    );
                  }

                  const { percent, moveName } = calcBestDamagePercent(
                    slot,
                    threat.pokemon,
                    moves
                  );

                  return (
                    <td
                      key={threat.pokemon.id}
                      className="text-center px-2 py-1.5 border-b border-[#3a4466]/40"
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-0.5"
                        title={`${formatName(moveName)}: ${percent}% of max HP`}
                      >
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: getDamageColor(percent) }}
                        >
                          {percent}%
                        </span>
                        <span
                          className="text-[9px] font-bold uppercase"
                          style={{ color: getDamageColor(percent) }}
                        >
                          {getDamageLabel(percent)}
                        </span>
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
