import { TypeName } from "@/types";

export const TYPE_LIST: TypeName[] = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

// 18x18 type effectiveness matrix
// Row = attacking type, Column = defending type
// Order matches TYPE_LIST above
// 0 = immune, 0.5 = not very effective, 1 = normal, 2 = super effective
const matrix: number[][] = [
  // NOR  FIR  WAT  ELE  GRA  ICE  FIG  POI  GRO  FLY  PSY  BUG  ROC  GHO  DRA  DAR  STE  FAI
  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,  0.5,  0,   1,   1,  0.5,  1  ], // Normal
  [  1,  0.5, 0.5,  1,   2,   2,   1,   1,   1,   1,   1,   2,  0.5,  1,  0.5,  1,   2,   1  ], // Fire
  [  1,   2,  0.5,  1,  0.5,  1,   1,   1,   2,   1,   1,   1,   2,   1,  0.5,  1,   1,   1  ], // Water
  [  1,   1,   2,  0.5, 0.5,  1,   1,   1,   0,   2,   1,   1,   1,   1,  0.5,  1,   1,   1  ], // Electric
  [  1,  0.5,  2,   1,  0.5,  1,   1,  0.5,  2,  0.5,  1,  0.5,  2,   1,  0.5,  1,  0.5,  1  ], // Grass
  [  1,  0.5, 0.5,  1,   2,  0.5,  1,   1,   2,   2,   1,   1,   1,   1,   2,   1,  0.5,  1  ], // Ice
  [  2,   1,   1,   1,   1,   2,   1,  0.5,  1,  0.5, 0.5, 0.5,  2,   0,   1,   2,   2,  0.5 ], // Fighting
  [  1,   1,   1,   1,   2,   1,   1,  0.5, 0.5,  1,   1,   1,  0.5, 0.5,  1,   1,   0,   2  ], // Poison
  [  1,   2,   1,   2,  0.5,  1,   1,   2,   1,   0,   1,  0.5,  2,   1,   1,   1,   2,   1  ], // Ground
  [  1,   1,   1,  0.5,  2,   1,   2,   1,   1,   1,   1,   2,  0.5,  1,   1,   1,  0.5,  1  ], // Flying
  [  1,   1,   1,   1,   1,   1,   2,   2,   1,   1,  0.5,  1,   1,   1,   1,   0,  0.5,  1  ], // Psychic
  [  1,  0.5,  1,   1,   2,   1,  0.5, 0.5,  1,  0.5,  2,   1,   1,  0.5,  1,   2,  0.5, 0.5 ], // Bug
  [  1,   2,   1,   1,   1,   2,  0.5,  1,  0.5,  2,   1,   2,   1,   1,   1,   1,  0.5,  1  ], // Rock
  [  0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,   1,   2,   1,  0.5,  1,   1  ], // Ghost
  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,  0.5,  0  ], // Dragon
  [  1,   1,   1,   1,   1,   1,  0.5,  1,   1,   1,   2,   1,   1,   2,   1,  0.5, 0.5, 0.5 ], // Dark
  [  1,  0.5, 0.5, 0.5,  1,   2,   1,   1,   1,   1,   1,   1,   2,   1,   1,   1,  0.5,  2  ], // Steel
  [  1,  0.5,  1,   1,   1,   1,   2,  0.5,  1,   1,   1,   1,   1,   1,   2,   2,  0.5,  1  ], // Fairy
];

export function getEffectiveness(attackType: TypeName, defendType: TypeName): number {
  const atkIdx = TYPE_LIST.indexOf(attackType);
  const defIdx = TYPE_LIST.indexOf(defendType);
  if (atkIdx === -1 || defIdx === -1) return 1;
  return matrix[atkIdx][defIdx];
}

export function getDefensiveMultiplier(attackType: TypeName, defenderTypes: TypeName[]): number {
  let multiplier = 1;
  for (const defType of defenderTypes) {
    multiplier *= getEffectiveness(attackType, defType);
  }
  return multiplier;
}
