"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { TeamSlot, PCBoxPokemon, BallType, EVSpread, Pokemon } from "@/types";
import type { WildPanel } from "@/components/wild/WildToolbar";
import { useWildEncounter } from "@/hooks/useWildEncounter";
import { usePCBox } from "@/hooks/usePCBox";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useNuzlocke } from "@/hooks/useNuzlocke";
import { useOnlineBattle } from "@/hooks/useOnlineBattle";
import { useSafariZone } from "@/hooks/useSafariZone";
import { useWildActions } from "@/hooks/useWildActions";
import { playCry } from "@/utils/cryPlayer";

const DEFAULT_BATTLE_ITEMS = { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 };

// ── Context value types ──

export interface WildEncounterContextValue {
  encounter: ReturnType<typeof useWildEncounter>["state"];
  battleLog: ReturnType<typeof useWildEncounter>["battleLog"];
  selectArea: ReturnType<typeof useWildEncounter>["selectArea"];
  startEncounter: ReturnType<typeof useWildEncounter>["startEncounter"];
  enterBattle: ReturnType<typeof useWildEncounter>["enterBattle"];
  playerAttack: ReturnType<typeof useWildEncounter>["playerAttack"];
  throwBall: ReturnType<typeof useWildEncounter>["throwBall"];
  playerRun: ReturnType<typeof useWildEncounter>["playerRun"];
  returnToMap: ReturnType<typeof useWildEncounter>["returnToMap"];
  continueAfterCatch: ReturnType<typeof useWildEncounter>["continueAfterCatch"];
  wildSlot: ReturnType<typeof useWildEncounter>["wildSlot"];
  handleStartEncounter: () => void;
  handleThrowBall: (ballType: BallType) => void;
  handleAddToBox: () => void;
}

export interface WildInventoryContextValue {
  box: PCBoxPokemon[];
  ballInventory: Record<string, number>;
  addToBox: (p: PCBoxPokemon) => void;
  removeFromBox: (index: number) => void;
  setNickname: (index: number, nickname: string) => void;
  moveToTeam: (index: number) => void;
  useBall: (ball: BallType) => boolean;
  isAlreadyCaught: (pokemonId: number) => boolean;
  fossilInventory: Record<string, number>;
  setFossilInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ownedItems: Record<string, number>;
  setOwnedItems: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  battleItemInventory: Record<string, number>;
  setBattleItemInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  stats: ReturnType<typeof useAchievementsContext>["stats"];
  incrementStat: ReturnType<typeof useAchievementsContext>["incrementStat"];
  addUniqueBall: ReturnType<typeof useAchievementsContext>["addUniqueBall"];
  addUniqueType: ReturnType<typeof useAchievementsContext>["addUniqueType"];
  addKantoSpecies: ReturnType<typeof useAchievementsContext>["addKantoSpecies"];
  addMoney: ReturnType<typeof useAchievementsContext>["addMoney"];
  spendMoney: ReturnType<typeof useAchievementsContext>["spendMoney"];
  markSeen: ReturnType<typeof usePokedexContext>["markSeen"];
  markCaught: ReturnType<typeof usePokedexContext>["markCaught"];
  handleReviveFossil: (fossilId: string) => Promise<void>;
  handleGameCornerPurchase: (pokemonId: number, level: number, area: string) => Promise<void>;
  handlePokeMartBuy: (item: { id: string; price: number; category: string; ballType?: BallType }, quantity: number) => boolean;
  handleMoveToTeam: (index: number) => void;
}

