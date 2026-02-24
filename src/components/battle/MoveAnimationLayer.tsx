"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ActiveAnimation } from "@/types";

interface MoveAnimationLayerProps {
  animation: ActiveAnimation | null;
  onComplete: () => void;
}

/**
 * Absolute-positioned overlay for battle move animations.
 * Renders type-colored effects based on damage class.
 */
export default function MoveAnimationLayer({ animation, onComplete }: MoveAnimationLayerProps) {
  if (!animation) return null;

  const { config, attacker, isCritical, isSuperEffective } = animation;
  const isLeft = attacker === "left";
  const color = config.typeColor;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* ── Physical: attacker dashes forward + impact shake ── */}
        {config.damageClass === "physical" && (
          <>
            {/* Dash slash effect */}
            <motion.div
              key={`phys-${animation.id}`}
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                left: isLeft ? "15%" : "auto",
                right: isLeft ? "auto" : "15%",
                width: 80,
                height: 80,
              }}
              initial={{ x: 0, opacity: 0, scale: 0.5 }}
              animate={{
                x: isLeft ? 180 : -180,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1.2, 0.8],
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onAnimationComplete={onComplete}
            >
              {/* Impact starburst */}
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `radial-gradient(circle, ${color}cc, ${color}44, transparent)`,
                  boxShadow: `0 0 20px ${color}66`,
                }}
              />
            </motion.div>

            {/* Impact lines */}
            {[0, 45, 90, 135].map((deg) => (
              <motion.div
                key={`line-${deg}-${animation.id}`}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: 3,
                  height: 24,
                  backgroundColor: color,
                  transformOrigin: "center center",
                  transform: `rotate(${deg}deg)`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 2],
                  x: isLeft ? 60 : -60,
                }}
                transition={{ duration: 0.4, delay: 0.3 }}
              />
            ))}
          </>
        )}

        {/* ── Special: energy orbs travel attacker → defender ── */}
        {config.damageClass === "special" && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`orb-${i}-${animation.id}`}
                className="absolute top-1/2"
                style={{
                  left: isLeft ? "20%" : "80%",
                  width: 16 + i * 4,
                  height: 16 + i * 4,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, white, ${color})`,
                  boxShadow: `0 0 12px ${color}, 0 0 24px ${color}66`,
                }}
                initial={{
                  x: 0,
                  y: (i - 1) * 20,
                  opacity: 0,
                  scale: 0.3,
                }}
                animate={{
                  x: isLeft ? 260 : -260,
                  y: (i - 1) * 10,
                  opacity: [0, 1, 1, 0.5, 0],
                  scale: [0.3, 1, 1.2, 0.8, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
                onAnimationComplete={i === 2 ? onComplete : undefined}
              />
            ))}
            {/* Trailing sparkles */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={`spark-${i}-${animation.id}`}
                className="absolute top-1/2"
                style={{
                  left: isLeft ? "20%" : "80%",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
                initial={{ x: 0, y: (i - 2) * 15, opacity: 0 }}
                animate={{
                  x: isLeft ? (50 + i * 40) : -(50 + i * 40),
                  y: (i - 2) * 15 + Math.sin(i) * 10,
                  opacity: [0, 0.8, 0],
                }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              />
            ))}
          </>
        )}

        {/* ── Status: particles around target ── */}
        {config.damageClass === "status" && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = (i / 6) * Math.PI * 2;
              const radius = 50;
              return (
                <motion.div
                  key={`status-${i}-${animation.id}`}
                  className="absolute"
                  style={{
                    left: isLeft ? "75%" : "25%",
                    top: "40%",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1.2, 1, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.06,
                  }}
                  onAnimationComplete={i === 5 ? onComplete : undefined}
                />
              );
            })}
          </>
        )}

        {/* ── Critical hit: white flash ── */}
        {isCritical && (
          <motion.div
            key={`crit-${animation.id}`}
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.3, delay: 0.2 }}
          />
        )}

        {/* ── Super effective: screen shake via jittering border ── */}
        {isSuperEffective && (
          <motion.div
            key={`super-${animation.id}`}
            className="absolute inset-0 rounded-xl"
            style={{ border: `3px solid ${color}` }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.8, 0.4, 0.8, 0],
              x: [0, -3, 3, -2, 0],
              y: [0, 2, -2, 1, 0],
            }}
            transition={{ duration: 0.4, delay: 0.3 }}
          />
        )}

        {/* ── Critical hit text ── */}
        {isCritical && (
          <motion.span
            key={`crit-text-${animation.id}`}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 text-sm font-pixel font-bold text-[#f7a838] drop-shadow-lg whitespace-nowrap"
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -20, scale: [0.5, 1.3, 1.1, 1] }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            CRITICAL HIT!
          </motion.span>
        )}

        {/* ── Super effective text ── */}
        {isSuperEffective && !isCritical && (
          <motion.span
            key={`super-text-${animation.id}`}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 text-sm font-pixel font-bold drop-shadow-lg whitespace-nowrap"
            style={{ color }}
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -20, scale: [0.5, 1.2, 1, 1] }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            SUPER EFFECTIVE!
          </motion.span>
        )}
      </div>
    </AnimatePresence>
  );
}
