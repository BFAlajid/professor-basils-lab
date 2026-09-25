"use client";

import { useState, useMemo, memo } from "react";
import { TeamSlot } from "@/types";
import { extractBaseStats } from "@/utils/damageWasm";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import { formatName } from "@/utils/format";

interface SpeedOptimizerProps {
  team: TeamSlot[];
}

const COMMON_TIERS = [
  { label: "Dragapult (Base 142)", baseSpe: 142 },
  { label: "Barraskewda (Base 136)", baseSpe: 136 },
  { label: "Weavile (Base 125)", baseSpe: 125 },
  { label: "Cinderace (Base 119)", baseSpe: 119 },
  { label: "Gengar (Base 110)", baseSpe: 110 },
  { label: "Garchomp (Base 102)", baseSpe: 102 },
  { label: "Volcarona (Base 100)", baseSpe: 100 },
  { label: "Excadrill (Base 88)", baseSpe: 88 },
  { label: "Dragonite (Base 80)", baseSpe: 80 },
  { label: "Tyranitar (Base 61)", baseSpe: 61 },
];

const NATURE_OPTIONS = [
  { label: "+Spe (Jolly/Timid)", mult: 1.1 },
  { label: "Neutral", mult: 1.0 },
  { label: "-Spe (Brave/Quiet)", mult: 0.9 },
] as const;

