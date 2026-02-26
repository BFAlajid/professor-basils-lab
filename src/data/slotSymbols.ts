export interface SlotSymbol {
  id: number;
  name: string;
  label: string;
  color: string;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 0, name: "seven", label: "7", color: "#e8433f" },
  { id: 1, name: "cherry", label: "\uD83C\uDF52", color: "#EE99AC" },
  { id: 2, name: "bar", label: "\u25AC", color: "#f7a838" },
  { id: 3, name: "bell", label: "\u266A", color: "#f7a838" },
  { id: 4, name: "pikachu", label: "\u26A1", color: "#f7a838" },
];

export const PAYOUTS: Record<string, number> = {
  "seven-seven-seven": 100,
  "cherry-cherry-cherry": 20,
  "bar-bar-bar": 10,
  "bell-bell-bell": 8,
  "pikachu-pikachu-pikachu": 15,
};

export function calculatePayout(reels: [number, number, number], bet: number): number {
  const key = reels.map((r) => SLOT_SYMBOLS[r].name).join("-");
  if (PAYOUTS[key]) return PAYOUTS[key] * bet;
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return bet * 2;
  return 0;
}
