"use client";

import { useEffect, useState, useCallback } from "react";
import { TeamSlot, BattleReplay, BattleMode, GenerationalMechanic, DifficultyLevel } from "@/types";
import { useBattle } from "@/hooks/useBattle";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useBattleAchievements } from "@/hooks/useBattleAchievements";
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
import { useReplayRecorder } from "@/hooks/useReplayRecorder";
import { GYM_BADGE_NAMES } from "@/data/gymLeaders";
import ChallengeCode from "./ChallengeCode";
import BattleHistoryDashboard from "./BattleHistoryDashboard";
import ELOLeaderboard from "./ELOLeaderboard";
import { useFeatureFlagsContext } from "@/contexts/FeatureFlagsContext";

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

  const { addMoney, stats } = useAchievementsContext();
  const { features } = useFeatureFlagsContext();
  const replayRecorder = useReplayRecorder();
  const tournament = useTournament();
  const online = useOnlineBattle();
  const facility = useBattleFacility();
  const factory = useBattleFactory();
  const [viewingReplay, setViewingReplay] = useState<BattleReplay | null>(null);
  const [replaySaved, setReplaySaved] = useState(false);
  const [activeBattleMode, setActiveBattleMode] = useState<"ai" | "pvp" | "tournament" | "online" | "facility" | "factory" | null>(null);

  // Determine which battle state to use
  const isFacilityMode = activeBattleMode === "facility";
  const activeBattleState = isFacilityMode ? facility.battle.state : state;

  // Track achievements, ELO, and combat stats
  useBattleAchievements({
    state,
    activeBattleState,
    activeBattleMode,
    isFacilityMode,
    tournament,
    facility,
  });

  // Reset replaySaved when returning to setup
  useEffect(() => {
    if (state.phase === "setup") {
      setReplaySaved(false);
    }
  }, [state.phase]);

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
          onPrizeMoney={addMoney}
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
          // Use returned value to avoid stale closure over factoryState
          const opponentTeam = await factory.generateOpponent();
          const fState = factory.factoryState;
          const pTeam = fState.selectedIndices.map(i => fState.rentalPool[i]);
          if (opponentTeam.length > 0) {
            startBattle(pTeam, opponentTeam, "ai");
          }
        }}
        onSwap={factory.swapPokemon}
        onSkipSwap={async () => {
          factory.skipSwap();
          // Use returned value to avoid stale closure over factoryState
          const opponentTeam = await factory.generateOpponent();
          if (opponentTeam.length > 0) {
            startBattle(factory.factoryState.playerTeam, opponentTeam, "ai");
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
    if (features.enableMultiplayer && (activeBattleMode === "online" || online.state.phase !== "idle")) {
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
        {features.enableSharing && (
          <ChallengeCode
            team={team}
            onAccept={(data) => {
              // Load opponent from challenge code and start battle
              Promise.all(
                data.team.map(async (entry) => {
                  const { fetchPokemon } = await import("@/hooks/usePokemon");
                  const pokemon = await fetchPokemon(entry.pokemonId);
                  return {
                    pokemon,
                    position: 0,
                    nature: null,
                    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
                    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
                    ability: entry.ability ?? pokemon.abilities?.[0]?.ability.name ?? null,
                    heldItem: entry.item ?? null,
                    selectedMoves: entry.moves,
                  } as TeamSlot;
                })
              ).then((opponentTeam) => {
                handleStartBattle(team, opponentTeam, "ai");
              });
            }}
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BattleHistoryDashboard
            stats={{
              totalBattlesWon: stats.totalBattlesWon,
              totalBattlesPlayed: stats.totalBattlesPlayed,
              eloRating: stats.eloRating,
            }}
            replays={replayRecorder.loadReplays()}
          />
          {features.enableLeaderboards && (
            <ELOLeaderboard
              eloRating={stats.eloRating}
              totalWins={stats.totalBattlesWon}
              totalLosses={stats.totalBattlesPlayed - stats.totalBattlesWon}
              teamPokemonNames={team.map((s) => s.pokemon.name)}
            />
          )}
        </div>
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
        prizeMoney={state.mode === "ai" && state.winner === "player1" ? 500 + state.turn * 50 : undefined}
        onPrizeMoney={addMoney}
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
