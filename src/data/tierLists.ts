export interface TierList {
  id: string;
  name: string;
  bannedPokemon: number[];
  clauses: string[];
}

export const TIER_LISTS: TierList[] = [
  {
    id: "ou",
    name: "OU",
    bannedPokemon: [
      150, 249, 250, 382, 383, 384, 483, 484, 487, 493, 643, 644, 646, 716,
      717, 718, 785, 786, 787, 788, 800, 888, 889, 890, 891, 892, 898, 1007,
      1008, 1024, 1025,
    ],
    clauses: ["Species Clause", "Item Clause", "Sleep Clause"],
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
  {
    id: "ubers",
    name: "Ubers",
    bannedPokemon: [],
    clauses: ["Species Clause"],
  },
];