export interface WildUIContextValue {
  activePanel: WildPanel;
  setActivePanel: React.Dispatch<React.SetStateAction<WildPanel>>;
  togglePanel: (panel: NonNullable<WildPanel>) => void;
  linkView: "cable" | "trade";
  setLinkView: React.Dispatch<React.SetStateAction<"cable" | "trade">>;
  evolvingPokemon: PCBoxPokemon | null;
  setEvolvingPokemon: React.Dispatch<React.SetStateAction<PCBoxPokemon | null>>;
  isSearching: boolean;
  showCatchFailure: boolean;
  setShowCatchFailure: React.Dispatch<React.SetStateAction<boolean>>;
  nuzlocke: ReturnType<typeof useNuzlocke>["state"];
  enableNuzlocke: () => void;
  disableNuzlocke: () => void;
  markAreaEncountered: ReturnType<typeof useNuzlocke>["markAreaEncountered"];
  isAreaEncountered: ReturnType<typeof useNuzlocke>["isAreaEncountered"];
  addToGraveyard: ReturnType<typeof useNuzlocke>["addToGraveyard"];
  checkGameOver: ReturnType<typeof useNuzlocke>["checkGameOver"];
  resetNuzlocke: ReturnType<typeof useNuzlocke>["resetNuzlocke"];
  online: ReturnType<typeof useOnlineBattle>;
  safari: ReturnType<typeof useSafariZone>;
  team: TeamSlot[];
  onAddToTeam: (pokemon: Pokemon) => void;
  onSetEvs?: (position: number, evs: EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
}

// Backwards-compatible combined type
export type WildTabContextValue = WildEncounterContextValue & WildInventoryContextValue & WildUIContextValue;

// ── Contexts ──

const WildEncounterCtx = createContext<WildEncounterContextValue | null>(null);
const WildInventoryCtx = createContext<WildInventoryContextValue | null>(null);
const WildUICtx = createContext<WildUIContextValue | null>(null);

export function useWildEncounterContext(): WildEncounterContextValue {
  const ctx = useContext(WildEncounterCtx);
  if (!ctx) throw new Error("useWildEncounterContext must be used within WildTabProvider");
  return ctx;
}

export function useWildInventoryContext(): WildInventoryContextValue {
  const ctx = useContext(WildInventoryCtx);
  if (!ctx) throw new Error("useWildInventoryContext must be used within WildTabProvider");
  return ctx;
}

export function useWildUIContext(): WildUIContextValue {
  const ctx = useContext(WildUICtx);
  if (!ctx) throw new Error("useWildUIContext must be used within WildTabProvider");
  return ctx;
}

// Backwards-compatible hook
export function useWildTabContext(): WildTabContextValue {
  const encounter = useWildEncounterContext();
  const inventory = useWildInventoryContext();
  const ui = useWildUIContext();
  return useMemo(() => ({ ...encounter, ...inventory, ...ui }), [encounter, inventory, ui]);
}

// ── Provider ──

interface WildTabProviderProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: Pokemon) => void;
  onSetEvs?: (position: number, evs: EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
  children: React.ReactNode;
}

