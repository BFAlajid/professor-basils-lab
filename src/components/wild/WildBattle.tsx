"use client";

import { motion } from "framer-motion";
import { Pokemon, BallType, StatusCondition, TeamSlot } from "@/types";
import Image from "@/components/PokeImage";
import WildActionPanel from "./WildActionPanel";

interface WildBattleProps {
  wildPokemon: Pokemon;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  wildStatus: StatusCondition;
  playerSlot: TeamSlot;
  playerCurrentHp: number;
  playerMaxHp: number;
  playerStatus: StatusCondition;
  ballInventory: Record<BallType, number>;
  battleLog: string[];
  onFight: (moveIndex: number) => void;
  onThrowBall: (ball: BallType) => void;
  onRun: () => void;
  disabled?: boolean;
}

function HealthBar({ current, max, label, level, status }: {
  current: number;
  max: number;
  label: string;
  level?: number;
  status: StatusCondition;
}) {
  const percent = Math.max(0, (current / max) * 100);
  const barColor = percent > 50 ? "#38b764" : percent > 20 ? "#f7a838" : "#e8433f";

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-pixel text-[#f0f0e8]">{label}</span>
        <div className="flex items-center gap-1">
          {status && (
            <span className="text-[7px] font-pixel px-1 py-0.5 rounded" style={{
              backgroundColor: status === "burn" ? "#e8433f" : status === "poison" || status === "toxic" ? "#a855f7" : status === "paralyze" ? "#f59e0b" : status === "sleep" ? "#8b9bb4" : status === "freeze" ? "#06b6d4" : "#3a4466",
              color: "#f0f0e8",
            }}>
              {({ burn: "BRN", paralyze: "PAR", poison: "PSN", toxic: "TOX", sleep: "SLP", freeze: "FRZ" } as Record<string, string>)[status] ?? status.toUpperCase().slice(0, 3)}
            </span>
          )}
          {level && <span className="text-[8px] text-[#8b9bb4]">Lv.{level}</span>}
        </div>
      </div>
      <div className="w-full h-2 bg-[#1a1c2c] rounded-full overflow-hidden border border-[#3a4466]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: "100%" }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-[8px] text-[#8b9bb4] text-right">
        {current}/{max}
      </p>
    </div>
  );
}

export default function WildBattle({
  wildPokemon,
  wildLevel,
  wildCurrentHp,
  wildMaxHp,
  wildStatus,
  playerSlot,
  playerCurrentHp,
  playerMaxHp,
  playerStatus,
  ballInventory,
  battleLog,
  onFight,
  onThrowBall,
  onRun,
  disabled,
}: WildBattleProps) {
  const wildSprite = wildPokemon.sprites.other?.["official-artwork"]?.front_default ?? wildPokemon.sprites.front_default;
  const playerSprite = playerSlot.pokemon.sprites.other?.["official-artwork"]?.front_default ?? playerSlot.pokemon.sprites.front_default;
  const wildName = wildPokemon.name.charAt(0).toUpperCase() + wildPokemon.name.slice(1);
  const playerName = playerSlot.pokemon.name.charAt(0).toUpperCase() + playerSlot.pokemon.name.slice(1);

  return (
    <div className="space-y-3">
      {/* Battle field */}
      <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Wild Pokemon (right side) */}
          <div className="order-2 space-y-2">
            <HealthBar
              current={wildCurrentHp}
              max={wildMaxHp}
              label={`Wild ${wildName}`}
              level={wildLevel}
              status={wildStatus}
            />
            <div className="flex justify-center">
              {wildSprite && (
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: wildCurrentHp > 0 ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src={wildSprite}
                    alt={wildName}
                    width={100}
                    height={100}
                    unoptimized
                    className="pixelated drop-shadow-lg"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Player Pokemon (left side) */}
          <div className="order-1 space-y-2">
            <HealthBar
              current={playerCurrentHp}
              max={playerMaxHp}
              label={playerName}
              status={playerStatus}
            />
            <div className="flex justify-center">
              {playerSprite && (
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: playerCurrentHp > 0 ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src={playerSprite}
                    alt={playerName}
                    width={100}
                    height={100}
                    unoptimized
                    className="pixelated drop-shadow-lg"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Battle log */}
      {battleLog.length > 0 && (
        <div className="bg-[#262b44] border border-[#3a4466] rounded-xl p-2 max-h-[100px] overflow-y-auto">
          {battleLog.slice(-6).map((msg, i) => (
            <p key={`${battleLog.length - 6 + i}-${msg.slice(0, 20)}`} className="text-[9px] text-[#8b9bb4] py-0.5">
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Action panel */}
      <WildActionPanel
        playerMoves={playerSlot.selectedMoves ?? []}
        ballInventory={ballInventory}
        onFight={onFight}
        onThrowBall={onThrowBall}
        onRun={onRun}
        disabled={disabled}
      />
    </div>
  );
}
