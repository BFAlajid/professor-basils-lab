"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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

type CalcMode = "offensive" | "defensive";
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
  // Mode toggle
  const [mode, setMode] = useState<CalcMode>("offensive");

  // Core selection
  const [teamSlotIdx, setTeamSlotIdx] = useState<number | null>(null);
  const [searchedPokemon, setSearchedPokemon] = useState<Pokemon | null>(null);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const blurTimer = useRef<NodeJS.Timeout | null>(null);

  // Team-side competitive options (attacker in offensive, defender in defensive)
  const [teamLevel, setTeamLevel] = useState(50);
  const [teamNature, setTeamNature] = useState<Nature | null>(null);
  const [teamEvs, setTeamEvs] = useState<EVSpread>({ ...DEFAULT_EVS });
  const [teamIvs, setTeamIvs] = useState<IVSpread>({ ...DEFAULT_IVS });
  const [teamItem, setTeamItem] = useState("");
  const [teamAbility, setTeamAbility] = useState("");
  const [teamStatStage, setTeamStatStage] = useState(0);

  // Search-side competitive options (defender in offensive, attacker in defensive)
  const [searchLevel, setSearchLevel] = useState(50);
  const [searchNature, setSearchNature] = useState<Nature | null>(null);
  const [searchEvs, setSearchEvs] = useState<EVSpread>({ ...DEFAULT_EVS });
  const [searchIvs, setSearchIvs] = useState<IVSpread>({ ...DEFAULT_IVS });
  const [searchItem, setSearchItem] = useState("");
  const [searchAbility, setSearchAbility] = useState("");
  const [searchStatStage, setSearchStatStage] = useState(0);

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

  const teamPokemon =
    teamSlotIdx !== null ? team[teamSlotIdx]?.pokemon ?? null : null;

  const isOffensive = mode === "offensive";
  // In offensive mode: attacker = team, defender = searched
  // In defensive mode: attacker = searched, defender = team
  const attacker = isOffensive ? teamPokemon : searchedPokemon;
  const defender = isOffensive ? searchedPokemon : teamPokemon;

  const filteredResults = useMemo(() => {
    if (!pokemonList || !searchText) return [];
    return pokemonList
      .filter((p) => p.name.includes(searchText.toLowerCase()))
      .slice(0, 8);
  }, [pokemonList, searchText]);

  const handleTeamSelect = useCallback(
    (idx: number) => {
      setTeamSlotIdx(idx);
      setSelectedMove(null);
      const slot = team[idx];
      if (slot) {
        setTeamNature(slot.nature ?? null);
        setTeamEvs(slot.evs ?? { ...DEFAULT_EVS });
        setTeamIvs(slot.ivs ?? { ...DEFAULT_IVS });
        setTeamItem(slot.heldItem ?? "");
        setTeamAbility(slot.ability ?? "");
        setTeamLevel(50);
        setTeamStatStage(0);
      }
    },
    [team]
  );

  const handleSearchSelect = async (name: string) => {
    setSearchLoading(true);
    setShowDropdown(false);
    setSearchText(name);
    try {
      const pokemon = await fetchPokemon(name);
      setSearchedPokemon(pokemon);
      setSelectedMove(null);
      setSearchNature(null);
      setSearchEvs({ ...DEFAULT_EVS });
      setSearchIvs({ ...DEFAULT_IVS });
      setSearchItem("");
      setSearchAbility("");
      setSearchLevel(50);
      setSearchStatStage(0);
    } catch {
      // not found
    } finally {
      setSearchLoading(false);
    }
  };

  // In offensive mode, moves come from the team Pokemon (attacker)
  // In defensive mode, moves come from the searched Pokemon (attacker)
  const moveSource = isOffensive ? teamPokemon : searchedPokemon;
  const attackerMoves = useMemo(() => {
    if (!moveSource) return [];
    return moveSource.moves.slice(0, 50).map((m) => m.move.name);
  }, [moveSource]);

  const damageResult = useMemo(() => {
    if (!attacker || !defender || !moveData) return null;

    const atkLevel = isOffensive ? teamLevel : searchLevel;
    const atkEvs = isOffensive ? teamEvs : searchEvs;
    const atkIvs = isOffensive ? teamIvs : searchIvs;
    const atkNature = isOffensive ? teamNature : searchNature;
    const atkItem = isOffensive ? teamItem : searchItem;
    const atkAbility = isOffensive ? teamAbility : searchAbility;
    const atkStage = isOffensive ? teamStatStage : searchStatStage;

    const defLvl = isOffensive ? searchLevel : teamLevel;
    const defEv = isOffensive ? searchEvs : teamEvs;
    const defIv = isOffensive ? searchIvs : teamIvs;
    const defNat = isOffensive ? searchNature : teamNature;
    const defItm = isOffensive ? searchItem : teamItem;
    const defAbl = isOffensive ? searchAbility : teamAbility;
    const defStg = isOffensive ? searchStatStage : teamStatStage;

    const options: DamageCalcOptions = {
      attackerLevel: atkLevel,
      defenderLevel: defLvl,
      attackerEvs: atkEvs,
      attackerIvs: atkIvs,
      attackerNature: atkNature,
      attackerItem: atkItem || null,
      attackerAbility: atkAbility || null,
      attackerStatStage: atkStage,
      defenderEvs: defEv,
      defenderIvs: defIv,
      defenderNature: defNat,
      defenderItem: defItm || null,
      defenderAbility: defAbl || null,
      defenderStatStage: defStg,
      isCritical: criticalHit,
      fieldWeather: weather || null,
      fieldTerrain: terrain || null,
      defenderSideReflect: reflect,
      defenderSideLightScreen: lightScreen,
    };
    return calculateDamage(attacker, defender, moveData, options);
  }, [
    attacker, defender, moveData, isOffensive,
    teamLevel, teamEvs, teamIvs, teamNature, teamItem, teamAbility, teamStatStage,
    searchLevel, searchEvs, searchIvs, searchNature, searchItem, searchAbility, searchStatStage,
    criticalHit, weather, terrain, reflect, lightScreen,
  ]);

  const koResult = useMemo(() => {
    if (!damageResult || !defender || damageResult.max === 0) return null;
    const defLvl = isOffensive ? searchLevel : teamLevel;
    const defEv = isOffensive ? searchEvs : teamEvs;
    const defIv = isOffensive ? searchIvs : teamIvs;
    const baseStats = extractBaseStats(defender);
    const defenderMaxHP = calculateHP(
      baseStats.hp,
      defIv.hp,
      defEv.hp,
      defLvl
    );
    return calculateKO(damageResult.min, damageResult.max, defenderMaxHP);
  }, [damageResult, defender, isOffensive, searchLevel, searchEvs.hp, searchIvs.hp, teamLevel, teamEvs.hp, teamIvs.hp]);

  const handleModeToggle = useCallback(() => {
    setMode((prev) => (prev === "offensive" ? "defensive" : "offensive"));
    setSelectedMove(null);
  }, []);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to your team to use the damage calculator
      </div>
    );
  }

  const teamLabel = isOffensive ? "Attacker" : "Defender";
  const searchLabel = isOffensive ? "Defender" : "Attacker";
  const searchPlaceholder = isOffensive
    ? "Search any Pokemon..."
    : "Search attacking Pokemon...";

  // Build team-side stat panel based on mode
  const teamStatPanel = (
    <div className="space-y-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
      <div className="grid grid-cols-2 gap-2">
        <NumInput
          label="Level"
          value={teamLevel}
          min={1}
          max={100}
          onChange={setTeamLevel}
          ariaLabel={`${teamLabel} level`}
        />
        <div>
          <label className={lblCls}>Nature</label>
          <select
            value={teamNature?.name ?? ""}
            onChange={(e) => {
              const nature = NATURES.find((n) => n.name === e.target.value);
              setTeamNature(nature ?? null);
            }}
            className={selectCls}
            aria-label={`${teamLabel} nature`}
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

      {isOffensive ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk EVs" value={teamEvs.attack} min={0} max={252}
              onChange={(v) => setTeamEvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${teamLabel} attack EVs`} />
            <NumInput label="SpA EVs" value={teamEvs.spAtk} min={0} max={252}
              onChange={(v) => setTeamEvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${teamLabel} special attack EVs`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk IVs" value={teamIvs.attack} min={0} max={31}
              onChange={(v) => setTeamIvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${teamLabel} attack IVs`} />
            <NumInput label="SpA IVs" value={teamIvs.spAtk} min={0} max={31}
              onChange={(v) => setTeamIvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${teamLabel} special attack IVs`} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP EVs" value={teamEvs.hp} min={0} max={252}
              onChange={(v) => setTeamEvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${teamLabel} HP EVs`} />
            <NumInput label="Def EVs" value={teamEvs.defense} min={0} max={252}
              onChange={(v) => setTeamEvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${teamLabel} defense EVs`} />
            <NumInput label="SpD EVs" value={teamEvs.spDef} min={0} max={252}
              onChange={(v) => setTeamEvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${teamLabel} special defense EVs`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP IVs" value={teamIvs.hp} min={0} max={31}
              onChange={(v) => setTeamIvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${teamLabel} HP IVs`} />
            <NumInput label="Def IVs" value={teamIvs.defense} min={0} max={31}
              onChange={(v) => setTeamIvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${teamLabel} defense IVs`} />
            <NumInput label="SpD IVs" value={teamIvs.spDef} min={0} max={31}
              onChange={(v) => setTeamIvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${teamLabel} special defense IVs`} />
          </div>
        </>
      )}

      <div>
        <label className={lblCls}>Held Item</label>
        <select
          value={teamItem}
          onChange={(e) => setTeamItem(e.target.value)}
          className={selectCls}
          aria-label={`${teamLabel} held item`}
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
          value={teamAbility}
          onChange={(e) => setTeamAbility(e.target.value)}
          placeholder={isOffensive ? "e.g. huge-power" : "e.g. multiscale"}
          className={inputCls}
          aria-label={`${teamLabel} ability`}
        />
      </div>
    </div>
  );

  // Build search-side stat panel
  const searchStatPanel = searchedPokemon && (
    <div className="space-y-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
      <div className="grid grid-cols-2 gap-2">
        <NumInput
          label="Level"
          value={searchLevel}
          min={1}
          max={100}
          onChange={setSearchLevel}
          ariaLabel={`${searchLabel} level`}
        />
        <div>
          <label className={lblCls}>Nature</label>
          <select
            value={searchNature?.name ?? ""}
            onChange={(e) => {
              const nature = NATURES.find((n) => n.name === e.target.value);
              setSearchNature(nature ?? null);
            }}
            className={selectCls}
            aria-label={`${searchLabel} nature`}
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

      {isOffensive ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP EVs" value={searchEvs.hp} min={0} max={252}
              onChange={(v) => setSearchEvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${searchLabel} HP EVs`} />
            <NumInput label="Def EVs" value={searchEvs.defense} min={0} max={252}
              onChange={(v) => setSearchEvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${searchLabel} defense EVs`} />
            <NumInput label="SpD EVs" value={searchEvs.spDef} min={0} max={252}
              onChange={(v) => setSearchEvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${searchLabel} special defense EVs`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumInput label="HP IVs" value={searchIvs.hp} min={0} max={31}
              onChange={(v) => setSearchIvs((prev) => ({ ...prev, hp: v }))}
              ariaLabel={`${searchLabel} HP IVs`} />
            <NumInput label="Def IVs" value={searchIvs.defense} min={0} max={31}
              onChange={(v) => setSearchIvs((prev) => ({ ...prev, defense: v }))}
              ariaLabel={`${searchLabel} defense IVs`} />
            <NumInput label="SpD IVs" value={searchIvs.spDef} min={0} max={31}
              onChange={(v) => setSearchIvs((prev) => ({ ...prev, spDef: v }))}
              ariaLabel={`${searchLabel} special defense IVs`} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk EVs" value={searchEvs.attack} min={0} max={252}
              onChange={(v) => setSearchEvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${searchLabel} attack EVs`} />
            <NumInput label="SpA EVs" value={searchEvs.spAtk} min={0} max={252}
              onChange={(v) => setSearchEvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${searchLabel} special attack EVs`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Atk IVs" value={searchIvs.attack} min={0} max={31}
              onChange={(v) => setSearchIvs((prev) => ({ ...prev, attack: v }))}
              ariaLabel={`${searchLabel} attack IVs`} />
            <NumInput label="SpA IVs" value={searchIvs.spAtk} min={0} max={31}
              onChange={(v) => setSearchIvs((prev) => ({ ...prev, spAtk: v }))}
              ariaLabel={`${searchLabel} special attack IVs`} />
          </div>
        </>
      )}

      <div>
        <label className={lblCls}>Held Item</label>
        <select
          value={searchItem}
          onChange={(e) => setSearchItem(e.target.value)}
          className={selectCls}
          aria-label={`${searchLabel} held item`}
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
          value={searchAbility}
          onChange={(e) => setSearchAbility(e.target.value)}
          placeholder={isOffensive ? "e.g. multiscale" : "e.g. huge-power"}
          className={inputCls}
          aria-label={`${searchLabel} ability`}
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 sm:p-6">
      {/* Header with mode toggle */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold font-pixel">Damage Calculator</h3>
        <button
          onClick={handleModeToggle}
          className="flex items-center gap-2 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs font-pixel transition-colors hover:border-[#e8433f]"
          aria-label={`Switch to ${isOffensive ? "defensive" : "offensive"} mode`}
        >
          <span className={isOffensive ? "text-[#e8433f] font-bold" : "text-[#8b9bb4]"}>
            Offensive
          </span>
          <span className="text-[#8b9bb4]">{"\u2194"}</span>
          <span className={!isOffensive ? "text-[#6390F0] font-bold" : "text-[#8b9bb4]"}>
            Defensive
          </span>
        </button>
      </div>

      {!isOffensive && (
        <p className="mb-4 text-[10px] text-[#8b9bb4]">
          Select your Pokemon as the defender, then search for the attacking Pokemon and move to see how much damage you take.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Team Pokemon Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            {teamLabel}
            <span className="ml-1 text-[10px] font-normal">(Your Team)</span>
          </label>
          <div className="space-y-1">
            {team.map((slot, idx) => (
              <button
                key={slot.pokemon.id}
                onClick={() => handleTeamSelect(idx)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  teamSlotIdx === idx
                    ? isOffensive ? "bg-[#e8433f] text-[#f0f0e8]" : "bg-[#6390F0] text-[#f0f0e8]"
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

          {teamPokemon && teamStatPanel}
        </div>

        {/* Move + Advanced Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            Move
          </label>
          {moveSource ? (
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
            <p className="text-sm text-[#8b9bb4]">
              {isOffensive ? "Select an attacker first" : "Search an attacking Pokemon first"}
            </p>
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
                        value={isOffensive ? teamStatStage : searchStatStage}
                        onChange={(e) =>
                          isOffensive
                            ? setTeamStatStage(parseInt(e.target.value))
                            : setSearchStatStage(parseInt(e.target.value))
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
                        value={isOffensive ? searchStatStage : teamStatStage}
                        onChange={(e) =>
                          isOffensive
                            ? setSearchStatStage(parseInt(e.target.value))
                            : setTeamStatStage(parseInt(e.target.value))
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

        {/* Search Pokemon Panel */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8b9bb4]">
            {searchLabel}
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowDropdown(true);
                setHighlightedIdx(-1);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setShowDropdown(false), 150);
              }}
              onKeyDown={(e) => {
                if (!showDropdown || filteredResults.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIdx((prev) => Math.min(prev + 1, filteredResults.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIdx((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter" && highlightedIdx >= 0) {
                  e.preventDefault();
                  handleSearchSelect(filteredResults[highlightedIdx].name);
                } else if (e.key === "Escape") {
                  setShowDropdown(false);
                }
              }}
              placeholder={searchPlaceholder}
              className={`${inputCls} py-2 placeholder-[#8b9bb4]`}
              role="combobox"
              aria-expanded={showDropdown && filteredResults.length > 0}
              aria-controls="search-listbox"
              aria-activedescendant={highlightedIdx >= 0 ? `search-option-${highlightedIdx}` : undefined}
            />
            {showDropdown && filteredResults.length > 0 && (
              <div
                id="search-listbox"
                role="listbox"
                aria-label={`${searchLabel} search results`}
                className="absolute z-10 mt-1 w-full rounded-lg border border-[#3a4466] bg-[#262b44] shadow-lg max-h-48 overflow-y-auto"
              >
                {filteredResults.map((p, i) => (
                  <button
                    key={p.name}
                    id={`search-option-${i}`}
                    role="option"
                    aria-selected={highlightedIdx === i}
                    onMouseDown={() => {
                      if (blurTimer.current) clearTimeout(blurTimer.current);
                    }}
                    onClick={() => handleSearchSelect(p.name)}
                    className={`w-full px-3 py-2 text-left text-sm capitalize transition-colors ${
                      highlightedIdx === i ? "bg-[#3a4466] text-[#f0f0e8]" : "hover:bg-[#3a4466]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {searchLoading && (
            <div className="mt-2">
              <LoadingSpinner size={20} />
            </div>
          )}
          {searchedPokemon && (
            <>
              <div className="flex items-center gap-2">
                {searchedPokemon.sprites.front_default && (
                  <Image
                    src={searchedPokemon.sprites.front_default}
                    alt={searchedPokemon.name}
                    width={48}
                    height={48}
                    unoptimized
                  />
                )}
                <div>
                  <p className="capitalize font-medium">{searchedPokemon.name}</p>
                  <div className="flex gap-1">
                    {searchedPokemon.types.map((t) => (
                      <TypeBadge
                        key={t.type.name}
                        type={t.type.name}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {searchStatPanel}
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
            ) : isOffensive ? (
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
            ) : (
              <>
                <p className="text-sm">
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {defender.name}
                  </span>{" "}
                  takes{" "}
                  <span className="font-bold text-[#6390F0]">
                    {damageResult.min}-{damageResult.max}
                  </span>{" "}
                  damage from{" "}
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {attacker.name}
                  </span>
                  &apos;s{" "}
                  <span className="capitalize font-semibold text-[#f0f0e8]">
                    {moveData.name.replace(/-/g, " ")}
                  </span>{" "}
                  <span
                    className={`font-semibold ${
                      damageResult.effectiveness > 1
                        ? "text-[#e8433f]"
                        : damageResult.effectiveness < 1
                        ? "text-[#38b764]"
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
                    <span className="font-bold" style={{ color: koResult.hpPercent.max >= 100 ? "#e8433f" : koResult.hpPercent.max >= 50 ? "#f7a838" : "#38b764" }}>
                      {koResult.hpPercent.min}% - {koResult.hpPercent.max}% HP
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
