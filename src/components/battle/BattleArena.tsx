"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { BattleState, BattleTurnAction, ActiveAnimation, SpriteAnimationState } from "@/types";
import { getActivePokemon } from "@/utils/battle";
import { getAttackerSide, buildAnimationConfig, isCriticalEntry, isSuperEffectiveEntry, isFaintEntry } from "@/utils/moveAnimations";
import PokemonBattleSprite from "./PokemonBattleSprite";
import MoveAnimationLayer from "./MoveAnimationLayer";
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

export default memo(function BattleArena({
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

  // Move animation state
  const [activeAnimation, setActiveAnimation] = useState<ActiveAnimation | null>(null);
  const [p1SpriteAnim, setP1SpriteAnim] = useState<SpriteAnimationState>("idle");
  const [p2SpriteAnim, setP2SpriteAnim] = useState<SpriteAnimationState>("idle");
  const prevLogLen = useRef(0);
  const animQueue = useRef<ActiveAnimation[]>([]);
  const isAnimating = useRef(false);

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

  // Process new log entries for animations
  const playNextAnimation = useCallback(() => {
    if (animQueue.current.length === 0) {
      isAnimating.current = false;
      setActiveAnimation(null);
      setP1SpriteAnim("idle");
      setP2SpriteAnim("idle");
      return;
    }
    isAnimating.current = true;
    const anim = animQueue.current.shift()!;
    setActiveAnimation(anim);

    // Set sprite states
    if (anim.attacker === "left") {
      setP1SpriteAnim("attacking");
      setTimeout(() => { setP2SpriteAnim("hit"); }, 200);
    } else {
      setP2SpriteAnim("attacking");
      setTimeout(() => { setP1SpriteAnim("hit"); }, 200);
    }
    // Reset sprite states after animation
    setTimeout(() => {
      setP1SpriteAnim("idle");
      setP2SpriteAnim("idle");
    }, anim.config.duration);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    // Small gap between animations
    setTimeout(playNextAnimation, 100);
  }, [playNextAnimation]);

  useEffect(() => {
    if (state.log.length <= prevLogLen.current) {
      if (state.phase === "setup") prevLogLen.current = 0;
      return;
    }
    const newEntries = state.log.slice(prevLogLen.current);
    prevLogLen.current = state.log.length;

    const p1Name = p1Active?.slot.pokemon.name ?? "";
    const p2Name = p2Active?.slot.pokemon.name ?? "";

    // Batch: scan new entries for move-use patterns
    let pendingAnim: Partial<ActiveAnimation> | null = null;

    for (const entry of newEntries) {
      // Check for move-use ("X used Y!")
      const moveMatch = entry.message.match(/^(.+?) used (.+?)!$/);
      if (moveMatch && (entry.kind === "damage" || entry.kind === "status")) {
        const side = getAttackerSide(entry, p1Name, p2Name);
        const damageClass = entry.kind === "status" ? "status" as const : "physical" as const;
        pendingAnim = {
          id: `${Date.now()}-${Math.random()}`,
          config: buildAnimationConfig(damageClass),
          attacker: side,
          isCritical: false,
          isSuperEffective: false,
          startTime: Date.now(),
        };
        continue;
      }

      // Enrich pending animation with follow-up info
      if (pendingAnim) {
        if (isCriticalEntry(entry)) {
          pendingAnim.isCritical = true;
          continue;
        }
        if (isSuperEffectiveEntry(entry)) {
          pendingAnim.isSuperEffective = true;
          continue;
        }
      }

      // Faint triggers sprite animation directly (no overlay)
      if (isFaintEntry(entry)) {
        const faintedSide = getAttackerSide(entry, p1Name, p2Name);
        if (faintedSide === "left") setP1SpriteAnim("fainting");
        else setP2SpriteAnim("fainting");
      }

      // Switch triggers entering animation
      if (entry.kind === "switch") {
        const switchSide = getAttackerSide(entry, p1Name, p2Name);
        if (switchSide === "left") setP1SpriteAnim("entering");
        else setP2SpriteAnim("entering");
        setTimeout(() => {
          setP1SpriteAnim("idle");
          setP2SpriteAnim("idle");
        }, 500);
      }

      // When we hit a non-continuation entry, flush pending animation
      if (pendingAnim && pendingAnim.id) {
        animQueue.current.push(pendingAnim as ActiveAnimation);
        pendingAnim = null;
      }
    }

    // Flush any remaining pending animation
    if (pendingAnim && pendingAnim.id) {
      animQueue.current.push(pendingAnim as ActiveAnimation);
    }

    // Start playing if not already
    if (!isAnimating.current && animQueue.current.length > 0) {
      playNextAnimation();
    }
  }, [state.log, state.phase, p1Active, p2Active, playNextAnimation]);

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
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 relative">
        <div className="flex items-center justify-between gap-8">
          <PokemonBattleSprite
            pokemon={p1Active}
            side="left"
            label={state.mode === "ai" ? "Your Pokemon" : "Player 1"}
            animationState={p1SpriteAnim}
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
            animationState={p2SpriteAnim}
          />
        </div>

        {/* Move animation overlay */}
        <MoveAnimationLayer
          animation={activeAnimation}
          onComplete={handleAnimationComplete}
        />

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
});
