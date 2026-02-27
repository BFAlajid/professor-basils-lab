"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { TeamSlot } from "@/types";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import { extractBaseStats } from "@/utils/damageWasm";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";

interface SpeedTierChartProps {
  team: TeamSlot[];
}

const DEFAULT_THREATS = [
  { name: "Dragapult", baseSpe: 142 },
  { name: "Weavile", baseSpe: 125 },
  { name: "Garchomp", baseSpe: 102 },
  { name: "Volcarona", baseSpe: 100 },
  { name: "Excadrill", baseSpe: 88 },
  { name: "Toxapex", baseSpe: 35 },
  { name: "Ferrothorn", baseSpe: 20 },
];

function calcMaxSpeed(baseSpe: number, mult: number = 1): number {
  return Math.floor(
    Math.floor((2 * baseSpe + 31 + 252 / 4) * 50 / 100 + 5) * 1.1 * mult
  );
}

function calcMinSpeedEvs(baseSpe: number, iv: number, natureMult: number, targetSpeed: number): number | null {
  // We need: floor(floor((2*base + iv + floor(ev/4)) * 50/100 + 5) * natureMult) >= targetSpeed
  for (let ev = 0; ev <= 252; ev += 4) {
    const stat = Math.floor(
      Math.floor((2 * baseSpe + iv + Math.floor(ev / 4)) * 50 / 100 + 5) * natureMult
    );
    if (stat >= targetSpeed) return ev;
  }
  return null;
}

type SpeedModifier = "base" | "+1" | "scarf" | "paralyzed" | "tailwind";

