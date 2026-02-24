"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TeamSlot, BattleReplay, BattleMode, GenerationalMechanic, DifficultyLevel } from "@/types";
import { useBattle } from "@/hooks/useBattle";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useTournament } from "@/hooks/useTournament";
import { useOnlineBattle } from "@/hooks/useOnlineBattle";
import { useBattleFacility } from "@/hooks/useBattleFacility";
import BattleSetup from "./BattleSetup";
import BattleArena from "./BattleArena";
import BattleResult from "./BattleResult";
import ReplayViewer from "./ReplayViewer";
import ReplayList from "./ReplayList";
import TournamentBracket from "./TournamentBracket";
import OnlineLobby from "./OnlineLobby";
import BattleFacilityView from "./BattleFacilityView";
import BattleFactory from "./BattleFactory";
import { useBattleFactory } from "@/hooks/useBattleFactory";
import { GYM_BADGE_NAMES } from "@/data/gymLeaders";

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

  const { recordBattleWin, recordBattleLoss, incrementStat, setBattleTowerStreak } = useAchievementsContext();
  const tournament = useTournament();
  const online = useOnlineBattle();
  const facility = useBattleFacility();
  const factory = useBattleFactory();
  const hasRecorded = useRef(false);
  const prevLogLen = useRef(0);
  const facilityRecorded = useRef(false);
  const [viewingReplay, setViewingReplay] = useState<BattleReplay | null>(null);
  const [replaySaved, setReplaySaved] = useState(false);
  const [activeBattleMode, setActiveBattleMode] = useState<"ai" | "pvp" | "tournament" | "online" | "facility" | "factory" | null>(null);

  // Determine which battle state to use
  const isFacilityMode = activeBattleMode === "facility";
  const activeBattleState = isFacilityMode ? facility.battle.state : state;

  // Record battle result exactly once when battle ends (non-facility)
  useEffect(() => {
    if (isFacilityMode) return;
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
  }, [state.phase, state.winner, recordBattleWin, recordBattleLoss, activeBattleMode, tournament, isFacilityMode]);

  // Record facility battle result when facility battle ends
  useEffect(() => {
    if (!isFacilityMode) return;
    const fBattle = facility.battle.state;
    if (fBattle.phase === "ended" && !facilityRecorded.current) {
      facilityRecorded.current = true;
      const winner = fBattle.winner;
      if (winner === "player1") {
        recordBattleWin();
      } else {
        recordBattleLoss();
      }
      facility.handleBattleEnd(winner ?? "player2");

      // Track E4 / Battle Tower / Gym achievements
      if (winner === "player1") {
        if (facility.facilityState.mode === "elite_four") {
          const newWins = facility.facilityState.wins + 1;
          if (newWins >= facility.facilityState.totalOpponents) {
            incrementStat("eliteFourCleared", 1);
            incrementStat("hallOfFameEntries", 1);
          }
        } else if (facility.facilityState.mode === "battle_tower") {
          const newStreak = facility.facilityState.streak + 1;
          setBattleTowerStreak(newStreak);
        } else if (facility.facilityState.mode === "gym_challenge") {
          incrementStat("gymBadgesEarned", 1);
          const newWins = facility.facilityState.wins + 1;
          if (newWins >= facility.facilityState.totalOpponents) {
            incrementStat("hallOfFameEntries", 1);
          }
        }
      }
    }
    if (fBattle.phase === "setup") {
      facilityRecorded.current = false;
    }
  }, [facility.battle.state.phase, facility.battle.state.winner, isFacilityMode, facility, recordBattleWin, recordBattleLoss, incrementStat]);

  // Track critical hits and super effective hits from active battle log
  useEffect(() => {
    if (activeBattleState.log.length > prevLogLen.current) {
      const newEntries = activeBattleState.log.slice(prevLogLen.current);
      const crits = newEntries.filter((e) => e.kind === "critical").length;
      const supers = newEntries.filter((e) => e.message === "It's super effective!").length;
      if (crits > 0) incrementStat("criticalHits", crits);
      if (supers > 0) incrementStat("superEffectiveHits", supers);
      prevLogLen.current = activeBattleState.log.length;
    }
    if (activeBattleState.phase === "setup") {
      prevLogLen.current = 0;
    }
  }, [activeBattleState.log, activeBattleState.phase, incrementStat]);

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

  // Handle entering factory mode
  useEffect(() => {
    if (activeBattleMode === "factory" && factory.factoryState.phase === "idle") {
      factory.startFactory();
    }
  }, [activeBattleMode, factory]);

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

  // Facility mode handlers
  const handleFacilityReset = useCallback(() => {
    facility.resetFacility();
    setActiveBattleMode(null);
  }, [facility]);

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

  // ═══ FACILITY MODE ═══
  if (isFacilityMode) {
    const fBattle = facility.battle.state;
    const fPhase = facility.facilityState.phase;

    // During an active facility battle, show BattleArena
    if (fPhase === "battling" && fBattle.phase !== "setup" && fBattle.phase !== "ended") {
      return (
        <BattleArena
          state={fBattle}
          onSubmitAction={facility.battle.submitPlayerAction}
          onForceSwitch={facility.battle.forceSwitch}
          onAutoAISwitch={facility.battle.autoAISwitch}
          onSubmitPvPActions={facility.battle.submitActions}
        />
      );
    }

    // Facility battle ended — show result briefly then route to facility view
    if (fPhase === "battling" && fBattle.phase === "ended") {
      const fState = facility.facilityState;
      const currentOpp = fState.opponents[fState.currentOpponentIndex] ?? null;
      const isGym = fState.mode === "gym_challenge";
      const badgeName = isGym && fBattle.winner === "player1"
        ? (GYM_BADGE_NAMES[fState.currentOpponentIndex] ?? null)
        : null;
      return (
        <BattleResult
          state={fBattle}
          onPlayAgain={() => {
            facility.battle.resetBattle();
          }}
          onReset={handleFacilityReset}
          trainerName={currentOpp?.name}
          prizeMoney={currentOpp?.prizeMoney}
          badgeEarned={badgeName ?? undefined}
        />
      );
    }

    // All other facility phases (lobby, pre_battle, between_battles, victory, defeat)
    return (
      <BattleFacilityView
        facilityState={facility.facilityState}
        playerTeam={team}
        isLoading={facility.isLoadingOpponent}
        onStartEliteFour={() => {
          facility.startEliteFour();
        }}
        onStartBattleTower={() => {
          facility.startBattleTower();
        }}
        onStartGymChallenge={() => {
          facility.startGymChallenge();
        }}
        onBeginBattle={() => {
          facility.beginCurrentBattle(team);
        }}
        onNextBattle={() => {
          facility.nextBattle();
        }}
        onHeal={() => {
          facility.healTeam();
        }}
        onReset={handleFacilityReset}
      />
    );
  }

  // ═══ FACTORY MODE ═══
  if (activeBattleMode === "factory") {
    const fPhase = factory.factoryState.phase;

    // During battling, use the main battle hook
    if (fPhase === "battling" && state.phase !== "setup" && state.phase !== "ended") {
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

    // Battle ended in factory mode
    if (fPhase === "battling" && state.phase === "ended") {
      if (state.winner === "player1") {
        factory.reportWin();
      } else {
        factory.reportLoss();
      }
      resetBattle();
      return null;
    }

    // All other factory phases (pick, swap, victory, defeat)
    return (
      <BattleFactory
        factoryState={factory.factoryState}
        onSelect={factory.selectRental}
        onDeselect={factory.deselectRental}
        onConfirm={async () => {
          factory.confirmTeam();
          await factory.generateOpponent();
          // Start battle with factory team vs opponent
          const fState = factory.factoryState;
          const pTeam = fState.selectedIndices.map(i => fState.rentalPool[i]);
          if (fState.opponentTeam.length > 0) {
            startBattle(pTeam, fState.opponentTeam, "ai");
          }
        }}
        onSwap={factory.swapPokemon}
        onSkipSwap={async () => {
          factory.skipSwap();
          await factory.generateOpponent();
          const fState = factory.factoryState;
          if (fState.opponentTeam.length > 0) {
            startBattle(fState.playerTeam, fState.opponentTeam, "ai");
          }
        }}
        onReset={() => {
          factory.resetFactory();
          setActiveBattleMode(null);
        }}
        isLoading={false}
      />
    );
  }

  // ═══ STANDARD MODES ═══
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
          onModeChange={(mode) => setActiveBattleMode(mode as typeof activeBattleMode)}
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
