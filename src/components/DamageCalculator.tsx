"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "@/components/PokeImage";
import { Pokemon, TeamSlot, Nature, EVSpread, IVSpread, WeatherType } from "@/types";
import { useMove } from "@/hooks/useMove";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import {
  calculateDamage,
  getEffectivenessText,
  extractBaseStats,
  calculateKO,
  DamageCalcOptions,
} from "@/utils/damageWasm";
import { calculateHP, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import { NATURES, getNatureLabel } from "@/data/natures";
import { HELD_ITEMS } from "@/data/heldItems";
import LoadingSpinner from "./LoadingSpinner";
import TypeBadge from "./TypeBadge";

interface DamageCalculatorProps {
  team: TeamSlot[];
}

type TerrainType = "electric" | "grassy" | "misty" | "psychic";

const WEATHER_OPTIONS: { value: WeatherType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "sun", label: "Sun" },
  { value: "rain", label: "Rain" },
  { value: "sandstorm", label: "Sandstorm" },
  { value: "hail", label: "Hail" },
];

const TERRAIN_OPTIONS: { value: TerrainType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "electric", label: "Electric" },
  { value: "grassy", label: "Grassy" },
  { value: "psychic", label: "Psychic" },
  { value: "misty", label: "Misty" },
];

const STAT_STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const inputCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const selectCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const lblCls = "block text-[10px] text-[#8b9bb4] mb-0.5";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function NumInput({
  label,
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  return (
    <div>
      <label className={lblCls}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(clamp(parseInt(e.target.value) || min, min, max))
        }
        className={inputCls}
        aria-label={ariaLabel ?? label}
      />
    </div>
  );
}

