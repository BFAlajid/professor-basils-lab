"use client";

import { useEffect, useState } from "react";

interface BattleTransitionProps {
  active: boolean;
}

export default function BattleTransition({ active }: BattleTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "flash1" | "flash2" | "flash3" | "black">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    // GBA-style: 3 white flashes then fade to black
    setPhase("flash1");
    const t1 = setTimeout(() => setPhase("flash2"), 100);
    const t2 = setTimeout(() => setPhase("flash3"), 250);
    const t3 = setTimeout(() => setPhase("black"), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active]);

  if (phase === "idle") return null;

  const isFlash = phase === "flash1" || phase === "flash2" || phase === "flash3";

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundColor: isFlash ? "#fff" : "#000",
        opacity: isFlash ? (phase === "flash1" ? 0.8 : phase === "flash2" ? 0.9 : 1) : 1,
        transition: isFlash ? "opacity 50ms" : "opacity 200ms",
      }}
      aria-hidden="true"
    />
  );
}
