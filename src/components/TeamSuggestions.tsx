"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, Pokemon, TypeName } from "@/types";
import { suggestTeamFillers, ScoredCandidate } from "@/utils/teamSuggestionWasm";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { capitalize } from "@/utils/format";
import { typeColors } from "@/data/typeColors";
import TypeBadge from "./TypeBadge";

/** Gen 1-3 competitive Pokemon (fully evolved, broadly useful). */
const CANDIDATE_IDS = [
  3, 6, 9, 12, 15, 18, 20, 22, 24, 26, 28, 31, 34, 36, 38, 40, 42, 45,
  47, 49, 51, 53, 55, 57, 59, 62, 65, 68, 71, 73, 76, 78, 80, 82, 83,
  85, 87, 89, 91, 94, 95, 97, 99, 101, 103, 105, 106, 107, 108, 110,
  112, 113, 114, 115, 117, 119, 121, 122, 123, 124, 125, 126, 127, 128,
  130, 131, 134, 135, 136, 137, 139, 141, 142, 143, 144, 145, 146, 149,
  150, 151,
  // Gen 2
  154, 157, 160, 162, 164, 168, 169, 171, 176, 178, 181, 182, 184, 185,
  186, 189, 192, 195, 196, 197, 199, 201, 202, 203, 205, 206, 208, 210,
  211, 212, 213, 214, 217, 219, 221, 222, 224, 225, 226, 227, 229, 230,
  232, 233, 234, 237, 241, 242, 243, 244, 245, 248, 249, 250, 251,
  // Gen 3
  254, 257, 260, 262, 264, 267, 269, 272, 275, 277, 279, 282, 284, 286,
  289, 291, 292, 295, 297, 299, 301, 302, 303, 306, 308, 310, 312, 314,
  317, 319, 321, 323, 324, 326, 327, 330, 332, 334, 335, 336, 337, 338,
  340, 342, 344, 346, 348, 350, 351, 354, 356, 357, 358, 359, 362, 365,
  368, 369, 370, 373, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
];

interface TeamSuggestionsProps {
  team: TeamSlot[];
  onAddPokemon?: (pokemon: Pokemon) => void;
}

export default function TeamSuggestions({ team, onAddPokemon }: TeamSuggestionsProps) {
  const [candidatePool, setCandidatePool] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  const loadCandidates = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        CANDIDATE_IDS.map((id) => fetchPokemonData(id))
      );
      const pokemon = results
        .filter((r): r is PromiseFulfilledResult<Pokemon> => r.status === "fulfilled")
        .map((r) => r.value);
      setCandidatePool(pokemon);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  // Auto-load when section is expanded
  useEffect(() => {
    if (expanded && !loaded && !loading) {
      loadCandidates();
    }
  }, [expanded, loaded, loading, loadCandidates]);

  const suggestions = useMemo(() => {
    if (candidatePool.length === 0) return [];
    return suggestTeamFillers(team, candidatePool, 5);
  }, [team, candidatePool]);

  if (team.length >= 6) return null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
        aria-controls="team-suggestions-panel"
      >
        <h4 className="text-sm font-bold text-[#f0f0e8] font-pixel">
          Auto Team Filler
        </h4>
        <span className="text-xs text-[#8b9bb4] font-pixel">
          {expanded ? "Hide" : "Show suggestions"}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            id="team-suggestions-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loading && (
              <p className="mt-4 text-xs text-[#8b9bb4] font-pixel animate-pulse">
                Loading candidate Pokemon...
              </p>
            )}

            {loaded && suggestions.length === 0 && (
              <p className="mt-4 text-xs text-[#8b9bb4] font-pixel">
                {team.length === 0
                  ? "Add Pokemon to your team to get suggestions."
                  : "Your team has great coverage! No strong suggestions."}
              </p>
            )}

            {loaded && suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-[#8b9bb4] mb-2">
                  Pokemon that best fill your team&apos;s defensive gaps:
                </p>
                {suggestions.map((candidate, idx) => (
                  <SuggestionRow
                    key={candidate.pokemon.id}
                    candidate={candidate}
                    rank={idx + 1}
                    isHighlighted={highlightedIdx === idx}
                    onHover={() => setHighlightedIdx(idx)}
                    onLeave={() => setHighlightedIdx(null)}
                    onAdd={onAddPokemon}
                    teamIsFull={team.length >= 6}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionRow({
  candidate,
  rank,
  isHighlighted,
  onHover,
  onLeave,
  onAdd,
  teamIsFull,
}: {
  candidate: ScoredCandidate;
  rank: number;
  isHighlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
  onAdd?: (pokemon: Pokemon) => void;
  teamIsFull: boolean;
}) {
  const { pokemon, score, resistsWeaknesses, addsOffensiveCoverage } = candidate;
  const spriteUrl =
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default;

  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
        isHighlighted
          ? "border-[#e8433f] bg-[#1a1c2c]"
          : "border-[#3a4466] bg-[#1a1c2c]/50"
      }`}
    >
      {/* Rank */}
      <span className="w-5 text-center text-xs font-bold text-[#8b9bb4] font-pixel">
        {rank}
      </span>

      {/* Sprite */}
      <div className="relative h-10 w-10 flex-shrink-0">
        {spriteUrl ? (
          <img
            src={spriteUrl}
            alt={pokemon.name}
            className="h-10 w-10 object-contain"
            style={{ imageRendering: "pixelated" }}
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#3a4466] text-[10px] text-[#8b9bb4]">
            ?
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#f0f0e8] font-pixel truncate">
            {capitalize(pokemon.name)}
          </span>
          <div className="flex gap-1">
            {pokemon.types.map((t) => (
              <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
            ))}
          </div>
          <span className="ml-auto text-[10px] font-pixel text-[#f7a838] flex-shrink-0">
            +{score}
          </span>
        </div>

        {/* Breakdown */}
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-[#8b9bb4]">
          {resistsWeaknesses.length > 0 && (
            <span>
              Resists:{" "}
              {resistsWeaknesses.map((t, i) => (
                <span key={t}>
                  {i > 0 && ", "}
                  <span style={{ color: typeColors[t as TypeName] }}>
                    {capitalize(t)}
                  </span>
                </span>
              ))}
            </span>
          )}
          {addsOffensiveCoverage.length > 0 && (
            <span>
              Hits:{" "}
              {addsOffensiveCoverage.map((t, i) => (
                <span key={t}>
                  {i > 0 && ", "}
                  <span style={{ color: typeColors[t as TypeName] }}>
                    {capitalize(t)}
                  </span>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Add button */}
      {onAdd && !teamIsFull && (
        <button
          type="button"
          onClick={() => onAdd(pokemon)}
          className="flex-shrink-0 rounded-lg bg-[#3a4466] px-2 py-1 text-[10px] font-pixel text-[#f0f0e8] hover:bg-[#e8433f] transition-colors"
          aria-label={`Add ${pokemon.name} to team`}
        >
          Add
        </button>
      )}
    </motion.div>
  );
}
