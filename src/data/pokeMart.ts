import { BallType } from "@/types";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "ball" | "medicine" | "held-item" | "battle-item" | "special";
  ballType?: BallType;
}

export const POKEMART_ITEMS: ShopItem[] = [
  // Poke Balls
  { id: "poke-ball", name: "Poke Ball", description: "A basic ball for catching Pokemon.", price: 200, category: "ball", ballType: "poke-ball" },
  { id: "great-ball", name: "Great Ball", description: "A good ball with a higher catch rate.", price: 600, category: "ball", ballType: "great-ball" },
  { id: "ultra-ball", name: "Ultra Ball", description: "A high-performance ball.", price: 800, category: "ball", ballType: "ultra-ball" },
  { id: "quick-ball", name: "Quick Ball", description: "Best used on the first turn.", price: 1000, category: "ball", ballType: "quick-ball" },
  { id: "dusk-ball", name: "Dusk Ball", description: "Works well in dark areas.", price: 1000, category: "ball", ballType: "dusk-ball" },
  { id: "timer-ball", name: "Timer Ball", description: "Better as turns pass.", price: 1000, category: "ball", ballType: "timer-ball" },
  { id: "net-ball", name: "Net Ball", description: "Good for Water/Bug types.", price: 1000, category: "ball", ballType: "net-ball" },
  { id: "repeat-ball", name: "Repeat Ball", description: "Good for previously caught species.", price: 1000, category: "ball", ballType: "repeat-ball" },
  { id: "nest-ball", name: "Nest Ball", description: "Better for lower-level Pokemon.", price: 1000, category: "ball", ballType: "nest-ball" },
  { id: "dive-ball", name: "Dive Ball", description: "Good for fishing encounters.", price: 1000, category: "ball", ballType: "dive-ball" },
  { id: "luxury-ball", name: "Luxury Ball", description: "A comfortable ball for special catches.", price: 1500, category: "ball", ballType: "luxury-ball" },
  { id: "heal-ball", name: "Heal Ball", description: "Heals the caught Pokemon.", price: 300, category: "ball", ballType: "heal-ball" },

  // Medicine
  { id: "potion", name: "Potion", description: "Restores 20 HP in battle.", price: 200, category: "medicine" },
  { id: "super-potion", name: "Super Potion", description: "Restores 60 HP in battle.", price: 700, category: "medicine" },
  { id: "hyper-potion", name: "Hyper Potion", description: "Restores 120 HP in battle.", price: 1500, category: "medicine" },
  { id: "full-restore", name: "Full Restore", description: "Fully restores HP and cures status.", price: 3000, category: "medicine" },
  { id: "revive", name: "Revive", description: "Revives a fainted Pokemon to 50% HP.", price: 2000, category: "medicine" },

  // Battle Items (held items purchasable)
  { id: "leftovers", name: "Leftovers", description: "Gradually restores HP during battle.", price: 4000, category: "held-item" },
  { id: "life-orb", name: "Life Orb", description: "Boosts damage by 30% at the cost of HP.", price: 5000, category: "held-item" },
  { id: "choice-band", name: "Choice Band", description: "Boosts Attack by 50% but locks move.", price: 4000, category: "held-item" },
  { id: "choice-specs", name: "Choice Specs", description: "Boosts Sp.Atk by 50% but locks move.", price: 4000, category: "held-item" },
  { id: "choice-scarf", name: "Choice Scarf", description: "Boosts Speed by 50% but locks move.", price: 4000, category: "held-item" },
  { id: "focus-sash", name: "Focus Sash", description: "Survives one KO hit at 1 HP.", price: 3000, category: "held-item" },
  { id: "assault-vest", name: "Assault Vest", description: "Boosts Sp.Def by 50% but can only attack.", price: 4000, category: "held-item" },
  { id: "rocky-helmet", name: "Rocky Helmet", description: "Damages attackers on contact.", price: 3000, category: "held-item" },
  { id: "heavy-duty-boots", name: "Heavy-Duty Boots", description: "Protects from entry hazards.", price: 2500, category: "held-item" },
  { id: "eviolite", name: "Eviolite", description: "Boosts defenses of unevolved Pokemon.", price: 3500, category: "held-item" },

  // Special items
  { id: "heart-scale", name: "Heart Scale", description: "Currency for the Move Tutor.", price: 500, category: "special" },
  { id: "macho-brace", name: "Macho Brace", description: "Doubles EV gains during training.", price: 3000, category: "special" },
  { id: "power-weight", name: "Power Weight", description: "+8 HP EVs per training battle.", price: 2000, category: "special" },
  { id: "power-bracer", name: "Power Bracer", description: "+8 Attack EVs per training battle.", price: 2000, category: "special" },
  { id: "power-belt", name: "Power Belt", description: "+8 Defense EVs per training battle.", price: 2000, category: "special" },
  { id: "power-lens", name: "Power Lens", description: "+8 Sp.Atk EVs per training battle.", price: 2000, category: "special" },
  { id: "power-band", name: "Power Band", description: "+8 Sp.Def EVs per training battle.", price: 2000, category: "special" },
  { id: "power-anklet", name: "Power Anklet", description: "+8 Speed EVs per training battle.", price: 2000, category: "special" },
];

export function getShopItem(id: string): ShopItem | undefined {
  return POKEMART_ITEMS.find((item) => item.id === id);
}
