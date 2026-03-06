"use client";

import { useCallback } from "react";
import { BallType, PCBoxPokemon, Pokemon } from "@/types";
import { FOSSILS, FOSSIL_DROP_RATES } from "@/data/fossils";
import { LEGENDARY_IDS } from "@/data/legendaries";
import { SHINY_RATE } from "@/data/constants";
import { createPCBoxPokemon } from "@/utils/pokemonFactory";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { silentWarn } from "@/utils/silentWarn";
import type { WildEncounterState } from "@/types";
import type { PokedexSource } from "@/hooks/usePokedex";
import type { PlayerStats } from "@/hooks/useAchievementsReducer";

interface UseWildActionsDeps {
  encounter: WildEncounterState;
  startEncounter: () => Promise<void>;
  throwBall: (ball: BallType, isRepeat: boolean) => void;
  returnToMap: () => void;

  addToBox: (pokemon: PCBoxPokemon) => void;
  moveToTeam: (index: number) => { pokemon: Pokemon } | null;
  useBall: (ball: BallType) => boolean;
  isAlreadyCaught: (id: number) => boolean;
  onAddToTeam: (pokemon: Pokemon) => void;

  markCaught: (id: number, name: string, source: PokedexSource) => void;
  incrementStat: (stat: keyof PlayerStats, amount?: number) => void;
  addUniqueBall: (ball: BallType) => void;
  addUniqueType: (type: string) => void;
  addKantoSpecies: (id: number) => void;
  spendMoney: (amount: number) => void;
  money: number;

  fossilInventory: Record<string, number>;
  setFossilInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setBattleItemInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setOwnedItems: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;

  nuzlockeEnabled: boolean;
  isAreaEncountered: (id: string) => boolean;
  markAreaEncountered: (id: string) => void;
}

