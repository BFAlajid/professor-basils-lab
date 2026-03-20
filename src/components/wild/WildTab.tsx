"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot } from "@/types";
import { WildTabProvider, useWildTabContext } from "@/contexts/WildTabContext";
import RegionMap from "./RegionMap";
import AreaDetail from "./AreaDetail";
import NuzlockeGraveyard from "./NuzlockeGraveyard";
import NuzlockeGameOver from "./NuzlockeGameOver";
import EvolutionScreen from "./EvolutionScreen";
import WildToolbar from "./WildToolbar";
import WildPanelRouter from "./WildPanelRouter";
import WildEncounterPhases from "./WildEncounterPhases";

interface WildTabProps {
  team: TeamSlot[];
  onAddToTeam: (pokemon: import("@/types").Pokemon) => void;
  onSetEvs?: (position: number, evs: import("@/types").EVSpread) => void;
  onSetMoves?: (position: number, moves: string[]) => void;
}

export default function WildTab({ team, onAddToTeam, onSetEvs, onSetMoves }: WildTabProps) {
  if (team.length === 0)
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm font-pixel text-[#e8433f]">No Pokemon in your team!</p>
        <p className="text-xs text-[#8b9bb4]">Add at least one Pokemon to your team before exploring the wild.</p>
      </div>
    );

  return (
    <WildTabProvider team={team} onAddToTeam={onAddToTeam} onSetEvs={onSetEvs} onSetMoves={onSetMoves}>
      <WildTabContent />
    </WildTabProvider>
  );
}

function WildTabContent() {
  const {
    encounter,
    battleLog,
    selectArea,
    playerAttack,
    playerRun,
    returnToMap,
    continueAfterCatch,
    nuzlocke,
    disableNuzlocke,
    resetNuzlocke,
    isAreaEncountered,
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
    ownedItems,
    box,
    removeFromBox,
    addToBox,
    ballInventory,
    stats,
    team,
    handleStartEncounter,
    handleThrowBall,
    handleAddToBox,
    enableNuzlocke,
  } = useWildTabContext();

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
              {activePanel && <WildPanelRouter />}
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
