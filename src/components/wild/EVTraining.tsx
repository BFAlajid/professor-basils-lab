"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, EVSpread } from "@/types";

type StatKey = keyof EVSpread;

interface EVTrainingProps {
  team: TeamSlot[];
  ownedItems: Record<string, number>;
  onUpdateEvs: (position: number, evs: EVSpread) => void;
  onSessionComplete: () => void;
}

const STAT_INFO: { key: StatKey; label: string; color: string; pokemon: string; evYield: number }[] = [
  { key: "hp", label: "HP", color: "#e8433f", pokemon: "Chansey", evYield: 2 },
  { key: "attack", label: "Attack", color: "#f7a838", pokemon: "Machop", evYield: 1 },
  { key: "defense", label: "Defense", color: "#f0c040", pokemon: "Geodude", evYield: 1 },
  { key: "spAtk", label: "Sp.Atk", color: "#4a90d9", pokemon: "Gastly", evYield: 1 },
  { key: "spDef", label: "Sp.Def", color: "#38b764", pokemon: "Tentacool", evYield: 1 },
  { key: "speed", label: "Speed", color: "#f06292", pokemon: "Zubat", evYield: 1 },
];

const POWER_ITEMS: Record<string, StatKey> = {
  "power-weight": "hp",
  "power-bracer": "attack",
  "power-belt": "defense",
  "power-lens": "spAtk",
  "power-band": "spDef",
  "power-anklet": "speed",
};

const MAX_SINGLE_EV = 252;
const MAX_TOTAL_EVS = 510;

function getTotalEvs(evs: EVSpread): number {
  return evs.hp + evs.attack + evs.defense + evs.spAtk + evs.spDef + evs.speed;
}

