import { RouteArea } from "@/types";

export const REGIONS = [
  { id: "kanto", name: "Kanto", color: "#e8433f" },
  { id: "johto", name: "Johto", color: "#3b82f6" },
  { id: "hoenn", name: "Hoenn", color: "#22c55e" },
  { id: "sinnoh", name: "Sinnoh", color: "#a855f7" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const ROUTE_AREAS: RouteArea[] = [
  // === KANTO ===
  {
    id: "kanto-route-1",
    name: "Route 1",
    description: "A quiet path between Pallet Town and Viridian City.",
    theme: "grass",
    region: "kanto",
    position: { x: 55, y: 72, width: 12, height: 14 },
    encounterPool: [
      { pokemonId: 16, minLevel: 2, maxLevel: 5, encounterRate: 50 },  // Pidgey
      { pokemonId: 19, minLevel: 2, maxLevel: 4, encounterRate: 50 },  // Rattata
    ],
  },
  {
    id: "kanto-route-2",
    name: "Route 2",
    description: "A short route leading to Viridian Forest.",
    theme: "grass",
    region: "kanto",
    position: { x: 45, y: 60, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 16, minLevel: 3, maxLevel: 5, encounterRate: 40 },  // Pidgey
      { pokemonId: 19, minLevel: 3, maxLevel: 5, encounterRate: 30 },  // Rattata
      { pokemonId: 10, minLevel: 3, maxLevel: 5, encounterRate: 15 },  // Caterpie
      { pokemonId: 13, minLevel: 3, maxLevel: 5, encounterRate: 15 },  // Weedle
    ],
  },
  {
    id: "kanto-viridian-forest",
    name: "Viridian Forest",
    description: "A dense forest full of Bug-type Pokemon.",
    theme: "forest",
    region: "kanto",
    position: { x: 30, y: 50, width: 14, height: 16 },
    encounterPool: [
      { pokemonId: 10, minLevel: 3, maxLevel: 5, encounterRate: 35 },  // Caterpie
      { pokemonId: 13, minLevel: 3, maxLevel: 5, encounterRate: 35 },  // Weedle
      { pokemonId: 11, minLevel: 4, maxLevel: 6, encounterRate: 10 },  // Metapod
      { pokemonId: 14, minLevel: 4, maxLevel: 6, encounterRate: 10 },  // Kakuna
      { pokemonId: 25, minLevel: 3, maxLevel: 5, encounterRate: 5 },   // Pikachu
      { pokemonId: 127, minLevel: 8, maxLevel: 10, encounterRate: 5 }, // Pinsir
    ],
  },
  {
    id: "kanto-mt-moon",
    name: "Mt. Moon",
    description: "A mysterious cave where Clefairy dance under moonlight.",
    theme: "cave",
    region: "kanto",
    position: { x: 60, y: 38, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 41, minLevel: 7, maxLevel: 11, encounterRate: 40 }, // Zubat
      { pokemonId: 46, minLevel: 8, maxLevel: 10, encounterRate: 20 }, // Paras
      { pokemonId: 74, minLevel: 8, maxLevel: 10, encounterRate: 25 }, // Geodude
      { pokemonId: 35, minLevel: 8, maxLevel: 12, encounterRate: 10 }, // Clefairy
      { pokemonId: 27, minLevel: 9, maxLevel: 11, encounterRate: 5 },  // Sandshrew
    ],
  },
  {
    id: "kanto-cerulean-cave",
    name: "Cerulean Cave",
    description: "A dangerous cave rumored to house extremely powerful Pokemon.",
    theme: "cave",
    region: "kanto",
    position: { x: 75, y: 25, width: 13, height: 13 },
    encounterPool: [
      { pokemonId: 42, minLevel: 46, maxLevel: 50, encounterRate: 25 },  // Golbat
      { pokemonId: 64, minLevel: 46, maxLevel: 48, encounterRate: 15 },  // Kadabra
      { pokemonId: 82, minLevel: 46, maxLevel: 48, encounterRate: 10 },  // Magneton
      { pokemonId: 132, minLevel: 46, maxLevel: 50, encounterRate: 15 }, // Ditto
      { pokemonId: 101, minLevel: 46, maxLevel: 48, encounterRate: 10 }, // Electrode
      { pokemonId: 150, minLevel: 70, maxLevel: 70, encounterRate: 1 },  // Mewtwo (legendary rare)
    ],
  },
  {
    id: "kanto-safari-zone",
    name: "Safari Zone",
    description: "A nature preserve with rare and exotic Pokemon.",
    theme: "grass",
    region: "kanto",
    position: { x: 15, y: 30, width: 16, height: 16 },
    encounterPool: [
      { pokemonId: 111, minLevel: 25, maxLevel: 28, encounterRate: 20 }, // Rhyhorn
      { pokemonId: 115, minLevel: 25, maxLevel: 28, encounterRate: 10 }, // Kangaskhan
      { pokemonId: 128, minLevel: 25, maxLevel: 28, encounterRate: 10 }, // Tauros
      { pokemonId: 123, minLevel: 25, maxLevel: 28, encounterRate: 15 }, // Scyther
      { pokemonId: 113, minLevel: 25, maxLevel: 28, encounterRate: 5 },  // Chansey
      { pokemonId: 102, minLevel: 24, maxLevel: 26, encounterRate: 20 }, // Exeggcute
      { pokemonId: 84, minLevel: 24, maxLevel: 26, encounterRate: 20 },  // Doduo
    ],
  },

  // === JOHTO ===
  {
    id: "johto-route-29",
    name: "Route 29",
    description: "The first route in Johto, west of New Bark Town.",
    theme: "grass",
    region: "johto",
    position: { x: 70, y: 65, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 161, minLevel: 2, maxLevel: 4, encounterRate: 40 }, // Sentret
      { pokemonId: 163, minLevel: 2, maxLevel: 4, encounterRate: 25 }, // Hoothoot
      { pokemonId: 16, minLevel: 2, maxLevel: 4, encounterRate: 35 },  // Pidgey
    ],
  },
  {
    id: "johto-ilex-forest",
    name: "Ilex Forest",
    description: "A sacred forest protected by its guardian Pokemon.",
    theme: "forest",
    region: "johto",
    position: { x: 35, y: 55, width: 14, height: 16 },
    encounterPool: [
      { pokemonId: 46, minLevel: 5, maxLevel: 7, encounterRate: 25 },   // Paras
      { pokemonId: 43, minLevel: 5, maxLevel: 7, encounterRate: 25 },   // Oddish
      { pokemonId: 102, minLevel: 5, maxLevel: 7, encounterRate: 15 },  // Exeggcute
      { pokemonId: 187, minLevel: 6, maxLevel: 8, encounterRate: 20 },  // Hoppip
      { pokemonId: 251, minLevel: 30, maxLevel: 30, encounterRate: 1 }, // Celebi (legendary rare)
    ],
  },
  {
    id: "johto-lake-of-rage",
    name: "Lake of Rage",
    description: "A lake famous for its Red Gyarados sightings.",
    theme: "water",
    region: "johto",
    position: { x: 50, y: 20, width: 15, height: 15 },
    encounterPool: [
      { pokemonId: 129, minLevel: 10, maxLevel: 20, encounterRate: 60 }, // Magikarp
      { pokemonId: 130, minLevel: 30, maxLevel: 30, encounterRate: 5 },  // Gyarados
      { pokemonId: 118, minLevel: 15, maxLevel: 25, encounterRate: 20 }, // Goldeen
      { pokemonId: 60, minLevel: 15, maxLevel: 20, encounterRate: 15 },  // Poliwag
    ],
  },
  {
    id: "johto-tin-tower",
    name: "Tin Tower",
    description: "An ancient tower said to be where Ho-Oh roosts.",
    theme: "mountain",
    region: "johto",
    position: { x: 20, y: 35, width: 12, height: 16 },
    encounterPool: [
      { pokemonId: 92, minLevel: 20, maxLevel: 25, encounterRate: 30 },  // Gastly
      { pokemonId: 93, minLevel: 22, maxLevel: 27, encounterRate: 20 },  // Haunter
      { pokemonId: 198, minLevel: 20, maxLevel: 24, encounterRate: 20 }, // Murkrow
      { pokemonId: 353, minLevel: 22, maxLevel: 26, encounterRate: 15 }, // Shuppet
      { pokemonId: 250, minLevel: 45, maxLevel: 45, encounterRate: 1 },  // Ho-Oh (legendary rare)
    ],
  },

  // === HOENN ===
  {
    id: "hoenn-route-101",
    name: "Route 101",
    description: "A short grassy route in southern Hoenn.",
    theme: "grass",
    region: "hoenn",
    position: { x: 45, y: 75, width: 12, height: 10 },
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
    position: { x: 25, y: 55, width: 15, height: 16 },
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
    position: { x: 55, y: 30, width: 14, height: 14 },
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
    position: { x: 70, y: 40, width: 12, height: 18 },
    encounterPool: [
      { pokemonId: 43, minLevel: 25, maxLevel: 28, encounterRate: 25 },  // Oddish
      { pokemonId: 264, minLevel: 25, maxLevel: 27, encounterRate: 20 }, // Linoone
      { pokemonId: 352, minLevel: 25, maxLevel: 27, encounterRate: 10 }, // Kecleon
      { pokemonId: 349, minLevel: 20, maxLevel: 25, encounterRate: 5 },  // Feebas (ultra rare)
      { pokemonId: 283, minLevel: 25, maxLevel: 27, encounterRate: 20 }, // Surskit
      { pokemonId: 357, minLevel: 25, maxLevel: 28, encounterRate: 10 }, // Tropius
    ],
  },

  // === SINNOH ===
  {
    id: "sinnoh-route-201",
    name: "Route 201",
    description: "The first route in Sinnoh, connecting Twinleaf and Sandgem Towns.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 50, y: 75, width: 12, height: 10 },
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
    position: { x: 30, y: 50, width: 15, height: 16 },
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
    position: { x: 55, y: 30, width: 16, height: 18 },
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
    position: { x: 20, y: 65, width: 14, height: 14 },
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
    position: { x: 75, y: 35, width: 13, height: 13 },
    encounterPool: [
      { pokemonId: 75, minLevel: 29, maxLevel: 33, encounterRate: 20 },  // Graveler
      { pokemonId: 95, minLevel: 30, maxLevel: 33, encounterRate: 20 },  // Onix
      { pokemonId: 305, minLevel: 29, maxLevel: 32, encounterRate: 15 }, // Lairon
      { pokemonId: 436, minLevel: 29, maxLevel: 32, encounterRate: 15 }, // Bronzor
      { pokemonId: 42, minLevel: 29, maxLevel: 33, encounterRate: 15 },  // Golbat
      { pokemonId: 448, minLevel: 32, maxLevel: 35, encounterRate: 5 },  // Lucario (rare)
    ],
  },
];

export function getAreasForRegion(regionId: string): RouteArea[] {
  return ROUTE_AREAS.filter((area) => area.region === regionId);
}

export function getAreaById(areaId: string): RouteArea | undefined {
  return ROUTE_AREAS.find((area) => area.id === areaId);
}
