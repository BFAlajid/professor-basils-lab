"use client";

import { motion } from "framer-motion";
import { TeamSlot, Nature, EVSpread, IVSpread, TypeName } from "@/types";
import { extractBaseStats } from "@/utils/damageWasm";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import NatureSelector from "./NatureSelector";
import EVEditor from "./EVEditor";
import IVEditor from "./IVEditor";
import AbilitySelector from "./AbilitySelector";
import HeldItemSelector from "./HeldItemSelector";
import MoveSelector from "./MoveSelector";
import TeraTypeSelector from "./TeraTypeSelector";
import FormeSelector from "./FormeSelector";
import StatRadarChart from "./StatRadarChart";
import { playCry } from "@/utils/cryPlayer";
import SmogonSetLoader from "./SmogonSetLoader";
import { NATURES } from "@/data/natures";

interface PokemonDetailPanelProps {
  slot: TeamSlot;
  onUpdateNature: (nature: Nature) => void;
  onUpdateEvs: (evs: EVSpread) => void;
  onUpdateIvs: (ivs: IVSpread) => void;
  onUpdateAbility: (ability: string) => void;
  onUpdateItem: (item: string) => void;
  onUpdateMoves: (moves: string[]) => void;
  onSetTeraType?: (teraType: TypeName) => void;
  onSetForme?: (forme: string | null) => void;
  onClose: () => void;
}

const STAT_LABELS: { key: keyof ReturnType<typeof extractBaseStats>; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "spAtk", label: "SpA" },
  { key: "spDef", label: "SpD" },
  { key: "speed", label: "Spe" },
];

export default function PokemonDetailPanel({
  slot,
  onUpdateNature,
  onUpdateEvs,
  onUpdateIvs,
  onUpdateAbility,
  onUpdateItem,
  onUpdateMoves,
  onSetTeraType,
  onSetForme,
  onClose,
}: PokemonDetailPanelProps) {
  const baseStats = extractBaseStats(slot.pokemon);
  const evs = slot.evs ?? DEFAULT_EVS;
  const ivs = slot.ivs ?? DEFAULT_IVS;
  const nature = slot.nature ?? null;

  const calculatedStats = calculateAllStats(baseStats, ivs, evs, nature);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="col-span-full rounded-xl border border-[#3a4466] bg-[#262b44] p-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold font-pixel capitalize">{slot.pokemon.name} - Configuration</h3>
          <button
            onClick={() => playCry(slot.pokemon)}
            aria-label={`Play ${slot.pokemon.name} cry`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3a4466] text-sm text-[#8b9bb4] hover:bg-[#3b82f6] hover:text-[#f0f0e8] transition-colors"
            title="Play cry"
          >
            &#9835;
          </button>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-[#3a4466] px-3 py-1 text-sm text-[#8b9bb4] hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stats Comparison */}
        <div>
          <label className="mb-2 block text-xs text-[#8b9bb4]">Calculated Stats (Lv. 50)</label>
          <div className="space-y-1.5">
            {STAT_LABELS.map(({ key, label }) => {
              const base = baseStats[key];
              const calc = calculatedStats[key];
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-[#8b9bb4]">{label}</span>
                  <span className="w-8 text-right text-[#8b9bb4]">{base}</span>
                  <span className="text-[#8b9bb4]">&rarr;</span>
                  <span className="w-8 text-right font-semibold text-[#f0f0e8]">{calc}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#3a4466] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (calc / 500) * 100)}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full rounded-full bg-[#e8433f]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-[#8b9bb4]">
            BST: {Object.values(calculatedStats).reduce((a, b) => a + b, 0)}
          </div>
          <div className="mt-3 flex justify-center">
            <StatRadarChart baseStats={baseStats} calculatedStats={calculatedStats} size={160} />
          </div>
        </div>

        {/* Nature + Ability + Item */}
        <div className="space-y-4">
          <NatureSelector value={nature} onChange={onUpdateNature} />
          <AbilitySelector
            pokemon={slot.pokemon}
            value={slot.ability ?? null}
            onChange={onUpdateAbility}
          />
          <HeldItemSelector
            value={slot.heldItem ?? null}
            onChange={onUpdateItem}
          />
        </div>

        {/* Moves */}
        <div className="space-y-4">
          <MoveSelector
            pokemon={slot.pokemon}
            selectedMoves={slot.selectedMoves ?? []}
            onChange={onUpdateMoves}
          />

          {/* Tera Type */}
          {onSetTeraType && (
            <TeraTypeSelector
              value={slot.teraConfig?.teraType ?? null}
              onChange={onSetTeraType}
            />
          )}

          {/* Alternate Forme */}
          {onSetForme && (
            <FormeSelector
              pokemon={slot.pokemon}
              value={slot.formeOverride ?? null}
              onChange={onSetForme}
            />
          )}
        </div>
      </div>

      {/* EVs and IVs */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <EVEditor evs={evs} onChange={onUpdateEvs} />
        <IVEditor ivs={ivs} onChange={onUpdateIvs} />
      </div>

      {/* Smogon Competitive Sets */}
      <div className="mt-6">
        <SmogonSetLoader
          pokemonId={slot.pokemon.id}
          onApplySet={(set) => {
            const matchedNature = NATURES.find(n => n.name.toLowerCase() === set.nature.toLowerCase());
            if (matchedNature) onUpdateNature(matchedNature);
            onUpdateAbility(set.ability);
            onUpdateItem(set.item);
            onUpdateEvs({
              hp: set.evs.hp,
              attack: set.evs.atk,
              defense: set.evs.def,
              spAtk: set.evs.spa,
              spDef: set.evs.spd,
              speed: set.evs.spe,
            });
            onUpdateMoves(set.moves);
          }}
        />
      </div>
    </motion.div>
  );
}
