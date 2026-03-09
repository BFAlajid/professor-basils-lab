"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, PCBoxPokemon } from "@/types";
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
import RegionMap from "./RegionMap";
import AreaDetail from "./AreaDetail";
import NuzlockeGraveyard from "./NuzlockeGraveyard";
import NuzlockeGameOver from "./NuzlockeGameOver";
import EvolutionScreen from "./EvolutionScreen";
import WildToolbar from "./WildToolbar";
import type { WildPanel } from "./WildToolbar";
import WildPanelRouter from "./WildPanelRouter";
import WildEncounterPhases from "./WildEncounterPhases";

interface WildTabProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: import("@/types").Pokemon) => void;
  onSetEvs?: (position: number, evs: import("@/types").EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
}

const DEFAULT_BATTLE_ITEMS = { potion: 3, "super-potion": 2, "hyper-potion": 1, "full-restore": 1, revive: 1 };

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

  if (team.length === 0)
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm font-pixel text-[#e8433f]">No Pokemon in your team!</p>
        <p className="text-xs text-[#8b9bb4]">Add at least one Pokemon to your team before exploring the wild.</p>
      </div>
    );

  if (nuzlocke.enabled && nuzlocke.isGameOver)
    return <NuzlockeGameOver graveyard={nuzlocke.graveyard} onReset={resetNuzlocke} onDisable={disableNuzlocke} />;
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
              <h2 className="text-base font-pixel text-[#f0f0e8]">Wild Encounters</h2>
              <WildToolbar
                activePanel={activePanel}
                onTogglePanel={(panel) => {
                  if (panel === "linkCable") {
                    setActivePanel(prev => {
                      if (prev === "linkCable") return null;
                      setLinkView("cable");
                      return "linkCable";
                    });
                  } else {
                    togglePanel(panel);
                  }
                }}
                nuzlockeEnabled={nuzlocke.enabled}
                onToggleNuzlocke={() => nuzlocke.enabled ? disableNuzlocke() : enableNuzlocke()}
                teamLeadName={team[0].pokemon.name.charAt(0).toUpperCase() + team[0].pokemon.name.slice(1)}
                fossilCount={Object.values(fossilInventory).reduce((a, b) => a + b, 0)}
                money={stats.money}
                boxCount={box.length}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <p className="text-sm text-[#8b9bb4]">Select an area on the map</p>
                    <p className="text-xs text-[#3a4466] mt-1">Click a zone to see available Pokemon</p>
                  </div>
                )}
              </div>
            </div>
            <AnimatePresence mode="wait">
              {activePanel && (
                <WildPanelRouter
                  activePanel={activePanel}
                  box={box}
                  teamSize={team.length}
                  onMoveToTeam={handleMoveToTeam}
                  onRemoveFromBox={removeFromBox}
                  onSetNickname={setNickname}
                  onAddToBox={addToBox}
                  onTradeComplete={() => incrementStat("wonderTradesCompleted")}
                  onGiftClaimed={() => incrementStat("mysteryGiftsClaimed")}
                  linkView={linkView}
                  online={online}
                  onLinkBattle={() => setActivePanel(null)}
                  onLinkTrade={() => setLinkView("trade")}
                  onLinkBack={() => { online.disconnect(); setActivePanel(null); }}
                  onTradeSwitchToCable={() => setLinkView("cable")}
                  safari={safari}
                  onSafariAddAll={(entries) => {
                    entries.forEach((entry) => {
                      const pcPokemon = createPCBoxPokemon({
                        pokemon: entry.pokemon,
                        caughtInArea: `Safari Zone (${safari.state.region})`,
                        level: entry.level,
                        isShiny: entry.isShiny,
                      });
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
                  onSafariTrip={() => {
                    if (safari.state.caughtPokemon.length > 0) incrementStat("safariTripsCompleted");
                  }}
                  onSafariClose={() => {
                    if (safari.state.phase !== "entrance") safari.reset();
                    setActivePanel(null);
                  }}
                  onGameCornerPurchase={handleGameCornerPurchase}
                  onCoinsEarned={(amount) => incrementStat("gameCornerCoinsEarned", amount)}
                  stats={stats}
                  onQuizScore={(score) => {
                    if (score > (stats.quizBestScore ?? 0)) incrementStat("quizBestScore", score - (stats.quizBestScore ?? 0));
                  }}
                  fossilInventory={fossilInventory}
                  onReviveFossil={handleReviveFossil}
                  onFossilClose={() => setActivePanel(null)}
                  ballInventory={ballInventory}
                  battleItemInventory={battleItemInventory}
                  ownedItems={ownedItems}
                  onPokeMartBuy={handlePokeMartBuy}
                  team={team}
                  onUpdateEvs={(position, evs) => onSetEvs?.(position, evs)}
                  onEvSession={() => incrementStat("evTrainingSessions")}
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
              )}
            </AnimatePresence>
            {evolvingPokemon && (
              <EvolutionScreen
                pcPokemon={evolvingPokemon}
                onEvolve={(evolved) => {
                  const idx = box.findIndex((p) => p === evolvingPokemon);
                  if (idx >= 0) {
                    removeFromBox(idx);
                    addToBox(evolved);
                  }
                  setEvolvingPokemon(null);
                }}
                onClose={() => setEvolvingPokemon(null)}
                ownedItems={ownedItems}
              />
            )}
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
            {nuzlocke.enabled && nuzlocke.graveyard.length > 0 && (
              <NuzlockeGraveyard graveyard={nuzlocke.graveyard} />
            )}
            {nuzlocke.enabled && encounter.currentArea && isAreaEncountered(encounter.currentArea.id) && (
              <div className="rounded-lg border border-[#e8433f]/30 bg-[#e8433f]/10 p-3 text-xs text-[#e8433f]">
                You already had an encounter in this area. Nuzlocke rules: one encounter per area.
              </div>
            )}
          </motion.div>
        )}
        {encounter.phase !== "map" && (
          <WildEncounterPhases
            encounter={encounter}
            battleLog={battleLog}
            playerSlot={team[0]}
            ballInventory={ballInventory}
            showCatchFailure={showCatchFailure}
            onFight={playerAttack}
            onThrowBall={handleThrowBall}
            onRun={playerRun}
            onAddToBox={handleAddToBox}
            onReturnToMap={returnToMap}
            onCatchAnimComplete={() => {
              if (!encounter.isCaught) {
                setShowCatchFailure(true);
              }
            }}
            onContinueAfterCatch={() => {
              setShowCatchFailure(false);
              continueAfterCatch();
            }}
            onCatchFailureReturnToMap={() => {
              setShowCatchFailure(false);
              returnToMap();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
