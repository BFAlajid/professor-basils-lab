"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { parseGen3SaveWasm, ensureWasmReady } from "@/utils/gen3ParserWasm";
import type { Gen3SaveData } from "@/utils/gen3SaveParser";
import { mapGen3PokemonBatch } from "@/utils/gen3ToAppMapper";
import type { Gen3Pokemon } from "@/utils/gen3PokemonDecryptor";
import type { PCBoxPokemon } from "@/types";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import SaveImporterGrid from "./SaveImporterGrid";

interface SaveImporterProps {
  saveData: Uint8Array;
  onImport: (pokemon: PCBoxPokemon) => void;
  onClose: () => void;
}

interface PokemonPreview {
  gen3: Gen3Pokemon;
  selected: boolean;
  index: number;
  source: "party" | "box";
  boxIndex?: number;
}

export default function SaveImporter({ saveData, onImport, onClose }: SaveImporterProps) {
  const { markCaught } = usePokedexContext();
  const { incrementStat, addUniqueType, addKantoSpecies } = useAchievementsContext();

  const [parsedSave, setParsedSave] = useState<Gen3SaveData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PokemonPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const [tab, setTab] = useState<"party" | "pc">("party");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-load WASM on mount
  useEffect(() => {
    ensureWasmReady();
  }, []);

  // Parse save data on mount (async for WASM)
  useEffect(() => {
    let cancelled = false;

    async function parse() {
      const buffer = new ArrayBuffer(saveData.byteLength);
      new Uint8Array(buffer).set(saveData);
      const parsed = await parseGen3SaveWasm(buffer);

      if (cancelled) return;

      if (!parsed) {
        setParseError(
          "Could not parse save file. Make sure this is a valid Gen 3 (Ruby/Sapphire/Emerald/FireRed/LeafGreen) save file."
        );
        return;
      }

      setParsedSave(parsed);

      // Build preview list
      const allPreviews: PokemonPreview[] = [];

      // Party
      parsed.partyPokemon.forEach((p, i) => {
        allPreviews.push({ gen3: p, selected: true, index: i, source: "party" });
      });

      // PC boxes
      parsed.pcBoxPokemon.forEach((box, boxIdx) => {
        box.forEach((p) => {
          allPreviews.push({
            gen3: p,
            selected: false,
            index: allPreviews.length,
            source: "box",
            boxIndex: boxIdx,
          });
        });
      });

      setPreviews(allPreviews);
    }

    parse();
    return () => { cancelled = true; };
  }, [saveData]);

  const toggleSelect = useCallback((index: number) => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.index === index ? { ...p, selected: !p.selected } : p
      )
    );
  }, []);

  const selectAll = useCallback((source: "party" | "box") => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.source === (source === "box" ? "box" : "party")
          ? { ...p, selected: true }
          : p
      )
    );
  }, []);

  const deselectAll = useCallback((source: "party" | "box") => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.source === (source === "box" ? "box" : "party")
          ? { ...p, selected: false }
          : p
      )
    );
  }, []);

  const handleImport = useCallback(async () => {
    const selected = previews.filter((p) => p.selected);
    if (selected.length === 0) return;

    setImporting(true);
    setImportProgress({ done: 0, total: selected.length });

    const gen3Pokemon = selected.map((p) => p.gen3);
    const mapped = await mapGen3PokemonBatch(gen3Pokemon, (done, total) => {
      setImportProgress({ done, total });
    });

    for (const pokemon of mapped) {
      onImport(pokemon);

      // Track in Pokedex
      markCaught(pokemon.pokemon.id, pokemon.pokemon.name, "gba-import");

      // Track achievements
      incrementStat("totalCaught");
      incrementStat("gbaImports");
      pokemon.pokemon.types?.forEach((t: { type: { name: string } }) => addUniqueType(t.type.name));
      if (pokemon.pokemon.id <= 151) {
        addKantoSpecies(pokemon.pokemon.id);
      }
    }

    setImportedCount(mapped.length);
    setImporting(false);
  }, [previews, onImport, markCaught, incrementStat, addUniqueType, addKantoSpecies]);

  // Allow importing from a standalone .sav file
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const parsed = await parseGen3SaveWasm(buffer);

      if (!parsed) {
        setParseError("Could not parse the uploaded save file.");
        return;
      }

      setParsedSave(parsed);
      setParseError(null);

      const allPreviews: PokemonPreview[] = [];
      parsed.partyPokemon.forEach((p, i) => {
        allPreviews.push({ gen3: p, selected: true, index: i, source: "party" });
      });
      parsed.pcBoxPokemon.forEach((box, boxIdx) => {
        box.forEach((p) => {
          allPreviews.push({
            gen3: p,
            selected: false,
            index: allPreviews.length,
            source: "box",
            boxIndex: boxIdx,
          });
        });
      });
      setPreviews(allPreviews);

      e.target.value = "";
    },
    []
  );

  const partyPreviews = previews.filter((p) => p.source === "party");
  const pcPreviews = previews.filter((p) => p.source === "box");
  const selectedCount = previews.filter((p) => p.selected).length;

  if (parseError) {
    return (
      <div className="space-y-4">
        <div className="bg-[#e8433f]/20 border border-[#e8433f] rounded-lg p-4 text-sm text-[#f0f0e8]">
          <p className="font-pixel text-xs mb-2">Parse Error</p>
          <p>{parseError}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577]"
          >
            Upload .sav File
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#3a4466] text-[#8b9bb4] text-xs font-pixel hover:bg-[#4a5577]"
          >
            Back
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sav"
          className="hidden"
          aria-label="Load save file"
          onChange={handleFileUpload}
        />
      </div>
    );
  }

  if (importedCount > 0) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-[#2a5040]/50 border border-[#3a6050] rounded-lg p-6">
          <p className="text-[#f0f0e8] font-pixel text-sm mb-2">
            Import Complete!
          </p>
          <p className="text-[#8b9bb4] text-sm">
            Successfully imported {importedCount} Pokémon to your PC Box.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-xs font-pixel hover:bg-[#f05050]"
        >
          Back to Emulator
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#f0f0e8] font-pixel text-sm">
            Import Pokémon from Save
          </h2>
          {parsedSave && (
            <p className="text-[#8b9bb4] text-xs mt-1">
              Trainer: {parsedSave.trainerName} | ID: {parsedSave.trainerId}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded bg-[#3a4466] text-[#8b9bb4] text-xs font-pixel hover:bg-[#4a5577]"
        >
          Back
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("party")}
          className={`px-4 py-2 rounded text-xs font-pixel transition-colors ${
            tab === "party"
              ? "bg-[#e8433f] text-[#f0f0e8]"
              : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          }`}
        >
          Party ({partyPreviews.length})
        </button>
        <button
          onClick={() => setTab("pc")}
          className={`px-4 py-2 rounded text-xs font-pixel transition-colors ${
            tab === "pc"
              ? "bg-[#e8433f] text-[#f0f0e8]"
              : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
          }`}
        >
          PC Boxes ({pcPreviews.length})
        </button>
      </div>

      {/* Select controls */}
      <div className="flex gap-2">
        <button
          onClick={() => selectAll(tab === "party" ? "party" : "box")}
          className="px-3 py-1 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577]"
        >
          Select All
        </button>
        <button
          onClick={() => deselectAll(tab === "party" ? "party" : "box")}
          className="px-3 py-1 rounded bg-[#3a4466] text-[#8b9bb4] text-[10px] font-pixel hover:bg-[#4a5577]"
        >
          Deselect All
        </button>
      </div>

      {/* Pokemon grid */}
      <SaveImporterGrid
        previews={tab === "party" ? partyPreviews : pcPreviews}
        onToggle={toggleSelect}
      />

      {/* Import button */}
      <div className="flex items-center justify-between pt-2 border-t border-[#3a4466]">
        <p className="text-[#8b9bb4] text-xs">
          {selectedCount} Pokémon selected
        </p>
        <button
          onClick={handleImport}
          disabled={selectedCount === 0 || importing}
          className="px-6 py-2 rounded-lg bg-[#e8433f] text-[#f0f0e8] text-xs font-pixel hover:bg-[#f05050] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing
            ? `Importing... (${importProgress.done}/${importProgress.total})`
            : `Import ${selectedCount} Pokémon`}
        </button>
      </div>
    </div>
  );
}
