"use client";

import { motion } from "framer-motion";
import { BallType } from "@/types";
import { POKE_BALLS, BALL_ORDER } from "@/data/pokeBalls";
import ItemSprite from "@/components/ItemSprite";

interface BallSelectorProps {
  inventory: Record<BallType, number>;
  onSelect: (ball: BallType) => void;
  onCancel: () => void;
}

export default function BallSelector({ inventory, onSelect, onCancel }: BallSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#262b44] border border-[#3a4466] rounded-xl p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-pixel text-[#f0f0e8] uppercase">Select Ball</h4>
        <button
          onClick={onCancel}
          className="text-[10px] text-[#8b9bb4] hover:text-[#e8433f] transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-[280px] overflow-y-auto">
        {BALL_ORDER.map((ballType) => {
          const ball = POKE_BALLS[ballType];
          const count = inventory[ballType] ?? 0;
          const disabled = count <= 0;

          return (
            <button
              key={ballType}
              onClick={() => !disabled && onSelect(ballType)}
              disabled={disabled}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 border transition-all text-left ${
                disabled
                  ? "border-[#3a4466] opacity-40 cursor-not-allowed"
                  : "border-[#3a4466] hover:border-[#f0f0e8] cursor-pointer"
              }`}
            >
              {/* Ball icon */}
              <ItemSprite name={ballType} size={24} fallbackColor={ball.spriteColor} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-[#f0f0e8] truncate">{ball.displayName}</p>
                <p className="text-[7px] text-[#8b9bb4] truncate">{ball.description}</p>
              </div>
              <span className={`text-[10px] font-pixel flex-shrink-0 ${count <= 3 ? "text-[#e8433f]" : "text-[#8b9bb4]"}`}>
                x{count}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
