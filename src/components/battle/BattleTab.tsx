"use client";

import { TeamSlot } from "@/types";
import { useBattle } from "@/hooks/useBattle";
import BattleSetup from "./BattleSetup";
import BattleArena from "./BattleArena";
import BattleResult from "./BattleResult";

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
  } = useBattle();

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center text-[#8b9bb4]">
        Add Pokemon to your team to battle
      </div>
    );
  }

  if (state.phase === "setup") {
    return (
      <BattleSetup
        playerTeam={team}
        onStart={startBattle}
        onGenerateOpponent={generateOpponent}
        isLoadingOpponent={isLoadingOpponent}
      />
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