export function useWildActions(deps: UseWildActionsDeps) {
  const {
    encounter,
    startEncounter,
    throwBall,
    returnToMap,
    addToBox,
    moveToTeam,
    useBall,
    isAlreadyCaught,
    onAddToTeam,
    markCaught,
    incrementStat,
    addUniqueBall,
    addUniqueType,
    addKantoSpecies,
    spendMoney,
    money,
    fossilInventory,
    setFossilInventory,
    setBattleItemInventory,
    setOwnedItems,
    setIsSearching,
    nuzlockeEnabled,
    isAreaEncountered,
    markAreaEncountered,
  } = deps;

  const rollFossilDrop = useCallback((areaTheme?: string) => {
    if (!areaTheme) return;
    const rate = FOSSIL_DROP_RATES[areaTheme];
    if (!rate || Math.random() > rate) return;
    const fossil = FOSSILS[Math.floor(Math.random() * FOSSILS.length)];
    setFossilInventory((prev) => ({ ...prev, [fossil.id]: (prev[fossil.id] ?? 0) + 1 }));
  }, [setFossilInventory]);

  const handleReviveFossil = useCallback(async (fossilId: string) => {
    const fossil = FOSSILS.find((f) => f.id === fossilId);
    if (!fossil || (fossilInventory[fossilId] ?? 0) <= 0) return;

    setFossilInventory((prev) => ({
      ...prev,
      [fossilId]: Math.max(0, (prev[fossilId] ?? 0) - 1),
    }));

    try {
      const pokemon = await fetchPokemonData(fossil.pokemonId);

      const pcPokemon = createPCBoxPokemon({
        pokemon,
        caughtInArea: "Fossil Lab",
        level: fossil.reviveLevel,
        isShiny: Math.random() < SHINY_RATE,
      });
      addToBox(pcPokemon);
      markCaught(pokemon.id, pokemon.name, "fossil");
      incrementStat("fossilsRevived");
      incrementStat("totalCaught");
    } catch (e) {
      silentWarn("FossilRevive", e);
      setFossilInventory((prev) => ({
        ...prev,
        [fossilId]: (prev[fossilId] ?? 0) + 1,
      }));
    }
  }, [fossilInventory, addToBox, markCaught, incrementStat, setFossilInventory]);

  const handleGameCornerPurchase = useCallback(async (pokemonId: number, level: number, area: string) => {
    try {
      const pokemon = await fetchPokemonData(pokemonId);

      const pcPokemon = createPCBoxPokemon({
        pokemon,
        caughtInArea: area,
        level,
        isShiny: false,
      });
      addToBox(pcPokemon);
      markCaught(pokemon.id, pokemon.name, "game-corner");
      incrementStat("totalCaught");
      incrementStat("gameCornerPrizesClaimed");
    } catch (e) {
      silentWarn("GameCornerPurchase", e);
    }
  }, [addToBox, markCaught, incrementStat]);

  const handlePokeMartBuy = useCallback((item: { id: string; price: number; category: string; ballType?: BallType }, quantity: number): boolean => {
    const totalCost = item.price * quantity;
    if (money < totalCost) return false;
    spendMoney(totalCost);

    if (item.ballType) {
      const key = "pokemon-team-builder-ball-inventory";
      try {
        const raw = localStorage.getItem(key);
        const inv = raw ? JSON.parse(raw) : {};
        inv[item.ballType] = (inv[item.ballType] ?? 0) + quantity;
        localStorage.setItem(key, JSON.stringify(inv));
        window.dispatchEvent(new Event("storage"));
      } catch (e) { silentWarn("PokeMartBuy", e); }
    } else if (item.category === "medicine") {
      setBattleItemInventory((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    } else {
      setOwnedItems((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    }
    return true;
  }, [money, spendMoney, setBattleItemInventory, setOwnedItems]);

  const handleStartEncounter = useCallback(async () => {
    if (nuzlockeEnabled && encounter.currentArea && isAreaEncountered(encounter.currentArea.id)) {
      return;
    }
    setIsSearching(true);
    try {
      await startEncounter();
      if (nuzlockeEnabled && encounter.currentArea) {
        markAreaEncountered(encounter.currentArea.id);
      }
    } finally {
      setIsSearching(false);
    }
  }, [startEncounter, nuzlockeEnabled, encounter.currentArea, isAreaEncountered, markAreaEncountered, setIsSearching]);

  const handleThrowBall = useCallback((ball: BallType) => {
    if (!useBall(ball)) return;
    throwBall(ball, isAlreadyCaught(encounter.wildPokemon?.id ?? 0));
    incrementStat("ballsThrown");
  }, [useBall, throwBall, incrementStat, isAlreadyCaught, encounter.wildPokemon]);

  const handleAddToBox = useCallback((nickname?: string) => {
    if (!encounter.wildPokemon) return;

    const pcPokemon = createPCBoxPokemon({
      pokemon: encounter.wildPokemon,
      nickname,
      caughtWith: encounter.selectedBall ?? "poke-ball",
      caughtInArea: encounter.currentArea?.name ?? "Unknown",
      level: encounter.wildLevel,
      isShiny: encounter.isShiny,
    });

    addToBox(pcPokemon);
    markCaught(encounter.wildPokemon.id, encounter.wildPokemon.name, "wild");
    incrementStat("totalCaught");
    if (!isAlreadyCaught(encounter.wildPokemon.id)) {
      incrementStat("uniqueSpeciesCaught");
    }
    if (LEGENDARY_IDS.has(encounter.wildPokemon.id)) {
      incrementStat("legendsCaught");
    }
    addUniqueBall(encounter.selectedBall ?? "poke-ball");
    encounter.wildPokemon.types.forEach((t: { type: { name: string } }) => addUniqueType(t.type.name));
    if (encounter.wildPokemon.id <= 151) {
      addKantoSpecies(encounter.wildPokemon.id);
    }
    if (encounter.isShiny) {
      incrementStat("shinyCaught");
    }
    rollFossilDrop(encounter.currentArea?.theme);
    returnToMap();
  }, [encounter, addToBox, returnToMap, markCaught, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, isAlreadyCaught, rollFossilDrop]);

  const handleMoveToTeam = useCallback((index: number) => {
    const slot = moveToTeam(index);
    if (slot) {
      onAddToTeam(slot.pokemon);
    }
  }, [moveToTeam, onAddToTeam]);

  return {
    rollFossilDrop,
    handleReviveFossil,
    handleGameCornerPurchase,
    handlePokeMartBuy,
    handleStartEncounter,
    handleThrowBall,
    handleAddToBox,
    handleMoveToTeam,
  };
}
