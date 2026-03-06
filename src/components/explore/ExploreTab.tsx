"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TeamSlot } from "@/types";
import { useExplore } from "@/hooks/useExplore";
import { useOverworldPresence } from "@/hooks/useOverworldPresence";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import RomPrompt from "./RomPrompt";
import OverworldCanvas from "./OverworldCanvas";
import DialogBox from "./DialogBox";
import ExploreHUD from "./ExploreHUD";
import MapTransition from "./MapTransition";
import BattleTransition from "./BattleTransition";
import WeatherOverlay from "./WeatherOverlay";
import Minimap from "./Minimap";
import ExploreEncounter from "./ExploreEncounter";

interface ExploreTabProps {
  team: TeamSlot[];
}

export default function ExploreTab({ team }: ExploreTabProps) {
  const { state, camera, tileset, connectedMaps, loadRomFromFile, endBattle, dispatch } =
    useExplore();
  const presence = useOverworldPresence();
  const { incrementStat } = useAchievementsContext();

  const advanceDialog = useCallback(
    () => dispatch({ type: "ADVANCE_DIALOG" }),
    [dispatch]
  );

  const completeDialogLine = useCallback(
    () => dispatch({ type: "COMPLETE_DIALOG_LINE" }),
    [dispatch]
  );

  const mapName = useMemo(() => {
    if (!state.currentMap) return null;
    const { group, num } = state.currentMap.map;
    return `Map ${group}-${num}`;
  }, [state.currentMap]);

  // Overworld presence: join/leave map channel on map change
  useEffect(() => {
    if (state.currentMap && state.phase === "exploring") {
      const mapId = `${state.currentMap.map.group}-${state.currentMap.map.num}`;
      presence.joinMap(mapId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentMap?.map.group, state.currentMap?.map.num, state.phase]);

  // Overworld presence: broadcast position on movement
  useEffect(() => {
    if (state.phase === "exploring" && state.currentMap) {
      presence.updatePosition(
        state.player.x,
        state.player.y,
        state.player.direction,
        state.player.isMoving
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.player.x, state.player.y, state.player.direction, state.player.isMoving, state.phase]);

  // Track steps walked for achievements
  const prevCooldown = useRef(state.encounterCooldown);
  useEffect(() => {
    if (state.encounterCooldown > prevCooldown.current) {
      incrementStat("exploreStepsWalked");
    }
    prevCooldown.current = state.encounterCooldown;
  }, [state.encounterCooldown, incrementStat]);

  // Track unique maps visited for achievements
  const visitedMaps = useRef(new Set<string>());
  useEffect(() => {
    if (state.currentMap) {
      const key = `${state.currentMap.map.group}-${state.currentMap.map.num}`;
      if (!visitedMaps.current.has(key)) {
        visitedMaps.current.add(key);
        incrementStat("exploreMapsVisited");
      }
    }
  }, [state.currentMap, incrementStat]);

  // Loading WASM
  if (state.phase === "loading") {
    return (
      <div className="flex items-center justify-center h-[480px]">
        <p className="text-sm font-pixel animate-pulse" style={{ color: "#8b9bb4" }}>
          Initializing...
        </p>
      </div>
    );
  }

  // ROM not loaded — show file loader
  if (!state.romLoaded) {
    return <RomPrompt onRomLoaded={loadRomFromFile} />;
  }

  // Battle phase — real encounter with WildBattle UI
  if (state.phase === "battle" && state.pendingEncounter) {
    if (team.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[480px] gap-4">
          <p className="text-sm font-pixel" style={{ color: "#e8433f" }}>
            No Pokemon in your team!
          </p>
          <p className="text-xs" style={{ color: "#8b9bb4" }}>
            Add a Pokemon to your team first to battle wild Pokemon.
          </p>
          <button
            onClick={endBattle}
            className="px-6 py-2 rounded-lg font-pixel text-sm transition-colors"
            style={{ backgroundColor: "#3a4466", color: "#f0f0e8" }}
          >
            Return to Overworld
          </button>
        </div>
      );
    }

    return (
      <ExploreEncounter
        pendingEncounter={state.pendingEncounter}
        team={team}
        mapName={mapName ?? `Map ${state.player.mapGroup}-${state.player.mapNum}`}
        onEndBattle={endBattle}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[720px] rounded-lg overflow-hidden border-4 border-[#3a4466] bg-black">
        <OverworldCanvas
          map={state.currentMap}
          tileset={tileset}
          player={state.player}
          npcs={state.currentMap?.npcs ?? []}
          camera={camera}
          connectedMaps={connectedMaps}
          remotePlayers={presence.remotePlayers}
        />

        {/* Weather effects */}
        <WeatherOverlay weather={state.weather} />

        {/* HUD overlay */}
        <ExploreHUD mapName={mapName} />

        {/* Minimap */}
        {state.currentMap && (
          <Minimap
            map={state.currentMap.map}
            player={state.player}
            tileset={tileset}
          />
        )}

        {/* Dialog overlay */}
        {state.dialog && (
          <DialogBox
            dialog={state.dialog}
            onAdvance={advanceDialog}
            onLineComplete={completeDialogLine}
          />
        )}

        {/* Warp fade transition */}
        <MapTransition active={state.isTransitioning} />

        {/* Battle encounter flash */}
        <BattleTransition active={state.isBattleTransitioning} />
      </div>

      {/* Controls hint */}
      <div
        className="mt-3 text-center text-xs"
        style={{ color: "#8b9bb4" }}
      >
        Arrow keys / WASD to move &middot; Z / Enter to interact &middot; Shift
        to run &middot; M for minimap
      </div>
    </div>
  );
}
