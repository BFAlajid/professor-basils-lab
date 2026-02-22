"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, Pokemon, Nature, EVSpread, IVSpread, TypeName } from "@/types";
import PokemonCard from "./PokemonCard";
import PokemonSearch from "./PokemonSearch";
import PokemonDetailPanel from "./PokemonDetailPanel";
import { exportToShowdown, importFromShowdown } from "@/utils/showdownFormat";

interface TeamRosterProps {
  team: TeamSlot[];
  onAdd: (pokemon: Pokemon) => void;
  onRemove: (position: number) => void;
  isFull: boolean;
  onSetNature: (position: number, nature: Nature) => void;
  onSetEvs: (position: number, evs: EVSpread) => void;
  onSetIvs: (position: number, ivs: IVSpread) => void;
  onSetAbility: (position: number, ability: string) => void;
  onSetHeldItem: (position: number, item: string) => void;
  onSetMoves: (position: number, moves: string[]) => void;
  onSetTeraType?: (position: number, teraType: TypeName) => void;
  onSetForme?: (position: number, forme: string | null) => void;
  onSetTeam?: (slots: TeamSlot[]) => void;
}

export default function TeamRoster({
  team,
  onAdd,
  onRemove,
  isFull,
  onSetNature,
  onSetEvs,
  onSetIvs,
  onSetAbility,
  onSetHeldItem,
  onSetMoves,
  onSetTeraType,
  onSetForme,
  onSetTeam,
}: TeamRosterProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [showShowdown, setShowShowdown] = useState(false);
  const [showdownText, setShowdownText] = useState("");
  const [showdownMessage, setShowdownMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const emptySlots = Math.max(0, 6 - team.length);

  const expandedSlot = team.find((s) => s.position === expandedPosition);

  const handleExport = useCallback(() => {
    if (team.length === 0) return;
    const text = exportToShowdown(team);
    setShowdownText(text);
    setShowShowdown(true);
    setShowdownMessage("");
  }, [team]);

  const handleCopyExport = useCallback(() => {
    navigator.clipboard.writeText(showdownText).then(() => {
      setShowdownMessage("Copied!");
      setTimeout(() => setShowdownMessage(""), 2000);
    });
  }, [showdownText]);

  const handleImport = useCallback(async () => {
    if (!showdownText.trim() || !onSetTeam) return;
    setIsImporting(true);
    setShowdownMessage("Importing...");
    try {
      const slots = await importFromShowdown(showdownText);
      if (slots.length === 0) {
        setShowdownMessage("No valid Pokemon found");
      } else {
        onSetTeam(slots);
        setShowdownMessage(`Imported ${slots.length} Pokemon!`);
        setTimeout(() => {
          setShowShowdown(false);
          setShowdownText("");
          setShowdownMessage("");
        }, 1500);
      }
    } catch {
      setShowdownMessage("Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [showdownText, onSetTeam]);

  return (
    <>
      {/* Showdown toolbar */}
      <div className="mb-4 flex items-center gap-2">
        {team.length > 0 && (
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
          >
            Export Showdown
          </button>
        )}
        <button
          onClick={() => {
            setShowdownText("");
            setShowShowdown(true);
            setShowdownMessage("");
          }}
          className="px-3 py-1.5 rounded-lg bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
        >
          Import Showdown
        </button>
      </div>

      {/* Showdown modal */}
      <AnimatePresence>
        {showShowdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-pixel text-[#f0f0e8]">
                  Pokemon Showdown Format
                </h3>
                <button
                  onClick={() => {
                    setShowShowdown(false);
                    setShowdownText("");
                    setShowdownMessage("");
                  }}
                  className="text-[#8b9bb4] hover:text-[#f0f0e8] text-xs"
                >
                  Close
                </button>
              </div>
              <textarea
                value={showdownText}
                onChange={(e) => setShowdownText(e.target.value)}
                placeholder={"Paste a Showdown team here to import, or click Export to generate...\n\nExample:\nGarchomp @ Life Orb\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Outrage\n- Swords Dance\n- Stone Edge"}
                className="w-full h-48 rounded-lg bg-[#1a1c2c] border border-[#3a4466] text-[#f0f0e8] text-xs font-mono p-3 resize-y focus:outline-none focus:border-[#e8433f] placeholder-[#8b9bb4]/50"
              />
              <div className="flex items-center gap-2">
                {showdownText.trim() && (
                  <>
                    <button
                      onClick={handleCopyExport}
                      className="px-3 py-1.5 rounded bg-[#3a4466] text-[#f0f0e8] text-xs font-pixel hover:bg-[#4a5577] transition-colors"
                    >
                      Copy
                    </button>
                    {onSetTeam && (
                      <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="px-3 py-1.5 rounded bg-[#e8433f] text-[#f0f0e8] text-xs font-pixel hover:bg-[#f05050] transition-colors disabled:opacity-50"
                      >
                        {isImporting ? "Importing..." : "Import Team"}
                      </button>
                    )}
                  </>
                )}
                {showdownMessage && (
                  <span className="text-xs text-[#8b9bb4] font-pixel">
                    {showdownMessage}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {team.map((slot) => (
            <PokemonCard
              key={slot.pokemon.id}
              slot={slot}
              onRemove={onRemove}
              onClick={() =>
                setExpandedPosition(
                  expandedPosition === slot.position ? null : slot.position
                )
              }
              isExpanded={expandedPosition === slot.position}
            />
          ))}
        </AnimatePresence>

        {Array.from({ length: emptySlots }).map((_, i) => (
          <motion.button
            key={`empty-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-[340px] items-center justify-center rounded-xl border-2 border-dashed border-[#3a4466] bg-[#262b44]/50 hover:border-[#e8433f] hover:bg-[#262b44] transition-colors"
            onClick={() => !isFull && setSearchOpen(true)}
          >
            <div className="text-center">
              <span className="block text-4xl text-[#3a4466]">+</span>
              <span className="mt-2 block text-sm text-[#8b9bb4]">
                Add Pokemon
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {expandedSlot && (
          <div className="mt-4">
            <PokemonDetailPanel
              key={expandedSlot.position}
              slot={expandedSlot}
              onUpdateNature={(nature) => onSetNature(expandedSlot.position, nature)}
              onUpdateEvs={(evs) => onSetEvs(expandedSlot.position, evs)}
              onUpdateIvs={(ivs) => onSetIvs(expandedSlot.position, ivs)}
              onUpdateAbility={(ability) => onSetAbility(expandedSlot.position, ability)}
              onUpdateItem={(item) => onSetHeldItem(expandedSlot.position, item)}
              onUpdateMoves={(moves) => onSetMoves(expandedSlot.position, moves)}
              onSetTeraType={onSetTeraType ? (teraType) => onSetTeraType(expandedSlot.position, teraType) : undefined}
              onSetForme={onSetForme ? (forme) => onSetForme(expandedSlot.position, forme) : undefined}
              onClose={() => setExpandedPosition(null)}
            />
          </div>
        )}
      </AnimatePresence>

      <PokemonSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={onAdd}
      />
    </>
  );
}
