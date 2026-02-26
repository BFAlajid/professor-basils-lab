import { StatusCondition } from "@/types";

export interface StatusMoveEffect {
  targetStatus?: StatusCondition;
  selfStatChanges?: Partial<Record<string, number>>;
  targetStatChanges?: Partial<Record<string, number>>;
  healPercent?: number;
  protect?: boolean;
  hazard?: "stealth-rock" | "spikes" | "toxic-spikes" | "sticky-web";
  clearHazards?: "rapid-spin" | "defog";
  reflect?: boolean;
  lightScreen?: boolean;
}

export const STATUS_MOVE_EFFECTS: Record<string, StatusMoveEffect> = {
  // Stat boosts (self)
  "swords-dance": { selfStatChanges: { attack: 2 } },
  "nasty-plot": { selfStatChanges: { spAtk: 2 } },
  "dragon-dance": { selfStatChanges: { attack: 1, speed: 1 } },
  "quiver-dance": { selfStatChanges: { spAtk: 1, spDef: 1, speed: 1 } },
  "bulk-up": { selfStatChanges: { attack: 1, defense: 1 } },
  "calm-mind": { selfStatChanges: { spAtk: 1, spDef: 1 } },
  "iron-defense": { selfStatChanges: { defense: 2 } },
  "agility": { selfStatChanges: { speed: 2 } },
  "shell-smash": { selfStatChanges: { attack: 2, spAtk: 2, speed: 2, defense: -1, spDef: -1 } },
  "belly-drum": { selfStatChanges: { attack: 6 } },
  "coil": { selfStatChanges: { attack: 1, defense: 1, accuracy: 1 } },
  "shift-gear": { selfStatChanges: { attack: 1, speed: 2 } },

  // Stat drops (target)
  "charm": { targetStatChanges: { attack: -2 } },
  "screech": { targetStatChanges: { defense: -2 } },
  "fake-tears": { targetStatChanges: { spDef: -2 } },
  "scary-face": { targetStatChanges: { speed: -2 } },
  "growl": { targetStatChanges: { attack: -1 } },
  "leer": { targetStatChanges: { defense: -1 } },
  "tail-whip": { targetStatChanges: { defense: -1 } },
  "string-shot": { targetStatChanges: { speed: -2 } },

  // Status conditions
  "will-o-wisp": { targetStatus: "burn" },
  "thunder-wave": { targetStatus: "paralyze" },
  "toxic": { targetStatus: "toxic" },
  "poison-powder": { targetStatus: "poison" },
  "sleep-powder": { targetStatus: "sleep" },
  "spore": { targetStatus: "sleep" },
  "hypnosis": { targetStatus: "sleep" },
  "sing": { targetStatus: "sleep" },
  "dark-void": { targetStatus: "sleep" },
  "yawn": { targetStatus: "sleep" },
  "glare": { targetStatus: "paralyze" },
  "stun-spore": { targetStatus: "paralyze" },
  "nuzzle": { targetStatus: "paralyze" },

  // Protection
  "protect": { protect: true },
  "detect": { protect: true },
  "king-s-shield": { protect: true },
  "spiky-shield": { protect: true },
  "baneful-bunker": { protect: true },

  // Recovery
  "recover": { healPercent: 50 },
  "roost": { healPercent: 50 },
  "soft-boiled": { healPercent: 50 },
  "milk-drink": { healPercent: 50 },
  "slack-off": { healPercent: 50 },
  "moonlight": { healPercent: 50 },
  "morning-sun": { healPercent: 50 },
  "synthesis": { healPercent: 50 },
  "wish": { healPercent: 50 },
  "rest": { healPercent: 100, targetStatus: "sleep" },

  // Entry hazards
  "stealth-rock": { hazard: "stealth-rock" },
  "spikes": { hazard: "spikes" },
  "toxic-spikes": { hazard: "toxic-spikes" },
  "sticky-web": { hazard: "sticky-web" },

  // Hazard removal
  "rapid-spin": { clearHazards: "rapid-spin" },
  "defog": { clearHazards: "defog" },

  // Screens
  "reflect": { reflect: true },
  "light-screen": { lightScreen: true },
};