export default function EVTraining({ team, ownedItems, onUpdateEvs, onSessionComplete }: EVTrainingProps) {
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [trainingStat, setTrainingStat] = useState<StatKey | null>(null);
  const [sessionGains, setSessionGains] = useState<EVSpread>({ hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 });
  const [battleCount, setBattleCount] = useState(0);

  const hasMachoBrace = (ownedItems["macho-brace"] ?? 0) > 0;

  const activePowerItem = useMemo(() => {
    for (const [itemId, stat] of Object.entries(POWER_ITEMS)) {
      if ((ownedItems[itemId] ?? 0) > 0) return { itemId, stat };
    }
    return null;
  }, [ownedItems]);

  const currentEvs = useMemo(() => {
    if (selectedPokemon === null) return null;
    const slot = team[selectedPokemon];
    if (!slot) return null;
    return slot.evs ?? { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
  }, [selectedPokemon, team]);

  const calculateGain = useCallback((stat: StatKey): number => {
    const info = STAT_INFO.find((s) => s.key === stat)!;
    let gain = info.evYield;

    // Power item bonus
    if (activePowerItem && activePowerItem.stat === stat) gain += 8;

    // Macho Brace doubles
    if (hasMachoBrace) gain *= 2;

    return gain;
  }, [activePowerItem, hasMachoBrace]);

  function handleTrain() {
    if (selectedPokemon === null || !trainingStat || !currentEvs) return;

    const gain = calculateGain(trainingStat);
    const totalNow = getTotalEvs(currentEvs);
    const currentStat = currentEvs[trainingStat];

    // Cap at 252 per stat, 510 total
    const maxGainStat = MAX_SINGLE_EV - currentStat;
    const maxGainTotal = MAX_TOTAL_EVS - totalNow;
    const actualGain = Math.min(gain, maxGainStat, maxGainTotal);

    if (actualGain <= 0) return;

    const newEvs = { ...currentEvs, [trainingStat]: currentStat + actualGain };
    onUpdateEvs(selectedPokemon, newEvs);

    setSessionGains((prev) => ({
      ...prev,
      [trainingStat]: prev[trainingStat] + actualGain,
    }));
    setBattleCount((c) => c + 1);
  }

  function handleFinish() {
    onSessionComplete();
    setSessionGains({ hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 });
    setBattleCount(0);
    setTrainingStat(null);
    setSelectedPokemon(null);
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4">
      <h3 className="font-pixel text-sm text-[#f0f0e8] mb-3">EV Training Grounds</h3>

      {/* Step 1: Select Pokemon */}
      {selectedPokemon === null && (
        <div>
          <p className="font-pixel text-[9px] text-[#8b9bb4] mb-2">Select a Pokemon to train:</p>
          <div className="grid grid-cols-3 gap-2">
            {team.map((slot, i) => {
              const evTotal = getTotalEvs(slot.evs ?? { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 });
              const isFull = evTotal >= MAX_TOTAL_EVS;
              return (
                <button
                  key={i}
                  onClick={() => !isFull && setSelectedPokemon(i)}
                  disabled={isFull}
                  className="rounded-lg border border-[#3a4466] bg-[#262b44] p-2 text-center hover:border-[#f7a838] transition-colors disabled:opacity-40"
                >
                  <p className="font-pixel text-[10px] text-[#f0f0e8] capitalize truncate">
                    {slot.pokemon.name.replace(/-/g, " ")}
                  </p>
                  <p className="font-pixel text-[8px] text-[#8b9bb4]">
                    EVs: {evTotal}/{MAX_TOTAL_EVS}
                  </p>
                </button>
              );
            })}
          </div>
          {team.length === 0 && (
            <p className="font-pixel text-[9px] text-[#8b9bb4] text-center py-4">
              Add Pokemon to your team first!
            </p>
          )}
        </div>
      )}

      {/* Step 2: Select stat to train */}
      {selectedPokemon !== null && !trainingStat && currentEvs && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-[10px] text-[#f0f0e8] capitalize">
              Training: {team[selectedPokemon]?.pokemon.name.replace(/-/g, " ")}
            </p>
            <button
              onClick={() => setSelectedPokemon(null)}
              className="font-pixel text-[8px] text-[#8b9bb4] hover:text-[#f0f0e8]"
            >
              Back
            </button>
          </div>

          {/* Current EV bar */}
          <div className="mb-3 space-y-1">
            {STAT_INFO.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="font-pixel text-[8px] text-[#8b9bb4] w-10">{label}</span>
                <div className="flex-1 h-2 bg-[#3a4466] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(currentEvs[key] / MAX_SINGLE_EV) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="font-pixel text-[8px] text-[#8b9bb4] w-8 text-right">{currentEvs[key]}</span>
              </div>
            ))}
          </div>

          <p className="font-pixel text-[9px] text-[#8b9bb4] mb-2">Choose a stat to train:</p>
          <div className="grid grid-cols-3 gap-1">
            {STAT_INFO.map(({ key, label, color, pokemon, evYield }) => {
              const gain = calculateGain(key);
              const isCapped = currentEvs[key] >= MAX_SINGLE_EV;
              return (
                <button
                  key={key}
                  onClick={() => !isCapped && setTrainingStat(key)}
                  disabled={isCapped}
                  className="rounded-lg border border-[#3a4466] bg-[#262b44] p-2 text-left hover:border-[#f7a838] transition-colors disabled:opacity-40"
                >
                  <p className="font-pixel text-[9px]" style={{ color }}>{label}</p>
                  <p className="font-pixel text-[7px] text-[#8b9bb4]">vs {pokemon}</p>
                  <p className="font-pixel text-[7px] text-[#38b764]">+{gain} EVs/battle</p>
                </button>
              );
            })}
          </div>

          {/* Show active modifiers */}
          <div className="mt-2 flex gap-1 flex-wrap">
            {hasMachoBrace && (
              <span className="font-pixel text-[7px] text-[#f7a838] bg-[#f7a838]/10 px-1 rounded">Macho Brace ×2</span>
            )}
            {activePowerItem && (
              <span className="font-pixel text-[7px] text-[#4a90d9] bg-[#4a90d9]/10 px-1 rounded">
                {activePowerItem.itemId.replace(/-/g, " ")} +8
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Training in progress */}
      {selectedPokemon !== null && trainingStat && currentEvs && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-[10px] text-[#f0f0e8] capitalize">
              {team[selectedPokemon]?.pokemon.name.replace(/-/g, " ")} — {STAT_INFO.find((s) => s.key === trainingStat)?.label} Training
            </p>
            <button
              onClick={handleFinish}
              className="font-pixel text-[8px] text-[#f7a838] hover:text-[#f0f0e8]"
            >
              Finish
            </button>
          </div>

          {/* EV bars */}
          <div className="mb-3 space-y-1">
            {STAT_INFO.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="font-pixel text-[8px] text-[#8b9bb4] w-10">{label}</span>
                <div className="flex-1 h-2 bg-[#3a4466] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(currentEvs[key] / MAX_SINGLE_EV) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="font-pixel text-[8px] text-[#8b9bb4] w-8 text-right">{currentEvs[key]}</span>
                <AnimatePresence>
                  {sessionGains[key] > 0 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="font-pixel text-[7px] text-[#38b764]"
                    >
                      +{sessionGains[key]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Battle button */}
          <div className="text-center">
            <p className="font-pixel text-[8px] text-[#8b9bb4] mb-2">
              Battles: {battleCount} | Total EVs: {getTotalEvs(currentEvs)}/{MAX_TOTAL_EVS}
            </p>

            {getTotalEvs(currentEvs) >= MAX_TOTAL_EVS || currentEvs[trainingStat] >= MAX_SINGLE_EV ? (
              <div className="space-y-2">
                <p className="font-pixel text-[10px] text-[#f7a838]">
                  {currentEvs[trainingStat] >= MAX_SINGLE_EV ? "Stat maxed!" : "Total EVs maxed!"}
                </p>
                <button
                  onClick={handleFinish}
                  className="px-4 py-1.5 font-pixel text-[10px] rounded-lg bg-[#38b764] text-[#f0f0e8] hover:bg-[#2a9654] transition-colors"
                >
                  Finish Training
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleTrain}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 font-pixel text-[10px] rounded-lg bg-[#e8433f] text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
              >
                Battle {STAT_INFO.find((s) => s.key === trainingStat)?.pokemon}! (+{calculateGain(trainingStat)} EVs)
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
