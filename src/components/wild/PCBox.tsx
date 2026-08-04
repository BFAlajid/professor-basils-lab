"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PCBoxPokemon, IVSpread } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";
import { NATURES } from "@/data/natures";
import { getNatureLabel } from "@/data/natures";
import { POKEMART_ITEMS } from "@/data/pokeMart";
import PCBoxSlot from "./PCBoxSlot";
import Image from "@/components/PokeImage";
import ItemSprite from "@/components/ItemSprite";
import { formatName } from "@/utils/format";

interface PCBoxProps {
  box: PCBoxPokemon[];
  teamSize: number;
  onMoveToTeam: (index: number) => void;
  onRemove: (index: number) => void;
  onSetNickname: (index: number, nickname: string) => void;
  onUpdatePokemon?: (index: number, updates: Partial<PCBoxPokemon>) => void;
  ownedItems?: Record<string, number>;
  setOwnedItems?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

type ItemAction = "ability-capsule" | "ability-patch" | "bottle-cap" | "gold-bottle-cap" | "mint" | null;

const IV_STAT_KEYS: { key: keyof IVSpread; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAtk", label: "SpA" },
  { key: "spDef", label: "SpD" },
  { key: "speed", label: "Spe" },
];

export default function PCBox({ box, teamSize, onMoveToTeam, onRemove, onSetNickname, onUpdatePokemon, ownedItems = {}, setOwnedItems }: PCBoxProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<ItemAction>(null);
  const selected = selectedIndex !== null ? box[selectedIndex] : null;
  const handleToggle = useCallback((i: number) => {
    setSelectedIndex((prev) => prev === i ? null : i);
    setActiveAction(null);
  }, []);

  const hasItem = useCallback((id: string) => (ownedItems[id] ?? 0) > 0, [ownedItems]);

  const consumeItem = useCallback((id: string) => {
    setOwnedItems?.((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
  }, [setOwnedItems]);

  // Ability helpers
  const nonHiddenAbilities = useMemo(() => {
    if (!selected) return [];
    return (selected.pokemon.abilities ?? []).filter((a) => !a.is_hidden);
  }, [selected]);

  const hiddenAbility = useMemo(() => {
    if (!selected) return null;
    const ha = (selected.pokemon.abilities ?? []).find((a) => a.is_hidden);
    return ha?.ability.name ?? null;
  }, [selected]);

  const canUseAbilityCapsule = nonHiddenAbilities.length >= 2 && hasItem("ability-capsule");
  const canUseAbilityPatch = hiddenAbility !== null && selected?.ability !== hiddenAbility && hasItem("ability-patch");
  const canUseBottleCap = hasItem("bottle-cap");
  const canUseGoldBottleCap = hasItem("gold-bottle-cap");

  const ownedMints = useMemo(() => {
    return POKEMART_ITEMS.filter(
      (item) => item.category === "mint" && item.nature && (ownedItems[item.id] ?? 0) > 0
    );
  }, [ownedItems]);

  const handleAbilityCapsule = useCallback(() => {
    if (!selected || selectedIndex === null || !onUpdatePokemon) return;
    const other = nonHiddenAbilities.find((a) => a.ability.name !== selected.ability);
    if (!other) return;
    consumeItem("ability-capsule");
    onUpdatePokemon(selectedIndex, { ability: other.ability.name });
    setActiveAction(null);
  }, [selected, selectedIndex, nonHiddenAbilities, consumeItem, onUpdatePokemon]);

  const handleAbilityPatch = useCallback(() => {
    if (!selected || selectedIndex === null || !hiddenAbility || !onUpdatePokemon) return;
    consumeItem("ability-patch");
    onUpdatePokemon(selectedIndex, { ability: hiddenAbility });
    setActiveAction(null);
  }, [selected, selectedIndex, hiddenAbility, consumeItem, onUpdatePokemon]);

  const handleBottleCap = useCallback((stat: keyof IVSpread) => {
    if (!selected || selectedIndex === null || !onUpdatePokemon) return;
    consumeItem("bottle-cap");
    const newHyperTrained = { ...(selected.isHyperTrained ?? {}), [stat]: true };
    const newIvs = { ...selected.ivs, [stat]: 31 };
    onUpdatePokemon(selectedIndex, { ivs: newIvs, isHyperTrained: newHyperTrained });
    setActiveAction(null);
  }, [selected, selectedIndex, consumeItem, onUpdatePokemon]);

  const handleGoldBottleCap = useCallback(() => {
    if (!selected || selectedIndex === null || !onUpdatePokemon) return;
    consumeItem("gold-bottle-cap");
    const maxIvs: IVSpread = { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
    const allHyperTrained: Partial<Record<keyof IVSpread, boolean>> = { hp: true, attack: true, defense: true, spAtk: true, spDef: true, speed: true };
    onUpdatePokemon(selectedIndex, { ivs: maxIvs, isHyperTrained: allHyperTrained });
    setActiveAction(null);
  }, [selected, selectedIndex, consumeItem, onUpdatePokemon]);

  const handleMint = useCallback((mintId: string, natureName: string) => {
    if (!selected || selectedIndex === null || !onUpdatePokemon) return;
    const nature = NATURES.find((n) => n.name === natureName);
    if (!nature) return;
    consumeItem(mintId);
    onUpdatePokemon(selectedIndex, { nature });
    setActiveAction(null);
  }, [selected, selectedIndex, consumeItem, onUpdatePokemon]);

  const hasAnyCompetitiveItem = hasItem("ability-capsule") || hasItem("ability-patch") || hasItem("bottle-cap") || hasItem("gold-bottle-cap") || ownedMints.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">
          PC Box ({box.length})
        </h3>
      </div>

      {box.length === 0 ? (
        <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-6 text-center">
          <p className="text-sm text-[#8b9bb4]">No Pokemon in the box yet.</p>
          <p className="text-xs text-[#3a4466] mt-1">Catch wild Pokemon to fill your box!</p>
        </div>
      ) : (
        <div role="grid" aria-label="PC Box storage" className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[350px] overflow-y-auto bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-3">
          {box.map((pokemon, i) => (
            <PCBoxSlot
              key={`${pokemon.pokemon.id}-${pokemon.caughtDate}-${i}`}
              pokemon={pokemon}
              index={i}
              isSelected={selectedIndex === i}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Selected Pokemon detail */}
      <AnimatePresence>
        {selected && selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              {selected.pokemon.sprites.other?.["official-artwork"]?.front_default && (
                <Image
                  src={selected.pokemon.sprites.other["official-artwork"].front_default}
                  alt={selected.pokemon.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="pixelated"
                />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-pixel text-[#f0f0e8]">
                  {selected.nickname ?? formatName(selected.pokemon.name)}
                </p>
                <p className="text-xs text-[#8b9bb4]">
                  Lv. {selected.level} · {selected.pokemon.types.map((t) => t.type.name).join("/")}
                </p>
                <div className="flex items-center gap-1">
                  <ItemSprite name={selected.caughtWith} size={18} fallbackColor={POKE_BALLS[selected.caughtWith]?.spriteColor} />
                  <span className="text-[11px] text-[#8b9bb4]">
                    Caught in {selected.caughtInArea} · {new Date(selected.caughtDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9bb4]">
                  Nature: {selected.nature.name} · Ability: {selected.ability}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {teamSize < 6 && (
                <button
                  onClick={() => { onMoveToTeam(selectedIndex); setSelectedIndex(null); }}
                  aria-label="Move Pokemon to team"
                  className="px-4 py-2 bg-[#38b764] hover:bg-[#2d9550] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
                >
                  Move to Team
                </button>
              )}
              <button
                onClick={() => { if (window.confirm(`Release ${selected.nickname || selected.pokemon.name}? This cannot be undone.`)) { onRemove(selectedIndex); setSelectedIndex(null); } }}
                aria-label="Release Pokemon"
                className="px-4 py-2 bg-[#e8433f] hover:bg-[#c9342e] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors"
              >
                Release
              </button>
            </div>

            {/* Competitive item actions */}
            {onUpdatePokemon && hasAnyCompetitiveItem && (
              <div className="mt-3 border-t border-[#3a4466] pt-3">
                <p className="text-[10px] font-pixel text-[#8b9bb4] mb-2">Use Item</p>
                <div className="flex flex-wrap gap-1">
                  {canUseAbilityCapsule && (
                    <button
                      onClick={() => setActiveAction(activeAction === "ability-capsule" ? null : "ability-capsule")}
                      className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                        activeAction === "ability-capsule"
                          ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/15"
                          : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                    >
                      Ability Capsule (x{ownedItems["ability-capsule"] ?? 0})
                    </button>
                  )}
                  {canUseAbilityPatch && (
                    <button
                      onClick={() => setActiveAction(activeAction === "ability-patch" ? null : "ability-patch")}
                      className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                        activeAction === "ability-patch"
                          ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/15"
                          : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                    >
                      Ability Patch (x{ownedItems["ability-patch"] ?? 0})
                    </button>
                  )}
                  {canUseBottleCap && (
                    <button
                      onClick={() => setActiveAction(activeAction === "bottle-cap" ? null : "bottle-cap")}
                      className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                        activeAction === "bottle-cap"
                          ? "border-[#f7a838] text-[#f7a838] bg-[#f7a838]/15"
                          : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                    >
                      Bottle Cap (x{ownedItems["bottle-cap"] ?? 0})
                    </button>
                  )}
                  {canUseGoldBottleCap && (
                    <button
                      onClick={() => setActiveAction(activeAction === "gold-bottle-cap" ? null : "gold-bottle-cap")}
                      className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                        activeAction === "gold-bottle-cap"
                          ? "border-[#f7a838] text-[#f7a838] bg-[#f7a838]/15"
                          : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                    >
                      Gold Bottle Cap (x{ownedItems["gold-bottle-cap"] ?? 0})
                    </button>
                  )}
                  {ownedMints.length > 0 && (
                    <button
                      onClick={() => setActiveAction(activeAction === "mint" ? null : "mint")}
                      className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                        activeAction === "mint"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/15"
                          : "border-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                    >
                      Mints
                    </button>
                  )}
                </div>

                {/* Sub-panels for each action */}
                <AnimatePresence>
                  {activeAction === "ability-capsule" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden"
                    >
                      <p className="text-[9px] text-[#8b9bb4] mb-2">
                        Switch from <span className="text-[#f0f0e8]">{selected.ability}</span> to{" "}
                        <span className="text-[#a855f7]">{nonHiddenAbilities.find((a) => a.ability.name !== selected.ability)?.ability.name}</span>?
                      </p>
                      <button
                        onClick={handleAbilityCapsule}
                        className="px-3 py-1 text-[9px] font-pixel rounded bg-[#a855f7] text-[#f0f0e8] hover:bg-[#9333ea] transition-colors"
                      >
                        Confirm
                      </button>
                    </motion.div>
                  )}

                  {activeAction === "ability-patch" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden"
                    >
                      <p className="text-[9px] text-[#8b9bb4] mb-2">
                        Switch to hidden ability <span className="text-[#a855f7]">{hiddenAbility}</span>?
                      </p>
                      <button
                        onClick={handleAbilityPatch}
                        className="px-3 py-1 text-[9px] font-pixel rounded bg-[#a855f7] text-[#f0f0e8] hover:bg-[#9333ea] transition-colors"
                      >
                        Confirm
                      </button>
                    </motion.div>
                  )}

                  {activeAction === "bottle-cap" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden"
                    >
                      <p className="text-[9px] text-[#8b9bb4] mb-2">Select a stat to Hyper Train:</p>
                      <div className="flex flex-wrap gap-1">
                        {IV_STAT_KEYS.map(({ key, label }) => {
                          const isMaxed = selected.ivs[key] === 31;
                          return (
                            <button
                              key={key}
                              onClick={() => handleBottleCap(key)}
                              disabled={isMaxed}
                              className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                                isMaxed
                                  ? "border-[#3a4466] text-[#3a4466] cursor-not-allowed"
                                  : "border-[#f7a838] text-[#f7a838] hover:bg-[#f7a838]/15"
                              }`}
                            >
                              {label} ({selected.ivs[key]})
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeAction === "gold-bottle-cap" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden"
                    >
                      <p className="text-[9px] text-[#8b9bb4] mb-2">Set all IVs to 31?</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {IV_STAT_KEYS.map(({ key, label }) => (
                          <span key={key} className="text-[9px] font-pixel text-[#8b9bb4]">
                            {label}: {selected.ivs[key]} → <span className="text-[#f7a838]">31</span>
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={handleGoldBottleCap}
                        className="px-3 py-1 text-[9px] font-pixel rounded bg-[#f7a838] text-[#1a1c2c] hover:bg-[#e5962e] transition-colors"
                      >
                        Confirm
                      </button>
                    </motion.div>
                  )}

                  {activeAction === "mint" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a1c2c] border border-[#3a4466] rounded-lg overflow-hidden"
                    >
                      <p className="text-[9px] text-[#8b9bb4] mb-2">
                        Current: <span className="text-[#f0f0e8]">{getNatureLabel(selected.nature)}</span>
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                        {ownedMints.map((mint) => {
                          const nature = NATURES.find((n) => n.name === mint.nature);
                          const isCurrent = selected.nature.name === mint.nature;
                          return (
                            <button
                              key={mint.id}
                              onClick={() => handleMint(mint.id, mint.nature!)}
                              disabled={isCurrent}
                              className={`px-2 py-1 text-[9px] font-pixel rounded border transition-colors ${
                                isCurrent
                                  ? "border-[#3a4466] text-[#3a4466] cursor-not-allowed"
                                  : "border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/15"
                              }`}
                            >
                              {nature ? getNatureLabel(nature) : mint.name} (x{ownedItems[mint.id] ?? 0})
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
