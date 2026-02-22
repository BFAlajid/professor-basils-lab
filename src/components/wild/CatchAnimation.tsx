"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BallType } from "@/types";
import { POKE_BALLS } from "@/data/pokeBalls";

interface CatchAnimationProps {
  ball: BallType;
  shakeCount: number;
  isCaught: boolean;
  pokemonName: string;
  onComplete: () => void;
}

export default function CatchAnimation({
  ball,
  shakeCount,
  isCaught,
  pokemonName,
  onComplete,
}: CatchAnimationProps) {
  const [phase, setPhase] = useState<"throw" | "absorb" | "shake" | "result">("throw");
  const [currentShake, setCurrentShake] = useState(0);
  const ballColor = POKE_BALLS[ball]?.spriteColor ?? "#e8433f";

  useEffect(() => {
    // Phase timing sequence
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Throw phase: 800ms
    timers.push(setTimeout(() => setPhase("absorb"), 800));

    // Absorb phase: 600ms
    timers.push(setTimeout(() => setPhase("shake"), 1400));

    // Shake phases: 700ms each
    for (let i = 0; i < shakeCount; i++) {
      timers.push(setTimeout(() => setCurrentShake(i + 1), 1400 + 700 * (i + 1)));
    }

    // Result: after all shakes
    const resultTime = 1400 + 700 * (shakeCount + 1);
    timers.push(setTimeout(() => setPhase("result"), resultTime));

    // Complete callback
    timers.push(setTimeout(onComplete, resultTime + 1500));

    return () => timers.forEach(clearTimeout);
  }, [shakeCount, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] relative">
      {/* Ball animation */}
      <AnimatePresence mode="wait">
        {phase === "throw" && (
          <motion.div
            key="throw"
            initial={{ x: -100, y: 100, scale: 0.5, rotate: 0 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 720 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-12 h-12 rounded-full border-2 border-[#3a4466] shadow-lg"
            style={{ backgroundColor: ballColor }}
          >
            <div className="w-full h-1/2 rounded-t-full" />
            <div className="w-full h-[2px] bg-[#1a1c2c]" />
            <div className="w-3 h-3 rounded-full bg-[#f0f0e8] border-2 border-[#1a1c2c] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        )}

        {phase === "absorb" && (
          <motion.div
            key="absorb"
            className="relative"
          >
            {/* Red flash */}
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: ballColor, filter: "blur(8px)" }}
            />
            {/* Ball */}
            <motion.div
              initial={{ scale: 1.2 }}
              animate={{ scale: 1, y: 30 }}
              transition={{ duration: 0.5, ease: "easeIn" }}
              className="w-12 h-12 rounded-full border-2 border-[#3a4466] relative"
              style={{ backgroundColor: ballColor }}
            >
              <div className="w-3 h-3 rounded-full bg-[#f0f0e8] border-2 border-[#1a1c2c] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          </motion.div>
        )}

        {phase === "shake" && (
          <motion.div
            key="shake"
            animate={{
              rotate: currentShake > 0
                ? [0, -15, 15, -15, 15, 0]
                : [0],
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full border-2 border-[#3a4466] relative"
            style={{ backgroundColor: ballColor }}
          >
            <div className="w-3 h-3 rounded-full bg-[#f0f0e8] border-2 border-[#1a1c2c] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            {isCaught ? (
              <>
                {/* Sparkle effect */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl"
                >
                  ✨
                </motion.div>
                <p className="text-sm font-pixel text-[#38b764]">Click!</p>
                <p className="text-xs text-[#f0f0e8]">
                  Gotcha! {pokemonName} was caught!
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: [-10, 0] }}
                  className="w-12 h-12 rounded-full border-2 border-[#3a4466] mx-auto relative overflow-hidden"
                  style={{ backgroundColor: ballColor }}
                >
                  {/* Ball opening effect */}
                  <motion.div
                    initial={{ scaleY: 1 }}
                    animate={{ scaleY: [1, 0.3, 1] }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-1/2 rounded-t-full"
                    style={{ backgroundColor: ballColor }}
                  />
                </motion.div>
                <p className="text-sm font-pixel text-[#e8433f]">Oh no!</p>
                <p className="text-xs text-[#f0f0e8]">
                  {pokemonName} broke free!
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shake counter dots */}
      {phase === "shake" && (
        <div className="flex gap-2 mt-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.5, opacity: 0.3 }}
              animate={
                currentShake >= i
                  ? { scale: 1, opacity: 1, backgroundColor: "#38b764" }
                  : { scale: 0.5, opacity: 0.3, backgroundColor: "#3a4466" }
              }
              className="w-3 h-3 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
