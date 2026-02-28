"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, Move } from "@/types";
import { fetchPokemonData, fetchMoveData } from "@/utils/pokeApiClient";

interface MoveTutorProps {
  team: TeamSlot[];
  heartScales: number;
  onTeachMove: (position: number, moveName: string) => void;
  onSpendHeartScale: () => boolean;
}

interface TutorMove {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  damageClass: string;
  learnMethod: string;
}

async function fetchAllMoves(pokemonName: string): Promise<TutorMove[]> {
  try {
    const data = await fetchPokemonData(pokemonName);

    const tutorMoves: TutorMove[] = [];
    const seen = new Set<string>();

    for (const entry of data.moves) {
      const moveName = entry.move.name as string;
      if (seen.has(moveName)) continue;

      // Get learn methods
      const methods = (entry.version_group_details ?? []).map(
        (d) => d.move_learn_method.name
      );

      // Include tutor, machine (TM/HM), and egg moves
      const isTutor = methods.includes("tutor");
      const isMachine = methods.includes("machine");
      const isEgg = methods.includes("egg");

      if (isTutor || isMachine || isEgg) {
        seen.add(moveName);
        tutorMoves.push({
          name: moveName,
          type: "",
          power: null,
          accuracy: null,
          damageClass: "",
          learnMethod: isTutor ? "Tutor" : isMachine ? "TM" : "Egg",
        });
      }
    }

    // Fetch move details for the first 40 (avoid too many requests)
    const toFetch = tutorMoves.slice(0, 40);
    const details = await Promise.allSettled(
      toFetch.map(async (m) => {
        try {
          const moveData = await fetchMoveData(m.name);
          return {
            ...m,
            type: moveData.type?.name ?? "",
            power: moveData.power,
            accuracy: moveData.accuracy,
            damageClass: moveData.damage_class?.name ?? "",
          };
        } catch {
          return m;
        }
      })
    );

    return details
      .filter((r): r is PromiseFulfilledResult<TutorMove> => r.status === "fulfilled")
      .map((r) => r.value);
  } catch {
    return [];
  }
}