const MODIFIER_OPTIONS: { key: SpeedModifier; label: string; mult: number }[] = [
  { key: "base", label: "Base", mult: 1 },
  { key: "+1", label: "+1", mult: 1.5 },
  { key: "scarf", label: "Scarf", mult: 1.5 },
  { key: "paralyzed", label: "Paralyzed", mult: 0.5 },
  { key: "tailwind", label: "Tailwind", mult: 2 },
];

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SpeedTierChart({ team }: SpeedTierChartProps) {
  const [modifier, setModifier] = useState<SpeedModifier>("base");
  const [customThreats, setCustomThreats] = useState(DEFAULT_THREATS);
  const [threatQuery, setThreatQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [optimizerTeamIdx, setOptimizerTeamIdx] = useState(0);
  const [optimizerThreatIdx, setOptimizerThreatIdx] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: pokemonList } = usePokemonList();

  const mult = MODIFIER_OPTIONS.find((m) => m.key === modifier)!.mult;

  const threatEntries = useMemo(() =>
    customThreats.map((t) => ({
      name: t.name,
      speed: calcMaxSpeed(t.baseSpe),
      baseSpe: t.baseSpe,
      isThreat: true as const,
    })),
    [customThreats]
  );

  const entries = useMemo(() => {
    const teamEntries = team.map((slot) => {
      const baseStats = extractBaseStats(slot.pokemon);
      const ivs = slot.ivs ?? DEFAULT_IVS;
      const evs = slot.evs ?? DEFAULT_EVS;
      const nature = slot.nature ?? null;
      const calc = calculateAllStats(baseStats, ivs, evs, nature);
      const adjustedSpeed = Math.floor(calc.speed * mult);

      return {
        name: formatName(slot.pokemon.name),
        speed: adjustedSpeed,
        baseSpe: baseStats.speed,
        isThreat: false as const,
      };
    });

    const all = [...teamEntries, ...threatEntries];
    all.sort((a, b) => b.speed - a.speed);
    return all;
  }, [team, mult, threatEntries]);

  const maxSpeed = entries.length > 0 ? entries[0].speed : 1;

  const filteredPokemon = useMemo(() => {
    if (!threatQuery.trim() || !pokemonList) return [];
    const q = threatQuery.toLowerCase();
    return pokemonList
      .filter((p: { name: string }) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [threatQuery, pokemonList]);

  const handleAddThreat = useCallback(async (name: string) => {
    if (customThreats.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setThreatQuery("");
      setShowDropdown(false);
      return;
    }
    try {
      const pokemon = await fetchPokemon(name);
      const baseSpe = pokemon.stats.find((s: { stat: { name: string } }) => s.stat.name === "speed")?.base_stat ?? 0;
      setCustomThreats((prev) => [...prev, { name: formatName(pokemon.name), baseSpe }]);
    } catch { /* ignore */ }
    setThreatQuery("");
    setShowDropdown(false);
  }, [customThreats]);

  const handleRemoveThreat = useCallback((idx: number) => {
    setCustomThreats((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Speed EV optimizer calculation
  const optimizerResult = useMemo(() => {
    if (team.length === 0 || customThreats.length === 0) return null;
    const slot = team[optimizerTeamIdx];
    const threat = customThreats[optimizerThreatIdx];
    if (!slot || !threat) return null;

    const baseStats = extractBaseStats(slot.pokemon);
    const targetSpeed = calcMaxSpeed(threat.baseSpe, mult) + 1;
    const iv = slot.ivs?.speed ?? 31;

    // Try with +Spe nature (1.1x)
    const withPositive = calcMinSpeedEvs(baseStats.speed, iv, 1.1 * mult, targetSpeed);
    // Try with neutral nature (1.0x)
    const withNeutral = calcMinSpeedEvs(baseStats.speed, iv, 1.0 * mult, targetSpeed);

    return { targetSpeed, withPositive, withNeutral, baseSpe: baseStats.speed, pokemonName: formatName(slot.pokemon.name), threatName: threat.name };
  }, [team, customThreats, optimizerTeamIdx, optimizerThreatIdx, mult]);

  if (team.length === 0) {
    return (
      <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
        <h3 className="text-[#f0f0e8] text-sm mb-2">Speed Tiers</h3>
        <p className="text-[#8b9bb4] text-xs">
          Add Pokemon to your team to compare speed tiers.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#262b44] border border-[#3a4466] rounded-lg p-4 font-pixel">
      <h3 className="text-[#f0f0e8] text-sm mb-3">Speed Tiers</h3>

      {/* Modifier toggles */}
      <div className="flex flex-wrap gap-2 mb-3">
        {MODIFIER_OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded border transition-colors ${
              modifier === opt.key
                ? "bg-[#3a4466] border-[#5b6e8f] text-[#f0f0e8]"
                : "border-[#3a4466] text-[#8b9bb4] hover:border-[#5b6e8f]"
            }`}
          >
            <input
              type="radio"
              name="speed-modifier"
              value={opt.key}
              checked={modifier === opt.key}
              onChange={() => setModifier(opt.key)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Custom threat search + tags */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {customThreats.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-[#3a4466] text-[#e8433f]">
              {t.name}
              <button
                type="button"
                onClick={() => handleRemoveThreat(i)}
                className="text-[#8b9bb4] hover:text-[#f0f0e8] ml-0.5"
                aria-label={`Remove ${t.name}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={threatQuery}
            onChange={(e) => { setThreatQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Add threat..."
            className="w-full bg-[#1a1c2c] border border-[#3a4466] rounded px-2 py-1 text-[10px] text-[#f0f0e8] placeholder-[#5b6e8f] focus:outline-none focus:border-[#5b6e8f]"
            aria-label="Search for a threat Pokemon to add"
          />
          {showDropdown && filteredPokemon.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[#262b44] border border-[#3a4466] rounded shadow-lg max-h-36 overflow-y-auto">
              {filteredPokemon.map((p: { name: string }) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handleAddThreat(p.name)}
                  className="w-full text-left px-2 py-1 text-[10px] text-[#f0f0e8] hover:bg-[#3a4466] transition-colors"
                >
                  {formatName(p.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Speed bars */}
      <div className="space-y-1.5">
        {entries.map((entry, i) => {
          const pct = maxSpeed > 0 ? (entry.speed / maxSpeed) * 100 : 0;
          const isTeam = !entry.isThreat;

          return (
            <div key={`${entry.name}-${entry.isThreat}-${i}`} className="flex items-center gap-2">
              <span
                className={`text-xs w-24 truncate text-right shrink-0 ${
                  isTeam ? "text-[#f0f0e8]" : "text-[#e8433f]"
                }`}
                title={entry.name}
              >
                {entry.name}
              </span>
              <div className="flex-1 h-4 bg-[#1a1c2c] rounded-sm overflow-hidden relative">
                <motion.div
                  className="h-full rounded-sm"
                  style={{
                    backgroundColor: isTeam ? "#38b764" : "#e8433f33",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span
                className={`text-xs w-8 text-right shrink-0 tabular-nums ${
                  isTeam ? "text-[#f0f0e8]" : "text-[#e8433f]"
                }`}
              >
                {entry.speed}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-[#8b9bb4]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-[#38b764]" />
          Your team
          {modifier !== "base" && (
            <span className="text-[#5b6e8f]">
              {" "}({MODIFIER_OPTIONS.find((m) => m.key === modifier)!.label})
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-[#e8433f33]" />
          Threats (max speed)
        </span>
      </div>

      {/* Speed EV Optimizer */}
      {team.length > 0 && customThreats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#3a4466]">
          <h4 className="text-[10px] text-[#f0f0e8] mb-2 uppercase tracking-wider">Speed EV Optimizer</h4>
          <div className="flex gap-2 mb-2">
            <select
              value={optimizerTeamIdx}
              onChange={(e) => setOptimizerTeamIdx(Number(e.target.value))}
              className="flex-1 bg-[#1a1c2c] border border-[#3a4466] rounded px-2 py-1 text-[10px] text-[#f0f0e8]"
              aria-label="Select team member"
            >
              {team.map((s, i) => (
                <option key={i} value={i}>{formatName(s.pokemon.name)}</option>
              ))}
            </select>
            <span className="text-[10px] text-[#8b9bb4] self-center">outspeeds</span>
            <select
              value={optimizerThreatIdx}
              onChange={(e) => setOptimizerThreatIdx(Number(e.target.value))}
              className="flex-1 bg-[#1a1c2c] border border-[#3a4466] rounded px-2 py-1 text-[10px] text-[#f0f0e8]"
              aria-label="Select threat to outspeed"
            >
              {customThreats.map((t, i) => (
                <option key={i} value={i}>{t.name}</option>
              ))}
            </select>
          </div>
          {optimizerResult && (
            <div className="bg-[#1a1c2c] rounded p-2 text-[10px] space-y-1">
              <p className="text-[#8b9bb4]">
                Target speed: <span className="text-[#f0f0e8]">{optimizerResult.targetSpeed}</span> (to outspeed max {optimizerResult.threatName})
              </p>
              {optimizerResult.withPositive !== null ? (
                <p className="text-[#38b764]">
                  +Spe nature: <span className="font-bold">{optimizerResult.withPositive} EVs</span>
                  {optimizerResult.withPositive < 252 && (
                    <span className="text-[#8b9bb4]"> (saves {252 - optimizerResult.withPositive})</span>
                  )}
                </p>
              ) : (
                <p className="text-[#e8433f]">+Spe nature: Cannot outspeed even at 252 EVs</p>
              )}
              {optimizerResult.withNeutral !== null ? (
                <p className="text-[#f7a838]">
                  Neutral nature: <span className="font-bold">{optimizerResult.withNeutral} EVs</span>
                  {optimizerResult.withNeutral < 252 && (
                    <span className="text-[#8b9bb4]"> (saves {252 - optimizerResult.withNeutral})</span>
                  )}
                </p>
              ) : (
                <p className="text-[#e8433f]">Neutral nature: Cannot outspeed even at 252 EVs</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
