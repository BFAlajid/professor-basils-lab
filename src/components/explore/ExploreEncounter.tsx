"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TeamSlot, BallType, PCBoxPokemon } from "@/types";
import type { PendingEncounter } from "@/types/explore";
import { useExploreEncounter } from "@/hooks/useExploreEncounter";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { usePCBox } from "@/hooks/usePCBox";
import { generateRandomIVs } from "@/utils/wildBattle";
import { NATURES } from "@/data/natures";
import WildBattle from "@/components/wild/WildBattle";
import CatchAnimation from "@/components/wild/CatchAnimation";
import CatchResult from "@/components/wild/CatchResult";

interface ExploreEncounterProps {
  pendingEncounter: PendingEncounter;
  team: TeamSlot[];
  mapName: string;
  onEndBattle: () => void;
}

export default function ExploreEncounter({
  pendingEncounter,
  team,
  mapName,
  onEndBattle,
}: ExploreEncounterProps) {
  const encounter = useExploreEncounter(pendingEncounter, team);
  const { state } = encounter;

  const { markSeen, markCaught } = usePokedexContext();
  const { incrementStat, addUniqueBall, addUniqueType, addKantoSpecies } =
    useAchievementsContext();
  const { addToBox, ballInventory, useBall, isAlreadyCaught } = usePCBox();

  // Mark as seen when Pokemon data loads
  const seenRef = useRef(false);
  useEffect(() => {
    if (state.wildPokemon && !seenRef.current) {
      seenRef.current = true;
      markSeen(state.wildPokemon.id, state.wildPokemon.name, "gba-import");
    }
  }, [state.wildPokemon, markSeen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      encounter.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThrowBall = useCallback(
    (ball: BallType) => {
      if (!useBall(ball)) return;
      incrementStat("ballsThrown");
      const repeat = state.wildPokemon ? isAlreadyCaught(state.wildPokemon.id) : false;
      encounter.throwBall(ball, repeat);
    },
    [useBall, incrementStat, isAlreadyCaught, state.wildPokemon, encounter]
  );

  const handleAddToBox = useCallback(
    (nickname?: string) => {
      if (!state.wildPokemon) return;
      const pokemon = state.wildPokemon;

      const pcPokemon: PCBoxPokemon = {
        pokemon,
        nickname,
        caughtWith: state.selectedBall ?? "poke-ball",
        caughtInArea: mapName,
        caughtDate: new Date().toISOString(),
        level: state.wildLevel,
        nature: NATURES[Math.floor(Math.random() * NATURES.length)],
        ivs: generateRandomIVs(),
        ability: pokemon.abilities?.[0]?.ability.name ?? "unknown",
        isShiny: state.isShiny,
      };

      addToBox(pcPokemon);
      markCaught(pokemon.id, pokemon.name, "gba-import");
      incrementStat("totalCaught");
      incrementStat("gbaImports");
      addUniqueBall(state.selectedBall ?? "poke-ball");
      pokemon.types.forEach((t) => addUniqueType(t.type.name));
      if (pokemon.id <= 151) addKantoSpecies(pokemon.id);
      if (state.isShiny) incrementStat("shinyCaught");

      onEndBattle();
    },
    [
      state, mapName, addToBox, markCaught, incrementStat,
      addUniqueBall, addUniqueType, addKantoSpecies, onEndBattle,
    ]
  );

  const handleReturnToOverworld = useCallback(() => {
    encounter.reset();
    onEndBattle();
  }, [encounter, onEndBattle]);

  // Loading
  if (state.phase === "loading" || state.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-[480px] gap-3">
        <p
          className="text-sm font-pixel animate-pulse"
          style={{ color: "#8b9bb4" }}
        >
          Encountering wild Pokemon...
        </p>
        <p className="text-xs" style={{ color: "#3a4466" }}>
          Species #{pendingEncounter.speciesId} &middot; Lv.{" "}
          {pendingEncounter.level}
        </p>
      </div>
    );
  }

  // Battle
  if (state.phase === "battle" && state.wildPokemon) {
    return (
      <div className="p-4">
        <WildBattle
          wildPokemon={state.wildPokemon}
          wildLevel={state.wildLevel}
          wildCurrentHp={state.wildCurrentHp}
          wildMaxHp={state.wildMaxHp}
          wildStatus={state.wildStatus}
          playerSlot={team[0]}
          playerCurrentHp={state.playerCurrentHp}
          playerMaxHp={state.playerMaxHp}
          playerStatus={state.playerStatus}
          ballInventory={ballInventory}
          battleLog={state.battleLog}
          onFight={encounter.playerAttack}
          onThrowBall={handleThrowBall}
          onRun={encounter.run}
        />
      </div>
    );
  }

  // Catch animation
  if (state.phase === "catching" && state.wildPokemon && state.selectedBall) {
    return (
      <div className="flex items-center justify-center h-[480px]">
        <CatchAnimation
          ball={state.selectedBall}
          shakeCount={state.shakeCount}
          isCaught={state.isCaught}
          pokemonName={state.wildPokemon.name}
          onComplete={encounter.catchAnimationDone}
        />
      </div>
    );
  }

  // Caught — show result + add to box
  if (state.phase === "caught" && state.wildPokemon && state.selectedBall) {
    return (
      <div className="flex items-center justify-center h-[480px]">
        <CatchResult
          pokemon={state.wildPokemon}
          ball={state.selectedBall}
          level={state.wildLevel}
          isCaught={true}
          onAddToBox={handleAddToBox}
          onContinueBattle={handleReturnToOverworld}
          onReturnToMap={handleReturnToOverworld}
        />
      </div>
    );
  }

  // Fled or player ran
  if (state.phase === "fled") {
    return (
      <div className="flex flex-col items-center justify-center h-[480px] gap-4">
        <p className="text-sm font-pixel" style={{ color: "#f0f0e8" }}>
          Got away safely!
        </p>
        <button
          onClick={handleReturnToOverworld}
          className="px-6 py-2 rounded-lg font-pixel text-sm transition-colors"
          style={{ backgroundColor: "#3a4466", color: "#f0f0e8" }}
        >
          Return to Overworld
        </button>
      </div>
    );
  }

  // Player fainted
  if (state.phase === "fainted") {
    return (
      <div className="flex flex-col items-center justify-center h-[480px] gap-4">
        <p className="text-sm font-pixel" style={{ color: "#e8433f" }}>
          Your Pokemon fainted!
        </p>
        <button
          onClick={handleReturnToOverworld}
          className="px-6 py-2 rounded-lg font-pixel text-sm transition-colors"
          style={{ backgroundColor: "#3a4466", color: "#f0f0e8" }}
        >
          Return to Overworld
        </button>
      </div>
    );
  }

  return null;
}
