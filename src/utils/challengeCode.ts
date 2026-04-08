import { TeamSlot, GenerationalMechanic } from "@/types";
import { silentWarn } from "@/utils/silentWarn";

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

const VALID_MECHANICS: Set<string | null> = new Set(["mega", "tera", "dynamax", null]);

export function decodeChallengeCode(code: string): ChallengeData | null {
  try {
    const data = JSON.parse(atob(code));
    if (typeof data !== "object" || data === null) return null;
    if (!Array.isArray(data.team) || data.team.length === 0 || data.team.length > 6) return null;
    if (typeof data.format !== "string") return null;
    if (!Array.isArray(data.rules) || !data.rules.every((r: unknown) => typeof r === "string")) return null;
    if (!VALID_MECHANICS.has(data.mechanic)) return null;
    for (const member of data.team) {
      if (typeof member !== "object" || member === null) return null;
      if (typeof member.pokemonId !== "number" || !Number.isFinite(member.pokemonId)) return null;
      if (!Array.isArray(member.moves) || !member.moves.every((m: unknown) => typeof m === "string")) return null;
    }
    if (data.description !== undefined && typeof data.description !== "string") return null;
    return data as ChallengeData;
  } catch (e) {
    silentWarn("decodeChallengeCode", e);
    return null;
  }
}
