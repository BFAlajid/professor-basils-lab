import { RouteArea } from "@/types";

export const SINNOH_ROUTES: RouteArea[] = [
  // === SINNOH ===
  {
    id: "sinnoh-route-201",
    name: "Route 201",
    description: "The first route in Sinnoh, connecting Twinleaf and Sandgem Towns.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 46, y: 85, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 396, minLevel: 2, maxLevel: 4, encounterRate: 50 }, // Starly
      { pokemonId: 399, minLevel: 2, maxLevel: 4, encounterRate: 50 }, // Bidoof
    ],
  },
  {
    id: "sinnoh-eterna-forest",
    name: "Eterna Forest",
    description: "A dark, mossy forest on the way to Eterna City.",
    theme: "forest",
    region: "sinnoh",
    position: { x: 25, y: 30, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 406, minLevel: 10, maxLevel: 13, encounterRate: 20 }, // Budew
      { pokemonId: 415, minLevel: 10, maxLevel: 12, encounterRate: 15 }, // Combee
      { pokemonId: 412, minLevel: 10, maxLevel: 12, encounterRate: 20 }, // Burmy
      { pokemonId: 397, minLevel: 10, maxLevel: 12, encounterRate: 15 }, // Staravia
      { pokemonId: 92, minLevel: 11, maxLevel: 13, encounterRate: 15 },  // Gastly
      { pokemonId: 417, minLevel: 10, maxLevel: 12, encounterRate: 10 }, // Pachirisu
      { pokemonId: 242, minLevel: 14, maxLevel: 16, encounterRate: 5 },  // Blissey (rare)
    ],
  },
  {
    id: "sinnoh-mt-coronet",
    name: "Mt. Coronet",
    description: "The massive mountain at the heart of Sinnoh, home to ancient legends.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 44, y: 25, width: 8, height: 40 },
    encounterPool: [
      { pokemonId: 41, minLevel: 14, maxLevel: 18, encounterRate: 25 },  // Zubat
      { pokemonId: 74, minLevel: 15, maxLevel: 18, encounterRate: 20 },  // Geodude
      { pokemonId: 307, minLevel: 15, maxLevel: 18, encounterRate: 15 }, // Meditite
      { pokemonId: 35, minLevel: 16, maxLevel: 20, encounterRate: 10 },  // Clefairy
      { pokemonId: 433, minLevel: 14, maxLevel: 18, encounterRate: 15 }, // Chingling
      { pokemonId: 443, minLevel: 18, maxLevel: 22, encounterRate: 5 },  // Gible (rare)
    ],
  },
  {
    id: "sinnoh-lake-verity",
    name: "Lake Verity",
    description: "A serene lake near Twinleaf Town, said to be home to a Legendary Pokemon.",
    theme: "water",
    region: "sinnoh",
    position: { x: 18, y: 82, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 54, minLevel: 20, maxLevel: 30, encounterRate: 30 },  // Psyduck
      { pokemonId: 129, minLevel: 10, maxLevel: 25, encounterRate: 35 }, // Magikarp
      { pokemonId: 418, minLevel: 20, maxLevel: 25, encounterRate: 20 }, // Buizel
      { pokemonId: 55, minLevel: 25, maxLevel: 30, encounterRate: 10 },  // Golduck
      { pokemonId: 481, minLevel: 50, maxLevel: 50, encounterRate: 1 },  // Mesprit (legendary rare)
    ],
  },
  {
    id: "sinnoh-iron-island",
    name: "Iron Island",
    description: "An island mine rich in iron ore and Steel-type Pokemon.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 8, y: 38, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 75, minLevel: 29, maxLevel: 33, encounterRate: 20 },  // Graveler
      { pokemonId: 95, minLevel: 30, maxLevel: 33, encounterRate: 20 },  // Onix
      { pokemonId: 305, minLevel: 29, maxLevel: 32, encounterRate: 15 }, // Lairon
      { pokemonId: 436, minLevel: 29, maxLevel: 32, encounterRate: 15 }, // Bronzor
      { pokemonId: 42, minLevel: 29, maxLevel: 33, encounterRate: 15 },  // Golbat
      { pokemonId: 448, minLevel: 32, maxLevel: 35, encounterRate: 5 },  // Lucario (rare)
    ],
  },

  {
    id: "sinnoh-route-202-203",
    name: "Routes 202 & 203",
    description: "Early routes near Sandgem and Jubilife with common Sinnoh Pokemon.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 32, y: 78, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 396, minLevel: 3, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 399, minLevel: 3, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 401, minLevel: 3, maxLevel: 5, encounterRate: 20 },
      { pokemonId: 63, minLevel: 4, maxLevel: 6, encounterRate: 10 },
      { pokemonId: 403, minLevel: 4, maxLevel: 6, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-204-205",
    name: "Routes 204 & 205",
    description: "Routes through Ravaged Path and Eterna Forest's outskirts.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 26, y: 48, width: 8, height: 28 },
    encounterPool: [
      { pokemonId: 399, minLevel: 5, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 401, minLevel: 5, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 406, minLevel: 5, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 396, minLevel: 5, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 418, minLevel: 6, maxLevel: 9, encounterRate: 15 },
    ],
  },
  {
    id: "sinnoh-route-206-207",
    name: "Routes 206 & 207",
    description: "The Cycling Road and Oreburgh Gate area south of Eterna.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 38, y: 48, width: 8, height: 22 },
    encounterPool: [
      { pokemonId: 74, minLevel: 14, maxLevel: 17, encounterRate: 25 },
      { pokemonId: 66, minLevel: 14, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 402, minLevel: 14, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 403, minLevel: 14, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 207, minLevel: 16, maxLevel: 18, encounterRate: 15 },
    ],
  },
  {
    id: "sinnoh-route-208-210",
    name: "Routes 208\u2013210",
    description: "Mountainous routes between Hearthome and the foggy Route 210.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 56, y: 42, width: 10, height: 18 },
    encounterPool: [
      { pokemonId: 307, minLevel: 17, maxLevel: 20, encounterRate: 25 },
      { pokemonId: 406, minLevel: 17, maxLevel: 19, encounterRate: 20 },
      { pokemonId: 183, minLevel: 17, maxLevel: 20, encounterRate: 20 },
      { pokemonId: 54, minLevel: 18, maxLevel: 20, encounterRate: 15 },
      { pokemonId: 439, minLevel: 17, maxLevel: 19, encounterRate: 10 },
      { pokemonId: 397, minLevel: 18, maxLevel: 20, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-211-212",
    name: "Routes 211 & 212",
    description: "Routes flanking Mt. Coronet and the rainy marsh south of Hearthome.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 52, y: 55, width: 10, height: 18 },
    encounterPool: [
      { pokemonId: 307, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 315, minLevel: 22, maxLevel: 24, encounterRate: 20 },
      { pokemonId: 183, minLevel: 20, maxLevel: 24, encounterRate: 20 },
      { pokemonId: 402, minLevel: 22, maxLevel: 24, encounterRate: 15 },
      { pokemonId: 397, minLevel: 22, maxLevel: 24, encounterRate: 10 },
      { pokemonId: 214, minLevel: 24, maxLevel: 26, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-213-215",
    name: "Routes 213\u2013215",
    description: "Coastal and woodland routes around Veilstone and Pastoria City.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 66, y: 62, width: 10, height: 16 },
    encounterPool: [
      { pokemonId: 397, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 418, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 419, minLevel: 26, maxLevel: 28, encounterRate: 10 },
      { pokemonId: 308, minLevel: 24, maxLevel: 27, encounterRate: 15 },
      { pokemonId: 214, minLevel: 22, maxLevel: 25, encounterRate: 10 },
      { pokemonId: 315, minLevel: 22, maxLevel: 25, encounterRate: 15 },
    ],
  },
  {
    id: "sinnoh-route-216-217",
    name: "Routes 216 & 217",
    description: "Snow-covered routes leading to Snowpoint City through blizzards.",
    theme: "mountain",
    region: "sinnoh",
    position: { x: 48, y: 12, width: 9, height: 18 },
    encounterPool: [
      { pokemonId: 215, minLevel: 32, maxLevel: 36, encounterRate: 25 },
      { pokemonId: 220, minLevel: 32, maxLevel: 35, encounterRate: 25 },
      { pokemonId: 307, minLevel: 32, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 459, minLevel: 32, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 460, minLevel: 36, maxLevel: 38, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-218-219",
    name: "Routes 218 & 219",
    description: "Water routes west of Jubilife connecting to Canalave City.",
    theme: "water",
    region: "sinnoh",
    position: { x: 10, y: 58, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 72, minLevel: 20, maxLevel: 30, encounterRate: 30 },
      { pokemonId: 278, minLevel: 20, maxLevel: 28, encounterRate: 25 },
      { pokemonId: 418, minLevel: 20, maxLevel: 26, encounterRate: 25 },
      { pokemonId: 419, minLevel: 26, maxLevel: 30, encounterRate: 10 },
      { pokemonId: 456, minLevel: 20, maxLevel: 28, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-222-224",
    name: "Routes 222\u2013224",
    description: "Sunny beach routes approaching Sunyshore and beyond.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 78, y: 52, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 81, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 82, minLevel: 40, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 310, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 369, minLevel: 38, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 419, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 423, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 465, minLevel: 40, maxLevel: 44, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-route-225-228",
    name: "Routes 225\u2013228",
    description: "Post-game routes in the Battle Zone with high-level encounters.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 82, y: 10, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 22, minLevel: 50, maxLevel: 54, encounterRate: 20 },
      { pokemonId: 207, minLevel: 50, maxLevel: 52, encounterRate: 15 },
      { pokemonId: 214, minLevel: 50, maxLevel: 54, encounterRate: 15 },
      { pokemonId: 284, minLevel: 50, maxLevel: 52, encounterRate: 15 },
      { pokemonId: 427, minLevel: 50, maxLevel: 52, encounterRate: 15 },
      { pokemonId: 402, minLevel: 50, maxLevel: 53, encounterRate: 10 },
      { pokemonId: 359, minLevel: 52, maxLevel: 54, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-oreburgh-mine",
    name: "Oreburgh Mine",
    description: "A working coal mine where Rock-type Pokemon abound.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 35, y: 68, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 74, minLevel: 6, maxLevel: 10, encounterRate: 35 },
      { pokemonId: 41, minLevel: 6, maxLevel: 10, encounterRate: 30 },
      { pokemonId: 95, minLevel: 8, maxLevel: 10, encounterRate: 20 },
      { pokemonId: 408, minLevel: 8, maxLevel: 10, encounterRate: 15 },
    ],
  },
  {
    id: "sinnoh-wayward-cave",
    name: "Wayward Cave",
    description: "A dark cave beneath the Cycling Road where Gible can be found.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 40, y: 50, width: 7, height: 7 },
    encounterPool: [
      { pokemonId: 41, minLevel: 16, maxLevel: 20, encounterRate: 30 },
      { pokemonId: 74, minLevel: 16, maxLevel: 20, encounterRate: 25 },
      { pokemonId: 95, minLevel: 17, maxLevel: 20, encounterRate: 20 },
      { pokemonId: 433, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 443, minLevel: 17, maxLevel: 20, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-old-chateau",
    name: "Old Chateau",
    description: "A haunted mansion in Eterna Forest filled with ghostly apparitions.",
    theme: "urban",
    region: "sinnoh",
    position: { x: 22, y: 28, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 92, minLevel: 14, maxLevel: 18, encounterRate: 40 },
      { pokemonId: 93, minLevel: 16, maxLevel: 20, encounterRate: 30 },
      { pokemonId: 94, minLevel: 18, maxLevel: 20, encounterRate: 10 },
      { pokemonId: 479, minLevel: 15, maxLevel: 15, encounterRate: 5 },
    ],
  },
  {
    id: "sinnoh-lost-tower",
    name: "Lost Tower",
    description: "A tower for mourning lost Pokemon on Route 209, full of Ghost types.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 60, y: 52, width: 7, height: 8 },
    encounterPool: [
      { pokemonId: 92, minLevel: 17, maxLevel: 22, encounterRate: 35 },
      { pokemonId: 93, minLevel: 20, maxLevel: 24, encounterRate: 25 },
      { pokemonId: 200, minLevel: 17, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 41, minLevel: 17, maxLevel: 22, encounterRate: 20 },
    ],
  },
  {
    id: "sinnoh-lake-acuity",
    name: "Lake Acuity",
    description: "A frozen lake near Snowpoint City, guarded by the Being of Willpower.",
    theme: "water",
    region: "sinnoh",
    position: { x: 62, y: 8, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 54, minLevel: 34, maxLevel: 38, encounterRate: 30 },
      { pokemonId: 55, minLevel: 36, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 129, minLevel: 20, maxLevel: 30, encounterRate: 30 },
      { pokemonId: 215, minLevel: 34, maxLevel: 38, encounterRate: 15 },
      { pokemonId: 482, minLevel: 50, maxLevel: 50, encounterRate: 1 },
    ],
  },
  {
    id: "sinnoh-victory-road",
    name: "Victory Road",
    description: "Sinnoh's grueling final cave before the Pokemon League.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 68, y: 5, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 42, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 75, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 308, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 207, minLevel: 40, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 397, minLevel: 42, maxLevel: 44, encounterRate: 15 },
      { pokemonId: 443, minLevel: 40, maxLevel: 44, encounterRate: 10 },
    ],
  },
  {
    id: "sinnoh-stark-mountain",
    name: "Stark Mountain",
    description: "A volcanic mountain in the Battle Zone, home to the legendary Heatran.",
    theme: "mountain",
    region: "sinnoh",
    position: { x: 88, y: 5, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 323, minLevel: 52, maxLevel: 56, encounterRate: 25 },
      { pokemonId: 75, minLevel: 52, maxLevel: 56, encounterRate: 20 },
      { pokemonId: 322, minLevel: 52, maxLevel: 54, encounterRate: 20 },
      { pokemonId: 219, minLevel: 52, maxLevel: 56, encounterRate: 15 },
      { pokemonId: 42, minLevel: 52, maxLevel: 56, encounterRate: 15 },
      { pokemonId: 485, minLevel: 70, maxLevel: 70, encounterRate: 1 },
    ],
  },
  {
    id: "sinnoh-turnback-cave",
    name: "Turnback Cave",
    description: "A disorienting cave where dimensions blur and Giratina lurks.",
    theme: "cave",
    region: "sinnoh",
    position: { x: 58, y: 35, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 42, minLevel: 45, maxLevel: 55, encounterRate: 30 },
      { pokemonId: 356, minLevel: 45, maxLevel: 55, encounterRate: 25 },
      { pokemonId: 353, minLevel: 45, maxLevel: 52, encounterRate: 20 },
      { pokemonId: 433, minLevel: 45, maxLevel: 50, encounterRate: 15 },
      { pokemonId: 487, minLevel: 70, maxLevel: 70, encounterRate: 1 },
    ],
  },
];
