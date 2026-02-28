import { RouteArea } from "@/types";

export const KALOS_ROUTES: RouteArea[] = [
  // === KALOS ===
  {
    id: "kalos-route-2",
    name: "Route 2",
    description: "A sunlit trail winding through the outskirts of Aquacorde Town.",
    theme: "grass",
    region: "kalos",
    position: { x: 48, y: 82, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 661, minLevel: 2, maxLevel: 4, encounterRate: 35 },  // Fletchling
      { pokemonId: 659, minLevel: 2, maxLevel: 4, encounterRate: 35 },  // Bunnelby
      { pokemonId: 664, minLevel: 2, maxLevel: 3, encounterRate: 20 },  // Scatterbug
      { pokemonId: 263, minLevel: 3, maxLevel: 5, encounterRate: 10 },  // Zigzagoon
    ],
  },
  {
    id: "kalos-santalune-forest",
    name: "Santalune Forest",
    description: "A lush forest near Santalune City buzzing with common Bug-type Pokemon.",
    theme: "forest",
    region: "kalos",
    position: { x: 60, y: 78, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 10, minLevel: 3, maxLevel: 5, encounterRate: 25 },  // Caterpie
      { pokemonId: 13, minLevel: 3, maxLevel: 5, encounterRate: 25 },  // Weedle
      { pokemonId: 25, minLevel: 4, maxLevel: 6, encounterRate: 10 },  // Pikachu
      { pokemonId: 511, minLevel: 3, maxLevel: 5, encounterRate: 15 }, // Pansage
      { pokemonId: 513, minLevel: 3, maxLevel: 5, encounterRate: 15 }, // Pansear
      { pokemonId: 515, minLevel: 3, maxLevel: 5, encounterRate: 10 }, // Panpour
    ],
  },
  {
    id: "kalos-glittering-cave",
    name: "Glittering Cave",
    description: "A sparkling cavern where fossils and rare minerals lie buried in the walls.",
    theme: "cave",
    region: "kalos",
    position: { x: 22, y: 52, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 104, minLevel: 15, maxLevel: 18, encounterRate: 25 }, // Cubone
      { pokemonId: 111, minLevel: 15, maxLevel: 18, encounterRate: 25 }, // Rhyhorn
      { pokemonId: 115, minLevel: 16, maxLevel: 19, encounterRate: 10 }, // Kangaskhan
      { pokemonId: 303, minLevel: 16, maxLevel: 18, encounterRate: 15 }, // Mawile
      { pokemonId: 337, minLevel: 17, maxLevel: 19, encounterRate: 15 }, // Lunatone
      { pokemonId: 338, minLevel: 17, maxLevel: 19, encounterRate: 10 }, // Solrock
    ],
  },
  {
    id: "kalos-frost-cavern",
    name: "Frost Cavern",
    description: "A bitterly cold cavern encased in ice, home to resilient Ice-type Pokemon.",
    theme: "cave",
    region: "kalos",
    position: { x: 42, y: 22, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 712, minLevel: 38, maxLevel: 41, encounterRate: 30 }, // Bergmite
      { pokemonId: 238, minLevel: 38, maxLevel: 40, encounterRate: 25 }, // Smoochum
      { pokemonId: 221, minLevel: 39, maxLevel: 42, encounterRate: 20 }, // Piloswine
      { pokemonId: 614, minLevel: 40, maxLevel: 43, encounterRate: 15 }, // Beartic
      { pokemonId: 124, minLevel: 42, maxLevel: 44, encounterRate: 10 }, // Jynx
    ],
  },
  {
    id: "kalos-pokemon-village",
    name: "Pokemon Village",
    description: "A hidden refuge where abandoned Pokemon have gathered to live in peace.",
    theme: "forest",
    region: "kalos",
    position: { x: 82, y: 12, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 571, minLevel: 48, maxLevel: 50, encounterRate: 20 }, // Zoroark
      { pokemonId: 132, minLevel: 46, maxLevel: 48, encounterRate: 20 }, // Ditto
      { pokemonId: 108, minLevel: 46, maxLevel: 48, encounterRate: 20 }, // Lickitung
      { pokemonId: 39, minLevel: 45, maxLevel: 47, encounterRate: 20 },  // Jigglypuff
      { pokemonId: 575, minLevel: 47, maxLevel: 49, encounterRate: 15 }, // Gothorita
      { pokemonId: 591, minLevel: 48, maxLevel: 50, encounterRate: 5 },  // Amoonguss
    ],
  },

  {
    id: "kalos-route-3-5",
    name: "Routes 3\u20135",
    description: "Rolling hills and flower fields between Santalune and Lumiose City.",
    theme: "grass",
    region: "kalos",
    position: { x: 56, y: 70, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 661, minLevel: 4, maxLevel: 7, encounterRate: 25 },
      { pokemonId: 659, minLevel: 4, maxLevel: 7, encounterRate: 20 },
      { pokemonId: 412, minLevel: 5, maxLevel: 7, encounterRate: 15 },
      { pokemonId: 283, minLevel: 4, maxLevel: 6, encounterRate: 15 },
      { pokemonId: 406, minLevel: 5, maxLevel: 7, encounterRate: 15 },
      { pokemonId: 298, minLevel: 4, maxLevel: 6, encounterRate: 10 },
    ],
  },
  {
    id: "kalos-route-6-7",
    name: "Routes 6 & 7",
    description: "A grand boulevard and berry fields between Camphrier and Cyllage.",
    theme: "grass",
    region: "kalos",
    position: { x: 30, y: 58, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 669, minLevel: 8, maxLevel: 12, encounterRate: 25 },
      { pokemonId: 165, minLevel: 8, maxLevel: 11, encounterRate: 20 },
      { pokemonId: 314, minLevel: 8, maxLevel: 11, encounterRate: 15 },
      { pokemonId: 313, minLevel: 8, maxLevel: 11, encounterRate: 15 },
      { pokemonId: 193, minLevel: 8, maxLevel: 11, encounterRate: 10 },
      { pokemonId: 672, minLevel: 9, maxLevel: 12, encounterRate: 15 },
    ],
  },
  {
    id: "kalos-route-8-9",
    name: "Routes 8 & 9",
    description: "Coastal cliffs and the Glittering Cave approach with Rock types.",
    theme: "grass",
    region: "kalos",
    position: { x: 18, y: 65, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 566, minLevel: 12, maxLevel: 15, encounterRate: 20 },
      { pokemonId: 564, minLevel: 12, maxLevel: 15, encounterRate: 20 },
      { pokemonId: 302, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 111, minLevel: 13, maxLevel: 15, encounterRate: 15 },
      { pokemonId: 371, minLevel: 13, maxLevel: 15, encounterRate: 10 },
      { pokemonId: 696, minLevel: 13, maxLevel: 15, encounterRate: 10 },
      { pokemonId: 698, minLevel: 13, maxLevel: 15, encounterRate: 10 },
    ],
  },
  {
    id: "kalos-route-10-11",
    name: "Routes 10 & 11",
    description: "Menhir Trail with mysterious standing stones and Reflection Cave approach.",
    theme: "grass",
    region: "kalos",
    position: { x: 34, y: 45, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 299, minLevel: 20, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 193, minLevel: 20, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 561, minLevel: 20, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 624, minLevel: 20, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 694, minLevel: 20, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 178, minLevel: 22, maxLevel: 24, encounterRate: 15 },
    ],
  },
  {
    id: "kalos-route-12-14",
    name: "Routes 12\u201314",
    description: "Coastal and swamp routes between Shalour, Coumarine, and Laverre.",
    theme: "grass",
    region: "kalos",
    position: { x: 22, y: 42, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 128, minLevel: 24, maxLevel: 27, encounterRate: 15 },
      { pokemonId: 241, minLevel: 24, maxLevel: 27, encounterRate: 15 },
      { pokemonId: 446, minLevel: 24, maxLevel: 27, encounterRate: 10 },
      { pokemonId: 590, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 708, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 710, minLevel: 28, maxLevel: 32, encounterRate: 20 },
    ],
  },
  {
    id: "kalos-route-15-16",
    name: "Routes 15 & 16",
    description: "Autumnal paths through Laverre's marshland and Dendemille outskirts.",
    theme: "forest",
    region: "kalos",
    position: { x: 28, y: 28, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 198, minLevel: 34, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 710, minLevel: 34, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 708, minLevel: 34, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 590, minLevel: 34, maxLevel: 36, encounterRate: 15 },
      { pokemonId: 353, minLevel: 34, maxLevel: 36, encounterRate: 15 },
      { pokemonId: 711, minLevel: 36, maxLevel: 38, encounterRate: 10 },
    ],
  },
  {
    id: "kalos-route-18-19",
    name: "Routes 18 & 19",
    description: "Rugged terrain and wetlands on the approach to the Pokemon League.",
    theme: "mountain",
    region: "kalos",
    position: { x: 68, y: 25, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 75, minLevel: 44, maxLevel: 47, encounterRate: 20 },
      { pokemonId: 621, minLevel: 44, maxLevel: 47, encounterRate: 15 },
      { pokemonId: 536, minLevel: 44, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 195, minLevel: 44, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 614, minLevel: 44, maxLevel: 47, encounterRate: 15 },
      { pokemonId: 713, minLevel: 46, maxLevel: 48, encounterRate: 10 },
    ],
  },
  {
    id: "kalos-route-20-22",
    name: "Routes 20\u201322",
    description: "Winding Woodlands and the path to Victory Road's entrance.",
    theme: "forest",
    region: "kalos",
    position: { x: 78, y: 15, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 708, minLevel: 46, maxLevel: 50, encounterRate: 20 },
      { pokemonId: 711, minLevel: 48, maxLevel: 50, encounterRate: 15 },
      { pokemonId: 521, minLevel: 46, maxLevel: 48, encounterRate: 20 },
      { pokemonId: 586, minLevel: 46, maxLevel: 48, encounterRate: 15 },
      { pokemonId: 435, minLevel: 46, maxLevel: 48, encounterRate: 15 },
      { pokemonId: 573, minLevel: 46, maxLevel: 48, encounterRate: 15 },
    ],
  },
  {
    id: "kalos-connecting-cave",
    name: "Connecting Cave",
    description: "A cave linking Routes 7 and 8 with Zubat colonies.",
    theme: "cave",
    region: "kalos",
    position: { x: 38, y: 55, width: 7, height: 7 },
    encounterPool: [
      { pokemonId: 41, minLevel: 15, maxLevel: 18, encounterRate: 35 },
      { pokemonId: 293, minLevel: 15, maxLevel: 17, encounterRate: 25 },
      { pokemonId: 610, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 194, minLevel: 15, maxLevel: 17, encounterRate: 20 },
    ],
  },
  {
    id: "kalos-reflection-cave",
    name: "Reflection Cave",
    description: "A crystalline cave of mirrors hiding Rock and Psychic types.",
    theme: "cave",
    region: "kalos",
    position: { x: 28, y: 50, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 524, minLevel: 21, maxLevel: 23, encounterRate: 25 },
      { pokemonId: 302, minLevel: 21, maxLevel: 23, encounterRate: 20 },
      { pokemonId: 703, minLevel: 21, maxLevel: 23, encounterRate: 15 },
      { pokemonId: 574, minLevel: 21, maxLevel: 23, encounterRate: 15 },
      { pokemonId: 527, minLevel: 21, maxLevel: 23, encounterRate: 15 },
      { pokemonId: 178, minLevel: 22, maxLevel: 24, encounterRate: 10 },
    ],
  },
  {
    id: "kalos-terminus-cave",
    name: "Terminus Cave",
    description: "A deep cave near Couriway Town where a dangerous cocoon Pokemon lurks.",
    theme: "cave",
    region: "kalos",
    position: { x: 72, y: 30, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 75, minLevel: 44, maxLevel: 46, encounterRate: 25 },
      { pokemonId: 525, minLevel: 44, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 305, minLevel: 44, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 529, minLevel: 44, maxLevel: 46, encounterRate: 15 },
      { pokemonId: 632, minLevel: 44, maxLevel: 46, encounterRate: 10 },
      { pokemonId: 718, minLevel: 50, maxLevel: 50, encounterRate: 1 },
    ],
  },
  {
    id: "kalos-victory-road",
    name: "Victory Road",
    description: "Kalos's grand final challenge before meeting the Elite Four.",
    theme: "cave",
    region: "kalos",
    position: { x: 85, y: 5, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 75, minLevel: 56, maxLevel: 58, encounterRate: 20 },
      { pokemonId: 42, minLevel: 56, maxLevel: 58, encounterRate: 15 },
      { pokemonId: 621, minLevel: 56, maxLevel: 58, encounterRate: 15 },
      { pokemonId: 308, minLevel: 56, maxLevel: 58, encounterRate: 15 },
      { pokemonId: 611, minLevel: 56, maxLevel: 58, encounterRate: 15 },
      { pokemonId: 706, minLevel: 56, maxLevel: 58, encounterRate: 10 },
      { pokemonId: 714, minLevel: 56, maxLevel: 58, encounterRate: 10 },
    ],
  },
];
