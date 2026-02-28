export const DEFAULT_FRIENDSHIP = 70;
export const MAX_FRIENDSHIP = 255;
export const EVOLUTION_FRIENDSHIP_THRESHOLD = 220;

export function calculateReturnPower(friendship: number): number {
  return Math.min(102, Math.floor(friendship / 2.5));
}

export function calculateFrustrationPower(friendship: number): number {
  return Math.min(102, Math.floor((255 - friendship) / 2.5));
}

export function calculateFriendshipGain(
  event: "catch" | "battle_win" | "level_up" | "vitamin" | "walk",
  hasSootheBell: boolean
): number {
  const gains: Record<string, number> = {
    catch: 0,
    battle_win: 2,
    level_up: 5,
    vitamin: 5,
    walk: 1,
  };
  const base = gains[event] ?? 0;
  return hasSootheBell ? Math.floor(base * 1.5) : base;
}
