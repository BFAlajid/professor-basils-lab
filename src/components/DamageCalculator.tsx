"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Pokemon, Move } from "@/types";
import { useMove } from "@/hooks/useMove";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import { calculateDamage, getEffectivenessText } from "@/utils/damageWasm";
import LoadingSpinner from "./LoadingSpinner";
import TypeBadge from "./TypeBadge";

interface DamageCalculatorProps {
  team: Pokemon[];
}

export default function DamageCalculator({ team }: DamageCalculatorProps) {
  const [attacker, setAttacker] = useState<Pokemon | null>(null);
  const [defender, setDefender] = useState<Pokemon | null>(null);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [defenderSearch, setDefenderSearch] = useState("");
  const [defenderLoading, setDefenderLoading] = useState(false);
  const [defenderResults, setDefenderResults] = useState<
    { name: string; url: string }[]
  >([]);
  const [showDefenderDropdown, setShowDefenderDropdown] = useState(false);

  const { data: pokemonList } = usePokemonList();
  const { data: moveData, isLoading: moveLoading } = useMove(selectedMove);

  // Debounced defender search
  const filteredDefenders = useMemo(() => {
    if (!pokemonList || !defenderSearch) return [];
    return pokemonList
      .filter((p) => p.name.includes(defenderSearch.toLowerCase()))
      .slice(0, 8);
  }, [pokemonList, defenderSearch]);

  const handleDefenderSelect = async (name: string) => {
    setDefenderLoading(true);
    setShowDefenderDropdown(false);
    setDefenderSearch(name);
    try {
      const pokemon = await fetchPokemon(name);
      setDefender(pokemon);
      setSelectedMove(null);
    } catch {
      // not found
    } finally {
      setDefenderLoading(false);
    }
  };

  const attackerMoves = useMemo(() => {
    if (!attacker) return [];
    return attacker.moves.slice(0, 50).map((m) => m.move.name);
  }, [attacker]);

  const damageResult = useMemo(() => {
    if (!attacker || !defender || !moveData) return null;
    return calculateDamage(attacker, defender, moveData);
  }, [attacker, defender, moveData]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to your team to use the damage calculator
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
      <h3 className="mb-4 text-lg font-bold font-pixel">Damage Calculator</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Attacker */}
        <div>
          <label className="mb-2 block text-sm text-[#8b9bb4]">Attacker</label>
          <div className="space-y-2">
            {team.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setAttacker(p);
                  setSelectedMove(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  attacker?.id === p.id
                    ? "bg-[#e8433f] text-[#f0f0e8]"
                    : "bg-[#1a1c2c] hover:bg-[#3a4466]"
                }`}
              >
                {p.sprites.front_default && (
                  <Image
                    src={p.sprites.front_default}
                    alt={p.name}
                    width={32}
                    height={32}
                    unoptimized
                  />
                )}
                <span className="capitalize">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Move */}
        <div>
          <label className="mb-2 block text-sm text-[#8b9bb4]">Move</label>
          {attacker ? (
            <select
              value={selectedMove ?? ""}
              onChange={(e) => setSelectedMove(e.target.value || null)}
              className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] outline-none focus:border-[#e8433f]"
            >
              <option value="">Select a move...</option>
              {attackerMoves.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-[#8b9bb4]">Select an attacker first</p>
          )}

          {moveData && (
            <div className="mt-3 space-y-1 text-xs text-[#8b9bb4]">
              <div className="flex items-center gap-2">
                <TypeBadge type={moveData.type.name} size="sm" />
                <span className="capitalize">{moveData.damage_class.name}</span>
              </div>
              <p>Power: {moveData.power ?? "—"}</p>
            </div>
          )}
          {moveLoading && <LoadingSpinner size={20} />}
        </div>

        {/* Defender */}
        <div>
          <label className="mb-2 block text-sm text-[#8b9bb4]">Defender</label>
          <div className="relative">
            <input
              type="text"
              value={defenderSearch}
              onChange={(e) => {
                setDefenderSearch(e.target.value);
                setShowDefenderDropdown(true);
              }}
              onFocus={() => setShowDefenderDropdown(true)}
              placeholder="Search any Pokemon..."
              className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-sm text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f]"
            />
            {showDefenderDropdown && filteredDefenders.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-48 overflow-y-auto">
                {filteredDefenders.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleDefenderSelect(p.name)}
                    className="w-full px-3 py-2 text-left text-sm capitalize hover:bg-[#3a4466] transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {defenderLoading && (
            <div className="mt-2">
              <LoadingSpinner size={20} />
            </div>
          )}
          {defender && (
            <div className="mt-3 flex items-center gap-2">
              {defender.sprites.front_default && (
                <Image
                  src={defender.sprites.front_default}
                  alt={defender.name}
                  width={48}
                  height={48}
                  unoptimized
                />
              )}
              <div>
                <p className="capitalize font-medium">{defender.name}</p>
                <div className="flex gap-1">
                  {defender.types.map((t) => (
                    <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {damageResult && attacker && defender && moveData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-4"
          >
            {damageResult.max === 0 ? (
              <p className="text-[#8b9bb4]">
                {moveData.damage_class.name === "status"
                  ? "Status moves don't deal direct damage."
                  : `${getEffectivenessText(damageResult.effectiveness)}`}
              </p>
            ) : (
              <p className="text-sm">
                <span className="capitalize font-semibold text-[#f0f0e8]">
                  {attacker.name}
                </span>
                &apos;s{" "}
                <span className="capitalize font-semibold text-[#f0f0e8]">
                  {moveData.name.replace(/-/g, " ")}
                </span>{" "}
                deals{" "}
                <span className="font-bold text-[#e8433f]">
                  {damageResult.min}-{damageResult.max}
                </span>{" "}
                damage to{" "}
                <span className="capitalize font-semibold text-[#f0f0e8]">
                  {defender.name}
                </span>{" "}
                <span
                  className={`font-semibold ${
                    damageResult.effectiveness > 1
                      ? "text-[#38b764]"
                      : damageResult.effectiveness < 1
                      ? "text-[#e8433f]"
                      : "text-[#8b9bb4]"
                  }`}
                >
                  ({getEffectivenessText(damageResult.effectiveness)})
                </span>
                {damageResult.stab && (
                  <span className="ml-1 text-xs text-[#f7a838]">[STAB]</span>
                )}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
