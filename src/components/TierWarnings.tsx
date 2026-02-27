"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot } from "@/types";
import { TIER_LISTS, TierList } from "@/data/tierLists";
import { validateTeam, TierViolation } from "@/utils/tierValidation";

interface TierWarningsProps {
  team: TeamSlot[];
}

export default function TierWarnings({ team }: TierWarningsProps) {
  const [selectedTierId, setSelectedTierId] = useState("ou");

  const selectedTier = TIER_LISTS.find((t) => t.id === selectedTierId) ?? TIER_LISTS[0];

  const violations = useMemo(
    () => (team.length > 0 ? validateTeam(team, selectedTier) : []),
    [team, selectedTier]
  );

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 font-pixel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#f0f0e8]">Tier Validation</h3>
        <select
          value={selectedTierId}
          onChange={(e) => setSelectedTierId(e.target.value)}
          className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-1.5 text-xs text-[#f0f0e8] outline-none focus:border-[#e8433f]"
          aria-label="Select competitive tier"
        >
          {TIER_LISTS.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active clauses */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {selectedTier.clauses.map((clause) => (
          <span
            key={clause}
            className="rounded-full bg-[#1a1c2c] border border-[#3a4466] px-2 py-0.5 text-[10px] text-[#8b9bb4]"
          >
            {clause}
          </span>
        ))}
      </div>

      {team.length === 0 ? (
        <p className="text-xs text-[#8b9bb4]">
          Add Pokemon to your team to check tier legality.
        </p>
      ) : violations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg bg-[#38b764]/10 border border-[#38b764]/30 px-3 py-2 text-xs text-[#38b764]"
        >
          Team is legal for {selectedTier.name}
        </motion.div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {errors.map((v, i) => (
              <motion.div
                key={`err-${v.position}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-2 rounded-lg bg-[#e8433f]/10 border border-[#e8433f]/30 px-3 py-2"
              >
                <span
                  className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[#e8433f] text-[#f0f0e8] text-[10px] flex items-center justify-center font-bold"
                  aria-hidden="true"
                >
                  !
                </span>
                <span className="text-xs text-[#e8433f]">{v.message}</span>
              </motion.div>
            ))}
            {warnings.map((v, i) => (
              <motion.div
                key={`warn-${v.position}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-2 rounded-lg bg-[#f7a838]/10 border border-[#f7a838]/30 px-3 py-2"
              >
                <span
                  className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[#f7a838] text-[#1a1c2c] text-[10px] flex items-center justify-center font-bold"
                  aria-hidden="true"
                >
                  ?
                </span>
                <span className="text-xs text-[#f7a838]">{v.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