export function WildTabProvider({ team, onAddToTeam, onSetEvs, onSetMoves, children }: WildTabProviderProps) {
  const {
    state: encounter, battleLog, selectArea, startEncounter, enterBattle,
    playerAttack, throwBall, playerRun, returnToMap, continueAfterCatch, wildSlot,
  } = useWildEncounter(team);

  const {
    box, ballInventory, addToBox, removeFromBox, setNickname, moveToTeam, useBall, isAlreadyCaught,
  } = usePCBox();

  const { markSeen, markCaught } = usePokedexContext();
  const { incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, updateShinyChain, resetShinyChain, addMoney, spendMoney, stats } = useAchievementsContext();

  const {
    state: nuzlocke, enableNuzlocke, disableNuzlocke,
    markAreaEncountered, isAreaEncountered, addToGraveyard, checkGameOver, resetNuzlocke,
  } = useNuzlocke();

  const online = useOnlineBattle();
  const safari = useSafariZone();

  const [activePanel, setActivePanel] = useState<WildPanel>(null);
  const togglePanel = useCallback((panel: NonNullable<WildPanel>) => setActivePanel(prev => prev === panel ? null : panel), []);
  const [linkView, setLinkView] = useState<"cable" | "trade">("cable");
  const [evolvingPokemon, setEvolvingPokemon] = useState<PCBoxPokemon | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCatchFailure, setShowCatchFailure] = useState(false);
  const [fossilInventory, setFossilInventory] = usePersistedState<Record<string, number>>("pokemon-fossil-inventory", {});
  const [ownedItems, setOwnedItems] = usePersistedState<Record<string, number>>("pokemon-owned-items", {});
  const [battleItemInventory, setBattleItemInventory] = usePersistedState<Record<string, number>>("pokemon-battle-items", DEFAULT_BATTLE_ITEMS);

  const {
    handleReviveFossil, handleGameCornerPurchase, handlePokeMartBuy,
    handleStartEncounter, handleThrowBall, handleAddToBox, handleMoveToTeam,
  } = useWildActions({
    encounter, startEncounter, throwBall, returnToMap,
    addToBox, moveToTeam, useBall, isAlreadyCaught, onAddToTeam,
    markCaught, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies,
    spendMoney, money: stats.money, fossilInventory, setFossilInventory,
    setBattleItemInventory, setOwnedItems, setIsSearching,
    nuzlockeEnabled: nuzlocke.enabled, isAreaEncountered, markAreaEncountered,
  });

  // --- Effects ---

  useEffect(() => {
    if (encounter.phase === "encounter_intro" && encounter.wildPokemon) {
      markSeen(encounter.wildPokemon.id, encounter.wildPokemon.name, "wild");
      playCry(encounter.wildPokemon);
      updateShinyChain(encounter.wildPokemon.name);
    }
  }, [encounter.phase, encounter.wildPokemon, markSeen, updateShinyChain]);

  useEffect(() => {
    if (encounter.phase === "encounter_intro") {
      const timer = setTimeout(enterBattle, 2000);
      return () => clearTimeout(timer);
    }
  }, [encounter.phase, enterBattle]);

  useEffect(() => {
    if (nuzlocke.enabled && encounter.phase === "fled" && encounter.playerCurrentHp <= 0) {
      const leadPokemon = team[0];
      if (leadPokemon) {
        addToGraveyard(
          leadPokemon.pokemon,
          leadPokemon.pokemon.name,
          encounter.wildPokemon
            ? `Defeated by wild ${encounter.wildPokemon.name}`
            : "Fainted in battle",
          encounter.currentArea?.name ?? "Unknown",
          encounter.wildLevel
        );
        checkGameOver(team.length - 1, box.length);
      }
    }
  }, [nuzlocke.enabled, encounter.phase, encounter.playerCurrentHp, team, encounter.wildPokemon, encounter.currentArea, encounter.wildLevel, addToGraveyard, checkGameOver, box.length]);

  useEffect(() => {
    if (encounter.phase !== "catching") setShowCatchFailure(false);
    if (encounter.phase === "fled") resetShinyChain();
  }, [encounter.phase, resetShinyChain]);

  useEffect(() => {
    import("@/utils/audioManager").then(({ playTrack }) => {
      if (encounter.phase === "battle" || encounter.phase === "encounter_intro") {
        const isWater = encounter.currentArea?.theme === "water";
        playTrack(isWater ? "surf" : "encounter");
      } else if (encounter.phase === "catch_result" && encounter.isCaught) {
        playTrack("catchSuccess");
      } else if (encounter.phase === "map") {
        playTrack(activePanel === "pcBox" ? "pokemonCenter" : "map");
      }
    });
  }, [encounter.phase, encounter.isCaught, encounter.currentArea?.theme, activePanel]);

  // --- Memoized context values (each with focused deps) ---

  const encounterValue = useMemo<WildEncounterContextValue>(() => ({
    encounter, battleLog, selectArea, startEncounter, enterBattle,
    playerAttack, throwBall, playerRun, returnToMap, continueAfterCatch, wildSlot,
    handleStartEncounter, handleThrowBall, handleAddToBox,
  }), [
    encounter, battleLog, selectArea, startEncounter, enterBattle,
    playerAttack, throwBall, playerRun, returnToMap, continueAfterCatch, wildSlot,
    handleStartEncounter, handleThrowBall, handleAddToBox,
  ]);

  const inventoryValue = useMemo<WildInventoryContextValue>(() => ({
    box, ballInventory, addToBox, removeFromBox, setNickname, moveToTeam, useBall, isAlreadyCaught,
    fossilInventory, setFossilInventory, ownedItems, setOwnedItems,
    battleItemInventory, setBattleItemInventory,
    stats, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, addMoney, spendMoney,
    markSeen, markCaught,
    handleReviveFossil, handleGameCornerPurchase, handlePokeMartBuy, handleMoveToTeam,
  }), [
    box, ballInventory, addToBox, removeFromBox, setNickname, moveToTeam, useBall, isAlreadyCaught,
    fossilInventory, ownedItems, battleItemInventory,
    stats, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, addMoney, spendMoney,
    markSeen, markCaught,
    handleReviveFossil, handleGameCornerPurchase, handlePokeMartBuy, handleMoveToTeam,
  ]);

  const uiValue = useMemo<WildUIContextValue>(() => ({
    activePanel, setActivePanel, togglePanel, linkView, setLinkView,
    evolvingPokemon, setEvolvingPokemon, isSearching, showCatchFailure, setShowCatchFailure,
    nuzlocke, enableNuzlocke, disableNuzlocke, markAreaEncountered, isAreaEncountered,
    addToGraveyard, checkGameOver, resetNuzlocke,
    online, safari,
    team, onAddToTeam, onSetEvs, onSetMoves,
  }), [
    activePanel, togglePanel, linkView,
    evolvingPokemon, isSearching, showCatchFailure,
    nuzlocke, enableNuzlocke, disableNuzlocke, markAreaEncountered, isAreaEncountered,
    addToGraveyard, checkGameOver, resetNuzlocke,
    online, safari,
    team, onAddToTeam, onSetEvs, onSetMoves,
  ]);

  return (
    <WildEncounterCtx.Provider value={encounterValue}>
      <WildInventoryCtx.Provider value={inventoryValue}>
        <WildUICtx.Provider value={uiValue}>
          {children}
        </WildUICtx.Provider>
      </WildInventoryCtx.Provider>
    </WildEncounterCtx.Provider>
  );
}
