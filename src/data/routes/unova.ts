import { RouteArea } from "@/types";

export const UNOVA_ROUTES: RouteArea[] = [
  // === UNOVA ===
  {
    id: "unova-route-1",
    name: "Route 1",
    description: "A peaceful path stretching from Nuvema Town through rolling hills.",
    theme: "grass",
    region: "unova",
    position: { x: 75, y: 80, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 504, minLevel: 2, maxLevel: 4, encounterRate: 40 },  // Patrat
      { pokemonId: 506, minLevel: 2, maxLevel: 4, encounterRate: 40 },  // Lillipup
      { pokemonId: 519, minLevel: 3, maxLevel: 5, encounterRate: 20 },  // Pidove
    ],
  },
  {
    id: "unova-pinwheel-forest",
    name: "Pinwheel Forest",
    description: "A vast woodland teeming with Bug and Grass-type Pokemon.",
    theme: "forest",
    region: "unova",
    position: { x: 42, y: 28, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 540, minLevel: 12, maxLevel: 15, encounterRate: 30 }, // Sewaddle
      { pokemonId: 543, minLevel: 12, maxLevel: 15, encounterRate: 25 }, // Venipede
      { pokemonId: 546, minLevel: 13, maxLevel: 16, encounterRate: 20 }, // Cottonee
      { pokemonId: 548, minLevel: 13, maxLevel: 16, encounterRate: 15 }, // Petilil
      { pokemonId: 544, minLevel: 14, maxLevel: 16, encounterRate: 10 }, // Whirlipede
    ],
  },
  {
    id: "unova-chargestone-cave",
    name: "Chargestone Cave",
    description: "An electrifying cave filled with levitating charged stones and Electric-type Pokemon.",
    theme: "cave",
    region: "unova",
    position: { x: 22, y: 30, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 595, minLevel: 24, maxLevel: 27, encounterRate: 30 }, // Joltik
      { pokemonId: 597, minLevel: 24, maxLevel: 27, encounterRate: 25 }, // Ferroseed
      { pokemonId: 599, minLevel: 25, maxLevel: 28, encounterRate: 20 }, // Klink
      { pokemonId: 602, minLevel: 24, maxLevel: 26, encounterRate: 15 }, // Tynamo
      { pokemonId: 525, minLevel: 26, maxLevel: 28, encounterRate: 10 }, // Boldore
    ],
  },
  {
    id: "unova-dragonspiral-tower",
    name: "Dragonspiral Tower",
    description: "An ancient tower steeped in legend, said to be the oldest structure in Unova.",
    theme: "mountain",
    region: "unova",
    position: { x: 25, y: 15, width: 8, height: 10 },
    encounterPool: [
      { pokemonId: 622, minLevel: 30, maxLevel: 33, encounterRate: 30 }, // Golett
      { pokemonId: 619, minLevel: 30, maxLevel: 33, encounterRate: 30 }, // Mienfoo
      { pokemonId: 621, minLevel: 32, maxLevel: 35, encounterRate: 20 }, // Druddigon
      { pokemonId: 607, minLevel: 30, maxLevel: 32, encounterRate: 15 }, // Litwick
      { pokemonId: 623, minLevel: 35, maxLevel: 38, encounterRate: 5 },  // Golurk
    ],
  },
  {
    id: "unova-giant-chasm",
    name: "Giant Chasm",
    description: "A frigid crater at the edge of Unova, radiating an otherworldly chill.",
    theme: "cave",
    region: "unova",
    position: { x: 68, y: 18, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 35, minLevel: 45, maxLevel: 48, encounterRate: 25 },  // Clefairy
      { pokemonId: 221, minLevel: 46, maxLevel: 49, encounterRate: 25 }, // Piloswine
      { pokemonId: 225, minLevel: 45, maxLevel: 47, encounterRate: 20 }, // Delibird
      { pokemonId: 583, minLevel: 46, maxLevel: 48, encounterRate: 15 }, // Vanillish
      { pokemonId: 375, minLevel: 48, maxLevel: 50, encounterRate: 10 }, // Metang
      { pokemonId: 646, minLevel: 50, maxLevel: 55, encounterRate: 5 },  // Kyurem
    ],
  },

  {
    id: "unova-route-2-3",
    name: "Routes 2 & 3",
    description: "Early routes near Striaton City with common Unova Pokemon.",
    theme: "grass",
    region: "unova",
    position: { x: 68, y: 65, width: 10, height: 15 },
    encounterPool: [
      { pokemonId: 504, minLevel: 4, maxLevel: 7, encounterRate: 30 },
      { pokemonId: 506, minLevel: 4, maxLevel: 7, encounterRate: 30 },
      { pokemonId: 519, minLevel: 5, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 509, minLevel: 5, maxLevel: 7, encounterRate: 15 },
    ],
  },
  {
    id: "unova-route-4-5",
    name: "Routes 4 & 5",
    description: "Desert sands of Route 4 and the bustling bridge approach of Route 5.",
    theme: "desert",
    region: "unova",
    position: { x: 48, y: 68, width: 10, height: 14 },
    encounterPool: [
      { pokemonId: 551, minLevel: 15, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 559, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 557, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 556, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 561, minLevel: 16, maxLevel: 19, encounterRate: 10 },
      { pokemonId: 572, minLevel: 16, maxLevel: 18, encounterRate: 10 },
    ],
  },
  {
    id: "unova-route-6-7",
    name: "Routes 6 & 7",
    description: "Seasonal routes with tall grass near Driftveil and Mistralton.",
    theme: "grass",
    region: "unova",
    position: { x: 30, y: 42, width: 10, height: 14 },
    encounterPool: [
      { pokemonId: 585, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 531, minLevel: 22, maxLevel: 25, encounterRate: 20 },
      { pokemonId: 574, minLevel: 22, maxLevel: 24, encounterRate: 15 },
      { pokemonId: 550, minLevel: 22, maxLevel: 25, encounterRate: 15 },
      { pokemonId: 517, minLevel: 22, maxLevel: 25, encounterRate: 15 },
      { pokemonId: 590, minLevel: 22, maxLevel: 24, encounterRate: 10 },
    ],
  },
  {
    id: "unova-route-8-9",
    name: "Routes 8 & 9",
    description: "Marshy wetlands and shopping district routes in central Unova.",
    theme: "grass",
    region: "unova",
    position: { x: 20, y: 22, width: 10, height: 12 },
    encounterPool: [
      { pokemonId: 536, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 618, minLevel: 28, maxLevel: 31, encounterRate: 20 },
      { pokemonId: 531, minLevel: 28, maxLevel: 31, encounterRate: 20 },
      { pokemonId: 585, minLevel: 28, maxLevel: 31, encounterRate: 20 },
      { pokemonId: 587, minLevel: 28, maxLevel: 31, encounterRate: 15 },
    ],
  },
  {
    id: "unova-route-10-13",
    name: "Routes 10\u201313",
    description: "A stretch of varied terrain from Badge Check Gates to giant bridges.",
    theme: "grass",
    region: "unova",
    position: { x: 48, y: 15, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 587, minLevel: 30, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 531, minLevel: 30, maxLevel: 33, encounterRate: 20 },
      { pokemonId: 523, minLevel: 30, maxLevel: 33, encounterRate: 15 },
      { pokemonId: 521, minLevel: 32, maxLevel: 35, encounterRate: 15 },
      { pokemonId: 553, minLevel: 30, maxLevel: 34, encounterRate: 15 },
      { pokemonId: 558, minLevel: 32, maxLevel: 35, encounterRate: 15 },
    ],
  },
  {
    id: "unova-route-14-16",
    name: "Routes 14\u201316",
    description: "Waterfalls and forests in Unova's western wilderness.",
    theme: "forest",
    region: "unova",
    position: { x: 78, y: 48, width: 12, height: 14 },
    encounterPool: [
      { pokemonId: 587, minLevel: 34, maxLevel: 38, encounterRate: 20 },
      { pokemonId: 575, minLevel: 34, maxLevel: 37, encounterRate: 15 },
      { pokemonId: 586, minLevel: 34, maxLevel: 38, encounterRate: 20 },
      { pokemonId: 611, minLevel: 36, maxLevel: 38, encounterRate: 15 },
      { pokemonId: 521, minLevel: 34, maxLevel: 37, encounterRate: 15 },
      { pokemonId: 628, minLevel: 36, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 630, minLevel: 36, maxLevel: 38, encounterRate: 5 },
    ],
  },
  {
    id: "unova-route-17-18",
    name: "Routes 17 & 18",
    description: "Rough seas and a remote island with powerful wild Pokemon.",
    theme: "water",
    region: "unova",
    position: { x: 15, y: 70, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 592, minLevel: 30, maxLevel: 40, encounterRate: 30 },
      { pokemonId: 593, minLevel: 35, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 594, minLevel: 35, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 588, minLevel: 32, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 616, minLevel: 32, maxLevel: 36, encounterRate: 20 },
    ],
  },
  {
    id: "unova-wellspring-cave",
    name: "Wellspring Cave",
    description: "A cave near Nacrene City with underground rivers.",
    theme: "cave",
    region: "unova",
    position: { x: 48, y: 35, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 527, minLevel: 10, maxLevel: 13, encounterRate: 35 },
      { pokemonId: 524, minLevel: 10, maxLevel: 13, encounterRate: 35 },
      { pokemonId: 525, minLevel: 22, maxLevel: 24, encounterRate: 15 },
      { pokemonId: 529, minLevel: 10, maxLevel: 13, encounterRate: 15 },
    ],
  },
  {
    id: "unova-relic-castle",
    name: "Relic Castle",
    description: "Ancient desert ruins buried in sand, hiding Ghost and Ground types.",
    theme: "desert",
    region: "unova",
    position: { x: 42, y: 62, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 551, minLevel: 19, maxLevel: 22, encounterRate: 25 },
      { pokemonId: 562, minLevel: 19, maxLevel: 22, encounterRate: 25 },
      { pokemonId: 557, minLevel: 19, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 561, minLevel: 19, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 563, minLevel: 30, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 637, minLevel: 35, maxLevel: 38, encounterRate: 5 },
    ],
  },
  {
    id: "unova-mistralton-cave",
    name: "Mistralton Cave",
    description: "A cave of guidance where the legendary Cobalion rests.",
    theme: "cave",
    region: "unova",
    position: { x: 28, y: 38, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 525, minLevel: 28, maxLevel: 32, encounterRate: 30 },
      { pokemonId: 611, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 527, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 529, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 638, minLevel: 42, maxLevel: 42, encounterRate: 1 },
    ],
  },
  {
    id: "unova-twist-mountain",
    name: "Twist Mountain",
    description: "A winding mountain with seasonal changes and Ice-type Pokemon.",
    theme: "cave",
    region: "unova",
    position: { x: 22, y: 24, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 525, minLevel: 28, maxLevel: 32, encounterRate: 25 },
      { pokemonId: 527, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 615, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 538, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 539, minLevel: 28, maxLevel: 32, encounterRate: 10 },
      { pokemonId: 529, minLevel: 30, maxLevel: 33, encounterRate: 10 },
    ],
  },
  {
    id: "unova-celestial-tower",
    name: "Celestial Tower",
    description: "A tower dedicated to departed Pokemon where their spirits linger.",
    theme: "urban",
    region: "unova",
    position: { x: 18, y: 30, width: 7, height: 9 },
    encounterPool: [
      { pokemonId: 607, minLevel: 26, maxLevel: 30, encounterRate: 35 },
      { pokemonId: 592, minLevel: 26, maxLevel: 30, encounterRate: 25 },
      { pokemonId: 562, minLevel: 26, maxLevel: 30, encounterRate: 25 },
      { pokemonId: 608, minLevel: 30, maxLevel: 32, encounterRate: 15 },
    ],
  },
  {
    id: "unova-victory-road",
    name: "Victory Road",
    description: "Unova's final trial \u2014 a treacherous cave before the Pokemon League.",
    theme: "cave",
    region: "unova",
    position: { x: 44, y: 5, width: 10, height: 9 },
    encounterPool: [
      { pokemonId: 525, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 611, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 621, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 539, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 538, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 631, minLevel: 40, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 632, minLevel: 40, maxLevel: 42, encounterRate: 5 },
    ],
  },
];
