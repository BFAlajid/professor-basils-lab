import { TeamSlot } from "@/types";
import { TierList } from "@/data/tierLists";

export interface TierViolation {
  position: number;
  message: string;
  severity: "error" | "warning";
}

export function validateTeam(team: TeamSlot[], tier: TierList): TierViolation[] {
  const violations: TierViolation[] = [];

  // Check banned Pokemon
  for (const slot of team) {
    if (tier.bannedPokemon.includes(slot.pokemon.id)) {
      violations.push({
        position: slot.position,
        message: `${formatName(slot.pokemon.name)} is banned in ${tier.name}`,
        severity: "error",
      });
    }
  }

  // Species Clause: no duplicate species
  if (tier.clauses.includes("Species Clause")) {
    const seen = new Map<number, number>();
    for (const slot of team) {
      const id = slot.pokemon.id;
      if (seen.has(id)) {
        violations.push({
          position: slot.position,
          message: `Duplicate ${formatName(slot.pokemon.name)} violates Species Clause`,
          severity: "error",
        });
      } else {
        seen.set(id, slot.position);
      }
    }
  }

  // Item Clause: no duplicate held items
  if (tier.clauses.includes("Item Clause")) {
    const seenItems = new Map<string, number>();
    for (const slot of team) {
      if (slot.heldItem) {
        const item = slot.heldItem.toLowerCase();
        if (seenItems.has(item)) {
          violations.push({
            position: slot.position,
            message: `Duplicate item "${formatItemName(slot.heldItem)}" violates Item Clause`,
            severity: "error",
          });
        } else {
          seenItems.set(item, slot.position);
        }
      }
    }
  }

  // Sleep Clause warning (informational)
  if (tier.clauses.includes("Sleep Clause")) {
    const sleepMoves = ["spore", "sleep-powder", "hypnosis", "sing", "yawn", "lovely-kiss", "dark-void", "grass-whistle"];
    const hasSleepMoves = team.filter((slot) =>
      slot.selectedMoves?.some((m) => sleepMoves.includes(m))
    );
    if (hasSleepMoves.length > 1) {
      for (const slot of hasSleepMoves) {
        violations.push({
          position: slot.position,
          message: "Multiple sleep-inducing moves may violate Sleep Clause in practice",
          severity: "warning",
        });
      }
    }
  }

  return violations;
}

function formatName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatItemName(raw: string): string {
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
