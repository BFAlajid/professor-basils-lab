"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { usePokemonList } from "@/hooks/usePokemonList";
import { useWildEncounterContext } from "@/contexts/WildTabContext";
import { useShinyHunt, oddsFor } from "@/hooks/useShinyHunt";
import { formatName } from "@/utils/format";
import type { HuntMethod, ShinyHunt as ShinyHuntEntry } from "@/types/shinyHunt";
import type { Pokemon } from "@/types";
import PokemonSearch from "@/components/PokemonSearch";

type PickerMode = "start" | "switch" | "phase-shiny";

const METHODS: HuntMethod[] = ["full-odds", "masuda", "chain", "radar"];

const METHOD_LABELS: Record<HuntMethod, string> = {
  "full-odds": "Full Odds",
  masuda: "Masuda",
  chain: "Chain",
  radar: "Poké Radar",
};

const METHOD_HINTS: Record<HuntMethod, string> = {
  "full-odds": "No boosts — the game's real base rate.",
  masuda: "Breeding with a foreign-language parent, ~5x boost.",
  chain: "Odds improve the longer you find only your target.",
  radar: "Odds jump in big steps on long chains.",
};

function getSpriteUrl(id: number, shiny: boolean): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? "shiny/" : ""}${id}.png`;
}

function formatElapsed(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function SpeciesSprite({
  species,
  idByName,
  shiny,
  size = 48,
}: {
  species: string;
  idByName: Map<string, number>;
  shiny: boolean;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const id = idByName.get(species);

  if (!id || errored) {
    return (
      <div
        className="flex items-center justify-center bg-[#1a1c2c] rounded border border-[#3a4466] text-[#3a4466]"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <Image
      src={getSpriteUrl(id, shiny)}
      alt={shiny ? `Shiny ${species}` : species}
      width={size}
      height={size}
      unoptimized
      onError={() => setErrored(true)}
    />
  );
}

function MethodPicker({
  value,
  onChange,
}: {
  value: HuntMethod;
  onChange: (m: HuntMethod) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            aria-pressed={value === m}
            className={`rounded-lg border px-2 py-1.5 text-[10px] font-pixel transition-colors ${
              value === m
                ? "border-[#f7a838] text-[#f7a838] bg-[#f7a838]/10"
                : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
            }`}
          >
            {METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[9px] text-[#8b9bb4]">{METHOD_HINTS[value]}</p>
    </div>
  );
}

function HuntHistoryList({
  history,
  idByName,
}: {
  history: ShinyHuntEntry[];
  idByName: Map<string, number>;
}) {
  if (history.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wide mb-1.5">
        Hunt History
      </h4>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {history.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5"
          >
            <SpeciesSprite species={h.species} idByName={idByName} shiny={!!h.foundAt} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-pixel text-[#f0f0e8] truncate">
                {formatName(h.species)}{" "}
                <span className="text-[#8b9bb4]">({METHOD_LABELS[h.method]})</span>
              </p>
              <p className="text-[9px] text-[#8b9bb4]">
                {h.encounters} encounters · {formatElapsed(h.startedAt, h.foundAt)}
              </p>
            </div>
            <span
              className={`text-[9px] font-pixel ${h.foundAt ? "text-[#38b764]" : "text-[#8b9bb4]"}`}
            >
              {h.foundAt ? "Found!" : "Abandoned"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShinyHunt() {
  const { state, startHunt, recordEncounter, switchTarget, abandonHunt } = useShinyHunt();
  const { encounter } = useWildEncounterContext();
  const { data: pokemonList } = usePokemonList();

  const idByName = useMemo(() => {
    const map = new Map<string, number>();
    if (pokemonList) {
      for (const p of pokemonList) {
        const id = parseInt(p.url.replace(/\/$/, "").split("/").pop() ?? "", 10);
        if (!Number.isNaN(id)) map.set(p.name, id);
      }
    }
    return map;
  }, [pokemonList]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("start");
  const [pendingSpecies, setPendingSpecies] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<HuntMethod>("full-odds");
  const [justCompleted, setJustCompleted] = useState<ShinyHuntEntry | null>(null);

  // Detect a hunt completing (active -> null, with a freshly-found entry on
  // top of history) to show a one-time celebration overlay. Derived during
  // render (React's "adjust state during rendering" pattern) rather than in
  // an effect, so there's no cascading-render / double-fire risk — this only
  // reacts to state transitions the hook already made atomically, see
  // useShinyHunt.ts's recordEncounter for the guard against double-counting.
  const [prevActive, setPrevActive] = useState(state.active);
  if (state.active !== prevActive) {
    setPrevActive(state.active);
    if (prevActive && !state.active) {
      const top = state.history[0];
      if (top && top.id === prevActive.id && top.foundAt) {
        setJustCompleted(top);
      }
    }
  }

  const openPicker = useCallback((mode: PickerMode) => {
    setPickerMode(mode);
    setPendingSpecies(null);
    setPickerOpen(true);
  }, []);

  const handlePickerSelect = useCallback(
    (pokemon: Pokemon) => {
      if (pickerMode === "phase-shiny") {
        recordEncounter(pokemon.name, true);
      } else {
        setPendingSpecies(pokemon.name);
      }
    },
    [pickerMode, recordEncounter]
  );

  const confirmPending = useCallback(() => {
    if (!pendingSpecies) return;
    if (pickerMode === "switch") switchTarget(pendingSpecies, pendingMethod);
    else startHunt(pendingSpecies, pendingMethod);
    setPendingSpecies(null);
  }, [pendingSpecies, pendingMethod, pickerMode, startHunt, switchTarget]);

  const cancelPending = useCallback(() => setPendingSpecies(null), []);

  const liveEncounterAvailable =
    !!state.active &&
    !!encounter.wildPokemon &&
    (encounter.phase === "encounter_intro" ||
      encounter.phase === "battle" ||
      encounter.phase === "catching" ||
      encounter.phase === "catch_result");

  const logEncounter = useCallback(() => {
    if (!state.active) return;
    if (liveEncounterAvailable && encounter.wildPokemon) {
      recordEncounter(encounter.wildPokemon.name, encounter.isShiny);
    } else {
      recordEncounter(state.active.species, false);
    }
  }, [state.active, liveEncounterAvailable, encounter.wildPokemon, encounter.isShiny, recordEncounter]);

  const logTargetShinyManually = useCallback(() => {
    if (!state.active) return;
    recordEncounter(state.active.species, true);
  }, [state.active, recordEncounter]);

  const odds = state.active ? oddsFor(state.active.method, state.active.chain) : null;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <h3 className="text-sm font-pixel text-[#f0f0e8]">Shiny Hunting</h3>

      {/* State: celebration overlay — target just found */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-lg border border-[#f7a838] bg-[#f7a838]/10 p-3 text-center space-y-2"
            role="status"
            aria-live="polite"
          >
            <p className="text-[10px] font-pixel text-[#f7a838]">✨ Shiny Found! ✨</p>
            <div className="flex justify-center">
              <SpeciesSprite species={justCompleted.species} idByName={idByName} shiny size={64} />
            </div>
            <p className="text-xs font-pixel text-[#f0f0e8]">{formatName(justCompleted.species)}</p>
            <p className="text-[9px] text-[#8b9bb4]">
              Found after {justCompleted.encounters} encounters ({METHOD_LABELS[justCompleted.method]})
            </p>
            <button
              onClick={() => setJustCompleted(null)}
              className="text-[10px] font-pixel text-[#f7a838] border border-[#f7a838] rounded-lg px-3 py-1 hover:bg-[#f7a838]/10 transition-colors"
            >
              Nice!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State: active hunt */}
      {state.active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-2.5">
            <SpeciesSprite species={state.active.species} idByName={idByName} shiny size={48} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-pixel text-[#f0f0e8] truncate">
                {formatName(state.active.species)}
              </p>
              <p className="text-[9px] text-[#8b9bb4]">{METHOD_LABELS[state.active.method]}</p>
            </div>
            <div className="text-right" aria-live="polite">
              <p className="text-[10px] font-pixel text-[#f7a838]">1/{odds}</p>
              <p className="text-[9px] text-[#8b9bb4]">{state.active.encounters} encounters</p>
            </div>
          </div>

          {state.active.chain > 0 && (state.active.method === "chain" || state.active.method === "radar") && (
            <p className="text-[9px] text-[#8b9bb4] text-center">
              Chain: <span className="text-[#f7a838]">{state.active.chain}</span>
            </p>
          )}

          {liveEncounterAvailable && encounter.wildPokemon && (
            <div className="rounded-lg border border-[#4a90d9]/40 bg-[#4a90d9]/10 px-2.5 py-1.5 text-[9px] text-[#8b9bb4] text-center">
              Live encounter: <span className="text-[#f0f0e8]">{formatName(encounter.wildPokemon.name)}</span>
              {encounter.isShiny && <span className="text-[#f7a838]"> ✨ shiny!</span>}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={logEncounter}
            className="w-full rounded-lg border-2 border-[#e8433f] bg-[#e8433f]/10 py-3 text-xs font-pixel text-[#e8433f] hover:bg-[#e8433f]/20 transition-colors"
          >
            {liveEncounterAvailable ? "Log Wild Encounter" : "+1 Encounter"}
          </motion.button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={logTargetShinyManually}
              className="rounded-lg border border-[#f7a838] text-[#f7a838] text-[9px] font-pixel px-2 py-1.5 hover:bg-[#f7a838]/10 transition-colors"
            >
              Target found shiny!
            </button>
            <button
              onClick={() => openPicker("phase-shiny")}
              className="rounded-lg border border-[#3a4466] text-[#8b9bb4] text-[9px] font-pixel px-2 py-1.5 hover:text-[#f0f0e8] transition-colors"
            >
              Different shiny appeared
            </button>
          </div>

          {state.phases.length > 0 && (
            <div>
              <h4 className="text-[10px] font-pixel text-[#8b9bb4] uppercase tracking-wide mb-1.5">
                Phases
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {state.phases.map((p, i) => (
                  <div
                    key={`${p.species}-${p.encounterOfHunt}-${i}`}
                    className="flex items-center justify-between text-[9px] text-[#8b9bb4] rounded bg-[#1a1c2c] px-2 py-1"
                  >
                    <span className="text-[#f0f0e8]">{formatName(p.species)}</span>
                    <span>encounter #{p.encounterOfHunt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={() => openPicker("switch")}
              className="flex-1 rounded-lg border border-[#3a4466] text-[#8b9bb4] text-[9px] font-pixel px-2 py-1.5 hover:text-[#f0f0e8] transition-colors"
            >
              Switch Target
            </button>
            <button
              onClick={abandonHunt}
              className="flex-1 rounded-lg border border-[#3a4466] text-[#8b9bb4] text-[9px] font-pixel px-2 py-1.5 hover:text-[#e8433f] hover:border-[#e8433f] transition-colors"
            >
              Abandon Hunt
            </button>
          </div>
        </div>
      ) : pendingSpecies ? (
        /* State: target chosen, confirming method before starting */
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-2.5">
            <SpeciesSprite species={pendingSpecies} idByName={idByName} shiny size={48} />
            <p className="text-xs font-pixel text-[#f0f0e8]">{formatName(pendingSpecies)}</p>
          </div>
          <MethodPicker value={pendingMethod} onChange={setPendingMethod} />
          <div className="flex gap-1.5">
            <button
              onClick={confirmPending}
              className="flex-1 rounded-lg border-2 border-[#38b764] bg-[#38b764]/10 text-[#38b764] text-[10px] font-pixel px-2 py-2 hover:bg-[#38b764]/20 transition-colors"
            >
              {pickerMode === "switch" ? "Confirm Switch" : "Start Hunt"}
            </button>
            <button
              onClick={cancelPending}
              className="rounded-lg border border-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel px-3 py-2 hover:text-[#f0f0e8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* State: no active hunt (empty, or browsing history) */
        <div className="space-y-3">
          <p className="text-[10px] text-[#8b9bb4] text-center py-2">
            Pick a target species and a method, then hunt in the wild for that one special encounter.
          </p>
          <button
            onClick={() => openPicker("start")}
            className="w-full rounded-lg border-2 border-[#f7a838] bg-[#f7a838]/10 text-[#f7a838] text-xs font-pixel px-3 py-2.5 hover:bg-[#f7a838]/20 transition-colors"
          >
            Choose Target
          </button>
          <HuntHistoryList history={state.history} idByName={idByName} />
        </div>
      )}

      <PokemonSearch
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
