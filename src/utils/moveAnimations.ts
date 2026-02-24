import { MoveAnimationConfig, BattleLogEntry } from "@/types";
import { typeColors } from "@/data/typeColors";

/**
 * Parse a battle log entry to extract move info for animation.
 * Returns null if the entry isn't a move-use event.
 */
export function parseMoveFromLog(entry: BattleLogEntry): {
  moveName: string;
  attacker: string;
  damageClass: "physical" | "special" | "status";
} | null {
  if (entry.kind !== "damage" && entry.kind !== "status") return null;

  // Pattern: "PokemonName used MoveName!" or "PokemonName used MoveName (physical/special/status)!"
  const match = entry.message.match(/^(.+?) used (.+?)!$/);
  if (!match) return null;

  const attacker = match[1];
  const moveName = match[2];

  // Infer damage class from log kind
  const damageClass = entry.kind === "status" ? "status" : "physical";

  return { moveName, attacker, damageClass };
}

/**
 * Determine which side ("left" = player1, "right" = player2) attacked
 * based on whether the attacker name appears in the message context.
 */
export function getAttackerSide(
  entry: BattleLogEntry,
  p1Name: string,
  p2Name: string
): "left" | "right" {
  const lower = entry.message.toLowerCase();
  if (lower.startsWith(p1Name.toLowerCase())) return "left";
  if (lower.startsWith(p2Name.toLowerCase())) return "right";
  return "left";
}

/**
 * Build animation config from a log entry's inferred type.
 * We detect the type from follow-up messages (super effective, not very effective)
 * or fall back to a neutral color.
 */
export function buildAnimationConfig(
  damageClass: "physical" | "special" | "status",
  typeName?: string
): MoveAnimationConfig {
  const color = typeName ? ((typeColors as Record<string, string>)[typeName] ?? "#f0f0e8") : "#f0f0e8";

  const duration =
    damageClass === "physical" ? 800 :
    damageClass === "special" ? 1000 :
    600;

  return { damageClass, typeColor: color, duration };
}

/**
 * Check if a log entry indicates a critical hit.
 */
export function isCriticalEntry(entry: BattleLogEntry): boolean {
  return entry.kind === "critical";
}

/**
 * Check if a log entry indicates super effectiveness.
 */
export function isSuperEffectiveEntry(entry: BattleLogEntry): boolean {
  return entry.message === "It's super effective!";
}

/**
 * Check if a log entry indicates a faint.
 */
export function isFaintEntry(entry: BattleLogEntry): boolean {
  return entry.kind === "faint";
}
