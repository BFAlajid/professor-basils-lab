"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, Pokemon, BallType, PCBoxPokemon } from "@/types";
import { useWildEncounter } from "@/hooks/useWildEncounter";
import { usePCBox } from "@/hooks/usePCBox";
import { NATURES } from "@/data/natures";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import RegionMap from "./RegionMap";
import AreaDetail from "./AreaDetail";
import WildBattle from "./WildBattle";
import CatchAnimation from "./CatchAnimation";
import CatchResult from "./CatchResult";
import PCBox from "./PCBox";
import NuzlockeGraveyard from "./NuzlockeGraveyard";
import NuzlockeGameOver from "./NuzlockeGameOver";
import DayCare from "./DayCare";
import WonderTrade from "./WonderTrade";
import MysteryGift from "./MysteryGift";
import LinkCable from "./LinkCable";
import LinkTrade from "./LinkTrade";
import SafariZone from "./SafariZone";
import VoltorbFlip from "./VoltorbFlip";
import TypeQuiz from "./TypeQuiz";
import FossilLab from "./FossilLab";
import PokeMart from "./PokeMart";
import EVTraining from "./EVTraining";
import MoveTutor from "./MoveTutor";
import { useNuzlocke } from "@/hooks/useNuzlocke";
import { useOnlineBattle } from "@/hooks/useOnlineBattle";
import { useSafariZone } from "@/hooks/useSafariZone";
import { LEGENDARY_IDS } from "@/data/legendaries";
import { FOSSILS, FOSSIL_DROP_RATES } from "@/data/fossils";
import { generateRandomIVs } from "@/utils/wildBattle";
import { playCry } from "@/utils/cryPlayer";

interface WildTabProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: Pokemon) => void;
  onSetEvs?: (position: number, evs: import("@/types").EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
}

