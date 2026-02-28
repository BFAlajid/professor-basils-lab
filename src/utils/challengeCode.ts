import { TeamSlot, GenerationalMechanic } from "@/types";

export interface ChallengeData {
  team: { pokemonId: number; moves: string[]; nature?: string; ability?: string; item?: string }[];
  format: string;
  rules: string[];
  mechanic: GenerationalMechanic;
  description?: string;
}

export function encodeChallengeCode(data: ChallengeData): string {
  return btoa(JSON.stringify(data));
}

export function decodeChallengeCode(code: string): ChallengeData | null {
  try {
    return JSON.parse(atob(code));
  } catch {
    return null;
  }
}
