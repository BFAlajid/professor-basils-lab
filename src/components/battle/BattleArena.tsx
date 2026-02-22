"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BattleState, BattleTurnAction } from "@/types";
import { getActivePokemon } from "@/utils/battle";
import PokemonBattleSprite from "./PokemonBattleSprite";
import MovePanel from "./MovePanel";
import SwitchPanel from "./SwitchPanel";
import BattleLog from "./BattleLog";

interface BattleArenaProps {
  state: BattleState;
  onSubmitAction: (action: BattleTurnAction) => void;
  onForceSwitch: (player: "player1" | "player2", pokemonIndex: number) => void;
  onAutoAISwitch: () => void;
  // PvP support
  onSubmitPvPActions?: (p1: BattleTurnAction, p2: BattleTurnAction) => void;
}

export default function BattleArena({
  state,
  onSubmitAction,
  onForceSwitch,
  onAutoAISwitch,
  onSubmitPvPActions,
}: BattleArenaProps) {
  const [showSwitch, setShowSwitch] = useState(false);
  const [mechanicActivated, setMechanicActivated] = useState(false);
  const [pvpPhase, setPvpPhase] = useState<"player1" | "player2" | "ready">("player1");
  const [pvpP1Action, setPvpP1Action] = useState<BattleTurnAction | null>(null);

  const p1Active = getActivePokemon(state.player1);
  const p2Active = getActivePokemon(state.player2);

  const isForceSwitch = state.phase === "force_switch";
  const isActionSelect = state.phase === "action_select";

  // Auto AI switch when AI's Pokemon faints
  useEffect(() => {
    if (isForceSwitch && state.waitingForSwitch === "player2" && state.mode === "ai") {
      const timer = setTimeout(onAutoAISwitch, 500);
      return () => clearTimeout(timer);
    }
  }, [isForceSwitch, state.waitingForSwitch, state.mode, onAutoAISwitch]);

  // Reset mechanic toggle when phase or turn changes
  useEffect(() => {
    setMechanicActivated(false);
  }, [state.phase, state.turn]);

  const currentPlayer = state.mode === "pvp" ? pvpPhase : "player1";
  const currentTeam = currentPlayer === "player1" ? state.player1 : state.player2;
  const currentActive = currentPlayer === "player1" ? p1Active : p2Active;

  // Mechanic availability
  const teamMechanic = currentTeam.selectedMechanic;
  const canUseMechanic = (() => {
    if (!teamMechanic || !currentActive) return false;
    if (teamMechanic === "mega") {
      return !currentActive.hasMegaEvolved && currentActive.megaFormeData !== null;
    }
    if (teamMechanic === "tera") {
      return !currentActive.hasTerastallized && currentActive.teraType !== null;
    }
    if (teamMechanic === "dynamax") {
      return !currentActive.hasDynamaxed;
    }
    return false;
  })();

  // Check if ANY team member has already used the mechanic this battle
  const mechanicUsedThisBattle = currentTeam.pokemon.some(p => {
    if (teamMechanic === "mega") return p.hasMegaEvolved;
    if (teamMechanic === "tera") return p.hasTerastallized;
    if (teamMechanic === "dynamax") return p.hasDynamaxed;
    return false;
  });
  const canActivateMechanic = canUseMechanic && !mechanicUsedThisBattle;

  const handleMoveSelect = (moveIndex: number) => {
    let action: BattleTurnAction;

    if (mechanicActivated && canActivateMechanic) {
      if (teamMechanic === "mega") action = { type: "MEGA_EVOLVE", moveIndex };
      else if (teamMechanic === "tera") action = { type: "TERASTALLIZE", moveIndex };
      else if (teamMechanic === "dynamax") action = { type: "DYNAMAX", moveIndex };
      else action = { type: "MOVE", moveIndex };
      setMechanicActivated(false);
    } else {
      action = { type: "MOVE", moveIndex };
    }

    if (state.mode === "ai") {
      onSubmitAction(action);
      setShowSwitch(false);
    } else {
      // PvP mode
      if (pvpPhase === "player1") {
        setPvpP1Action(action);
        setPvpPhase("player2");
      } else if (pvpPhase === "player2" && pvpP1Action && onSubmitPvPActions) {
        onSubmitPvPActions(pvpP1Action, action);
        setPvpPhase("player1");
        setPvpP1Action(null);
      }
    }
  };

  const handleSwitch = (pokemonIndex: number) => {
    if (isForceSwitch) {
      onForceSwitch(state.waitingForSwitch!, pokemonIndex);
    } else if (state.mode === "ai") {
      onSubmitAction({ type: "SWITCH", pokemonIndex });
      setShowSwitch(false);
    } else {
      // PvP switch
      const action: BattleTurnAction = { type: "SWITCH", pokemonIndex };
      if (pvpPhase === "player1") {
        setPvpP1Action(action);
        setPvpPhase("player2");
      } else if (pvpPhase === "player2" && pvpP1Action && onSubmitPvPActions) {
        onSubmitPvPActions(pvpP1Action, action);
        setPvpPhase("player1");
        setPvpP1Action(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Battle Field */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
        <div className="flex items-center justify-between gap-8">
          <PokemonBattleSprite
            pokemon={p1Active}
            side="left"
            label={state.mode === "ai" ? "Your Pokemon" : "Player 1"}
          />

          <motion.div
            className="text-2xl font-bold text-[#3a4466] font-pixel"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            VS
          </motion.div>

          <PokemonBattleSprite
            pokemon={p2Active}
            side="right"
            label={state.mode === "ai" ? "Opponent" : "Player 2"}
          />
        </div>

        {/* Team Pokemon indicators */}
        <div className="flex justify-between mt-4">
          {[state.player1, state.player2].map((team, teamIdx) => (
            <div key={teamIdx} className="flex gap-1">
              {team.pokemon.map((p, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${
                    p.isFainted
                      ? "bg-[#e8433f]"
                      : p.isActive
                      ? "bg-[#38b764]"
                      : "bg-[#8b9bb4]"
                  }`}
                  title={`${p.slot.pokemon.name} - ${p.isFainted ? "Fainted" : `${Math.round((p.currentHp / p.maxHp) * 100)}% HP`}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Action Panel */}
      {isActionSelect && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          {state.mode === "pvp" && (
            <div className="mb-3 text-sm font-bold text-[#e8433f] font-pixel">
              {pvpPhase === "player1" ? "Player 1 — Choose your action" : "Player 2 — Choose your action"}
            </div>
          )}

          {!showSwitch ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold font-pixel">
                  What will {currentActive.slot.pokemon.name} do?
                </h4>
                <button
                  onClick={() => setShowSwitch(true)}
                  className="rounded-lg bg-[#3a4466] px-3 py-1.5 text-xs text-[#8b9bb4] hover:bg-[#4a5577] hover:text-[#f0f0e8] transition-colors"
                >
                  Switch
                </button>
              </div>
              {/* Mechanic Button */}
              {canActivateMechanic && (
                <button
                  onClick={() => setMechanicActivated(!mechanicActivated)}
                  className={`w-full rounded-lg px-4 py-2 mb-3 text-sm font-bold font-pixel transition-all ${
                    mechanicActivated ? "ring-2 ring-[#f0f0e8] scale-[1.02]" : ""
                  }`}
                  style={{
                    backgroundColor: mechanicActivated
                      ? (teamMechanic === "mega" ? "#f7a838" : teamMechanic === "tera" ? "#60a5fa" : "#e8433f")
                      : "#3a4466",
                    color: mechanicActivated ? "#1a1c2c" : "#f0f0e8",
                  }}
                >
                  {teamMechanic === "mega" ? "Mega Evolve" : teamMechanic === "tera" ? `Terastallize (${currentActive.teraType})` : `Dynamax${currentActive.isDynamaxed ? ` (${currentActive.dynamaxTurnsLeft}t)` : ""}`}
                </button>
              )}
              <MovePanel
                pokemon={currentActive}
                onSelectMove={handleMoveSelect}
                disabled={false}
                isDynamaxed={currentActive.isDynamaxed}
              />
            </div>
          ) : (
            <SwitchPanel
              team={currentTeam}
              onSwitch={handleSwitch}
              forced={false}
              onCancel={() => setShowSwitch(false)}
            />
          )}
        </div>
      )}

      {/* Force Switch */}
      {isForceSwitch && state.waitingForSwitch === "player1" && (
        <SwitchPanel
          team={state.player1}
          onSwitch={(idx) => handleSwitch(idx)}
          forced={true}
        />
      )}
      {isForceSwitch && state.waitingForSwitch === "player2" && state.mode === "pvp" && (
        <SwitchPanel
          team={state.player2}
          onSwitch={(idx) => onForceSwitch("player2", idx)}
          forced={true}
        />
      )}

      {/* Battle Log */}
      <BattleLog log={state.log} />
    </div>
  );
}
