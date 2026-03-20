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
import { createPCBoxPokemon } from "@/utils/pokemonFactory";
import { playCry } from "@/utils/cryPlayer";

const DEFAULT_BATTLE_ITEMS = { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 };

// --- Context value type ---

export interface WildTabContextValue {
  // Encounter
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

  // PC Box
  box: PCBoxPokemon[];
  ballInventory: Record<string, number>;
  addToBox: (p: PCBoxPokemon) => void;
  removeFromBox: (index: number) => void;
  setNickname: (index: number, nickname: string) => void;
  moveToTeam: (index: number) => void;
  useBall: (ball: BallType) => boolean;
  isAlreadyCaught: (pokemonId: number) => boolean;

  // Nuzlocke
  nuzlocke: ReturnType<typeof useNuzlocke>["state"];
  enableNuzlocke: () => void;
  disableNuzlocke: () => void;
  markAreaEncountered: ReturnType<typeof useNuzlocke>["markAreaEncountered"];
  isAreaEncountered: ReturnType<typeof useNuzlocke>["isAreaEncountered"];
  addToGraveyard: ReturnType<typeof useNuzlocke>["addToGraveyard"];
  checkGameOver: ReturnType<typeof useNuzlocke>["checkGameOver"];
  resetNuzlocke: ReturnType<typeof useNuzlocke>["resetNuzlocke"];

  // Online & Safari (pass-through)
  online: ReturnType<typeof useOnlineBattle>;
  safari: ReturnType<typeof useSafariZone>;

  // Panel state
  activePanel: WildPanel;
  setActivePanel: React.Dispatch<React.SetStateAction<WildPanel>>;
  togglePanel: (panel: NonNullable<WildPanel>) => void;
  linkView: "cable" | "trade";
  setLinkView: React.Dispatch<React.SetStateAction<"cable" | "trade">>;

  // UI state
  evolvingPokemon: PCBoxPokemon | null;
  setEvolvingPokemon: React.Dispatch<React.SetStateAction<PCBoxPokemon | null>>;
  isSearching: boolean;
  showCatchFailure: boolean;
  setShowCatchFailure: React.Dispatch<React.SetStateAction<boolean>>;

  // Inventories
  fossilInventory: Record<string, number>;
  setFossilInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ownedItems: Record<string, number>;
  setOwnedItems: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  battleItemInventory: Record<string, number>;
  setBattleItemInventory: React.Dispatch<React.SetStateAction<Record<string, number>>>;

  // Achievements stats
  stats: ReturnType<typeof useAchievementsContext>["stats"];
  incrementStat: ReturnType<typeof useAchievementsContext>["incrementStat"];
  addUniqueBall: ReturnType<typeof useAchievementsContext>["addUniqueBall"];
  addUniqueType: ReturnType<typeof useAchievementsContext>["addUniqueType"];
  addKantoSpecies: ReturnType<typeof useAchievementsContext>["addKantoSpecies"];
  addMoney: ReturnType<typeof useAchievementsContext>["addMoney"];
  spendMoney: ReturnType<typeof useAchievementsContext>["spendMoney"];

  // Pokedex
  markSeen: ReturnType<typeof usePokedexContext>["markSeen"];
  markCaught: ReturnType<typeof usePokedexContext>["markCaught"];

  // Wild actions (composed)
  handleReviveFossil: (fossilId: string) => Promise<void>;
  handleGameCornerPurchase: (pokemonId: number, level: number, area: string) => Promise<void>;
  handlePokeMartBuy: (item: { id: string; price: number; category: string; ballType?: BallType }, quantity: number) => boolean;
  handleStartEncounter: () => void;
  handleThrowBall: (ballType: BallType) => void;
  handleAddToBox: () => void;
  handleMoveToTeam: (index: number) => void;

  // Team props (passed from parent)
  team: TeamSlot[];
  onAddToTeam: (pokemon: import("@/types").Pokemon) => void;
  onSetEvs?: (position: number, evs: EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
}

const WildTabContext = createContext<WildTabContextValue | null>(null);

export function useWildTabContext(): WildTabContextValue {
  const ctx = useContext(WildTabContext);
  if (!ctx) throw new Error("useWildTabContext must be used within WildTabProvider");
  return ctx;
}

// --- Provider ---

interface WildTabProviderProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: import("@/types").Pokemon) => void;
  onSetEvs?: (position: number, evs: EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
  children: React.ReactNode;
}

