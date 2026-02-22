"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, Pokemon, BallType, PCBoxPokemon } from "@/types";
import { useWildEncounter } from "@/hooks/useWildEncounter";
import { usePCBox } from "@/hooks/usePCBox";
import { NATURES } from "@/data/natures";
import RegionMap from "./RegionMap";
import AreaDetail from "./AreaDetail";
import WildBattle from "./WildBattle";
import CatchAnimation from "./CatchAnimation";
import CatchResult from "./CatchResult";
import PCBox from "./PCBox";

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

  const [showPCBox, setShowPCBox] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleStartEncounter = useCallback(async () => {
    setIsSearching(true);
    try {
      await startEncounter();
    } finally {
      setIsSearching(false);
    }
  }, [startEncounter]);

  const handleThrowBall = useCallback((ball: BallType) => {
    if (!useBall(ball)) return;
    throwBall(ball);
  }, [useBall, throwBall]);

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
      ivs: {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        spAtk: Math.floor(Math.random() * 32),
        spDef: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32),
      },
      ability: encounter.wildPokemon.abilities?.[0]?.ability.name ?? "unknown",
    };

    addToBox(pcPokemon);
    returnToMap();
  }, [encounter, addToBox, returnToMap]);

  const handleMoveToTeam = useCallback((index: number) => {
    const slot = moveToTeam(index);
    if (slot) {
      onAddToTeam(slot.pokemon);
    }
  }, [moveToTeam, onAddToTeam]);

  // Auto transition from encounter_intro to battle
  useEffect(() => {
    if (encounter.phase === "encounter_intro") {
      const timer = setTimeout(enterBattle, 2000);
      return () => clearTimeout(timer);
    }
  }, [encounter.phase, enterBattle]);

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
                <span className="text-[9px] text-[#8b9bb4]">
                  Lead: {team[0].pokemon.name.charAt(0).toUpperCase() + team[0].pokemon.name.slice(1)}
                </span>
                <button
                  onClick={() => setShowPCBox(!showPCBox)}
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
                if (encounter.isCaught) {
                  // Stay in catching phase, show CatchResult
                } else {
                  continueAfterCatch();
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
