import type { NpcData } from "@/types/explore";

export interface NpcRole {
  type: "nurse" | "mart" | "trainer" | "generic";
  greeting: string[];
}

// GBA FireRed/LeafGreen NPC graphicsId → role mapping
// These correspond to ObjectEventGraphicsInfo table indices
export const NPC_GRAPHICS_ROLES: Record<number, NpcRole> = {
  // Nurse Joy variants
  3: {
    type: "nurse",
    greeting: [
      "Welcome to our Pokemon Center!",
      "We'll restore your Pokemon to full health.",
      "We hope to see you again!",
    ],
  },
  // Mart clerk
  4: {
    type: "mart",
    greeting: [
      "Welcome to the PokeMart!",
      "How may I help you?",
    ],
  },
};

export function getNpcDialog(npc: NpcData): string[] {
  // Trainers always use trainer dialog
  if (npc.trainerType > 0) {
    return [
      "I'm a Pokemon Trainer!",
      "If our eyes meet, we have to battle!",
      "(Trainer battles coming soon...)",
    ];
  }

  // Check for known role
  const role = NPC_GRAPHICS_ROLES[npc.graphicsId];
  if (role) return role.greeting;

  // Deterministic generic greeting per NPC
  const pool: string[][] = [
    ["Hello there!", "It's a great day for Pokemon training!"],
    ["Welcome!", "Are you a new trainer around here?"],
    ["Hi!", "Have you been to the Pokemon Center lately?"],
    ["Hey there!", "Be careful in the tall grass!"],
    ["Good day!", "The Pokemon around here are pretty strong."],
    ["Oh, hello!", "I've been exploring this area for a while now."],
    ["Hi there!", "Did you know you can catch wild Pokemon in the grass?"],
    ["Hey!", "Make sure your team is ready before you head out!"],
  ];
  const idx = (npc.localId + npc.graphicsId) % pool.length;
  return pool[idx];
}