export function WildTabProvider({ team, onAddToTeam, onSetEvs, onSetMoves, children }: WildTabProviderProps) {
  const {
    state: encounter,
    battleLog,
    selectArea,
    startEncounter,
    enterBattle,
    playerAttack,
    throwBall,
    playerRun,
    returnToMap,
    continueAfterCatch,
    wildSlot,
  } = useWildEncounter(team);

  const {
    box,
    ballInventory,
    addToBox,
    removeFromBox,
    setNickname,
    moveToTeam,
    useBall,
    isAlreadyCaught,
  } = usePCBox();

  const { markSeen, markCaught } = usePokedexContext();
  const { incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, updateShinyChain, resetShinyChain, addMoney, spendMoney, stats } = useAchievementsContext();

  const {
    state: nuzlocke,
    enableNuzlocke,
    disableNuzlocke,
    markAreaEncountered,
    isAreaEncountered,
    addToGraveyard,
    checkGameOver,
    resetNuzlocke,
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
    handleReviveFossil,
    handleGameCornerPurchase,
    handlePokeMartBuy,
    handleStartEncounter,
    handleThrowBall,
    handleAddToBox,
    handleMoveToTeam,
  } = useWildActions({
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
    money: stats.money,
    fossilInventory,
    setFossilInventory,
    setBattleItemInventory,
    setOwnedItems,
    setIsSearching,
    nuzlockeEnabled: nuzlocke.enabled,
    isAreaEncountered,
    markAreaEncountered,
  });

  // --- Effects (same order as original WildTab) ---

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
    if (encounter.phase !== "catching") {
      setShowCatchFailure(false);
    }
    if (encounter.phase === "fled") {
      resetShinyChain();
    }
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

  // --- Memoized context value ---

  const value = useMemo<WildTabContextValue>(() => ({
    encounter,
    battleLog,
    selectArea,
    startEncounter,
    enterBattle,
    playerAttack,
    throwBall,
    playerRun,
    returnToMap,
    continueAfterCatch,
    wildSlot,
    box,
    ballInventory,
    addToBox,
    removeFromBox,
    setNickname,
    moveToTeam,
    useBall,
    isAlreadyCaught,
    nuzlocke,
    enableNuzlocke,
    disableNuzlocke,
    markAreaEncountered,
    isAreaEncountered,
    addToGraveyard,
    checkGameOver,
    resetNuzlocke,
    online,
    safari,
    activePanel,
    setActivePanel,
    togglePanel,
    linkView,
    setLinkView,
    evolvingPokemon,
    setEvolvingPokemon,
    isSearching,
    showCatchFailure,
    setShowCatchFailure,
    fossilInventory,
    setFossilInventory,
    ownedItems,
    setOwnedItems,
    battleItemInventory,
    setBattleItemInventory,
    stats,
    incrementStat,
    addUniqueBall,
    addUniqueType,
    addKantoSpecies,
    addMoney,
    spendMoney,
    markSeen,
    markCaught,
    handleReviveFossil,
    handleGameCornerPurchase,
    handlePokeMartBuy,
    handleStartEncounter,
    handleThrowBall,
    handleAddToBox,
    handleMoveToTeam,
    team,
    onAddToTeam,
    onSetEvs,
    onSetMoves,
  }), [
    encounter, battleLog, selectArea, startEncounter, enterBattle,
    playerAttack, throwBall, playerRun, returnToMap, continueAfterCatch, wildSlot,
    box, ballInventory, addToBox, removeFromBox, setNickname, moveToTeam, useBall, isAlreadyCaught,
    nuzlocke, enableNuzlocke, disableNuzlocke, markAreaEncountered, isAreaEncountered,
    addToGraveyard, checkGameOver, resetNuzlocke,
    online, safari,
    activePanel, togglePanel, linkView,
    evolvingPokemon, isSearching, showCatchFailure,
    fossilInventory, ownedItems, battleItemInventory,
    stats, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, addMoney, spendMoney,
    markSeen, markCaught,
    handleReviveFossil, handleGameCornerPurchase, handlePokeMartBuy,
    handleStartEncounter, handleThrowBall, handleAddToBox, handleMoveToTeam,
    team, onAddToTeam, onSetEvs, onSetMoves,
  ]);

  return (
    <WildTabContext.Provider value={value}>
      {children}
    </WildTabContext.Provider>
  );
}