export default function MoveTutor({ team, heartScales, onTeachMove, onSpendHeartScale }: MoveTutorProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [moves, setMoves] = useState<TutorMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [taught, setTaught] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPokemon === null) return;
    const pokemon = team[selectedPokemon]?.pokemon;
    if (!pokemon) return;

    setLoading(true);
    setMoves([]);
    fetchAllMoves(pokemon.name).then((m) => {
      // Filter out moves already known
      const known = new Set(team[selectedPokemon]?.selectedMoves ?? []);
      setMoves(m.filter((move) => !known.has(move.name)));
      setLoading(false);
    });
  }, [selectedPokemon, team]);

  const handleTeach = useCallback((moveName: string) => {
    if (selectedPokemon === null) return;
    if (!onSpendHeartScale()) return;
    onTeachMove(selectedPokemon, moveName);
    setTaught(moveName);
    setTimeout(() => setTaught(null), 1500);
    // Remove from list
    setMoves((prev) => prev.filter((m) => m.name !== moveName));
  }, [selectedPokemon, onTeachMove, onSpendHeartScale]);

  const filteredMoves = moves.filter((m) =>
    m.name.replace(/-/g, " ").toLowerCase().includes(filter.toLowerCase())
  );

  const typeColors: Record<string, string> = {
    normal: "#a8a878", fire: "#f08030", water: "#6890f0", electric: "#f8d030",
    grass: "#78c850", ice: "#98d8d8", fighting: "#c03028", poison: "#a040a0",
    ground: "#e0c068", flying: "#a890f0", psychic: "#f85888", bug: "#a8b820",
    rock: "#b8a038", ghost: "#705898", dragon: "#7038f8", dark: "#705848",
    steel: "#b8b8d0", fairy: "#ee99ac",
  };

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-sm text-[#f0f0e8]">Move Tutor</h3>
        <div className="font-pixel text-[9px] text-[#f7a838]">
          Heart Scales: {heartScales}
        </div>
      </div>

      {/* Select Pokemon */}
      {selectedPokemon === null && (
        <div>
          <p className="font-pixel text-[9px] text-[#8b9bb4] mb-2">Choose a Pokemon to teach moves:</p>
          <div className="grid grid-cols-3 gap-2">
            {team.map((slot, i) => (
              <button
                key={i}
                onClick={() => setSelectedPokemon(i)}
                className="rounded-lg border border-[#3a4466] bg-[#262b44] p-2 text-center hover:border-[#f7a838] transition-colors"
              >
                <p className="font-pixel text-[10px] text-[#f0f0e8] capitalize truncate">
                  {slot.pokemon.name.replace(/-/g, " ")}
                </p>
                <p className="font-pixel text-[8px] text-[#8b9bb4]">
                  {(slot.selectedMoves ?? []).length}/4 moves
                </p>
              </button>
            ))}
          </div>
          {team.length === 0 && (
            <p className="font-pixel text-[9px] text-[#8b9bb4] text-center py-4">
              Add Pokemon to your team first!
            </p>
          )}
        </div>
      )}

      {/* Move list */}
      {selectedPokemon !== null && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-[10px] text-[#f0f0e8] capitalize">
              {team[selectedPokemon]?.pokemon.name.replace(/-/g, " ")}
            </p>
            <button
              onClick={() => { setSelectedPokemon(null); setFilter(""); }}
              className="font-pixel text-[8px] text-[#8b9bb4] hover:text-[#f0f0e8]"
            >
              Back
            </button>
          </div>

          {/* Current moves */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {(team[selectedPokemon]?.selectedMoves ?? []).map((m) => (
              <span key={m} className="font-pixel text-[7px] text-[#f0f0e8] bg-[#3a4466] px-1.5 py-0.5 rounded capitalize">
                {m.replace(/-/g, " ")}
              </span>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search moves..."
            className="w-full mb-2 px-2 py-1 text-[9px] font-pixel rounded border border-[#3a4466] bg-[#262b44] text-[#f0f0e8] outline-none focus:border-[#f7a838]"
          />

          {loading ? (
            <p className="font-pixel text-[9px] text-[#8b9bb4] text-center py-4 animate-pulse">
              Loading available moves...
            </p>
          ) : (
            <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
              <AnimatePresence>
                {filteredMoves.map((move) => {
                  const currentMoves = team[selectedPokemon]?.selectedMoves ?? [];
                  const isFull = currentMoves.length >= 4;
                  const noScales = heartScales <= 0;

                  return (
                    <motion.div
                      key={move.name}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        backgroundColor: taught === move.name ? "#38b76430" : "#262b44",
                      }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-[#3a4466] p-2 flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-pixel text-[9px] text-[#f0f0e8] capitalize">
                            {move.name.replace(/-/g, " ")}
                          </span>
                          {move.type && (
                            <span
                              className="font-pixel text-[7px] px-1 rounded text-white"
                              style={{ backgroundColor: typeColors[move.type] ?? "#888" }}
                            >
                              {move.type}
                            </span>
                          )}
                          <span className="font-pixel text-[7px] text-[#8b9bb4]">
                            {move.learnMethod}
                          </span>
                        </div>
                        <div className="flex gap-2 font-pixel text-[7px] text-[#8b9bb4]">
                          {move.power && <span>Pwr: {move.power}</span>}
                          {move.accuracy && <span>Acc: {move.accuracy}</span>}
                          {move.damageClass && <span className="capitalize">{move.damageClass}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTeach(move.name)}
                        disabled={isFull || noScales}
                        className="px-2 py-0.5 text-[8px] font-pixel rounded bg-[#4a90d9] text-[#f0f0e8] hover:bg-[#3a7dc4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        {isFull ? "Full" : noScales ? "No Scales" : "Teach (1)"}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredMoves.length === 0 && !loading && (
                <p className="font-pixel text-[9px] text-[#8b9bb4] text-center py-2">
                  No available moves found.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