export default function WildTab({ team, onAddToTeam, onSetEvs, onSetMoves }: WildTabProps) {
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

  const [showPCBox, setShowPCBox] = useState(false);
  const [showDayCare, setShowDayCare] = useState(false);
  const [showWonderTrade, setShowWonderTrade] = useState(false);
  const [showMysteryGift, setShowMysteryGift] = useState(false);
  const [showLinkCable, setShowLinkCable] = useState(false);
  const [linkView, setLinkView] = useState<"cable" | "trade">("cable");
  const [showSafariZone, setShowSafariZone] = useState(false);
  const [showGameCorner, setShowGameCorner] = useState(false);
  const [showTypeQuiz, setShowTypeQuiz] = useState(false);
  const [showFossilLab, setShowFossilLab] = useState(false);
  const [showPokeMart, setShowPokeMart] = useState(false);
  const [showEVTraining, setShowEVTraining] = useState(false);
  const [showMoveTutor, setShowMoveTutor] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showCatchFailure, setShowCatchFailure] = useState(false);

  // Fossil inventory (localStorage-persisted)
  const [fossilInventory, setFossilInventory] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("pokemon-fossil-inventory");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const fossilInventoryRef = useRef(fossilInventory);
  fossilInventoryRef.current = fossilInventory;

  // Owned items (special items from PokeMart: heart-scale, macho-brace, power items, held items)
  const [ownedItems, setOwnedItems] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("pokemon-owned-items");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem("pokemon-owned-items", JSON.stringify(ownedItems)); } catch {}
  }, [ownedItems]);

  // Battle item inventory (medicine)
  const [battleItemInventory, setBattleItemInventory] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 };
    try {
      const saved = localStorage.getItem("pokemon-battle-items");
      return saved ? JSON.parse(saved) : { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 };
    } catch { return { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 }; }
  });
  useEffect(() => {
    try { localStorage.setItem("pokemon-battle-items", JSON.stringify(battleItemInventory)); } catch {}
  }, [battleItemInventory]);

  // Persist fossil inventory
  useEffect(() => {
    try { localStorage.setItem("pokemon-fossil-inventory", JSON.stringify(fossilInventory)); } catch {}
  }, [fossilInventory]);

  // Close all side panels (mutual exclusion)
  const closeAllPanels = useCallback(() => {
    setShowPCBox(false); setShowDayCare(false); setShowWonderTrade(false);
    setShowMysteryGift(false); setShowLinkCable(false); setShowSafariZone(false);
    setShowGameCorner(false); setShowTypeQuiz(false); setShowFossilLab(false);
    setShowPokeMart(false); setShowEVTraining(false); setShowMoveTutor(false);
  }, []);

  // Roll fossil drop after a successful catch in cave/mountain/desert areas
  const rollFossilDrop = useCallback((areaTheme?: string) => {
    if (!areaTheme) return;
    const rate = FOSSIL_DROP_RATES[areaTheme];
    if (!rate || Math.random() > rate) return;
    const fossil = FOSSILS[Math.floor(Math.random() * FOSSILS.length)];
    setFossilInventory((prev) => ({ ...prev, [fossil.id]: (prev[fossil.id] ?? 0) + 1 }));
  }, []);

  // Handle reviving a fossil (fetch Pokemon data, add to PC box)
  const handleReviveFossil = useCallback(async (fossilId: string) => {
    const fossil = FOSSILS.find((f) => f.id === fossilId);
    if (!fossil || (fossilInventory[fossilId] ?? 0) <= 0) return;

    // Deduct from inventory
    setFossilInventory((prev) => ({
      ...prev,
      [fossilId]: Math.max(0, (prev[fossilId] ?? 0) - 1),
    }));

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${fossil.pokemonId}`);
      const pokemon = await res.json();

      const pcPokemon: PCBoxPokemon = {
        pokemon,
        caughtWith: "poke-ball",
        caughtInArea: "Fossil Lab",
        caughtDate: new Date().toISOString(),
        level: fossil.reviveLevel,
        nature: NATURES[Math.floor(Math.random() * NATURES.length)],
        ivs: generateRandomIVs(),
        ability: pokemon.abilities?.[0]?.ability.name ?? "unknown",
        isShiny: Math.random() < 1 / 4096,
      };
      addToBox(pcPokemon);
      markCaught(pokemon.id, pokemon.name, "fossil");
      incrementStat("fossilsRevived");
      incrementStat("totalCaught");
    } catch {
      // If fetch fails, refund the fossil
      setFossilInventory((prev) => ({
        ...prev,
        [fossilId]: (prev[fossilId] ?? 0) + 1,
      }));
    }
  }, [fossilInventory, addToBox, markCaught, incrementStat]);

  // Handle game corner prize purchase (fetch Pokemon, add to PC box)
  const handleGameCornerPurchase = useCallback(async (pokemonId: number, level: number, area: string) => {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      const pokemon = await res.json();

      const pcPokemon: PCBoxPokemon = {
        pokemon,
        caughtWith: "poke-ball",
        caughtInArea: area,
        caughtDate: new Date().toISOString(),
        level,
        nature: NATURES[Math.floor(Math.random() * NATURES.length)],
        ivs: generateRandomIVs(),
        ability: pokemon.abilities?.[0]?.ability.name ?? "unknown",
        isShiny: false,
      };
      addToBox(pcPokemon);
      markCaught(pokemon.id, pokemon.name, "game-corner");
      incrementStat("totalCaught");
      incrementStat("gameCornerPrizesClaimed");
    } catch {
      // fetch failed — silently ignore
    }
  }, [addToBox, markCaught, incrementStat]);

  // PokeMart buy handler
  const handlePokeMartBuy = useCallback((item: { id: string; price: number; category: string; ballType?: BallType }, quantity: number): boolean => {
    const totalCost = item.price * quantity;
    if (stats.money < totalCost) return false;
    spendMoney(totalCost);

    if (item.ballType) {
      // Add balls — we update via the PC box hook's internal state
      // Since usePCBox doesn't expose addBalls, we write directly to localStorage
      const key = "pokemon-team-builder-ball-inventory";
      try {
        const raw = localStorage.getItem(key);
        const inv = raw ? JSON.parse(raw) : {};
        inv[item.ballType] = (inv[item.ballType] ?? 0) + quantity;
        localStorage.setItem(key, JSON.stringify(inv));
        // Force reload by toggling any panel
        window.dispatchEvent(new Event("storage"));
      } catch {}
    } else if (item.category === "medicine") {
      setBattleItemInventory((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    } else {
      setOwnedItems((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + quantity }));
    }
    return true;
  }, [stats.money, spendMoney]);

  const handleStartEncounter = useCallback(async () => {
    // Nuzlocke: block encounters in already-encountered areas
    if (nuzlocke.enabled && encounter.currentArea && isAreaEncountered(encounter.currentArea.id)) {
      return;
    }
    setIsSearching(true);
    try {
      await startEncounter();
      // Nuzlocke: mark area as encountered
      if (nuzlocke.enabled && encounter.currentArea) {
        markAreaEncountered(encounter.currentArea.id);
      }
    } finally {
      setIsSearching(false);
    }
  }, [startEncounter, nuzlocke.enabled, encounter.currentArea, isAreaEncountered, markAreaEncountered]);

  const handleThrowBall = useCallback((ball: BallType) => {
    if (!useBall(ball)) return;
    throwBall(ball, isAlreadyCaught(encounter.wildPokemon?.id ?? 0));
    incrementStat("ballsThrown");
  }, [useBall, throwBall, incrementStat, isAlreadyCaught, encounter.wildPokemon]);

  const handleAddToBox = useCallback((nickname?: string) => {
    if (!encounter.wildPokemon) return;

    const pcPokemon: PCBoxPokemon = {
      pokemon: encounter.wildPokemon,
      nickname,
      caughtWith: encounter.selectedBall ?? "poke-ball",
      caughtInArea: encounter.currentArea?.name ?? "Unknown",
      caughtDate: new Date().toISOString(),
      level: encounter.wildLevel,
      nature: NATURES[Math.floor(Math.random() * NATURES.length)],
      ivs: generateRandomIVs(),
      ability: encounter.wildPokemon.abilities?.[0]?.ability.name ?? "unknown",
      isShiny: encounter.isShiny,
    };

    addToBox(pcPokemon);

    // Track in Pokedex
    markCaught(encounter.wildPokemon.id, encounter.wildPokemon.name, "wild");

    // Track achievements
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

    // Roll fossil drop in cave/mountain/desert areas
    rollFossilDrop(encounter.currentArea?.theme);

    returnToMap();
  }, [encounter, addToBox, returnToMap, markCaught, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, isAlreadyCaught, rollFossilDrop]);

  const handleMoveToTeam = useCallback((index: number) => {
    const slot = moveToTeam(index);
    if (slot) {
      onAddToTeam(slot.pokemon);
    }
  }, [moveToTeam, onAddToTeam]);

  // Mark Pokemon as seen and update shiny chain when encounter starts
  useEffect(() => {
    if (encounter.phase === "encounter_intro" && encounter.wildPokemon) {
      markSeen(encounter.wildPokemon.id, encounter.wildPokemon.name, "wild");
      playCry(encounter.wildPokemon);
      updateShinyChain(encounter.wildPokemon.name);
    }
  }, [encounter.phase, encounter.wildPokemon, markSeen, updateShinyChain]);

  // Auto transition from encounter_intro to battle
  useEffect(() => {
    if (encounter.phase === "encounter_intro") {
      const timer = setTimeout(enterBattle, 2000);
      return () => clearTimeout(timer);
    }
  }, [encounter.phase, enterBattle]);

  // Nuzlocke: handle player Pokemon faint
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

  // Reset catch failure state when phase changes; reset chain on flee
  useEffect(() => {
    if (encounter.phase !== "catching") {
      setShowCatchFailure(false);
    }
    if (encounter.phase === "fled") {
      resetShinyChain();
    }
  }, [encounter.phase, resetShinyChain]);

  // Audio triggers
  useEffect(() => {
    import("@/utils/audioManager").then(({ playTrack }) => {
      if (encounter.phase === "battle" || encounter.phase === "encounter_intro") {
        const isWater = encounter.currentArea?.theme === "water";
        playTrack(isWater ? "surf" : "encounter");
      } else if (encounter.phase === "catch_result" && encounter.isCaught) {
        playTrack("catchSuccess");
      } else if (encounter.phase === "map") {
        playTrack(showPCBox ? "pokemonCenter" : "map");
      }
    });
  }, [encounter.phase, encounter.isCaught, encounter.currentArea?.theme, showPCBox]);

  if (team.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm font-pixel text-[#e8433f]">No Pokemon in your team!</p>
        <p className="text-xs text-[#8b9bb4]">
          Add at least one Pokemon to your team before exploring the wild.
        </p>
      </div>
    );
  }

  // Nuzlocke game over screen
  if (nuzlocke.enabled && nuzlocke.isGameOver) {
    return (
      <NuzlockeGameOver
        graveyard={nuzlocke.graveyard}
        onReset={resetNuzlocke}
        onDisable={disableNuzlocke}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* MAP PHASE */}
        {encounter.phase === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-pixel text-[#f0f0e8]">Wild Encounters</h2>
              <div className="flex items-center gap-2">
                {/* Nuzlocke toggle */}
                <button
                  onClick={() => nuzlocke.enabled ? disableNuzlocke() : enableNuzlocke()}
                  className={`px-2 py-1 text-[9px] font-pixel rounded-lg border transition-colors ${
                    nuzlocke.enabled
                      ? "text-[#e8433f] border-[#e8433f] bg-[#e8433f]/10"
                      : "text-[#3a4466] border-[#3a4466] hover:text-[#8b9bb4]"
                  }`}
                  title="Nuzlocke: One catch per area, permadeath, game over when all faint"
                >
                  {nuzlocke.enabled ? "Nuzlocke ON" : "Nuzlocke"}
                </button>
                <span className="text-[9px] text-[#8b9bb4]">
                  Lead: {team[0].pokemon.name.charAt(0).toUpperCase() + team[0].pokemon.name.slice(1)}
                </span>
                <button
                  onClick={() => { const next = !showSafariZone; closeAllPanels(); if (next) setShowSafariZone(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showSafariZone
                      ? "text-[#38b764] border-[#38b764] bg-[#38b764]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Safari
                </button>
                <button
                  onClick={() => { const next = !showGameCorner; closeAllPanels(); if (next) setShowGameCorner(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showGameCorner
                      ? "text-[#f7a838] border-[#f7a838] bg-[#f7a838]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Game
                </button>
                <button
                  onClick={() => { const next = !showTypeQuiz; closeAllPanels(); if (next) setShowTypeQuiz(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showTypeQuiz
                      ? "text-[#4a90d9] border-[#4a90d9] bg-[#4a90d9]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Quiz
                </button>
                <button
                  onClick={() => { const next = !showFossilLab; closeAllPanels(); if (next) setShowFossilLab(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showFossilLab
                      ? "text-[#a0522d] border-[#a0522d] bg-[#a0522d]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Fossil{Object.values(fossilInventory).reduce((a, b) => a + b, 0) > 0 ? ` (${Object.values(fossilInventory).reduce((a, b) => a + b, 0)})` : ""}
                </button>
                <button
                  onClick={() => { const next = !showPokeMart; closeAllPanels(); if (next) setShowPokeMart(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showPokeMart
                      ? "text-[#38b764] border-[#38b764] bg-[#38b764]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Mart{stats.money > 0 ? ` (¥${stats.money.toLocaleString()})` : ""}
                </button>
                <button
                  onClick={() => { const next = !showEVTraining; closeAllPanels(); if (next) setShowEVTraining(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showEVTraining
                      ? "text-[#f06292] border-[#f06292] bg-[#f06292]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  EV Train
                </button>
                <button
                  onClick={() => { const next = !showMoveTutor; closeAllPanels(); if (next) setShowMoveTutor(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showMoveTutor
                      ? "text-[#4a90d9] border-[#4a90d9] bg-[#4a90d9]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Tutor
                </button>
                <button
                  onClick={() => { const next = !showMysteryGift; closeAllPanels(); if (next) setShowMysteryGift(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showMysteryGift
                      ? "text-[#f7a838] border-[#f7a838]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Gift
                </button>
                <button
                  onClick={() => { const next = !showLinkCable; closeAllPanels(); if (next) { setShowLinkCable(true); setLinkView("cable"); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showLinkCable
                      ? "text-[#e8433f] border-[#e8433f]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Link
                </button>
                <button
                  onClick={() => { const next = !showWonderTrade; closeAllPanels(); if (next) setShowWonderTrade(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showWonderTrade
                      ? "text-[#3b82f6] border-[#3b82f6]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Trade
                </button>
                <button
                  onClick={() => { const next = !showDayCare; closeAllPanels(); if (next) setShowDayCare(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showDayCare
                      ? "text-[#f7a838] border-[#f7a838]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Day Care
                </button>
                <button
                  onClick={() => { const next = !showPCBox; closeAllPanels(); if (next) setShowPCBox(true); }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showPCBox
                      ? "text-[#38b764] border-[#38b764]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  PC Box ({box.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RegionMap
                  selectedArea={encounter.currentArea}
                  onSelectArea={selectArea}
                />
              </div>
              <div>
                {encounter.currentArea ? (
                  <AreaDetail
                    area={encounter.currentArea}
                    onStartEncounter={handleStartEncounter}
                    isLoading={isSearching}
                  />
                ) : (
                  <div className="bg-[#262b44] border border-[#3a4466] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#8b9bb4]">Select an area on the map</p>
                    <p className="text-[10px] text-[#3a4466] mt-1">Click a zone to see available Pokemon</p>
                  </div>
                )}
              </div>
            </div>

            {/* PC Box panel */}
            <AnimatePresence>
              {showPCBox && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <PCBox
                    box={box}
                    teamSize={team.length}
                    onMoveToTeam={handleMoveToTeam}
                    onRemove={removeFromBox}
                    onSetNickname={setNickname}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Day Care panel */}
            <AnimatePresence>
              {showDayCare && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <DayCare box={box} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wonder Trade panel */}
            <AnimatePresence>
              {showWonderTrade && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <WonderTrade
                    box={box}
                    onRemoveFromBox={removeFromBox}
                    onAddToBox={addToBox}
                    onTradeComplete={() => incrementStat("wonderTradesCompleted")}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mystery Gift panel */}
            <AnimatePresence>
              {showMysteryGift && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <MysteryGift
                    onAddToBox={addToBox}
                    onGiftClaimed={() => incrementStat("mysteryGiftsClaimed")}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Link Cable / Link Trade panel */}
            <AnimatePresence>
              {showLinkCable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {linkView === "cable" ? (
                    <LinkCable
                      online={{
                        state: online.state,
                        createLobby: online.createLobby,
                        joinLobby: online.joinLobby,
                        setLinkMode: online.setLinkMode,
                        disconnect: online.disconnect,
                      }}
                      onBattle={() => {
                        // For now link battle redirects — user can switch to Battle tab
                        setShowLinkCable(false);
                      }}
                      onTrade={() => setLinkView("trade")}
                      onBack={() => {
                        online.disconnect();
                        setShowLinkCable(false);
                      }}
                    />
                  ) : (
                    <LinkTrade
                      myBox={box}
                      trade={online.state.trade}
                      isHost={online.state.isHost}
                      onShareBox={online.shareMyBox}
                      onOfferPokemon={online.sendTradeOffer}
                      onConfirm={online.confirmTrade}
                      onReject={online.rejectTrade}
                      onComplete={(sentPokemon) => {
                        online.completeTrade(sentPokemon);
                      }}
                      onReset={online.resetTrade}
                      onAddToBox={addToBox}
                      onRemoveFromBox={removeFromBox}
                      onBack={() => setLinkView("cable")}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Safari Zone panel */}
            <AnimatePresence>
              {showSafariZone && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <SafariZone
                    state={safari.state}
                    isSearching={safari.isSearching}
                    onEnter={safari.enterSafari}
                    onSearch={safari.search}
                    onThrowBall={safari.throwBall}
                    onThrowRock={safari.throwRock}
                    onThrowBait={safari.throwBait}
                    onRun={safari.run}
                    onContinue={safari.continueAfterResult}
                    onExit={safari.exitSafari}
                    onReset={() => {
                      if (safari.state.caughtPokemon.length > 0) {
                        incrementStat("safariTripsCompleted");
                      }
                      safari.reset();
                    }}
                    onAddAllToBox={(entries) => {
                      entries.forEach((entry) => {
                        const pcPokemon: PCBoxPokemon = {
                          pokemon: entry.pokemon,
                          caughtWith: "poke-ball",
                          caughtInArea: `Safari Zone (${safari.state.region})`,
                          caughtDate: new Date().toISOString(),
                          level: entry.level,
                          nature: NATURES[Math.floor(Math.random() * NATURES.length)],
                          ivs: generateRandomIVs(),
                          ability: entry.pokemon.abilities?.[0]?.ability.name ?? "unknown",
                          isShiny: entry.isShiny,
                        };
                        addToBox(pcPokemon);
                        markCaught(entry.pokemon.id, entry.pokemon.name, "safari");
                        incrementStat("totalCaught");
                        incrementStat("safariPokemonCaught");
                        if (entry.isShiny) incrementStat("shinyCaught");
                        entry.pokemon.types.forEach((t: { type: { name: string } }) => addUniqueType(t.type.name));
                        if (entry.pokemon.id <= 151) addKantoSpecies(entry.pokemon.id);
                      });
                      incrementStat("safariTripsCompleted");
                    }}
                    onClose={() => {
                      if (safari.state.phase !== "entrance") {
                        safari.reset();
                      }
                      setShowSafariZone(false);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Corner (Voltorb Flip) panel */}
            <AnimatePresence>
              {showGameCorner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <VoltorbFlip
                    onAddToBox={handleGameCornerPurchase}
                    onCoinsEarned={(amount) => incrementStat("gameCornerCoinsEarned", amount)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Type Quiz panel */}
            <AnimatePresence>
              {showTypeQuiz && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TypeQuiz onScoreUpdate={(score) => {
                    if (score > (stats.quizBestScore ?? 0)) {
                      // Use incrementStat to set the new best (delta-based)
                      incrementStat("quizBestScore", score - (stats.quizBestScore ?? 0));
                    }
                  }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fossil Lab panel */}
            <AnimatePresence>
              {showFossilLab && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <FossilLab
                    fossilInventory={fossilInventory}
                    onRevive={handleReviveFossil}
                    onClose={() => setShowFossilLab(false)}
                  />
                </motion.div>
              )}
              {showPokeMart && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <PokeMart
                    money={stats.money}
                    onBuy={handlePokeMartBuy}
                    ballInventory={ballInventory}
                    battleItemInventory={battleItemInventory}
                    ownedItems={ownedItems}
                  />
                </motion.div>
              )}
              {showEVTraining && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <EVTraining
                    team={team}
                    ownedItems={ownedItems}
                    onUpdateEvs={(position, evs) => onSetEvs?.(position, evs)}
                    onSessionComplete={() => incrementStat("evTrainingSessions")}
                  />
                </motion.div>
              )}
              {showMoveTutor && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <MoveTutor
                    team={team}
                    heartScales={ownedItems["heart-scale"] ?? 0}
                    onTeachMove={(position, moveName) => {
                      const slot = team[position];
                      if (!slot) return;
                      const moves = slot.selectedMoves ?? [];
                      if (moves.length >= 4) return;
                      onSetMoves?.(position, [...moves, moveName]);
                    }}
                    onSpendHeartScale={() => {
                      if ((ownedItems["heart-scale"] ?? 0) <= 0) return false;
                      setOwnedItems((prev) => ({ ...prev, "heart-scale": (prev["heart-scale"] ?? 0) - 1 }));
                      incrementStat("heartScalesUsed");
                      return true;
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shiny Chain indicator */}
            {stats.shinyChainCount > 0 && (
              <div className="rounded-lg border border-[#f7a838]/30 bg-[#f7a838]/10 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">&#10024;</span>
                  <span className="text-[10px] font-pixel text-[#f7a838]">
                    Shiny Chain: {stats.shinyChainCount}x {stats.shinyChainSpecies}
                  </span>
                </div>
                <span className="text-[9px] text-[#8b9bb4]">
                  Odds: 1/{Math.max(512, Math.floor(4096 / (1 + stats.shinyChainCount * 0.5)))}
                </span>
              </div>
            )}

            {/* Nuzlocke graveyard */}
            {nuzlocke.enabled && nuzlocke.graveyard.length > 0 && (
              <NuzlockeGraveyard graveyard={nuzlocke.graveyard} />
            )}

            {/* Nuzlocke area lock indicator */}
            {nuzlocke.enabled && encounter.currentArea && isAreaEncountered(encounter.currentArea.id) && (
              <div className="rounded-lg border border-[#e8433f]/30 bg-[#e8433f]/10 p-3 text-xs text-[#e8433f]">
                You already had an encounter in this area. Nuzlocke rules: one encounter per area.
              </div>
            )}
          </motion.div>
        )}

        {/* ENCOUNTER INTRO */}
        {encounter.phase === "encounter_intro" && encounter.wildPokemon && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] space-y-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {encounter.wildPokemon.sprites.other?.["official-artwork"]?.front_default && (
                <img
                  src={encounter.wildPokemon.sprites.other["official-artwork"].front_default}
                  alt={encounter.wildPokemon.name}
                  width={150}
                  height={150}
                  className="pixelated drop-shadow-lg"
                />
              )}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-pixel text-[#f0f0e8]"
            >
              A wild{" "}
              <span className="text-[#f7a838]">
                {encounter.wildPokemon.name.charAt(0).toUpperCase() + encounter.wildPokemon.name.slice(1)}
              </span>{" "}
              appeared!
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] text-[#8b9bb4]"
            >
              Level {encounter.wildLevel}
            </motion.p>
          </motion.div>
        )}

        {/* BATTLE PHASE */}
        {encounter.phase === "battle" && encounter.wildPokemon && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WildBattle
              wildPokemon={encounter.wildPokemon}
              wildLevel={encounter.wildLevel}
              wildCurrentHp={encounter.wildCurrentHp}
              wildMaxHp={encounter.wildMaxHp}
              wildStatus={encounter.wildStatus}
              playerSlot={team[0]}
              playerCurrentHp={encounter.playerCurrentHp}
              playerMaxHp={encounter.playerMaxHp}
              playerStatus={encounter.playerStatus}
              ballInventory={ballInventory}
              battleLog={battleLog}
              onFight={playerAttack}
              onThrowBall={handleThrowBall}
              onRun={playerRun}
              disabled={encounter.wildCurrentHp <= 0}
            />

            {/* Wild fainted message */}
            {encounter.wildCurrentHp <= 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-4 space-y-2"
              >
                <p className="text-xs text-[#8b9bb4]">The wild Pokemon fainted. You can&apos;t catch it now.</p>
                <button
                  onClick={returnToMap}
                  className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5476] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Return to Map
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* CATCHING PHASE */}
        {encounter.phase === "catching" && encounter.wildPokemon && encounter.selectedBall && (
          <motion.div
            key="catching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CatchAnimation
              ball={encounter.selectedBall}
              shakeCount={encounter.shakeCount}
              isCaught={encounter.isCaught}
              pokemonName={encounter.wildPokemon.name.charAt(0).toUpperCase() + encounter.wildPokemon.name.slice(1)}
              onComplete={() => {
                if (!encounter.isCaught) {
                  setShowCatchFailure(true);
                }
              }}
            />
          </motion.div>
        )}

        {/* CATCH RESULT (after successful animation) */}
        {encounter.phase === "catching" && encounter.isCaught && encounter.wildPokemon && encounter.selectedBall && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CatchResult
              pokemon={encounter.wildPokemon}
              ball={encounter.selectedBall}
              level={encounter.wildLevel}
              isCaught={true}
              onAddToBox={handleAddToBox}
              onContinueBattle={() => {}}
              onReturnToMap={returnToMap}
            />
          </motion.div>
        )}

        {/* CATCH FAILURE (Keep Fighting / Run Away) */}
        {encounter.phase === "catching" && !encounter.isCaught && showCatchFailure && encounter.wildPokemon && encounter.selectedBall && (
          <motion.div
            key="catch-failure"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CatchResult
              pokemon={encounter.wildPokemon}
              ball={encounter.selectedBall}
              level={encounter.wildLevel}
              isCaught={false}
              onAddToBox={() => {}}
              onContinueBattle={() => {
                setShowCatchFailure(false);
                continueAfterCatch();
              }}
              onReturnToMap={() => {
                setShowCatchFailure(false);
                returnToMap();
              }}
            />
          </motion.div>
        )}

        {/* FLED PHASE */}
        {encounter.phase === "fled" && (
          <motion.div
            key="fled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[300px] space-y-4"
          >
            <p className="text-sm font-pixel text-[#8b9bb4]">
              {encounter.playerCurrentHp <= 0
                ? "Your Pokemon fainted!"
                : "The wild Pokemon fled!"}
            </p>
            <button
              onClick={returnToMap}
              className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5476] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
            >
              Return to Map
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
