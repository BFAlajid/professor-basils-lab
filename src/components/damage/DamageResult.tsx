"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pokemon, Move } from "@/types";
import { getEffectivenessText } from "@/utils/damageWasm";
import type { DamageResult as DamageResultType, KOResult } from "@/utils/damage";

interface DamageResultProps {
  damageResult: DamageResultType;
  koResult: KOResult | null;
  attacker: Pokemon;
  defender: Pokemon;
  moveData: Move;
  isOffensive: boolean;
}

export default function DamageResult({
  damageResult,
  koResult,
  attacker,
  defender,
  moveData,
  isOffensive,
}: DamageResultProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-4"
      >
        {damageResult.max === 0 ? (
          <p className="text-[#8b9bb4]">
            {moveData.damage_class.name === "status"
              ? "Status moves don't deal direct damage."
              : `${getEffectivenessText(damageResult.effectiveness)}`}
          </p>
        ) : isOffensive ? (
          <>
            <p className="text-sm">
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {attacker.name}
              </span>
              &apos;s{" "}
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {moveData.name.replace(/-/g, " ")}
              </span>{" "}
              deals{" "}
              <span className="font-bold text-[#e8433f]">
                {damageResult.min}-{damageResult.max}
              </span>{" "}
              damage to{" "}
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {defender.name}
              </span>{" "}
              <span
                className={`font-semibold ${
                  damageResult.effectiveness > 1
                    ? "text-[#38b764]"
                    : damageResult.effectiveness < 1
                    ? "text-[#e8433f]"
                    : "text-[#8b9bb4]"
                }`}
              >
                ({getEffectivenessText(damageResult.effectiveness)})
              </span>
              {damageResult.stab && (
                <span className="ml-1 text-xs text-[#f7a838]">
                  [STAB]
                </span>
              )}
              {damageResult.isCritical && (
                <span className="ml-1 text-xs text-[#f7a838]">
                  [CRIT]
                </span>
              )}
            </p>
            {koResult && (
              <div className="mt-2 text-sm">
                <span className="text-[#8b9bb4]">
                  ({koResult.hpPercent.min}% - {koResult.hpPercent.max}%)
                </span>
                <span className="ml-2 font-semibold text-[#f7a838]">
                  {koResult.koText}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm">
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {defender.name}
              </span>{" "}
              takes{" "}
              <span className="font-bold text-[#6390F0]">
                {damageResult.min}-{damageResult.max}
              </span>{" "}
              damage from{" "}
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {attacker.name}
              </span>
              &apos;s{" "}
              <span className="capitalize font-semibold text-[#f0f0e8]">
                {moveData.name.replace(/-/g, " ")}
              </span>{" "}
              <span
                className={`font-semibold ${
                  damageResult.effectiveness > 1
                    ? "text-[#e8433f]"
                    : damageResult.effectiveness < 1
                    ? "text-[#38b764]"
                    : "text-[#8b9bb4]"
                }`}
              >
                ({getEffectivenessText(damageResult.effectiveness)})
              </span>
              {damageResult.stab && (
                <span className="ml-1 text-xs text-[#f7a838]">
                  [STAB]
                </span>
              )}
              {damageResult.isCritical && (
                <span className="ml-1 text-xs text-[#f7a838]">
                  [CRIT]
                </span>
              )}
            </p>
            {koResult && (
              <div className="mt-2 text-sm">
                <span className="font-bold" style={{ color: koResult.hpPercent.max >= 100 ? "#e8433f" : koResult.hpPercent.max >= 50 ? "#f7a838" : "#38b764" }}>
                  {koResult.hpPercent.min}% - {koResult.hpPercent.max}% HP
                </span>
                <span className="ml-2 font-semibold text-[#f7a838]">
                  {koResult.koText}
                </span>
              </div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
