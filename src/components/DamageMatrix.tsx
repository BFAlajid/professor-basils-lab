"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { TeamSlot, Pokemon, Move } from "@/types";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import { calculateDamage, extractBaseStats } from "@/utils/damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import LoadingSpinner from "./LoadingSpinner";
import TypeBadge from "./TypeBadge";

interface DamageMatrixProps {
  team: TeamSlot[];
}

interface ThreatEntry {
  pokemon: Pokemon;
  moves: Move[];
}

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchMoveData(moveName: string): Promise<Move> {
  const res = await fetch(
    `https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`
  );
  if (!res.ok) throw new Error(`Move "${moveName}" not found`);
  return res.json();
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

export default function DamageMatrix({ team }: DamageMatrixProps) {
  const [threats, setThreats] = useState<ThreatEntry[]>([]);
  const [threatSearch, setThreatSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingThreat, setLoadingThreat] = useState(false);
  const [teamMoves, setTeamMoves] = useState<Map<number, Move[]>>(new Map());
  const [movesLoading, setMovesLoading] = useState(false);

  const { data: pokemonList } = usePokemonList();

  const filteredResults = useMemo(() => {
    if (!pokemonList || !threatSearch) return [];
    return pokemonList
      .filter((p) => p.name.includes(threatSearch.toLowerCase()))
      .slice(0, 8);
  }, [pokemonList, threatSearch]);

  // Load moves for team members that haven't been loaded yet
  const ensureTeamMoves = useCallback(async () => {
    const missing = team.filter(
      (s) => !teamMoves.has(s.pokemon.id) && s.selectedMoves && s.selectedMoves.length > 0
    );
    if (missing.length === 0) return;

    setMovesLoading(true);
    const newMap = new Map(teamMoves);

    for (const slot of missing) {
      if (!slot.selectedMoves) continue;
      try {
        const moves = await Promise.all(
          slot.selectedMoves.map((m) => fetchMoveData(m))
        );
        newMap.set(slot.pokemon.id, moves);
      } catch {
        newMap.set(slot.pokemon.id, []);
      }
    }

    setTeamMoves(newMap);
    setMovesLoading(false);
  }, [team, teamMoves]);

  const handleAddThreat = async (name: string) => {
    if (threats.some((t) => t.pokemon.name === name)) return;

    setLoadingThreat(true);
    setShowDropdown(false);
    setThreatSearch("");

    try {
      await ensureTeamMoves();
      const pokemon = await fetchPokemon(name);
      setThreats((prev) => [...prev, { pokemon, moves: [] }]);
    } catch {
      // ignore
    } finally {
      setLoadingThreat(false);
    }
  };

  const handleRemoveThreat = (index: number) => {
    setThreats((prev) => prev.filter((_, i) => i !== index));
  };

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4] font-pixel">
        Add Pokemon to your team to use the damage matrix.
      </div>
    );
  }

  const hasMovesConfigured = team.some(
    (s) => s.selectedMoves && s.selectedMoves.length > 0
  );

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 font-pixel">
      <h3 className="text-sm font-bold text-[#f0f0e8] mb-3">Damage Matrix</h3>

      {!hasMovesConfigured && (
        <div className="rounded-lg border border-[#f7a838]/30 bg-[#f7a838]/10 p-3 text-xs text-[#f7a838] mb-3">
          Configure moves on your team members to see damage calculations.
        </div>
      )}

      {/* Threat search */}
      <div className="relative mb-4">
        <label className="block text-xs text-[#8b9bb4] mb-1">Add Threat</label>
        <input
          type="text"
          value={threatSearch}
          onChange={(e) => {
            setThreatSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search Pokemon to add..."
          className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f]"
          aria-label="Search for a threat Pokemon"
        />
        {showDropdown && filteredResults.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-48 overflow-y-auto">
            {filteredResults.map((p) => (
              <button
                key={p.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddThreat(p.name)}
                className="w-full px-3 py-2 text-left text-sm capitalize hover:bg-[#3a4466] transition-colors text-[#f0f0e8]"
              >
                {p.name.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        )}
        {loadingThreat && (
          <div className="absolute right-3 top-7">
            <LoadingSpinner size={16} />
          </div>
        )}
      </div>

      {/* Threat tags */}
      {threats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {threats.map((t, i) => (
            <span
              key={t.pokemon.id}
              className="flex items-center gap-1 rounded-full bg-[#1a1c2c] border border-[#3a4466] pl-2 pr-1 py-0.5 text-[10px] text-[#f0f0e8]"
            >
              <span className="capitalize">{formatName(t.pokemon.name)}</span>
              <button
                onClick={() => handleRemoveThreat(i)}
                className="w-4 h-4 rounded-full hover:bg-[#e8433f]/30 flex items-center justify-center text-[#8b9bb4] hover:text-[#e8433f] transition-colors"
                aria-label={`Remove ${formatName(t.pokemon.name)} from threats`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Matrix grid */}
      {threats.length > 0 && hasMovesConfigured && (
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
      )}

      {threats.length === 0 && (
        <p className="text-xs text-[#8b9bb4] text-center py-4">
          Search and add threat Pokemon above to build the damage matrix.
        </p>
      )}

      {movesLoading && (
        <div className="flex items-center justify-center gap-2 py-3">
          <LoadingSpinner size={16} />
          <span className="text-xs text-[#8b9bb4]">Loading move data...</span>
        </div>
      )}

      {/* Legend */}
      {threats.length > 0 && (
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#8b9bb4]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#38b764]" />
            OHKO (100%+)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#f7a838]" />
            2HKO (50-99%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#e8433f]" />
            3HKO+ (&lt;50%)
          </span>
        </div>
      )}
    </div>
  );
}
