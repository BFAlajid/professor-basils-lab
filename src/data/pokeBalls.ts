import { BallType, BallData, CatchContext } from "@/types";

export const POKE_BALLS: Record<BallType, BallData> = {
  "poke-ball": {
    name: "poke-ball",
    displayName: "Poke Ball",
    description: "A basic ball for catching Pokemon.",
    baseModifier: 1,
    spriteColor: "#e8433f",
  },
  "great-ball": {
    name: "great-ball",
    displayName: "Great Ball",
    description: "A good ball with a higher catch rate than a Poke Ball.",
    baseModifier: 1.5,
    spriteColor: "#3b82f6",
  },
  "ultra-ball": {
    name: "ultra-ball",
    displayName: "Ultra Ball",
    description: "A high-performance ball with a high catch rate.",
    baseModifier: 2,
    spriteColor: "#f59e0b",
  },
  "master-ball": {
    name: "master-ball",
    displayName: "Master Ball",
    description: "The best ball. It never fails to catch.",
    baseModifier: 255,
    spriteColor: "#8b5cf6",
  },
  "quick-ball": {
    name: "quick-ball",
    displayName: "Quick Ball",
    description: "Works best on the first turn of an encounter.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => ctx.turn === 1 ? 5 : 1,
    spriteColor: "#06b6d4",
  },
  "dusk-ball": {
    name: "dusk-ball",
    displayName: "Dusk Ball",
    description: "Works best at night or in caves.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => (ctx.isNight || ctx.isCave) ? 3 : 1,
    spriteColor: "#1e3a2f",
  },
  "timer-ball": {
    name: "timer-ball",
    displayName: "Timer Ball",
    description: "Becomes better the longer the battle lasts.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => Math.min(4, 1 + (ctx.turn - 1) * 0.3),
    spriteColor: "#f0f0e8",
  },
  "net-ball": {
    name: "net-ball",
    displayName: "Net Ball",
    description: "Works best on Water and Bug-type Pokemon.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) =>
      ctx.wildPokemonTypes.some((t) => t === "water" || t === "bug") ? 3.5 : 1,
    spriteColor: "#06d6a0",
  },
  "repeat-ball": {
    name: "repeat-ball",
    displayName: "Repeat Ball",
    description: "Works best on Pokemon you've caught before.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => ctx.isRepeatCatch ? 3.5 : 1,
    spriteColor: "#eab308",
  },
  "nest-ball": {
    name: "nest-ball",
    displayName: "Nest Ball",
    description: "Works best on lower-level Pokemon.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => Math.max(1, (41 - ctx.wildPokemonLevel) / 10),
    spriteColor: "#22c55e",
  },
  "dive-ball": {
    name: "dive-ball",
    displayName: "Dive Ball",
    description: "Works best in water areas.",
    baseModifier: 1,
    dynamicModifier: (ctx: CatchContext) => ctx.isWater ? 3.5 : 1,
    spriteColor: "#0ea5e9",
  },
  "luxury-ball": {
    name: "luxury-ball",
    displayName: "Luxury Ball",
    description: "A comfortable ball that makes Pokemon friendlier.",
    baseModifier: 1,
    spriteColor: "#a855f7",
  },
  "premier-ball": {
    name: "premier-ball",
    displayName: "Premier Ball",
    description: "A rare commemorative ball.",
    baseModifier: 1,
    spriteColor: "#f8fafc",
  },
  "heal-ball": {
    name: "heal-ball",
    displayName: "Heal Ball",
    description: "Fully heals the caught Pokemon.",
    baseModifier: 1,
    spriteColor: "#ec4899",
  },
};

export function getBallModifier(ball: BallType, context: CatchContext): number {
  const data = POKE_BALLS[ball];
  if (data.dynamicModifier) return data.dynamicModifier(context);
  return data.baseModifier;
}

export const DEFAULT_BALL_INVENTORY: Record<BallType, number> = {
  "poke-ball": 30,
  "great-ball": 15,
  "ultra-ball": 10,
  "master-ball": 1,
  "quick-ball": 5,
  "dusk-ball": 5,
  "timer-ball": 5,
  "net-ball": 5,
  "repeat-ball": 5,
  "nest-ball": 5,
  "dive-ball": 5,
  "luxury-ball": 3,
  "premier-ball": 3,
  "heal-ball": 5,
};

export const BALL_ORDER: BallType[] = [
  "poke-ball", "great-ball", "ultra-ball", "master-ball",
  "quick-ball", "dusk-ball", "timer-ball", "net-ball",
  "repeat-ball", "nest-ball", "dive-ball",
  "luxury-ball", "premier-ball", "heal-ball",
];
