"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TeamSlot, BattleReplay } from "@/types";
import { useBattle } from "@/hooks/useBattle";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import BattleSetup from "./BattleSetup";
import BattleArena from "./BattleArena";
import BattleResult from "./BattleResult";
import ReplayViewer from "./ReplayViewer";
import ReplayList from "./ReplayList";

interface BattleTabProps {
  team: TeamSlot[];
}

export default function BattleTab({ team }: BattleTabProps) {
  const {
    state,
    startBattle,
    generateOpponent,
    isLoadingOpponent,
    submitPlayerAction,
    submitActions,
    forceSwitch,
    autoAISwitch,
    resetBattle,
    saveReplay,
  } = useBattle();

  const { recordBattleWin, recordBattleLoss } = useAchievementsContext();
  const hasRecorded = useRef(false);
  const [viewingReplay, setViewingReplay] = useState<BattleReplay | null>(null);
  const [replaySaved, setReplaySaved] = useState(false);

  // Record battle result exactly once when battle ends
  useEffect(() => {
    if (state.phase === "ended" && !hasRecorded.current) {
      hasRecorded.current = true;
      if (state.winner === "player1") {
        recordBattleWin();
      } else {
        recordBattleLoss();
      }
    }
    if (state.phase === "setup") {
      hasRecorded.current = false;
      setReplaySaved(false);
    }
  }, [state.phase, state.winner, recordBattleWin, recordBattleLoss]);

  const handleSaveReplay = useCallback(() => {
    const replay = saveReplay(state);
    if (replay) {
      setReplaySaved(true);
    }
  }, [saveReplay, state]);

  const handleViewReplay = useCallback((replay: BattleReplay) => {
    setViewingReplay(replay);
  }, []);

  const handleCloseReplay = useCallback(() => {
    setViewingReplay(null);
  }, []);

  // If viewing a replay, show the replay viewer
  if (viewingReplay) {
    return <ReplayViewer replay={viewingReplay} onClose={handleCloseReplay} />;
  }

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to your team to battle
      </div>
    );
  }

  if (state.phase === "setup") {
    return (
      <div className="space-y-6">
        <BattleSetup
          playerTeam={team}
          onStart={startBattle}
          onGenerateOpponent={generateOpponent}
          isLoadingOpponent={isLoadingOpponent}
        />
        <ReplayList onViewReplay={handleViewReplay} />
      </div>
    );
  }

  if (state.phase === "ended") {
    return (
      <BattleResult
        state={state}
        onPlayAgain={() => {
          resetBattle();
        }}
        onReset={resetBattle}
        onSaveReplay={handleSaveReplay}
        replaySaved={replaySaved}
      />
    );
  }

  return (
    <BattleArena
      state={state}
      onSubmitAction={submitPlayerAction}
      onForceSwitch={forceSwitch}
      onAutoAISwitch={autoAISwitch}
      onSubmitPvPActions={submitActions}
    />
  );
}
