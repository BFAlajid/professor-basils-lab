"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "@/components/PokeImage";
import { Pokemon, TeamSlot, Nature, EVSpread, IVSpread, WeatherType } from "@/types";
import { useMove } from "@/hooks/useMove";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import {
  calculateDamage,
  extractBaseStats,
  DamageCalcOptions,
} from "@/utils/damageWasm";
import { calculateHP, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import { calculateKO } from "@/utils/damage";
import LoadingSpinner from "../LoadingSpinner";
import TypeBadge from "../TypeBadge";
import PokemonCalcPanel from "./PokemonCalcPanel";
import FieldConditions, { TerrainType } from "./FieldConditions";
import DamageResult from "./DamageResult";

interface DamageCalculatorProps {
  team: TeamSlot[];
}

type CalcMode = "offensive" | "defensive";

const selectCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";
const inputCls =
  "w-full rounded border border-[#3a4466] bg-[#1a1c2c] px-2 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]";

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

  // Resolve attacker/defender stat stage for field conditions
  const attackerStatStage = isOffensive ? teamStatStage : searchStatStage;
  const defenderStatStage = isOffensive ? searchStatStage : teamStatStage;
  const setAttackerStatStage = isOffensive ? setTeamStatStage : setSearchStatStage;
  const setDefenderStatStage = isOffensive ? setSearchStatStage : setTeamStatStage;

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

          {teamPokemon && (
            <PokemonCalcPanel
              sideLabel={teamLabel}
              isAttacker={isOffensive}
              level={teamLevel}
              setLevel={setTeamLevel}
              nature={teamNature}
              setNature={setTeamNature}
              evs={teamEvs}
              setEvs={setTeamEvs}
              ivs={teamIvs}
              setIvs={setTeamIvs}
              item={teamItem}
              setItem={setTeamItem}
              ability={teamAbility}
              setAbility={setTeamAbility}
            />
          )}
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
          <FieldConditions
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            attackerStatStage={attackerStatStage}
            setAttackerStatStage={setAttackerStatStage}
            defenderStatStage={defenderStatStage}
            setDefenderStatStage={setDefenderStatStage}
            weather={weather}
            setWeather={setWeather}
            terrain={terrain}
            setTerrain={setTerrain}
            reflect={reflect}
            setReflect={setReflect}
            lightScreen={lightScreen}
            setLightScreen={setLightScreen}
            criticalHit={criticalHit}
            setCriticalHit={setCriticalHit}
          />
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

              <PokemonCalcPanel
                sideLabel={searchLabel}
                isAttacker={!isOffensive}
                level={searchLevel}
                setLevel={setSearchLevel}
                nature={searchNature}
                setNature={setSearchNature}
                evs={searchEvs}
                setEvs={setSearchEvs}
                ivs={searchIvs}
                setIvs={setSearchIvs}
                item={searchItem}
                setItem={setSearchItem}
                ability={searchAbility}
                setAbility={setSearchAbility}
              />
            </>
          )}
        </div>
      </div>

      {/* Result */}
      {damageResult && attacker && defender && moveData && (
        <DamageResult
          damageResult={damageResult}
          koResult={koResult}
          attacker={attacker}
          defender={defender}
          moveData={moveData}
          isOffensive={isOffensive}
        />
      )}
    </div>
  );
}
