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
import { useNuzlocke } from "@/hooks/useNuzlocke";
import { useOnlineBattle } from "@/hooks/useOnlineBattle";
import { useSafariZone } from "@/hooks/useSafariZone";
import { LEGENDARY_IDS } from "@/data/legendaries";
import { generateRandomIVs } from "@/utils/wildBattle";
import { playCry } from "@/utils/cryPlayer";

interface WildTabProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: Pokemon) => void;
}

export default function WildTab({ team, onAddToTeam }: WildTabProps) {
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
  const { incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, updateShinyChain, resetShinyChain, stats } = useAchievementsContext();

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
  const [isSearching, setIsSearching] = useState(false);
  const [showCatchFailure, setShowCatchFailure] = useState(false);

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

    returnToMap();
  }, [encounter, addToBox, returnToMap, markCaught, incrementStat, addUniqueBall, addUniqueType, addKantoSpecies, isAlreadyCaught]);

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
                  onClick={() => { setShowSafariZone(!showSafariZone); if (!showSafariZone) { setShowPCBox(false); setShowDayCare(false); setShowWonderTrade(false); setShowMysteryGift(false); setShowLinkCable(false); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showSafariZone
                      ? "text-[#38b764] border-[#38b764] bg-[#38b764]/10"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Safari
                </button>
                <button
                  onClick={() => { setShowMysteryGift(!showMysteryGift); if (!showMysteryGift) { setShowPCBox(false); setShowDayCare(false); setShowWonderTrade(false); setShowLinkCable(false); setShowSafariZone(false); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showMysteryGift
                      ? "text-[#f7a838] border-[#f7a838]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Gift
                </button>
                <button
                  onClick={() => { setShowLinkCable(!showLinkCable); if (!showLinkCable) { setShowPCBox(false); setShowDayCare(false); setShowWonderTrade(false); setShowMysteryGift(false); setShowSafariZone(false); setLinkView("cable"); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showLinkCable
                      ? "text-[#e8433f] border-[#e8433f]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Link
                </button>
                <button
                  onClick={() => { setShowWonderTrade(!showWonderTrade); if (!showWonderTrade) { setShowPCBox(false); setShowDayCare(false); setShowMysteryGift(false); setShowLinkCable(false); setShowSafariZone(false); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showWonderTrade
                      ? "text-[#3b82f6] border-[#3b82f6]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Trade
                </button>
                <button
                  onClick={() => { setShowDayCare(!showDayCare); if (!showDayCare) { setShowPCBox(false); setShowWonderTrade(false); setShowMysteryGift(false); setShowLinkCable(false); setShowSafariZone(false); } }}
                  className={`px-3 py-1 text-[10px] font-pixel rounded-lg border transition-colors ${
                    showDayCare
                      ? "text-[#f7a838] border-[#f7a838]"
                      : "text-[#8b9bb4] border-[#3a4466] hover:text-[#f0f0e8]"
                  }`}
                >
                  Day Care
                </button>
                <button
                  onClick={() => { setShowPCBox(!showPCBox); if (!showPCBox) { setShowDayCare(false); setShowWonderTrade(false); setShowMysteryGift(false); setShowLinkCable(false); setShowSafariZone(false); } }}
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
