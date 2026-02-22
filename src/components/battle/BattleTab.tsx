"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TeamSlot, BattleReplay, BattleMode, GenerationalMechanic, DifficultyLevel } from "@/types";
import { useBattle } from "@/hooks/useBattle";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useTournament } from "@/hooks/useTournament";
import { useOnlineBattle } from "@/hooks/useOnlineBattle";
import BattleSetup from "./BattleSetup";
import BattleArena from "./BattleArena";
import BattleResult from "./BattleResult";
import ReplayViewer from "./ReplayViewer";
import ReplayList from "./ReplayList";
import TournamentBracket from "./TournamentBracket";
import OnlineLobby from "./OnlineLobby";

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

  const { recordBattleWin, recordBattleLoss, incrementStat } = useAchievementsContext();
  const tournament = useTournament();
  const online = useOnlineBattle();
  const hasRecorded = useRef(false);
  const prevLogLen = useRef(0);
  const [viewingReplay, setViewingReplay] = useState<BattleReplay | null>(null);
  const [replaySaved, setReplaySaved] = useState(false);
  const [activeBattleMode, setActiveBattleMode] = useState<"ai" | "pvp" | "tournament" | "online" | null>(null);

  // Record battle result exactly once when battle ends
  useEffect(() => {
    if (state.phase === "ended" && !hasRecorded.current) {
      hasRecorded.current = true;
      if (state.winner === "player1") {
        recordBattleWin();
        if (activeBattleMode === "tournament") {
          tournament.reportWin();
        }
      } else {
        recordBattleLoss();
        if (activeBattleMode === "tournament") {
          tournament.reportLoss();
        }
      }
    }
    if (state.phase === "setup") {
      hasRecorded.current = false;
      setReplaySaved(false);
    }
  }, [state.phase, state.winner, recordBattleWin, recordBattleLoss, activeBattleMode, tournament]);

  // Track critical hits and super effective hits from battle log
  useEffect(() => {
    if (state.log.length > prevLogLen.current) {
      const newEntries = state.log.slice(prevLogLen.current);
      const crits = newEntries.filter((e) => e.kind === "critical").length;
      const supers = newEntries.filter((e) => e.message === "It's super effective!").length;
      if (crits > 0) incrementStat("criticalHits", crits);
      if (supers > 0) incrementStat("superEffectiveHits", supers);
      prevLogLen.current = state.log.length;
    }
    if (state.phase === "setup") {
      prevLogLen.current = 0;
    }
  }, [state.log, state.phase, incrementStat]);

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

  // Handle tournament match start
  const handleTournamentBeginMatch = useCallback(async (opponentIndex: number) => {
    tournament.beginMatch(opponentIndex);
    const opponent = tournament.state.trainers[opponentIndex];
    if (!opponent) return;
    setActiveBattleMode("tournament");
    startBattle(team, opponent.team, "ai", null, null, opponent.difficulty);
  }, [tournament, team, startBattle]);

  // Handle starting battle from setup (for ai/pvp modes)
  const handleStartBattle = useCallback((
    player1Team: TeamSlot[],
    player2Team: TeamSlot[],
    mode: BattleMode,
    playerMechanic?: GenerationalMechanic,
    aiMechanic?: GenerationalMechanic,
    difficulty?: DifficultyLevel
  ) => {
    setActiveBattleMode(mode);
    startBattle(player1Team, player2Team, mode, playerMechanic, aiMechanic, difficulty);
  }, [startBattle]);

  // Handle online ready to battle
  const handleOnlineReady = useCallback(() => {
    online.sendReady();
    if (online.state.opponentTeam) {
      setActiveBattleMode("online");
      startBattle(team, online.state.opponentTeam, "pvp");
    }
  }, [online, team, startBattle]);

  const handleResetBattle = useCallback(() => {
    resetBattle();
    setActiveBattleMode(null);
  }, [resetBattle]);

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

  // Setup phase — route to appropriate sub-view
  if (state.phase === "setup") {
    // Tournament mode active
    if (activeBattleMode === "tournament" || tournament.state.trainers.length > 0) {
      return (
        <div className="space-y-6">
          <TournamentBracket
            state={tournament.state}
            isGenerating={tournament.isGenerating}
            onStartTournament={tournament.startTournament}
            onBeginMatch={handleTournamentBeginMatch}
            onNextRound={tournament.nextRound}
            onReset={() => {
              tournament.reset();
              setActiveBattleMode(null);
            }}
          />
          <ReplayList onViewReplay={handleViewReplay} />
        </div>
      );
    }

    // Online mode active
    if (activeBattleMode === "online" || online.state.phase !== "idle") {
      return (
        <div className="space-y-6">
          <OnlineLobby
            state={online.state}
            playerTeam={team}
            onCreateLobby={online.createLobby}
            onJoinLobby={online.joinLobby}
            onSubmitTeam={online.submitTeam}
            onReady={handleOnlineReady}
            onDisconnect={() => {
              online.disconnect();
              setActiveBattleMode(null);
            }}
          />
          <ReplayList onViewReplay={handleViewReplay} />
        </div>
      );
    }

    // Default setup view
    return (
      <div className="space-y-6">
        <BattleSetup
          playerTeam={team}
          onStart={handleStartBattle}
          onGenerateOpponent={generateOpponent}
          isLoadingOpponent={isLoadingOpponent}
          onModeChange={(mode) => setActiveBattleMode(mode)}
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
          if (activeBattleMode === "tournament") {
            // Return to bracket, not setup
            resetBattle();
          } else {
            handleResetBattle();
          }
        }}
        onReset={handleResetBattle}
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
