import { TypeName } from "@/types";
import { getEffectiveness, getDefensiveMultiplier } from "@/data/typeChart";

export { getEffectiveness, getDefensiveMultiplier };

export function getTypeEffectivenessLabel(multiplier: number): string {
  if (multiplier === 0) return "immune";
  if (multiplier < 1) return "not very effective";
  if (multiplier > 1) return "super effective";
  return "neutral";
}

export function getOffensiveEffectiveness(
  attackerTypes: TypeName[],
  defenderTypes: TypeName[]
): { bestMultiplier: number; hasStab: boolean } {
  let bestMultiplier = 0;
  let hasStab = false;

  for (const atkType of attackerTypes) {
    const multiplier = getDefensiveMultiplier(atkType, defenderTypes);
    if (multiplier > bestMultiplier) {
      bestMultiplier = multiplier;
      hasStab = true;
    }
  }

  return { bestMultiplier, hasStab };
}
