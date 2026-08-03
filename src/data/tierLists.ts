export interface TierList {
  id: string;
  name: string;
  bannedPokemon: number[];
  clauses: string[];
  levelCap?: number;
  nfeOnly?: boolean;
  bannedMoves?: string[];
  bannedItems?: string[];
  bannedAbilities?: string[];
  monotype?: boolean;
}

// OU banned list — box legendaries + mythicals + overcentralizing threats
const OU_BANNED: number[] = [
  150, 249, 250, 382, 383, 384, 483, 484, 487, 493, 643, 644, 646, 716,
  717, 718, 785, 786, 787, 788, 800, 888, 889, 890, 891, 892, 898, 1007,
  1008, 1024, 1025,
];

const OU_CLAUSES = [
  "Species Clause",
  "Item Clause",
  "Sleep Clause",
  "Evasion Clause",
  "OHKO Clause",
  "Moody Clause",
  "Baton Pass Clause",
];

// UU additions — Pokemon that are too strong for UU but legal in OU
const UU_BANS: number[] = [
  681,  // Aegislash
  534,  // Conkeldurr
  530,  // Excadrill
  214,  // Heracross
  473,  // Mamoswine
  373,  // Salamence
  212,  // Scizor
  245,  // Suicune
  639,  // Terrakion
  468,  // Togekiss
];

// RU additions — Pokemon that are too strong for RU but legal in UU
const RU_BANS: number[] = [
  169,  // Crobat
  330,  // Flygon
  350,  // Milotic
  31,   // Nidoqueen
  379,  // Registeel
  407,  // Roserade
  197,  // Umbreon
  3,    // Venusaur
];

// NU additions — Pokemon that are too strong for NU but legal in RU
const NU_BANS: number[] = [
  724,  // Decidueye
  452,  // Drapion
  569,  // Garbodor
  766,  // Passimian
  28,   // Sandslash
  128,  // Tauros
  45,   // Vileplume
];

// Cumulative ban lists (each lower tier bans everything above)
const UU_BANNED = [...OU_BANNED, ...UU_BANS];
const RU_BANNED = [...UU_BANNED, ...RU_BANS];
const NU_BANNED = [...RU_BANNED, ...NU_BANS];
const PU_BANNED = [...NU_BANNED];

// LC-specific bans — NFE Pokemon that are still too strong for Little Cup
const LC_BANNED_POKEMON: number[] = [
  123,  // Scyther
  114,  // Tangela
  193,  // Yanma
  198,  // Murkrow
  200,  // Misdreavus
  215,  // Sneasel
];

export const TIER_LISTS: TierList[] = [
  {
    id: "ou",
    name: "OU",
    bannedPokemon: OU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "ubers",
    name: "Ubers",
    bannedPokemon: [],
    clauses: ["Species Clause"],
  },
  {
    id: "uu",
    name: "UU",
    bannedPokemon: UU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "ru",
    name: "RU",
    bannedPokemon: RU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "nu",
    name: "NU",
    bannedPokemon: NU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "pu",
    name: "PU",
    bannedPokemon: PU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "lc",
    name: "LC",
    bannedPokemon: LC_BANNED_POKEMON,
    clauses: ["Species Clause", "Sleep Clause", "Evasion Clause", "OHKO Clause"],
    levelCap: 5,
    nfeOnly: true,
    bannedMoves: ["dragon-rage", "sonic-boom"],
    bannedItems: ["berry-juice"],
    bannedAbilities: ["moody"],
  },
  {
    id: "monotype",
    name: "Monotype",
    bannedPokemon: OU_BANNED,
    clauses: [...OU_CLAUSES, "Monotype Clause"],
    monotype: true,
  },
  {
    id: "ag",
    name: "Anything Goes",
    bannedPokemon: [],
    clauses: ["Species Clause"],
  },
  {
    id: "nationaldex",
    name: "National Dex OU",
    bannedPokemon: OU_BANNED,
    clauses: OU_CLAUSES,
  },
  {
    id: "vgc",
    name: "VGC 2024",
    bannedPokemon: [
      150, 249, 250, 382, 383, 384, 483, 484, 487, 493, 643, 644, 646, 716,
      717, 718, 800, 888, 889, 890, 898,
    ],
    clauses: ["Species Clause", "Item Clause"],
  },
];
