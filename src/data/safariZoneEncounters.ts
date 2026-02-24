export interface SafariEncounterDef {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  rarity: "common" | "uncommon" | "rare";
  baseFleeRate: number; // 0-1, how likely to flee each turn
  baseCatchRate: number; // 0-1, base catch chance with Safari Ball
}

export const SAFARI_REGIONS = ["kanto", "johto", "hoenn", "sinnoh"] as const;

export type SafariRegion = (typeof SAFARI_REGIONS)[number];

// Kanto Safari Zone — 18 Pokemon
// common (7): Nidoran♀, Nidoran♂, Parasect, Venomoth, Dodrio, Goldeen, Slowpoke
// uncommon (6): Rhyhorn, Exeggcute, Lickitung, Tangela, Tauros, Pinsir
// rare (5): Kangaskhan, Scyther, Chansey, Dratini, Dragonair
const kantoEncounters: SafariEncounterDef[] = [
  // --- common (40%) ---
  { pokemonId: 29, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.15, baseCatchRate: 0.45 },   // Nidoran♀
  { pokemonId: 32, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.15, baseCatchRate: 0.45 },   // Nidoran♂
  { pokemonId: 47, minLevel: 27, maxLevel: 35, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.40 },   // Parasect
  { pokemonId: 49, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.42 },   // Venomoth
  { pokemonId: 85, minLevel: 28, maxLevel: 35, rarity: "common", baseFleeRate: 0.22, baseCatchRate: 0.38 },   // Dodrio
  { pokemonId: 118, minLevel: 25, maxLevel: 32, rarity: "common", baseFleeRate: 0.16, baseCatchRate: 0.48 },  // Goldeen
  { pokemonId: 79, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.15, baseCatchRate: 0.50 },   // Slowpoke

  // --- uncommon (33%) ---
  { pokemonId: 111, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.22, baseCatchRate: 0.30 }, // Rhyhorn
  { pokemonId: 102, minLevel: 28, maxLevel: 35, rarity: "uncommon", baseFleeRate: 0.25, baseCatchRate: 0.28 }, // Exeggcute
  { pokemonId: 108, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.28, baseCatchRate: 0.25 }, // Lickitung
  { pokemonId: 114, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.24, baseCatchRate: 0.30 }, // Tangela
  { pokemonId: 128, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.30, baseCatchRate: 0.22 }, // Tauros
  { pokemonId: 127, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.26, baseCatchRate: 0.28 }, // Pinsir

  // --- rare (28%) ---
  { pokemonId: 115, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.35, baseCatchRate: 0.12 },    // Kangaskhan
  { pokemonId: 123, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.30, baseCatchRate: 0.15 },    // Scyther
  { pokemonId: 113, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.40, baseCatchRate: 0.10 },    // Chansey
  { pokemonId: 147, minLevel: 30, maxLevel: 38, rarity: "rare", baseFleeRate: 0.32, baseCatchRate: 0.15 },    // Dratini
  { pokemonId: 148, minLevel: 33, maxLevel: 42, rarity: "rare", baseFleeRate: 0.38, baseCatchRate: 0.10 },    // Dragonair
];

// Johto Safari Zone — 16 Pokemon
// common (6): Marill, Aipom, Girafarig, Stantler, Phanpy, Teddiursa
// uncommon (6): Yanma, Murkrow, Wobbuffet, Gligar, Sneasel, Miltank
// rare (4): Heracross, Misdreavus, Shuckle, Larvitar
const johtoEncounters: SafariEncounterDef[] = [
  // --- common (38%) ---
  { pokemonId: 183, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.15, baseCatchRate: 0.48 },  // Marill
  { pokemonId: 190, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.42 },  // Aipom
  { pokemonId: 203, minLevel: 27, maxLevel: 35, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.40 },  // Girafarig
  { pokemonId: 234, minLevel: 28, maxLevel: 35, rarity: "common", baseFleeRate: 0.22, baseCatchRate: 0.38 },  // Stantler
  { pokemonId: 231, minLevel: 25, maxLevel: 32, rarity: "common", baseFleeRate: 0.16, baseCatchRate: 0.45 },  // Phanpy
  { pokemonId: 216, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.44 },  // Teddiursa

  // --- uncommon (38%) ---
  { pokemonId: 193, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.25, baseCatchRate: 0.30 }, // Yanma
  { pokemonId: 198, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.28, baseCatchRate: 0.25 }, // Murkrow
  { pokemonId: 202, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.22, baseCatchRate: 0.32 }, // Wobbuffet
  { pokemonId: 207, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.26, baseCatchRate: 0.28 }, // Gligar
  { pokemonId: 215, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.28, baseCatchRate: 0.25 }, // Sneasel
  { pokemonId: 241, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.24, baseCatchRate: 0.30 }, // Miltank

  // --- rare (25%) ---
  { pokemonId: 214, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.30, baseCatchRate: 0.18 },    // Heracross
  { pokemonId: 200, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.35, baseCatchRate: 0.14 },    // Misdreavus
  { pokemonId: 213, minLevel: 30, maxLevel: 38, rarity: "rare", baseFleeRate: 0.25, baseCatchRate: 0.20 },    // Shuckle
  { pokemonId: 246, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.38, baseCatchRate: 0.10 },    // Larvitar
];