function calcSpeed(baseSpe: number, iv: number, ev: number, natureMult: number, level: number = 50): number {
  return Math.floor(
    Math.floor((2 * baseSpe + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureMult
  );
}

function calcMaxSpeed(baseSpe: number, natureMult: number = 1.1): number {
  return calcSpeed(baseSpe, 31, 252, natureMult);
}

function findMinEvs(baseSpe: number, iv: number, natureMult: number, targetSpeed: number): number | null {
  for (let ev = 0; ev <= 252; ev += 4) {
    if (calcSpeed(baseSpe, iv, ev, natureMult) >= targetSpeed) return ev;
  }
  return null;
}

interface SpreadResult {
  natureName: string;
  natureMult: number;
  evs: number | null;
  resultSpeed: number;
}

function calcSpreads(baseSpe: number, iv: number, targetSpeed: number): SpreadResult[] {
  return NATURE_OPTIONS.map((n) => {
    const evs = findMinEvs(baseSpe, iv, n.mult, targetSpeed);
    const resultSpeed = evs !== null ? calcSpeed(baseSpe, iv, evs, n.mult) : calcSpeed(baseSpe, iv, 252, n.mult);
    return { natureName: n.label, natureMult: n.mult, evs, resultSpeed };
  });
}

const TierRow = memo(function TierRow({
  label,
  speed,
  scarfSpeed,
  isSelected,
  onClick,
}: {
  label: string;
  speed: number;
  scarfSpeed: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors ${
        isSelected
          ? "bg-[#3a4466] text-[#f0f0e8]"
          : "text-[#8b9bb4] hover:bg-[#3a4466]/50"
      }`}
      aria-label={`Select ${label} as target`}
    >
      <span className="truncate text-left flex-1">{label}</span>
      <span className="tabular-nums ml-2 w-8 text-right">{speed}</span>
      <span className="tabular-nums ml-2 w-10 text-right text-[#f7a838]">{scarfSpeed}</span>
    </button>
  );
});

export default function SpeedOptimizer({ team }: SpeedOptimizerProps) {
  const [teamIdx, setTeamIdx] = useState(0);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [scarfTarget, setScarfTarget] = useState(false);
  const [customTarget, setCustomTarget] = useState("");

  const tiers = useMemo(
    () =>
      COMMON_TIERS.map((t) => ({
        ...t,
        speed: calcMaxSpeed(t.baseSpe, 1.1),
        scarfSpeed: Math.floor(calcMaxSpeed(t.baseSpe, 1.1) * 1.5),
      })),
    []
  );

  const slot = team[teamIdx] ?? null;

  const result = useMemo(() => {
    if (!slot) return null;
    const baseStats = extractBaseStats(slot.pokemon);
    const iv = slot.ivs?.speed ?? DEFAULT_IVS.speed;
    const tier = tiers[selectedTierIdx];
    if (!tier) return null;

    const customVal = customTarget.trim() ? parseInt(customTarget, 10) : NaN;
    const targetSpeed = !isNaN(customVal) && customVal > 0
      ? customVal
      : scarfTarget
        ? tier.scarfSpeed + 1
        : tier.speed + 1;

    const spreads = calcSpreads(baseStats.speed, iv, targetSpeed);
    const currentSpeed = calcSpeed(
      baseStats.speed,
      iv,
      slot.evs?.speed ?? DEFAULT_EVS.speed,
      slot.nature?.increased === "speed" ? 1.1 : slot.nature?.decreased === "speed" ? 0.9 : 1.0
    );

    return {
      targetSpeed,
      spreads,
      baseSpe: baseStats.speed,
      currentSpeed,
      pokemonName: formatName(slot.pokemon.name),
    };
  }, [slot, tiers, selectedTierIdx, scarfTarget, customTarget]);

  if (team.length === 0) {
    return (
      <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
        <h3 className="text-[#f0f0e8] text-sm mb-2">Speed Optimizer</h3>
        <p className="text-[#8b9bb4] text-xs">Add Pokemon to your team to optimize speed EVs.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
      <h3 className="text-[#f0f0e8] text-sm mb-3">Speed Optimizer</h3>

      {/* Pokemon selector */}
      <div className="mb-3">
        <label className="text-[10px] text-[#8b9bb4] mb-1 block">Your Pokemon</label>
        <select
          value={teamIdx}
          onChange={(e) => setTeamIdx(Number(e.target.value))}
          className="w-full bg-[#1a1c2c] border border-[#3a4466] rounded px-2 py-1 text-xs text-[#f0f0e8] focus:outline-none focus:border-[#5b6e8f]"
          aria-label="Select team member to optimize"
        >
          {team.map((s, i) => (
            <option key={i} value={i}>
              {formatName(s.pokemon.name)} (Base Spe: {extractBaseStats(s.pokemon).speed})
            </option>
          ))}
        </select>
      </div>

      {/* Common speed tiers */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#8b9bb4]">Speed Tiers</span>
          <div className="flex gap-2 text-[10px]">
            <span className="text-[#8b9bb4] w-8 text-right">Max</span>
            <span className="text-[#f7a838] w-10 text-right">Scarf</span>
          </div>
        </div>
        <div className="bg-[#1a1c2c] rounded border border-[#3a4466] max-h-40 overflow-y-auto">
          {tiers.map((tier, i) => (
            <TierRow
              key={tier.baseSpe}
              label={tier.label}
              speed={tier.speed}
              scarfSpeed={tier.scarfSpeed}
              isSelected={selectedTierIdx === i && !customTarget.trim()}
              onClick={() => {
                setSelectedTierIdx(i);
                setCustomTarget("");
              }}
            />
          ))}
        </div>
      </div>

      {/* Scarf toggle + custom target */}
      <div className="flex gap-2 mb-3">
        <label className="flex items-center gap-1 text-[10px] text-[#8b9bb4] cursor-pointer">
          <input
            type="checkbox"
            checked={scarfTarget}
            onChange={(e) => { setScarfTarget(e.target.checked); setCustomTarget(""); }}
            className="accent-[#f7a838]"
          />
          Target Scarf variant
        </label>
        <div className="flex-1">
          <input
            type="text"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value.replace(/\D/g, ""))}
            placeholder="Custom target..."
            className="w-full bg-[#1a1c2c] border border-[#3a4466] rounded px-2 py-1 text-[10px] text-[#f0f0e8] placeholder-[#5b6e8f] focus:outline-none focus:border-[#5b6e8f]"
            aria-label="Custom target speed stat"
          />
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-[#1a1c2c] rounded border border-[#3a4466] p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8b9bb4]">
              {result.pokemonName} (Base {result.baseSpe})
            </span>
            <span className="text-[#8b9bb4]">
              Current: <span className="text-[#f0f0e8]">{result.currentSpeed}</span>
            </span>
          </div>
          <p className="text-[10px] text-[#8b9bb4]">
            Target: <span className="text-[#f0f0e8] font-bold">{result.targetSpeed}</span>
            {result.currentSpeed >= result.targetSpeed && (
              <span className="text-[#38b764] ml-2">Already outspeeds!</span>
            )}
          </p>

          <div className="space-y-1.5 pt-1">
            {result.spreads.map((s) => (
              <div
                key={s.natureName}
                className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                  s.evs !== null ? "bg-[#262b44]" : "bg-[#262b44]/50"
                }`}
              >
                <span className={s.evs !== null ? "text-[#f0f0e8]" : "text-[#5b6e8f]"}>
                  {s.natureName}
                </span>
                {s.evs !== null ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[#38b764] font-bold">{s.evs} EVs</span>
                    {s.evs < 252 && (
                      <span className="text-[#8b9bb4]">(saves {252 - s.evs})</span>
                    )}
                    <span className="text-[#8b9bb4]">= {s.resultSpeed} Spe</span>
                  </span>
                ) : (
                  <span className="text-[#e8433f]">Cannot outspeed (max {s.resultSpeed})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
