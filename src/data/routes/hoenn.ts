import { RouteArea } from "@/types";

export const HOENN_ROUTES: RouteArea[] = [
  // === HOENN ===
  {
    id: "hoenn-route-101",
    name: "Route 101",
    description: "A short grassy route in southern Hoenn.",
    theme: "grass",
    region: "hoenn",
    position: { x: 42, y: 78, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 263, minLevel: 2, maxLevel: 4, encounterRate: 45 }, // Zigzagoon
      { pokemonId: 265, minLevel: 2, maxLevel: 4, encounterRate: 45 }, // Wurmple
      { pokemonId: 261, minLevel: 2, maxLevel: 4, encounterRate: 10 }, // Poochyena
    ],
  },
  {
    id: "hoenn-petalburg-woods",
    name: "Petalburg Woods",
    description: "A forest filled with Bug-type Pokemon and mushroom hunters.",
    theme: "forest",
    region: "hoenn",
    position: { x: 18, y: 55, width: 9, height: 10 },
    encounterPool: [
      { pokemonId: 265, minLevel: 5, maxLevel: 6, encounterRate: 25 },  // Wurmple
      { pokemonId: 285, minLevel: 5, maxLevel: 6, encounterRate: 20 },  // Shroomish
      { pokemonId: 276, minLevel: 5, maxLevel: 6, encounterRate: 20 },  // Taillow
      { pokemonId: 290, minLevel: 5, maxLevel: 6, encounterRate: 15 },  // Nincada
      { pokemonId: 286, minLevel: 7, maxLevel: 8, encounterRate: 5 },   // Breloom (rare)
      { pokemonId: 273, minLevel: 5, maxLevel: 6, encounterRate: 15 },  // Seedot
    ],
  },
  {
    id: "hoenn-meteor-falls",
    name: "Meteor Falls",
    description: "A beautiful cave with waterfalls and rare Dragon-type Pokemon.",
    theme: "cave",
    region: "hoenn",
    position: { x: 22, y: 28, width: 8, height: 9 },
    encounterPool: [
      { pokemonId: 41, minLevel: 14, maxLevel: 18, encounterRate: 35 },  // Zubat
      { pokemonId: 337, minLevel: 14, maxLevel: 18, encounterRate: 20 }, // Lunatone
      { pokemonId: 338, minLevel: 14, maxLevel: 18, encounterRate: 20 }, // Solrock
      { pokemonId: 371, minLevel: 16, maxLevel: 20, encounterRate: 10 }, // Bagon (rare)
      { pokemonId: 374, minLevel: 20, maxLevel: 25, encounterRate: 5 },  // Beldum (very rare)
    ],
  },
  {
    id: "hoenn-route-119",
    name: "Route 119",
    description: "A long rainy route with tall grass and the Weather Institute.",
    theme: "grass",
    region: "hoenn",
    position: { x: 52, y: 22, width: 7, height: 16 },
    encounterPool: [
      { pokemonId: 43, minLevel: 25, maxLevel: 28, encounterRate: 25 },  // Oddish
      { pokemonId: 264, minLevel: 25, maxLevel: 27, encounterRate: 20 }, // Linoone
      { pokemonId: 352, minLevel: 25, maxLevel: 27, encounterRate: 10 }, // Kecleon
      { pokemonId: 349, minLevel: 20, maxLevel: 25, encounterRate: 5 },  // Feebas (ultra rare)
      { pokemonId: 283, minLevel: 25, maxLevel: 27, encounterRate: 20 }, // Surskit
      { pokemonId: 357, minLevel: 25, maxLevel: 28, encounterRate: 10 }, // Tropius
    ],
  },

  {
    id: "hoenn-route-102",
    name: "Route 102",
    description: "A grassy path west of Oldale Town where beginning trainers hone their skills.",
    theme: "grass",
    region: "hoenn",
    position: { x: 30, y: 72, width: 10, height: 7 },
    encounterPool: [
      { pokemonId: 263, minLevel: 3, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 280, minLevel: 4, maxLevel: 5, encounterRate: 20 },
      { pokemonId: 270, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 273, minLevel: 3, maxLevel: 5, encounterRate: 25 },
    ],
  },
  {
    id: "hoenn-route-103-104",
    name: "Routes 103 & 104",
    description: "Coastal routes north and south of Petalburg, linking to Petalburg Woods.",
    theme: "grass",
    region: "hoenn",
    position: { x: 20, y: 62, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 263, minLevel: 3, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 278, minLevel: 4, maxLevel: 6, encounterRate: 25 },
      { pokemonId: 276, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 183, minLevel: 4, maxLevel: 6, encounterRate: 20 },
    ],
  },
  {
    id: "hoenn-route-110",
    name: "Route 110",
    description: "A long route with the Cycling Road between Mauville and Slateport.",
    theme: "grass",
    region: "hoenn",
    position: { x: 42, y: 52, width: 7, height: 14 },
    encounterPool: [
      { pokemonId: 309, minLevel: 12, maxLevel: 14, encounterRate: 25 },
      { pokemonId: 81, minLevel: 12, maxLevel: 14, encounterRate: 20 },
      { pokemonId: 311, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 312, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 100, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 278, minLevel: 12, maxLevel: 14, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-route-111",
    name: "Route 111 (Desert)",
    description: "A sandstorm-swept desert north of Mauville hiding Ground-type Pokemon.",
    theme: "desert",
    region: "hoenn",
    position: { x: 40, y: 30, width: 8, height: 12 },
    encounterPool: [
      { pokemonId: 27, minLevel: 20, maxLevel: 23, encounterRate: 30 },
      { pokemonId: 328, minLevel: 20, maxLevel: 23, encounterRate: 25 },
      { pokemonId: 322, minLevel: 20, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 343, minLevel: 20, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 246, minLevel: 20, maxLevel: 22, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-route-113",
    name: "Route 113",
    description: "A route blanketed in volcanic ash from Mt. Chimney.",
    theme: "mountain",
    region: "hoenn",
    position: { x: 22, y: 18, width: 10, height: 7 },
    encounterPool: [
      { pokemonId: 327, minLevel: 15, maxLevel: 17, encounterRate: 35 },
      { pokemonId: 218, minLevel: 15, maxLevel: 17, encounterRate: 30 },
      { pokemonId: 227, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 322, minLevel: 15, maxLevel: 17, encounterRate: 15 },
    ],
  },
  {
    id: "hoenn-route-114-115",
    name: "Routes 114 & 115",
    description: "Northern routes past Meteor Falls, home to Fighting and Rock types.",
    theme: "grass",
    region: "hoenn",
    position: { x: 14, y: 28, width: 8, height: 14 },
    encounterPool: [
      { pokemonId: 264, minLevel: 16, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 271, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 274, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 296, minLevel: 16, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 304, minLevel: 16, maxLevel: 18, encounterRate: 15 },
    ],
  },
  {
    id: "hoenn-route-116-117",
    name: "Routes 116 & 117",
    description: "Routes near Rustboro and the Pokemon Daycare on Route 117.",
    theme: "grass",
    region: "hoenn",
    position: { x: 22, y: 42, width: 14, height: 7 },
    encounterPool: [
      { pokemonId: 276, minLevel: 7, maxLevel: 10, encounterRate: 25 },
      { pokemonId: 290, minLevel: 7, maxLevel: 10, encounterRate: 20 },
      { pokemonId: 300, minLevel: 13, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 43, minLevel: 13, maxLevel: 16, encounterRate: 15 },
      { pokemonId: 314, minLevel: 13, maxLevel: 16, encounterRate: 10 },
      { pokemonId: 313, minLevel: 13, maxLevel: 16, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-route-118-120",
    name: "Routes 118 & 120",
    description: "Eastern routes where strong trainers battle amid tall grass and rain.",
    theme: "grass",
    region: "hoenn",
    position: { x: 52, y: 40, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 264, minLevel: 25, maxLevel: 28, encounterRate: 25 },
      { pokemonId: 43, minLevel: 25, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 352, minLevel: 25, maxLevel: 27, encounterRate: 10 },
      { pokemonId: 261, minLevel: 25, maxLevel: 27, encounterRate: 20 },
      { pokemonId: 359, minLevel: 27, maxLevel: 29, encounterRate: 10 },
      { pokemonId: 357, minLevel: 25, maxLevel: 28, encounterRate: 15 },
    ],
  },
  {
    id: "hoenn-route-121-123",
    name: "Routes 121\u2013123",
    description: "Western routes near Lilycove and the Safari Zone, with diverse Pokemon.",
    theme: "grass",
    region: "hoenn",
    position: { x: 64, y: 35, width: 10, height: 7 },
    encounterPool: [
      { pokemonId: 264, minLevel: 26, maxLevel: 28, encounterRate: 25 },
      { pokemonId: 42, minLevel: 26, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 353, minLevel: 26, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 302, minLevel: 26, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 44, minLevel: 26, maxLevel: 28, encounterRate: 10 },
      { pokemonId: 354, minLevel: 28, maxLevel: 30, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-ocean-routes",
    name: "Ocean Routes 124\u2013131",
    description: "Vast seas spanning eastern Hoenn, rich with aquatic life.",
    theme: "water",
    region: "hoenn",
    position: { x: 65, y: 60, width: 18, height: 10 },
    encounterPool: [
      { pokemonId: 72, minLevel: 25, maxLevel: 30, encounterRate: 40 },
      { pokemonId: 278, minLevel: 25, maxLevel: 30, encounterRate: 20 },
      { pokemonId: 320, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 319, minLevel: 28, maxLevel: 32, encounterRate: 10 },
      { pokemonId: 370, minLevel: 25, maxLevel: 28, encounterRate: 10 },
      { pokemonId: 369, minLevel: 30, maxLevel: 35, encounterRate: 5 },
    ],
  },
  {
    id: "hoenn-rusturf-tunnel",
    name: "Rusturf Tunnel",
    description: "A partially-dug tunnel connecting Rustboro and Verdanturf.",
    theme: "cave",
    region: "hoenn",
    position: { x: 28, y: 42, width: 7, height: 7 },
    encounterPool: [
      { pokemonId: 293, minLevel: 6, maxLevel: 10, encounterRate: 50 },
      { pokemonId: 41, minLevel: 6, maxLevel: 10, encounterRate: 30 },
      { pokemonId: 74, minLevel: 6, maxLevel: 10, encounterRate: 20 },
    ],
  },
  {
    id: "hoenn-granite-cave",
    name: "Granite Cave",
    description: "A cave near Dewford where rare Pokemon and ancient paintings hide.",
    theme: "cave",
    region: "hoenn",
    position: { x: 12, y: 78, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 41, minLevel: 8, maxLevel: 12, encounterRate: 30 },
      { pokemonId: 296, minLevel: 8, maxLevel: 12, encounterRate: 25 },
      { pokemonId: 304, minLevel: 9, maxLevel: 12, encounterRate: 20 },
      { pokemonId: 303, minLevel: 9, maxLevel: 12, encounterRate: 15 },
      { pokemonId: 302, minLevel: 9, maxLevel: 12, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-fiery-path",
    name: "Fiery Path",
    description: "A scorching tunnel through Mt. Chimney, home to Fire and Poison types.",
    theme: "cave",
    region: "hoenn",
    position: { x: 35, y: 22, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 322, minLevel: 15, maxLevel: 18, encounterRate: 30 },
      { pokemonId: 218, minLevel: 15, maxLevel: 18, encounterRate: 30 },
      { pokemonId: 109, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 324, minLevel: 16, maxLevel: 18, encounterRate: 10 },
      { pokemonId: 88, minLevel: 15, maxLevel: 18, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-mt-pyre",
    name: "Mt. Pyre",
    description: "A sacred mountain cemetery where Ghost-type Pokemon dwell.",
    theme: "cave",
    region: "hoenn",
    position: { x: 68, y: 45, width: 8, height: 9 },
    encounterPool: [
      { pokemonId: 353, minLevel: 27, maxLevel: 30, encounterRate: 30 },
      { pokemonId: 355, minLevel: 27, maxLevel: 30, encounterRate: 25 },
      { pokemonId: 37, minLevel: 27, maxLevel: 29, encounterRate: 20 },
      { pokemonId: 307, minLevel: 27, maxLevel: 29, encounterRate: 15 },
      { pokemonId: 354, minLevel: 30, maxLevel: 32, encounterRate: 10 },
    ],
  },
  {
    id: "hoenn-shoal-cave",
    name: "Shoal Cave",
    description: "A tidal cave near Mossdeep that shifts between ice and water.",
    theme: "cave",
    region: "hoenn",
    position: { x: 78, y: 32, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 41, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 42, minLevel: 30, maxLevel: 34, encounterRate: 15 },
      { pokemonId: 363, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 220, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 361, minLevel: 28, maxLevel: 32, encounterRate: 15 },
    ],
  },
  {
    id: "hoenn-sky-pillar",
    name: "Sky Pillar",
    description: "A crumbling tower rising from the sea where the sky dragon sleeps.",
    theme: "mountain",
    region: "hoenn",
    position: { x: 82, y: 55, width: 8, height: 9 },
    encounterPool: [
      { pokemonId: 42, minLevel: 40, maxLevel: 44, encounterRate: 30 },
      { pokemonId: 344, minLevel: 40, maxLevel: 44, encounterRate: 25 },
      { pokemonId: 333, minLevel: 40, maxLevel: 43, encounterRate: 20 },
      { pokemonId: 302, minLevel: 40, maxLevel: 43, encounterRate: 15 },
      { pokemonId: 384, minLevel: 70, maxLevel: 70, encounterRate: 1 },
    ],
  },
  {
    id: "hoenn-victory-road",
    name: "Victory Road",
    description: "Hoenn's ultimate gauntlet before the Pokemon League at Ever Grande City.",
    theme: "cave",
    region: "hoenn",
    position: { x: 85, y: 18, width: 8, height: 9 },
    encounterPool: [
      { pokemonId: 42, minLevel: 38, maxLevel: 42, encounterRate: 25 },
      { pokemonId: 305, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 297, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 308, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 75, minLevel: 38, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 356, minLevel: 40, maxLevel: 42, encounterRate: 10 },
    ],
  },
];
