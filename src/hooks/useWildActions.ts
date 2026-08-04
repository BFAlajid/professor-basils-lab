"use client";

import { useCallback, useEffect, useRef } from "react";
import { BallType, PCBoxPokemon, Pokemon } from "@/types";
import { FOSSILS, FOSSIL_DROP_RATES } from "@/data/fossils";
import { LEGENDARY_IDS } from "@/data/legendaries";
import { SHINY_RATE } from "@/data/constants";
import { createPCBoxPokemon } from "@/utils/pokemonFactory";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { silentWarn } from "@/utils/silentWarn";
import type { WildEncounterState } from "@/types";
import type { PokedexSource } from "@/hooks/usePokedex";
import type { PlayerStats } from "@/utils/statsReducer";

interface UseWildActionsDeps {
  encounter: WildEncounterState;
  startEncounter: () => Promise<void>;
  throwBall: (ball: BallType, isRepeat: boolean) => void;
  returnToMap: () => void;

  addToBox: (pokemon: PCBoxPokemon) => void;
  removeFromBox: (index: number) => void;
  moveToTeam: (index: number) => { pokemon: Pokemon } | null;
  addBalls: (ball: BallType, qty: number) => void;
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
    removeFromBox,
    moveToTeam,
    addBalls,
    // Aliased: destructuring as "useBall" trips the react-hooks/rules-of-hooks
    // naming heuristic (looks like a hook) when called inside a useCallback body.
    useBall: consumeBall,
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

  // Mirrors the latest `fossilInventory`/`money` props so the synchronous
  // guards below always read fresh values, even mid-render before an effect
  // would otherwise catch up.
  const fossilInventoryRef = useRef(fossilInventory);
  fossilInventoryRef.current = fossilInventory;
  const moneyRef = useRef(money);
  moneyRef.current = money;

  // Reservations for units of fossilInventory/money already committed to an
  // in-flight action this tick, but not yet reflected by the props above —
  // React's setState/dispatch functional-updater callbacks are NOT
  // guaranteed to run synchronously (that only happens via an internal,
  // undocumented "eager bailout" when no other update is already pending on
  // the same fiber). Reading/writing a ref here — rather than relying on the
  // updater's `prev` argument — means a rapid double-invoke (double-click,
  // double-tap) can't both read the same stale prop and both pass the guard
  // before the first call's state update has actually landed.
  const reservedFossils = useRef<Record<string, number>>({});
  const reservedMoney = useRef(0);
  useEffect(() => {
    reservedMoney.current = 0;
  }, [money]);

  const rollFossilDrop = useCallback((areaTheme?: string) => {
    if (!areaTheme) return;
    const rate = FOSSIL_DROP_RATES[areaTheme];
    if (!rate || Math.random() > rate) return;
    const fossil = FOSSILS[Math.floor(Math.random() * FOSSILS.length)];
    setFossilInventory((prev) => ({ ...prev, [fossil.id]: (prev[fossil.id] ?? 0) + 1 }));
  }, [setFossilInventory]);

  const handleReviveFossil = useCallback(async (fossilId: string) => {
    const fossil = FOSSILS.find((f) => f.id === fossilId);
    if (!fossil) return;

    // Reserve outside React state (see reservedFossils above) so two
    // overlapping calls can't both pass the guard and revive two Pokemon
    // from one fossil. Held until the async revive settles, then released.
    const available = (fossilInventoryRef.current[fossilId] ?? 0) - (reservedFossils.current[fossilId] ?? 0);
    if (available <= 0) return;
    reservedFossils.current[fossilId] = (reservedFossils.current[fossilId] ?? 0) + 1;
    setFossilInventory((prev) => ({ ...prev, [fossilId]: Math.max(0, (prev[fossilId] ?? 0) - 1) }));

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
    } finally {
      reservedFossils.current[fossilId] = Math.max(0, (reservedFossils.current[fossilId] ?? 0) - 1);
    }
  }, [addToBox, markCaught, incrementStat, setFossilInventory]);

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
    if (quantity < 1 || item.price < 0) return false;
    const totalCost = item.price * quantity;

    // Gate on moneyRef/reservedMoney (not the closed-over `money` prop) — a
    // rapid double-invoke in the same batch would otherwise have both calls
    // read the same stale `money`, both pass this check, and both add
    // inventory even though statsReducer's SPEND_MONEY guard only lets the
    // first of the two spendMoney dispatches actually succeed.
    const available = moneyRef.current - reservedMoney.current;
    if (available < totalCost) return false;
    reservedMoney.current += totalCost;

    if (item.ballType) {
      addBalls(item.ballType, quantity);
    } else if (item.category === "medicine") {
      setBattleItemInventory((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    } else {
      setOwnedItems((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    }

    spendMoney(totalCost);
    return true;
  }, [spendMoney, addBalls, setBattleItemInventory, setOwnedItems]);

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
    if (!consumeBall(ball)) return;
    throwBall(ball, isAlreadyCaught(encounter.wildPokemon?.id ?? 0));
    incrementStat("ballsThrown");
  }, [consumeBall, throwBall, incrementStat, isAlreadyCaught, encounter.wildPokemon]);

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
      // A true move, not a copy: remove from the box once the team add succeeds.
      removeFromBox(index);
    }
  }, [moveToTeam, onAddToTeam, removeFromBox]);

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