export default function DamageCalculator({ team }: DamageCalculatorProps) {
  // Core selection
  const [attackerSlotIdx, setAttackerSlotIdx] = useState<number | null>(null);
  const [defender, setDefender] = useState<Pokemon | null>(null);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [defenderSearch, setDefenderSearch] = useState("");
  const [defenderLoading, setDefenderLoading] = useState(false);
  const [showDefenderDropdown, setShowDefenderDropdown] = useState(false);

  // Attacker competitive options
  const [atkLevel, setAtkLevel] = useState(50);
  const [atkNature, setAtkNature] = useState<Nature | null>(null);
  const [atkEvs, setAtkEvs] = useState<EVSpread>({ ...DEFAULT_EVS });
  const [atkIvs, setAtkIvs] = useState<IVSpread>({ ...DEFAULT_IVS });
  const [atkItem, setAtkItem] = useState("");
  const [atkAbility, setAtkAbility] = useState("");
  const [atkStatStage, setAtkStatStage] = useState(0);

  // Defender competitive options
  const [defLevel, setDefLevel] = useState(50);
  const [defNature, setDefNature] = useState<Nature | null>(null);
  const [defEvs, setDefEvs] = useState<EVSpread>({ ...DEFAULT_EVS });
  const [defIvs, setDefIvs] = useState<IVSpread>({ ...DEFAULT_IVS });
  const [defItem, setDefItem] = useState("");
  const [defAbility, setDefAbility] = useState("");
  const [defStatStage, setDefStatStage] = useState(0);

  // Field conditions
  const [weather, setWeather] = useState<WeatherType | "">("");
  const [terrain, setTerrain] = useState<TerrainType | "">("");
  const [reflect, setReflect] = useState(false);
  const [lightScreen, setLightScreen] = useState(false);
  const [criticalHit, setCriticalHit] = useState(false);

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: pokemonList } = usePokemonList();
  const { data: moveData, isLoading: moveLoading } = useMove(selectedMove);

  const attacker =
    attackerSlotIdx !== null
      ? team[attackerSlotIdx]?.pokemon ?? null
      : null;

  const filteredDefenders = useMemo(() => {
    if (!pokemonList || !defenderSearch) return [];
    return pokemonList
      .filter((p) => p.name.includes(defenderSearch.toLowerCase()))
      .slice(0, 8);
  }, [pokemonList, defenderSearch]);

  const handleAttackerSelect = useCallback(
    (idx: number) => {
      setAttackerSlotIdx(idx);
      setSelectedMove(null);
      const slot = team[idx];
      if (slot) {
        setAtkNature(slot.nature ?? null);
        setAtkEvs(slot.evs ?? { ...DEFAULT_EVS });
        setAtkIvs(slot.ivs ?? { ...DEFAULT_IVS });
        setAtkItem(slot.heldItem ?? "");
        setAtkAbility(slot.ability ?? "");
        setAtkLevel(50);
        setAtkStatStage(0);
      }
    },
    [team]
  );

  const handleDefenderSelect = async (name: string) => {
    setDefenderLoading(true);
    setShowDefenderDropdown(false);
    setDefenderSearch(name);
    try {
      const pokemon = await fetchPokemon(name);
      setDefender(pokemon);
      setSelectedMove(null);
      setDefNature(null);
      setDefEvs({ ...DEFAULT_EVS });
      setDefIvs({ ...DEFAULT_IVS });
      setDefItem("");
      setDefAbility("");
      setDefLevel(50);
      setDefStatStage(0);
    } catch {
      // not found
    } finally {
      setDefenderLoading(false);
    }
  };

  const attackerMoves = useMemo(() => {
    if (!attacker) return [];
    return attacker.moves.slice(0, 50).map((m) => m.move.name);
  }, [attacker]);

  const damageResult = useMemo(() => {
    if (!attacker || !defender || !moveData) return null;
    const options: DamageCalcOptions = {
      attackerLevel: atkLevel,
      defenderLevel: defLevel,
      attackerEvs: atkEvs,
      attackerIvs: atkIvs,
      attackerNature: atkNature,
      attackerItem: atkItem || null,
      attackerAbility: atkAbility || null,
      attackerStatStage: atkStatStage,
      defenderEvs: defEvs,
      defenderIvs: defIvs,
      defenderNature: defNature,
      defenderItem: defItem || null,
      defenderAbility: defAbility || null,
      defenderStatStage: defStatStage,
      isCritical: criticalHit,
      fieldWeather: weather || null,
      fieldTerrain: terrain || null,
      defenderSideReflect: reflect,
      defenderSideLightScreen: lightScreen,
    };
    return calculateDamage(attacker, defender, moveData, options);
  }, [
    attacker, defender, moveData,
    atkLevel, atkEvs, atkIvs, atkNature, atkItem, atkAbility, atkStatStage,
    defLevel, defEvs, defIvs, defNature, defItem, defAbility, defStatStage,
    criticalHit, weather, terrain, reflect, lightScreen,
  ]);

  const koResult = useMemo(() => {
    if (!damageResult || !defender || damageResult.max === 0) return null;
    const baseStats = extractBaseStats(defender);
    const defenderMaxHP = calculateHP(
      baseStats.hp,
      defIvs.hp,
      defEvs.hp,
      defLevel
    );
    return calculateKO(damageResult.min, damageResult.max, defenderMaxHP);
  }, [damageResult, defender, defIvs.hp, defEvs.hp, defLevel]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to your team to use the damage calculator
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 sm:p-6">
      <h3 className="mb-4 text-lg font-bold font-pixel">Damage Calculator</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attacker Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            Attacker
          </label>
          <div className="space-y-1">
            {team.map((slot, idx) => (
              <button
                key={slot.pokemon.id}
                onClick={() => handleAttackerSelect(idx)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  attackerSlotIdx === idx
                    ? "bg-[#e8433f] text-[#f0f0e8]"
                    : "bg-[#1a1c2c] hover:bg-[#3a4466]"
                }`}
              >
                {slot.pokemon.sprites.front_default && (
                  <Image
                    src={slot.pokemon.sprites.front_default}
                    alt={slot.pokemon.name}
                    width={28}
                    height={28}
                    unoptimized
                  />
                )}
                <span className="capitalize">{slot.pokemon.name}</span>
              </button>
            ))}
          </div>

          {attacker && (
            <div className="space-y-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="Level"
                  value={atkLevel}
                  min={1}
                  max={100}
                  onChange={setAtkLevel}
                  ariaLabel="Attacker level"
                />
                <div>
                  <label className={lblCls}>Nature</label>
                  <select
                    value={atkNature?.name ?? ""}
                    onChange={(e) => {
                      const nature = NATURES.find(
                        (n) => n.name === e.target.value
                      );
                      setAtkNature(nature ?? null);
                    }}
                    className={selectCls}
                    aria-label="Attacker nature"
                  >
                    <option value="">None</option>
                    {NATURES.map((n) => (
                      <option key={n.name} value={n.name}>
                        {getNatureLabel(n)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="Atk EVs"
                  value={atkEvs.attack}
                  min={0}
                  max={252}
                  onChange={(v) =>
                    setAtkEvs((prev) => ({ ...prev, attack: v }))
                  }
                  ariaLabel="Attacker attack EVs"
                />
                <NumInput
                  label="SpA EVs"
                  value={atkEvs.spAtk}
                  min={0}
                  max={252}
                  onChange={(v) =>
                    setAtkEvs((prev) => ({ ...prev, spAtk: v }))
                  }
                  ariaLabel="Attacker special attack EVs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="Atk IVs"
                  value={atkIvs.attack}
                  min={0}
                  max={31}
                  onChange={(v) =>
                    setAtkIvs((prev) => ({ ...prev, attack: v }))
                  }
                  ariaLabel="Attacker attack IVs"
                />
                <NumInput
                  label="SpA IVs"
                  value={atkIvs.spAtk}
                  min={0}
                  max={31}
                  onChange={(v) =>
                    setAtkIvs((prev) => ({ ...prev, spAtk: v }))
                  }
                  ariaLabel="Attacker special attack IVs"
                />
              </div>
              <div>
                <label className={lblCls}>Held Item</label>
                <select
                  value={atkItem}
                  onChange={(e) => setAtkItem(e.target.value)}
                  className={selectCls}
                  aria-label="Attacker held item"
                >
                  <option value="">None</option>
                  {HELD_ITEMS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lblCls}>Ability</label>
                <input
                  type="text"
                  value={atkAbility}
                  onChange={(e) => setAtkAbility(e.target.value)}
                  placeholder="e.g. huge-power"
                  className={inputCls}
                  aria-label="Attacker ability"
                />
              </div>
            </div>
          )}
        </div>

        {/* Move + Advanced Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            Move
          </label>
          {attacker ? (
            <select
              value={selectedMove ?? ""}
              onChange={(e) => setSelectedMove(e.target.value || null)}
              className={`${selectCls} py-2`}
              aria-label="Select a move"
            >
              <option value="">Select a move...</option>
              {attackerMoves.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-[#8b9bb4]">Select an attacker first</p>
          )}

          {moveData && (
            <div className="space-y-1 text-xs text-[#8b9bb4]">
              <div className="flex items-center gap-2">
                <TypeBadge type={moveData.type.name} size="sm" />
                <span className="capitalize">
                  {moveData.damage_class.name}
                </span>
              </div>
              <p>Power: {moveData.power ?? "\u2014"}</p>
            </div>
          )}
          {moveLoading && <LoadingSpinner size={20} />}

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
            aria-expanded={showAdvanced}
            aria-controls="advanced-options"
          >
            <span>Advanced Options</span>
            <span className="text-[10px]">
              {showAdvanced ? "\u25B2" : "\u25BC"}
            </span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                id="advanced-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lblCls}>Atk Stage</label>
                      <select
                        value={atkStatStage}
                        onChange={(e) =>
                          setAtkStatStage(parseInt(e.target.value))
                        }
                        className={selectCls}
                        aria-label="Attacker stat stage"
                      >
                        {STAT_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s > 0 ? `+${s}` : `${s}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lblCls}>Def Stage</label>
                      <select
                        value={defStatStage}
                        onChange={(e) =>
                          setDefStatStage(parseInt(e.target.value))
                        }
                        className={selectCls}
                        aria-label="Defender stat stage"
                      >
                        {STAT_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s > 0 ? `+${s}` : `${s}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lblCls}>Weather</label>
                      <select
                        value={weather}
                        onChange={(e) =>
                          setWeather(e.target.value as WeatherType | "")
                        }
                        className={selectCls}
                        aria-label="Weather condition"
                      >
                        {WEATHER_OPTIONS.map((w) => (
                          <option key={w.value} value={w.value}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lblCls}>Terrain</label>
                      <select
                        value={terrain}
                        onChange={(e) =>
                          setTerrain(e.target.value as TerrainType | "")
                        }
                        className={selectCls}
                        aria-label="Terrain condition"
                      >
                        {TERRAIN_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reflect}
                        onChange={(e) => setReflect(e.target.checked)}
                        className="accent-[#e8433f]"
                      />
                      Reflect
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lightScreen}
                        onChange={(e) => setLightScreen(e.target.checked)}
                        className="accent-[#e8433f]"
                      />
                      Light Screen
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#8b9bb4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={criticalHit}
                        onChange={(e) => setCriticalHit(e.target.checked)}
                        className="accent-[#e8433f]"
                      />
                      Critical Hit
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Defender Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            Defender
          </label>
          <div className="relative">
            <input
              type="text"
              value={defenderSearch}
              onChange={(e) => {
                setDefenderSearch(e.target.value);
                setShowDefenderDropdown(true);
              }}
              onFocus={() => setShowDefenderDropdown(true)}
              placeholder="Search any Pokemon..."
              className={`${inputCls} py-2 placeholder-[#8b9bb4]`}
            />
            {showDefenderDropdown && filteredDefenders.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-48 overflow-y-auto">
                {filteredDefenders.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleDefenderSelect(p.name)}
                    className="w-full px-3 py-2 text-left text-sm capitalize hover:bg-[#3a4466] transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {defenderLoading && (
            <div className="mt-2">
              <LoadingSpinner size={20} />
            </div>
          )}
          {defender && (
            <>
              <div className="flex items-center gap-2">
                {defender.sprites.front_default && (
                  <Image
                    src={defender.sprites.front_default}
                    alt={defender.name}
                    width={48}
                    height={48}
                    unoptimized
                  />
                )}
                <div>
                  <p className="capitalize font-medium">{defender.name}</p>
                  <div className="flex gap-1">
                    {defender.types.map((t) => (
                      <TypeBadge
                        key={t.type.name}
                        type={t.type.name}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput
                    label="Level"
                    value={defLevel}
                    min={1}
                    max={100}
                    onChange={setDefLevel}
                    ariaLabel="Defender level"
                  />
                  <div>
                    <label className={lblCls}>Nature</label>
                    <select
                      value={defNature?.name ?? ""}
                      onChange={(e) => {
                        const nature = NATURES.find(
                          (n) => n.name === e.target.value
                        );
                        setDefNature(nature ?? null);
                      }}
                      className={selectCls}
                      aria-label="Defender nature"
                    >
                      <option value="">None</option>
                      {NATURES.map((n) => (
                        <option key={n.name} value={n.name}>
                          {getNatureLabel(n)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumInput
                    label="HP EVs"
                    value={defEvs.hp}
                    min={0}
                    max={252}
                    onChange={(v) =>
                      setDefEvs((prev) => ({ ...prev, hp: v }))
                    }
                    ariaLabel="Defender HP EVs"
                  />
                  <NumInput
                    label="Def EVs"
                    value={defEvs.defense}
                    min={0}
                    max={252}
                    onChange={(v) =>
                      setDefEvs((prev) => ({ ...prev, defense: v }))
                    }
                    ariaLabel="Defender defense EVs"
                  />
                  <NumInput
                    label="SpD EVs"
                    value={defEvs.spDef}
                    min={0}
                    max={252}
                    onChange={(v) =>
                      setDefEvs((prev) => ({ ...prev, spDef: v }))
                    }
                    ariaLabel="Defender special defense EVs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumInput
                    label="HP IVs"
                    value={defIvs.hp}
                    min={0}
                    max={31}
                    onChange={(v) =>
                      setDefIvs((prev) => ({ ...prev, hp: v }))
                    }
                    ariaLabel="Defender HP IVs"
                  />
                  <NumInput
                    label="Def IVs"
                    value={defIvs.defense}
                    min={0}
                    max={31}
                    onChange={(v) =>
                      setDefIvs((prev) => ({ ...prev, defense: v }))
                    }
                    ariaLabel="Defender defense IVs"
                  />
                  <NumInput
                    label="SpD IVs"
                    value={defIvs.spDef}
                    min={0}
                    max={31}
                    onChange={(v) =>
                      setDefIvs((prev) => ({ ...prev, spDef: v }))
                    }
                    ariaLabel="Defender special defense IVs"
                  />
                </div>
                <div>
                  <label className={lblCls}>Held Item</label>
                  <select
                    value={defItem}
                    onChange={(e) => setDefItem(e.target.value)}
                    className={selectCls}
                    aria-label="Defender held item"
                  >
                    <option value="">None</option>
                    {HELD_ITEMS.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lblCls}>Ability</label>
                  <input
                    type="text"
                    value={defAbility}
                    onChange={(e) => setDefAbility(e.target.value)}
                    placeholder="e.g. multiscale"
                    className={inputCls}
                    aria-label="Defender ability"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {damageResult && attacker && defender && moveData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-4"
          >
            {damageResult.max === 0 ? (
              <p className="text-[#8b9bb4]">
                {moveData.damage_class.name === "status"
                  ? "Status moves don't deal direct damage."
                  : `${getEffectivenessText(damageResult.effectiveness)}`}
              </p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {attacker.name}
                  </span>
                  &apos;s{" "}
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {moveData.name.replace(/-/g, " ")}
                  </span>{" "}
                  deals{" "}
                  <span className="font-bold text-[#e8433f]">
                    {damageResult.min}-{damageResult.max}
                  </span>{" "}
                  damage to{" "}
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {defender.name}
                  </span>{" "}
                  <span
                    className={`font-semibold ${
                      damageResult.effectiveness > 1
                        ? "text-[#38b764]"
                        : damageResult.effectiveness < 1
                        ? "text-[#e8433f]"
                        : "text-[#8b9bb4]"
                    }`}
                  >
                    ({getEffectivenessText(damageResult.effectiveness)})
                  </span>
                  {damageResult.stab && (
                    <span className="ml-1 text-xs text-[#f7a838]">
                      [STAB]
                    </span>
                  )}
                  {damageResult.isCritical && (
                    <span className="ml-1 text-xs text-[#f7a838]">
                      [CRIT]
                    </span>
                  )}
                </p>
                {koResult && (
                  <div className="mt-2 text-sm">
                    <span className="text-[#8b9bb4]">
                      ({koResult.hpPercent.min}% - {koResult.hpPercent.max}%)
                    </span>
                    <span className="ml-2 font-semibold text-[#f7a838]">
                      {koResult.koText}
                    </span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
