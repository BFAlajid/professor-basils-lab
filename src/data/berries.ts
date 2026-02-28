export type BerryCategory = "status" | "restore" | "ev-reduce" | "type-resist" | "stat-boost" | "special" | "poffin";

export interface BerryData {
  name: string;
  displayName: string;
  growthTimeMinutes: number;
  effect: string;
  heldItemEffect?: string;
  color: string;
  category: BerryCategory;
}

export const BERRIES: BerryData[] = [
  // ── Status Cure Berries ──
  { name: "cheri-berry", displayName: "Cheri Berry", growthTimeMinutes: 15, effect: "Cures paralysis", heldItemEffect: "Cures paralysis in battle", color: "#e8433f", category: "status" },
  { name: "chesto-berry", displayName: "Chesto Berry", growthTimeMinutes: 15, effect: "Cures sleep", heldItemEffect: "Cures sleep in battle", color: "#6390F0", category: "status" },
  { name: "pecha-berry", displayName: "Pecha Berry", growthTimeMinutes: 15, effect: "Cures poison", heldItemEffect: "Cures poison in battle", color: "#EE99AC", category: "status" },
  { name: "rawst-berry", displayName: "Rawst Berry", growthTimeMinutes: 15, effect: "Cures burn", heldItemEffect: "Cures burn in battle", color: "#38b764", category: "status" },
  { name: "aspear-berry", displayName: "Aspear Berry", growthTimeMinutes: 15, effect: "Cures freeze", heldItemEffect: "Cures freeze in battle", color: "#f7d838", category: "status" },
  { name: "persim-berry", displayName: "Persim Berry", growthTimeMinutes: 15, effect: "Cures confusion", heldItemEffect: "Cures confusion in battle", color: "#f08030", category: "status" },
  { name: "lum-berry", displayName: "Lum Berry", growthTimeMinutes: 120, effect: "Cures any status", heldItemEffect: "Cures any status in battle", color: "#38b764", category: "status" },

  // ── HP / PP Restore Berries ──
  { name: "leppa-berry", displayName: "Leppa Berry", growthTimeMinutes: 30, effect: "Restores 10 PP to a move", color: "#e8433f", category: "restore" },
  { name: "oran-berry", displayName: "Oran Berry", growthTimeMinutes: 20, effect: "Restores 10 HP", heldItemEffect: "Restores 10 HP at 50% HP", color: "#6390F0", category: "restore" },
  { name: "sitrus-berry", displayName: "Sitrus Berry", growthTimeMinutes: 60, effect: "Restores 25% HP", heldItemEffect: "Heals 25% HP when below 50%", color: "#f7a838", category: "restore" },
  { name: "figy-berry", displayName: "Figy Berry", growthTimeMinutes: 45, effect: "Restores 33% HP", heldItemEffect: "Heals 33% HP at 25% HP (confuses if -Atk nature)", color: "#e8433f", category: "restore" },
  { name: "wiki-berry", displayName: "Wiki Berry", growthTimeMinutes: 45, effect: "Restores 33% HP", heldItemEffect: "Heals 33% HP at 25% HP (confuses if -SpA nature)", color: "#7B62A1", category: "restore" },
  { name: "mago-berry", displayName: "Mago Berry", growthTimeMinutes: 45, effect: "Restores 33% HP", heldItemEffect: "Heals 33% HP at 25% HP (confuses if -Spe nature)", color: "#EE99AC", category: "restore" },
  { name: "aguav-berry", displayName: "Aguav Berry", growthTimeMinutes: 45, effect: "Restores 33% HP", heldItemEffect: "Heals 33% HP at 25% HP (confuses if -SpD nature)", color: "#38b764", category: "restore" },
  { name: "iapapa-berry", displayName: "Iapapa Berry", growthTimeMinutes: 45, effect: "Restores 33% HP", heldItemEffect: "Heals 33% HP at 25% HP (confuses if -Def nature)", color: "#f7d838", category: "restore" },

  // ── EV-Reducing Berries ──
  { name: "pomeg-berry", displayName: "Pomeg Berry", growthTimeMinutes: 60, effect: "Reduces HP EVs by 10", color: "#e8433f", category: "ev-reduce" },
  { name: "kelpsy-berry", displayName: "Kelpsy Berry", growthTimeMinutes: 60, effect: "Reduces Attack EVs by 10", color: "#6390F0", category: "ev-reduce" },
  { name: "qualot-berry", displayName: "Qualot Berry", growthTimeMinutes: 60, effect: "Reduces Defense EVs by 10", color: "#f7a838", category: "ev-reduce" },
  { name: "hondew-berry", displayName: "Hondew Berry", growthTimeMinutes: 60, effect: "Reduces Sp.Atk EVs by 10", color: "#38b764", category: "ev-reduce" },
  { name: "grepa-berry", displayName: "Grepa Berry", growthTimeMinutes: 60, effect: "Reduces Sp.Def EVs by 10", color: "#f7d838", category: "ev-reduce" },
  { name: "tamato-berry", displayName: "Tamato Berry", growthTimeMinutes: 60, effect: "Reduces Speed EVs by 10", color: "#e8433f", category: "ev-reduce" },

  // ── Type-Resist Berries (halve super-effective damage, single use) ──
  { name: "occa-berry", displayName: "Occa Berry", growthTimeMinutes: 90, effect: "Halves super-effective Fire damage", heldItemEffect: "0.5x super-effective Fire damage (once)", color: "#F08030", category: "type-resist" },
  { name: "passho-berry", displayName: "Passho Berry", growthTimeMinutes: 90, effect: "Halves super-effective Water damage", heldItemEffect: "0.5x super-effective Water damage (once)", color: "#6390F0", category: "type-resist" },
  { name: "wacan-berry", displayName: "Wacan Berry", growthTimeMinutes: 90, effect: "Halves super-effective Electric damage", heldItemEffect: "0.5x super-effective Electric damage (once)", color: "#F8D030", category: "type-resist" },
  { name: "rindo-berry", displayName: "Rindo Berry", growthTimeMinutes: 90, effect: "Halves super-effective Grass damage", heldItemEffect: "0.5x super-effective Grass damage (once)", color: "#78C850", category: "type-resist" },
  { name: "yache-berry", displayName: "Yache Berry", growthTimeMinutes: 90, effect: "Halves super-effective Ice damage", heldItemEffect: "0.5x super-effective Ice damage (once)", color: "#98D8D8", category: "type-resist" },
  { name: "chople-berry", displayName: "Chople Berry", growthTimeMinutes: 90, effect: "Halves super-effective Fighting damage", heldItemEffect: "0.5x super-effective Fighting damage (once)", color: "#C03028", category: "type-resist" },
  { name: "kebia-berry", displayName: "Kebia Berry", growthTimeMinutes: 90, effect: "Halves super-effective Poison damage", heldItemEffect: "0.5x super-effective Poison damage (once)", color: "#A040A0", category: "type-resist" },
  { name: "shuca-berry", displayName: "Shuca Berry", growthTimeMinutes: 90, effect: "Halves super-effective Ground damage", heldItemEffect: "0.5x super-effective Ground damage (once)", color: "#E0C068", category: "type-resist" },
  { name: "coba-berry", displayName: "Coba Berry", growthTimeMinutes: 90, effect: "Halves super-effective Flying damage", heldItemEffect: "0.5x super-effective Flying damage (once)", color: "#A890F0", category: "type-resist" },
  { name: "payapa-berry", displayName: "Payapa Berry", growthTimeMinutes: 90, effect: "Halves super-effective Psychic damage", heldItemEffect: "0.5x super-effective Psychic damage (once)", color: "#F85888", category: "type-resist" },
  { name: "tanga-berry", displayName: "Tanga Berry", growthTimeMinutes: 90, effect: "Halves super-effective Bug damage", heldItemEffect: "0.5x super-effective Bug damage (once)", color: "#A8B820", category: "type-resist" },
  { name: "charti-berry", displayName: "Charti Berry", growthTimeMinutes: 90, effect: "Halves super-effective Rock damage", heldItemEffect: "0.5x super-effective Rock damage (once)", color: "#B8A038", category: "type-resist" },
  { name: "kasib-berry", displayName: "Kasib Berry", growthTimeMinutes: 90, effect: "Halves super-effective Ghost damage", heldItemEffect: "0.5x super-effective Ghost damage (once)", color: "#705898", category: "type-resist" },
  { name: "haban-berry", displayName: "Haban Berry", growthTimeMinutes: 90, effect: "Halves super-effective Dragon damage", heldItemEffect: "0.5x super-effective Dragon damage (once)", color: "#7038F8", category: "type-resist" },
  { name: "colbur-berry", displayName: "Colbur Berry", growthTimeMinutes: 90, effect: "Halves super-effective Dark damage", heldItemEffect: "0.5x super-effective Dark damage (once)", color: "#705848", category: "type-resist" },
  { name: "babiri-berry", displayName: "Babiri Berry", growthTimeMinutes: 90, effect: "Halves super-effective Steel damage", heldItemEffect: "0.5x super-effective Steel damage (once)", color: "#B8B8D0", category: "type-resist" },
  { name: "chilan-berry", displayName: "Chilan Berry", growthTimeMinutes: 90, effect: "Halves Normal-type damage", heldItemEffect: "0.5x Normal-type damage (once)", color: "#A8A878", category: "type-resist" },

  // ── Stat-Boost Pinch Berries (activate at 25% HP) ──
  { name: "liechi-berry", displayName: "Liechi Berry", growthTimeMinutes: 180, effect: "Raises Attack when HP low", heldItemEffect: "+1 Atk at 25% HP", color: "#e8433f", category: "stat-boost" },
  { name: "ganlon-berry", displayName: "Ganlon Berry", growthTimeMinutes: 180, effect: "Raises Defense when HP low", heldItemEffect: "+1 Def at 25% HP", color: "#6390F0", category: "stat-boost" },
  { name: "salac-berry", displayName: "Salac Berry", growthTimeMinutes: 180, effect: "Raises Speed when HP low", heldItemEffect: "+1 Spe at 25% HP", color: "#38b764", category: "stat-boost" },
  { name: "petaya-berry", displayName: "Petaya Berry", growthTimeMinutes: 180, effect: "Raises Sp.Atk when HP low", heldItemEffect: "+1 SpA at 25% HP", color: "#7B62A1", category: "stat-boost" },
  { name: "apicot-berry", displayName: "Apicot Berry", growthTimeMinutes: 180, effect: "Raises Sp.Def when HP low", heldItemEffect: "+1 SpD at 25% HP", color: "#6390F0", category: "stat-boost" },
  { name: "lansat-berry", displayName: "Lansat Berry", growthTimeMinutes: 240, effect: "Raises critical hit ratio when HP low", heldItemEffect: "+1 crit stage at 25% HP", color: "#f7a838", category: "stat-boost" },
  { name: "starf-berry", displayName: "Starf Berry", growthTimeMinutes: 240, effect: "Sharply raises a random stat when HP low", heldItemEffect: "+2 random stat at 25% HP", color: "#38b764", category: "stat-boost" },

  // ── Special Berries ──
  { name: "enigma-berry", displayName: "Enigma Berry", growthTimeMinutes: 240, effect: "Restores HP when hit by super-effective move", heldItemEffect: "Heals 25% HP when hit super-effectively", color: "#705898", category: "special" },
  { name: "micle-berry", displayName: "Micle Berry", growthTimeMinutes: 240, effect: "Raises accuracy of next move when HP low", heldItemEffect: "+1.2x accuracy on next move at 25% HP", color: "#f7d838", category: "special" },
  { name: "custap-berry", displayName: "Custap Berry", growthTimeMinutes: 240, effect: "Grants priority on next move when HP low", heldItemEffect: "Move first next turn at 25% HP", color: "#e8433f", category: "special" },
  { name: "jaboca-berry", displayName: "Jaboca Berry", growthTimeMinutes: 240, effect: "Damages attacker when hit by physical move", heldItemEffect: "Attacker loses 12.5% HP on physical hit", color: "#f7a838", category: "special" },
  { name: "rowap-berry", displayName: "Rowap Berry", growthTimeMinutes: 240, effect: "Damages attacker when hit by special move", heldItemEffect: "Attacker loses 12.5% HP on special hit", color: "#6390F0", category: "special" },

  // ── Poffin / Contest Berries ──
  { name: "razz-berry", displayName: "Razz Berry", growthTimeMinutes: 20, effect: "Used for making Poffins (Spicy)", color: "#e8433f", category: "poffin" },
  { name: "bluk-berry", displayName: "Bluk Berry", growthTimeMinutes: 20, effect: "Used for making Poffins (Dry)", color: "#705898", category: "poffin" },
  { name: "nanab-berry", displayName: "Nanab Berry", growthTimeMinutes: 20, effect: "Used for making Poffins (Sweet)", color: "#EE99AC", category: "poffin" },
  { name: "wepear-berry", displayName: "Wepear Berry", growthTimeMinutes: 20, effect: "Used for making Poffins (Bitter)", color: "#38b764", category: "poffin" },
  { name: "pinap-berry", displayName: "Pinap Berry", growthTimeMinutes: 20, effect: "Used for making Poffins (Sour)", color: "#f7d838", category: "poffin" },
  { name: "cornn-berry", displayName: "Cornn Berry", growthTimeMinutes: 30, effect: "Used for making Poffins (Dry)", color: "#7B62A1", category: "poffin" },
  { name: "magost-berry", displayName: "Magost Berry", growthTimeMinutes: 30, effect: "Used for making Poffins (Sweet)", color: "#EE99AC", category: "poffin" },
  { name: "rabuta-berry", displayName: "Rabuta Berry", growthTimeMinutes: 30, effect: "Used for making Poffins (Bitter)", color: "#38b764", category: "poffin" },
  { name: "nomel-berry", displayName: "Nomel Berry", growthTimeMinutes: 30, effect: "Used for making Poffins (Sour)", color: "#f7d838", category: "poffin" },
  { name: "spelon-berry", displayName: "Spelon Berry", growthTimeMinutes: 45, effect: "Used for making Poffins (Very Spicy)", color: "#e8433f", category: "poffin" },
  { name: "pamtre-berry", displayName: "Pamtre Berry", growthTimeMinutes: 45, effect: "Used for making Poffins (Very Dry)", color: "#6390F0", category: "poffin" },
  { name: "watmel-berry", displayName: "Watmel Berry", growthTimeMinutes: 45, effect: "Used for making Poffins (Very Sweet)", color: "#EE99AC", category: "poffin" },
  { name: "durin-berry", displayName: "Durin Berry", growthTimeMinutes: 45, effect: "Used for making Poffins (Very Bitter)", color: "#38b764", category: "poffin" },
  { name: "belue-berry", displayName: "Belue Berry", growthTimeMinutes: 45, effect: "Used for making Poffins (Very Sour)", color: "#705898", category: "poffin" },
];

export const BERRY_CATEGORIES: { key: BerryCategory; label: string; color: string }[] = [
  { key: "status", label: "Status Cure", color: "#38b764" },
  { key: "restore", label: "HP/PP Restore", color: "#6390F0" },
  { key: "ev-reduce", label: "EV Reduce", color: "#f7a838" },
  { key: "type-resist", label: "Type Resist", color: "#e8433f" },
  { key: "stat-boost", label: "Stat Boost", color: "#7B62A1" },
  { key: "special", label: "Special", color: "#f7d838" },
  { key: "poffin", label: "Poffin", color: "#EE99AC" },
];
