import { TeamSlot } from "@/types";
import { TierList } from "@/data/tierLists";
import { formatName } from "@/utils/format";
import { isNFE } from "@/data/nfeList";

export interface TierViolation {
  position: number;
  message: string;
  severity: "error" | "warning";
}

export function validateTeam(team: TeamSlot[], tier: TierList): TierViolation[] {
  const violations: TierViolation[] = [];

  for (const slot of team) {
    // Banned Pokemon
    if (tier.bannedPokemon.includes(slot.pokemon.id)) {
      violations.push({
        position: slot.position,
        message: `${formatName(slot.pokemon.name)} is banned in ${tier.name}`,
        severity: "error",
      });
    }

    // LC: NFE-only check
    if (tier.nfeOnly && !isNFE(slot.pokemon.id)) {
      violations.push({
        position: slot.position,
        message: `${formatName(slot.pokemon.name)} is not NFE — only unevolved Pokemon are allowed in ${tier.name}`,
        severity: "error",
      });
    }

    // LC: banned moves
    if (tier.bannedMoves && slot.selectedMoves) {
      for (const move of slot.selectedMoves) {
        if (tier.bannedMoves.includes(move)) {
          violations.push({
            position: slot.position,
            message: `${formatName(move)} is banned in ${tier.name}`,
            severity: "error",
          });
        }
      }
    }

    // LC: banned items
    if (tier.bannedItems && slot.heldItem) {
      if (tier.bannedItems.includes(slot.heldItem)) {
        violations.push({
          position: slot.position,
          message: `${formatName(slot.heldItem)} is banned in ${tier.name}`,
          severity: "error",
        });
      }
    }

    // LC: banned abilities
    if (tier.bannedAbilities && slot.ability) {
      if (tier.bannedAbilities.includes(slot.ability)) {
        violations.push({
          position: slot.position,
          message: `${formatName(slot.ability)} is banned in ${tier.name}`,
          severity: "error",
        });
      }
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
            message: `Duplicate item "${formatName(slot.heldItem)}" violates Item Clause`,
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

  // Evasion Clause: ban evasion-boosting moves
  if (tier.clauses.includes("Evasion Clause")) {
    const evasionMoves = ["double-team", "minimize"];
    for (const slot of team) {
      if (slot.selectedMoves) {
        for (const move of slot.selectedMoves) {
          if (evasionMoves.includes(move)) {
            violations.push({
              position: slot.position,
              message: `${formatName(move)} violates Evasion Clause in ${tier.name}`,
              severity: "error",
            });
          }
        }
      }
    }
  }

  // OHKO Clause: ban one-hit-KO moves
  if (tier.clauses.includes("OHKO Clause")) {
    const ohkoMoves = ["fissure", "guillotine", "horn-drill", "sheer-cold"];
    for (const slot of team) {
      if (slot.selectedMoves) {
        for (const move of slot.selectedMoves) {
          if (ohkoMoves.includes(move)) {
            violations.push({
              position: slot.position,
              message: `${formatName(move)} violates OHKO Clause in ${tier.name}`,
              severity: "error",
            });
          }
        }
      }
    }
  }

  // Moody Clause: ban Moody ability
  if (tier.clauses.includes("Moody Clause")) {
    for (const slot of team) {
      if (slot.ability === "moody") {
        violations.push({
          position: slot.position,
          message: `Moody ability violates Moody Clause in ${tier.name}`,
          severity: "error",
        });
      }
    }
  }

  // Baton Pass Clause
  if (tier.clauses.includes("Baton Pass Clause")) {
    const bpUsers = team.filter((slot) =>
      slot.selectedMoves?.includes("baton-pass")
    );
    if (bpUsers.length > 1) {
      for (const slot of bpUsers) {
        violations.push({
          position: slot.position,
          message: "Multiple Baton Pass users violate Baton Pass Clause",
          severity: "error",
        });
      }
    }
  }

  // Monotype Clause: all team members must share at least one type
  if (tier.monotype && team.length > 1) {
    const sharedType = findSharedType(team);
    if (!sharedType) {
      violations.push({
        position: 0,
        message: "All Pokemon on the team must share at least one type in Monotype",
        severity: "error",
      });
    }
  }

  // LC level cap warning
  if (tier.levelCap) {
    violations.push({
      position: 0,
      message: `${tier.name} enforces a level cap of ${tier.levelCap}`,
      severity: "warning",
    });
  }

  return violations;
}

function findSharedType(team: TeamSlot[]): string | null {
  if (team.length === 0) return null;

  // Collect each Pokemon's type names
  const typeSets = team.map((slot) =>
    new Set(slot.pokemon.types.map((t) => t.type.name))
  );

  // Find any type present on every team member
  const firstTypes = typeSets[0];
  for (const typeName of firstTypes) {
    if (typeSets.every((ts) => ts.has(typeName))) {
      return typeName;
    }
  }
  return null;
}

