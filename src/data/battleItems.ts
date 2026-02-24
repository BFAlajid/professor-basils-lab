export interface BattleItem {
  id: string;
  name: string;
  description: string;
  effect: "heal" | "revive" | "cure_status";
  value: number; // HP restored (for heal), or percentage (for revive: 50 = 50%)
  maxStack: number; // max quantity player can hold
}

export const BATTLE_ITEMS: BattleItem[] = [
  {
    id: "potion",
    name: "Potion",
    description: "Restores 20 HP",
    effect: "heal",
    value: 20,
    maxStack: 5,
  },
  {
    id: "super-potion",
    name: "Super Potion",
    description: "Restores 60 HP",
    effect: "heal",
    value: 60,
    maxStack: 3,
  },
  {
    id: "hyper-potion",
    name: "Hyper Potion",
    description: "Restores 120 HP",
    effect: "heal",
    value: 120,
    maxStack: 2,
  },
  {
    id: "full-restore",
    name: "Full Restore",
    description: "Fully restores HP and cures status",
    effect: "heal",
    value: 9999, // means "full heal"
    maxStack: 1,
  },
  {
    id: "revive",
    name: "Revive",
    description: "Revives a fainted Pokemon to 50% HP",
    effect: "revive",
    value: 50,
    maxStack: 2,
  },
];

export const DEFAULT_BATTLE_INVENTORY: Record<string, number> = {
  "potion": 3,
  "super-potion": 2,
  "hyper-potion": 1,
  "full-restore": 1,
  "revive": 1,
};

export function getBattleItem(id: string): BattleItem | undefined {
  return BATTLE_ITEMS.find(item => item.id === id);
}
