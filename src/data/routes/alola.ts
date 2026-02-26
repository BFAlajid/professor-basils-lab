import { RouteArea } from "@/types";

export const ALOLA_ROUTES: RouteArea[] = [
  // === ALOLA ===
  {
    id: "alola-route-1",
    name: "Route 1",
    description: "A tropical path on Melemele Island with ocean views and wild Pokemon.",
    theme: "grass",
    region: "alola",
    position: { x: 12, y: 72, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 731, minLevel: 2, maxLevel: 4, encounterRate: 35 }, // Pikipek
      { pokemonId: 734, minLevel: 2, maxLevel: 4, encounterRate: 35 }, // Yungoos
      { pokemonId: 736, minLevel: 3, maxLevel: 5, encounterRate: 20 }, // Grubbin
      { pokemonId: 165, minLevel: 2, maxLevel: 4, encounterRate: 10 }, // Ledyba
    ],
  },
  {
    id: "alola-melemele-meadow",
    name: "Melemele Meadow",
    description: "A flower-filled meadow alive with the hum of pollinating Pokemon.",
    theme: "grass",
    region: "alola",
    position: { x: 5, y: 62, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 742, minLevel: 9, maxLevel: 11, encounterRate: 30 },  // Cutiefly
      { pokemonId: 741, minLevel: 9, maxLevel: 12, encounterRate: 25 },  // Oricorio
      { pokemonId: 10, minLevel: 9, maxLevel: 10, encounterRate: 20 },   // Caterpie
      { pokemonId: 12, minLevel: 11, maxLevel: 13, encounterRate: 10 },  // Butterfree
      { pokemonId: 546, minLevel: 10, maxLevel: 12, encounterRate: 15 }, // Cottonee
    ],
  },
  {
    id: "alola-lush-jungle",
    name: "Lush Jungle",
    description: "A dense tropical jungle on Akala Island, teeming with plant and insect life.",
    theme: "forest",
    region: "alola",
    position: { x: 32, y: 55, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 753, minLevel: 18, maxLevel: 21, encounterRate: 25 }, // Fomantis
      { pokemonId: 755, minLevel: 18, maxLevel: 20, encounterRate: 25 }, // Morelull
      { pokemonId: 761, minLevel: 19, maxLevel: 21, encounterRate: 20 }, // Bounsweet
      { pokemonId: 765, minLevel: 20, maxLevel: 22, encounterRate: 15 }, // Oranguru
      { pokemonId: 766, minLevel: 20, maxLevel: 22, encounterRate: 10 }, // Passimian
      { pokemonId: 754, minLevel: 22, maxLevel: 24, encounterRate: 5 },  // Lurantis
    ],
  },
  {
    id: "alola-mount-lanakila",
    name: "Mount Lanakila",
    description: "The snow-capped summit of Ula'ula Island, gateway to the Pokemon League.",
    theme: "mountain",
    region: "alola",
    position: { x: 58, y: 12, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 215, minLevel: 42, maxLevel: 45, encounterRate: 25 }, // Sneasel
      { pokemonId: 359, minLevel: 42, maxLevel: 46, encounterRate: 20 }, // Absol
      { pokemonId: 582, minLevel: 43, maxLevel: 45, encounterRate: 20 }, // Vanillite
      { pokemonId: 361, minLevel: 42, maxLevel: 44, encounterRate: 20 }, // Snorunt
      { pokemonId: 780, minLevel: 44, maxLevel: 47, encounterRate: 10 }, // Drampa
      { pokemonId: 362, minLevel: 46, maxLevel: 48, encounterRate: 5 },  // Glalie
    ],
  },
  {
    id: "alola-ultra-space",
    name: "Ultra Space",
    description: "A bizarre dimension beyond Ultra Wormholes where Ultra Beasts roam free.",
    theme: "cave",
    region: "alola",
    position: { x: 88, y: 5, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 793, minLevel: 55, maxLevel: 58, encounterRate: 25 }, // Nihilego
      { pokemonId: 794, minLevel: 55, maxLevel: 58, encounterRate: 20 }, // Buzzwole
      { pokemonId: 795, minLevel: 55, maxLevel: 58, encounterRate: 20 }, // Pheromosa
      { pokemonId: 796, minLevel: 56, maxLevel: 59, encounterRate: 15 }, // Xurkitree
      { pokemonId: 798, minLevel: 56, maxLevel: 60, encounterRate: 10 }, // Kartana
      { pokemonId: 799, minLevel: 58, maxLevel: 60, encounterRate: 10 }, // Guzzlord
    ],
  },

  {
    id: "alola-route-2-3",
    name: "Routes 2 & 3",
    description: "Melemele Island routes through berry fields and past Hau'oli outskirts.",
    theme: "grass",
    region: "alola",
    position: { x: 18, y: 82, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 734, minLevel: 5, maxLevel: 8, encounterRate: 30 },
      { pokemonId: 21, minLevel: 5, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 52, minLevel: 5, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 735, minLevel: 8, maxLevel: 10, encounterRate: 10 },
      { pokemonId: 79, minLevel: 6, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "alola-route-4-6",
    name: "Routes 4\u20136",
    description: "Akala Island routes through Paniola Ranch and lush meadows.",
    theme: "grass",
    region: "alola",
    position: { x: 28, y: 45, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 749, minLevel: 12, maxLevel: 15, encounterRate: 25 },
      { pokemonId: 759, minLevel: 12, maxLevel: 15, encounterRate: 20 },
      { pokemonId: 741, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 174, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 133, minLevel: 14, maxLevel: 16, encounterRate: 10 },
      { pokemonId: 764, minLevel: 12, maxLevel: 15, encounterRate: 15 },
    ],
  },
  {
    id: "alola-route-7-8",
    name: "Routes 7 & 8",
    description: "Coastal roads on Akala with tide pools and volcanic ash.",
    theme: "water",
    region: "alola",
    position: { x: 38, y: 65, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 456, minLevel: 16, maxLevel: 19, encounterRate: 25 },
      { pokemonId: 771, minLevel: 16, maxLevel: 19, encounterRate: 20 },
      { pokemonId: 767, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 739, minLevel: 16, maxLevel: 19, encounterRate: 15 },
      { pokemonId: 757, minLevel: 17, maxLevel: 19, encounterRate: 10 },
      { pokemonId: 758, minLevel: 19, maxLevel: 21, encounterRate: 10 },
    ],
  },
  {
    id: "alola-route-10-12",
    name: "Routes 10\u201312",
    description: "Ula'ula Island routes around Mt. Hokulani and Secluded Shore.",
    theme: "grass",
    region: "alola",
    position: { x: 60, y: 35, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 774, minLevel: 25, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 751, minLevel: 24, maxLevel: 27, encounterRate: 20 },
      { pokemonId: 22, minLevel: 24, maxLevel: 27, encounterRate: 20 },
      { pokemonId: 773, minLevel: 25, maxLevel: 28, encounterRate: 10 },
      { pokemonId: 777, minLevel: 24, maxLevel: 27, encounterRate: 20 },
      { pokemonId: 239, minLevel: 24, maxLevel: 27, encounterRate: 15 },
    ],
  },
  {
    id: "alola-route-13-15",
    name: "Routes 13\u201315",
    description: "Desolate coast and Tapu Village ruins on Ula'ula Island.",
    theme: "desert",
    region: "alola",
    position: { x: 52, y: 50, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 769, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 770, minLevel: 30, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 551, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 104, minLevel: 28, maxLevel: 30, encounterRate: 20 },
      { pokemonId: 359, minLevel: 30, maxLevel: 33, encounterRate: 15 },
      { pokemonId: 37, minLevel: 28, maxLevel: 32, encounterRate: 10 },
    ],
  },
  {
    id: "alola-route-16-17",
    name: "Routes 16 & 17",
    description: "Po Town outskirts and the rain-soaked path to Ula'ula Meadow.",
    theme: "grass",
    region: "alola",
    position: { x: 50, y: 22, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 779, minLevel: 32, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 775, minLevel: 32, maxLevel: 35, encounterRate: 15 },
      { pokemonId: 776, minLevel: 32, maxLevel: 36, encounterRate: 15 },
      { pokemonId: 278, minLevel: 32, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 279, minLevel: 34, maxLevel: 36, encounterRate: 10 },
      { pokemonId: 764, minLevel: 32, maxLevel: 35, encounterRate: 20 },
    ],
  },
  {
    id: "alola-verdant-cavern",
    name: "Verdant Cavern",
    description: "The site of Melemele's first trial, crawling with Bug and Normal types.",
    theme: "cave",
    region: "alola",
    position: { x: 8, y: 80, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 19, minLevel: 9, maxLevel: 12, encounterRate: 30 },
      { pokemonId: 41, minLevel: 9, maxLevel: 12, encounterRate: 25 },
      { pokemonId: 50, minLevel: 9, maxLevel: 12, encounterRate: 25 },
      { pokemonId: 735, minLevel: 12, maxLevel: 12, encounterRate: 10 },
      { pokemonId: 20, minLevel: 12, maxLevel: 14, encounterRate: 10 },
    ],
  },
  {
    id: "alola-brooklet-hill",
    name: "Brooklet Hill",
    description: "A rain-soaked area with cascading pools, site of Lana's trial.",
    theme: "water",
    region: "alola",
    position: { x: 35, y: 55, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 751, minLevel: 16, maxLevel: 19, encounterRate: 30 },
      { pokemonId: 746, minLevel: 16, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 54, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 118, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 752, minLevel: 20, maxLevel: 20, encounterRate: 10 },
    ],
  },
  {
    id: "alola-wela-volcano",
    name: "Wela Volcano Park",
    description: "A volcanic trail on Akala where Fire-type Pokemon bask in the heat.",
    theme: "mountain",
    region: "alola",
    position: { x: 40, y: 42, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 757, minLevel: 16, maxLevel: 19, encounterRate: 30 },
      { pokemonId: 240, minLevel: 16, maxLevel: 19, encounterRate: 25 },
      { pokemonId: 662, minLevel: 16, maxLevel: 19, encounterRate: 20 },
      { pokemonId: 104, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 758, minLevel: 20, maxLevel: 22, encounterRate: 10 },
    ],
  },
  {
    id: "alola-haina-desert",
    name: "Haina Desert",
    description: "A confusing desert maze on Ula'ula where sandstorms rage.",
    theme: "desert",
    region: "alola",
    position: { x: 62, y: 42, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 551, minLevel: 32, maxLevel: 36, encounterRate: 25 },
      { pokemonId: 769, minLevel: 32, maxLevel: 36, encounterRate: 25 },
      { pokemonId: 328, minLevel: 32, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 444, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 770, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 552, minLevel: 34, maxLevel: 36, encounterRate: 10 },
    ],
  },
  {
    id: "alola-vast-poni-canyon",
    name: "Vast Poni Canyon",
    description: "A sprawling canyon on Poni Island, the site of the grand trial.",
    theme: "cave",
    region: "alola",
    position: { x: 80, y: 45, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 782, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 621, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 42, minLevel: 40, maxLevel: 44, encounterRate: 15 },
      { pokemonId: 525, minLevel: 40, maxLevel: 43, encounterRate: 15 },
      { pokemonId: 308, minLevel: 40, maxLevel: 43, encounterRate: 15 },
      { pokemonId: 783, minLevel: 44, maxLevel: 46, encounterRate: 10 },
      { pokemonId: 784, minLevel: 48, maxLevel: 50, encounterRate: 5 },
    ],
  },
  {
    id: "alola-resolution-cave",
    name: "Resolution Cave",
    description: "A deep cavern on Poni Island where a powerful Pokemon hides.",
    theme: "cave",
    region: "alola",
    position: { x: 85, y: 55, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 42, minLevel: 46, maxLevel: 50, encounterRate: 25 },
      { pokemonId: 621, minLevel: 46, maxLevel: 50, encounterRate: 20 },
      { pokemonId: 782, minLevel: 46, maxLevel: 50, encounterRate: 20 },
      { pokemonId: 783, minLevel: 48, maxLevel: 52, encounterRate: 15 },
      { pokemonId: 784, minLevel: 50, maxLevel: 54, encounterRate: 10 },
      { pokemonId: 718, minLevel: 60, maxLevel: 60, encounterRate: 1 },
    ],
  },
];
