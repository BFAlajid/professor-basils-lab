import { BallType } from "@/types";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "ball" | "medicine" | "held-item" | "battle-item" | "special" | "competitive" | "mint";
  ballType?: BallType;
  nature?: string;
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

  // Competitive Items
  { id: "ability-capsule", name: "Ability Capsule", description: "Switches between the two non-hidden abilities.", price: 10000, category: "competitive" },
  { id: "ability-patch", name: "Ability Patch", description: "Switches to the hidden ability.", price: 20000, category: "competitive" },
  { id: "bottle-cap", name: "Bottle Cap", description: "Hyper Trains one IV to 31.", price: 5000, category: "competitive" },
  { id: "gold-bottle-cap", name: "Gold Bottle Cap", description: "Hyper Trains all IVs to 31.", price: 25000, category: "competitive" },

  // Mints
  { id: "adamant-mint", name: "Adamant Mint", description: "Changes nature to Adamant (+Atk / -SpA).", price: 3000, category: "mint", nature: "adamant" },
  { id: "jolly-mint", name: "Jolly Mint", description: "Changes nature to Jolly (+Spe / -SpA).", price: 3000, category: "mint", nature: "jolly" },
  { id: "modest-mint", name: "Modest Mint", description: "Changes nature to Modest (+SpA / -Atk).", price: 3000, category: "mint", nature: "modest" },
  { id: "timid-mint", name: "Timid Mint", description: "Changes nature to Timid (+Spe / -Atk).", price: 3000, category: "mint", nature: "timid" },
  { id: "bold-mint", name: "Bold Mint", description: "Changes nature to Bold (+Def / -Atk).", price: 3000, category: "mint", nature: "bold" },
  { id: "impish-mint", name: "Impish Mint", description: "Changes nature to Impish (+Def / -SpA).", price: 3000, category: "mint", nature: "impish" },
  { id: "calm-mint", name: "Calm Mint", description: "Changes nature to Calm (+SpD / -Atk).", price: 3000, category: "mint", nature: "calm" },
  { id: "careful-mint", name: "Careful Mint", description: "Changes nature to Careful (+SpD / -SpA).", price: 3000, category: "mint", nature: "careful" },
  { id: "brave-mint", name: "Brave Mint", description: "Changes nature to Brave (+Atk / -Spe).", price: 3000, category: "mint", nature: "brave" },
  { id: "quiet-mint", name: "Quiet Mint", description: "Changes nature to Quiet (+SpA / -Spe).", price: 3000, category: "mint", nature: "quiet" },
  { id: "relaxed-mint", name: "Relaxed Mint", description: "Changes nature to Relaxed (+Def / -Spe).", price: 3000, category: "mint", nature: "relaxed" },
  { id: "sassy-mint", name: "Sassy Mint", description: "Changes nature to Sassy (+SpD / -Spe).", price: 3000, category: "mint", nature: "sassy" },
  { id: "naive-mint", name: "Naive Mint", description: "Changes nature to Naive (+Spe / -SpD).", price: 3000, category: "mint", nature: "naive" },
  { id: "hasty-mint", name: "Hasty Mint", description: "Changes nature to Hasty (+Spe / -Def).", price: 3000, category: "mint", nature: "hasty" },
  { id: "lonely-mint", name: "Lonely Mint", description: "Changes nature to Lonely (+Atk / -Def).", price: 3000, category: "mint", nature: "lonely" },
  { id: "mild-mint", name: "Mild Mint", description: "Changes nature to Mild (+SpA / -Def).", price: 3000, category: "mint", nature: "mild" },
  { id: "rash-mint", name: "Rash Mint", description: "Changes nature to Rash (+SpA / -SpD).", price: 3000, category: "mint", nature: "rash" },
  { id: "gentle-mint", name: "Gentle Mint", description: "Changes nature to Gentle (+SpD / -Def).", price: 3000, category: "mint", nature: "gentle" },
  { id: "naughty-mint", name: "Naughty Mint", description: "Changes nature to Naughty (+Atk / -SpD).", price: 3000, category: "mint", nature: "naughty" },
  { id: "lax-mint", name: "Lax Mint", description: "Changes nature to Lax (+Def / -SpD).", price: 3000, category: "mint", nature: "lax" },
  { id: "serious-mint", name: "Serious Mint", description: "Changes nature to Serious (Neutral).", price: 3000, category: "mint", nature: "serious" },
];

export function getShopItem(id: string): ShopItem | undefined {
  return POKEMART_ITEMS.find((item) => item.id === id);
}
