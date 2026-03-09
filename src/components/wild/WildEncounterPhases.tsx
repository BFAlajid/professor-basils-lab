"use client";

import { motion } from "framer-motion";
import { TeamSlot, BallType, WildEncounterState } from "@/types";
import WildBattle from "./WildBattle";
import CatchAnimation from "./CatchAnimation";
import CatchResult from "./CatchResult";

interface WildEncounterPhasesProps {
  encounter: WildEncounterState;
  battleLog: string[];
  playerSlot: TeamSlot;
  ballInventory: Record<BallType, number>;
  showCatchFailure: boolean;
  onFight: (moveIndex: number) => void;
  onThrowBall: (ball: BallType) => void;
  onRun: () => void;
  onAddToBox: (nickname?: string) => void;
  onReturnToMap: () => void;
  onCatchAnimComplete: () => void;
  onContinueAfterCatch: () => void;
  onCatchFailureReturnToMap: () => void;
}

export default function WildEncounterPhases({
  encounter,
  battleLog,
  playerSlot,
  ballInventory,
  showCatchFailure,
  onFight,
  onThrowBall,
  onRun,
  onAddToBox,
  onReturnToMap,
  onCatchAnimComplete,
  onContinueAfterCatch,
  onCatchFailureReturnToMap,
}: WildEncounterPhasesProps) {
  return (
    <>
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
            playerSlot={playerSlot}
            playerCurrentHp={encounter.playerCurrentHp}
            playerMaxHp={encounter.playerMaxHp}
            playerStatus={encounter.playerStatus}
            ballInventory={ballInventory}
            battleLog={battleLog}
            onFight={onFight}
            onThrowBall={onThrowBall}
            onRun={onRun}
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
                onClick={onReturnToMap}
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
            onComplete={onCatchAnimComplete}
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
            onAddToBox={onAddToBox}
            onContinueBattle={() => {}}
            onReturnToMap={onReturnToMap}
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
            onContinueBattle={onContinueAfterCatch}
            onReturnToMap={onCatchFailureReturnToMap}
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
            onClick={onReturnToMap}
            className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5476] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
          >
            Return to Map
          </button>
        </motion.div>
      )}
    </>
  );
}
