"use client";

import { motion } from "framer-motion";
import { GYM_BADGE_NAMES } from "@/data/gymLeaders";

interface GymBadgeCaseProps {
  earnedBadges: string[];
}

export default function GymBadgeCase({ earnedBadges }: GymBadgeCaseProps) {
  return (
    <div className="bg-[#1a1c2c] border border-[#3a4466] rounded-lg p-4">
      <h3 className="text-sm font-pixel text-[#f0f0e8] text-center mb-3">
        Badge Case
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {GYM_BADGE_NAMES.map((badge) => {
          const earned = earnedBadges.includes(badge);
          return (
            <div
              key={badge}
              className="flex flex-col items-center gap-1.5"
            >
              {earned ? (
                <motion.div
                  className="w-9 h-9 rounded-full bg-[#f7a838] border-2 border-[#f7a838]"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                  }}
                  style={{
                    boxShadow: "0 0 8px 2px rgba(247, 168, 56, 0.5)",
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-[#3a4466] bg-[#262b44]" />
              )}
              <span
                className={`text-[9px] font-pixel ${
                  earned ? "text-[#f7a838]" : "text-[#3a4466]"
                }`}
              >
                {badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