// Hoenn Safari Zone — 16 Pokemon
// common (6): Electrike, Cacnea, Marill-equivalent→Ralts, Sableye, Mawile, Duskull
// uncommon (6): Zangoose, Seviper, Trapinch, Heracross, Pinsir, Tropius
// rare (4): Absol, Bagon, Beldum, Feebas
const hoennEncounters: SafariEncounterDef[] = [
  // --- common (38%) ---
  { pokemonId: 309, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.45 },  // Electrike
  { pokemonId: 331, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.42 },  // Cacnea
  { pokemonId: 280, minLevel: 25, maxLevel: 32, rarity: "common", baseFleeRate: 0.16, baseCatchRate: 0.48 },  // Ralts
  { pokemonId: 302, minLevel: 27, maxLevel: 35, rarity: "common", baseFleeRate: 0.22, baseCatchRate: 0.40 },  // Sableye
  { pokemonId: 303, minLevel: 27, maxLevel: 35, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.42 },  // Mawile
  { pokemonId: 355, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.44 },  // Duskull

  // --- uncommon (38%) ---
  { pokemonId: 335, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.25, baseCatchRate: 0.30 }, // Zangoose
  { pokemonId: 336, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.25, baseCatchRate: 0.30 }, // Seviper
  { pokemonId: 328, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.24, baseCatchRate: 0.28 }, // Trapinch
  { pokemonId: 214, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.28, baseCatchRate: 0.25 }, // Heracross
  { pokemonId: 127, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.26, baseCatchRate: 0.28 }, // Pinsir
  { pokemonId: 357, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.22, baseCatchRate: 0.32 }, // Tropius

  // --- rare (25%) ---
  { pokemonId: 359, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.35, baseCatchRate: 0.14 },    // Absol
  { pokemonId: 371, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.32, baseCatchRate: 0.15 },    // Bagon
  { pokemonId: 374, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.38, baseCatchRate: 0.10 },    // Beldum
  { pokemonId: 349, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.40, baseCatchRate: 0.10 },    // Feebas
];

// Sinnoh Safari Zone — 16 Pokemon
// common (7): Pachirisu, Chatot, Buizel, Shellos, Stunky, Glameow, Combee
// uncommon (5): Croagunk, Hippopotas, Carnivine, Bronzor, Skorupi
// rare (4): Gible, Riolu, Spiritomb, Munchlax
const sinnohEncounters: SafariEncounterDef[] = [
  // --- common (44%) ---
  { pokemonId: 417, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.45 },  // Pachirisu
  { pokemonId: 441, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.42 },  // Chatot
  { pokemonId: 418, minLevel: 25, maxLevel: 32, rarity: "common", baseFleeRate: 0.16, baseCatchRate: 0.48 },  // Buizel
  { pokemonId: 422, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.15, baseCatchRate: 0.50 },  // Shellos
  { pokemonId: 434, minLevel: 26, maxLevel: 34, rarity: "common", baseFleeRate: 0.20, baseCatchRate: 0.40 },  // Stunky
  { pokemonId: 431, minLevel: 25, maxLevel: 33, rarity: "common", baseFleeRate: 0.18, baseCatchRate: 0.44 },  // Glameow
  { pokemonId: 415, minLevel: 25, maxLevel: 32, rarity: "common", baseFleeRate: 0.16, baseCatchRate: 0.46 },  // Combee

  // --- uncommon (31%) ---
  { pokemonId: 453, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.24, baseCatchRate: 0.30 }, // Croagunk
  { pokemonId: 449, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.26, baseCatchRate: 0.28 }, // Hippopotas
  { pokemonId: 455, minLevel: 28, maxLevel: 36, rarity: "uncommon", baseFleeRate: 0.22, baseCatchRate: 0.32 }, // Carnivine
  { pokemonId: 436, minLevel: 30, maxLevel: 38, rarity: "uncommon", baseFleeRate: 0.28, baseCatchRate: 0.25 }, // Bronzor
  { pokemonId: 451, minLevel: 29, maxLevel: 37, rarity: "uncommon", baseFleeRate: 0.25, baseCatchRate: 0.30 }, // Skorupi

  // --- rare (25%) ---
  { pokemonId: 443, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.35, baseCatchRate: 0.12 },    // Gible
  { pokemonId: 447, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.32, baseCatchRate: 0.15 },    // Riolu
  { pokemonId: 442, minLevel: 32, maxLevel: 42, rarity: "rare", baseFleeRate: 0.38, baseCatchRate: 0.10 },    // Spiritomb
  { pokemonId: 446, minLevel: 30, maxLevel: 40, rarity: "rare", baseFleeRate: 0.40, baseCatchRate: 0.10 },    // Munchlax
];

export const SAFARI_ENCOUNTERS: Record<string, SafariEncounterDef[]> = {
  kanto: kantoEncounters,
  johto: johtoEncounters,
  hoenn: hoennEncounters,
  sinnoh: sinnohEncounters,
};
