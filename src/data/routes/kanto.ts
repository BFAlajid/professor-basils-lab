import { RouteArea } from "@/types";

export const KANTO_ROUTES: RouteArea[] = [
  // === KANTO ===
  {
    id: "kanto-route-1",
    name: "Route 1",
    description: "A quiet path between Pallet Town and Viridian City.",
    theme: "grass",
    region: "kanto",
    position: { x: 38, y: 72, width: 8, height: 10 },
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
    position: { x: 28, y: 50, width: 7, height: 10 },
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
    position: { x: 26, y: 38, width: 9, height: 10 },
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
    position: { x: 45, y: 22, width: 9, height: 9 },
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
    position: { x: 62, y: 12, width: 8, height: 8 },
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
    position: { x: 38, y: 68, width: 9, height: 9 },
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

  {
    id: "kanto-route-3",
    name: "Route 3",
    description: "A winding path leading to Mt. Moon, alive with early trainers.",
    theme: "grass",
    region: "kanto",
    position: { x: 34, y: 25, width: 10, height: 7 },
    encounterPool: [
      { pokemonId: 21, minLevel: 6, maxLevel: 8, encounterRate: 55 },
      { pokemonId: 32, minLevel: 7, maxLevel: 9, encounterRate: 20 },
      { pokemonId: 29, minLevel: 7, maxLevel: 9, encounterRate: 15 },
      { pokemonId: 39, minLevel: 8, maxLevel: 10, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-route-4",
    name: "Route 4",
    description: "East of Mt. Moon, leading toward Cerulean City.",
    theme: "grass",
    region: "kanto",
    position: { x: 55, y: 22, width: 10, height: 7 },
    encounterPool: [
      { pokemonId: 21, minLevel: 13, maxLevel: 15, encounterRate: 40 },
      { pokemonId: 19, minLevel: 13, maxLevel: 15, encounterRate: 35 },
      { pokemonId: 32, minLevel: 13, maxLevel: 15, encounterRate: 15 },
      { pokemonId: 29, minLevel: 13, maxLevel: 15, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-route-5-6",
    name: "Routes 5 & 6",
    description: "Connects Cerulean to Saffron and Vermilion, with tall grass along the banks.",
    theme: "grass",
    region: "kanto",
    position: { x: 65, y: 38, width: 7, height: 14 },
    encounterPool: [
      { pokemonId: 16, minLevel: 14, maxLevel: 16, encounterRate: 30 },
      { pokemonId: 52, minLevel: 14, maxLevel: 17, encounterRate: 25 },
      { pokemonId: 43, minLevel: 13, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 63, minLevel: 14, maxLevel: 17, encounterRate: 15 },
      { pokemonId: 17, minLevel: 17, maxLevel: 19, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-route-7-8",
    name: "Routes 7 & 8",
    description: "Runs between Saffron, Celadon and Lavender, rich with Fire and Grass types.",
    theme: "grass",
    region: "kanto",
    position: { x: 45, y: 40, width: 14, height: 7 },
    encounterPool: [
      { pokemonId: 16, minLevel: 18, maxLevel: 22, encounterRate: 25 },
      { pokemonId: 37, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 58, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 43, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 69, minLevel: 18, maxLevel: 22, encounterRate: 15 },
    ],
  },
  {
    id: "kanto-route-9-10",
    name: "Routes 9 & 10",
    description: "Rocky routes east of Cerulean, flanking the entrance to Rock Tunnel.",
    theme: "grass",
    region: "kanto",
    position: { x: 72, y: 25, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 19, minLevel: 18, maxLevel: 22, encounterRate: 30 },
      { pokemonId: 21, minLevel: 18, maxLevel: 22, encounterRate: 30 },
      { pokemonId: 32, minLevel: 18, maxLevel: 20, encounterRate: 20 },
      { pokemonId: 29, minLevel: 18, maxLevel: 20, encounterRate: 20 },
    ],
  },
  {
    id: "kanto-route-11-13",
    name: "Routes 11\u201313",
    description: "Coastal routes stretching east from Vermilion, home to rare Bug types.",
    theme: "grass",
    region: "kanto",
    position: { x: 72, y: 50, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 21, minLevel: 20, maxLevel: 24, encounterRate: 30 },
      { pokemonId: 23, minLevel: 20, maxLevel: 23, encounterRate: 20 },
      { pokemonId: 48, minLevel: 20, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 123, minLevel: 25, maxLevel: 28, encounterRate: 5 },
      { pokemonId: 127, minLevel: 25, maxLevel: 28, encounterRate: 5 },
      { pokemonId: 43, minLevel: 20, maxLevel: 22, encounterRate: 20 },
    ],
  },
  {
    id: "kanto-route-14-15",
    name: "Routes 14 & 15",
    description: "Southern routes connecting Lavender to Fuchsia through tall grass.",
    theme: "grass",
    region: "kanto",
    position: { x: 60, y: 55, width: 7, height: 12 },
    encounterPool: [
      { pokemonId: 43, minLevel: 22, maxLevel: 26, encounterRate: 30 },
      { pokemonId: 69, minLevel: 22, maxLevel: 26, encounterRate: 30 },
      { pokemonId: 48, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 49, minLevel: 26, maxLevel: 28, encounterRate: 15 },
    ],
  },
  {
    id: "kanto-route-16-18",
    name: "Routes 16\u201318",
    description: "The Cycling Road and surrounding routes west of Celadon.",
    theme: "grass",
    region: "kanto",
    position: { x: 30, y: 45, width: 8, height: 14 },
    encounterPool: [
      { pokemonId: 21, minLevel: 20, maxLevel: 25, encounterRate: 35 },
      { pokemonId: 84, minLevel: 22, maxLevel: 26, encounterRate: 35 },
      { pokemonId: 22, minLevel: 25, maxLevel: 28, encounterRate: 30 },
    ],
  },
  {
    id: "kanto-route-19-21",
    name: "Routes 19\u201321",
    description: "Water routes south of Fuchsia, connecting to Seafoam Islands and Cinnabar.",
    theme: "water",
    region: "kanto",
    position: { x: 20, y: 80, width: 18, height: 8 },
    encounterPool: [
      { pokemonId: 72, minLevel: 25, maxLevel: 35, encounterRate: 60 },
      { pokemonId: 116, minLevel: 20, maxLevel: 30, encounterRate: 20 },
      { pokemonId: 118, minLevel: 20, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 129, minLevel: 5, maxLevel: 15, encounterRate: 5 },
    ],
  },
  {
    id: "kanto-route-22-23",
    name: "Routes 22 & 23",
    description: "The route west of Viridian leading to Victory Road.",
    theme: "grass",
    region: "kanto",
    position: { x: 14, y: 42, width: 10, height: 8 },
    encounterPool: [
      { pokemonId: 21, minLevel: 3, maxLevel: 5, encounterRate: 40 },
      { pokemonId: 32, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 29, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 56, minLevel: 3, maxLevel: 5, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-route-24-25",
    name: "Routes 24 & 25",
    description: "Nugget Bridge and Bill's cottage, north of Cerulean City.",
    theme: "grass",
    region: "kanto",
    position: { x: 65, y: 15, width: 8, height: 10 },
    encounterPool: [
      { pokemonId: 63, minLevel: 13, maxLevel: 15, encounterRate: 30 },
      { pokemonId: 17, minLevel: 13, maxLevel: 15, encounterRate: 20 },
      { pokemonId: 43, minLevel: 12, maxLevel: 14, encounterRate: 25 },
      { pokemonId: 10, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 13, minLevel: 12, maxLevel: 14, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-rock-tunnel",
    name: "Rock Tunnel",
    description: "A pitch-dark cave connecting Cerulean to Lavender.",
    theme: "cave",
    region: "kanto",
    position: { x: 74, y: 32, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 41, minLevel: 17, maxLevel: 22, encounterRate: 40 },
      { pokemonId: 74, minLevel: 17, maxLevel: 22, encounterRate: 30 },
      { pokemonId: 66, minLevel: 17, maxLevel: 20, encounterRate: 20 },
      { pokemonId: 95, minLevel: 18, maxLevel: 22, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-digletts-cave",
    name: "Diglett's Cave",
    description: "A tunnel riddled with Diglett and their evolved forms.",
    theme: "cave",
    region: "kanto",
    position: { x: 32, y: 58, width: 7, height: 7 },
    encounterPool: [
      { pokemonId: 50, minLevel: 15, maxLevel: 22, encounterRate: 75 },
      { pokemonId: 51, minLevel: 26, maxLevel: 29, encounterRate: 25 },
    ],
  },
  {
    id: "kanto-pokemon-tower",
    name: "Pokemon Tower",
    description: "A haunted tower in Lavender Town where Pokemon are laid to rest.",
    theme: "cave",
    region: "kanto",
    position: { x: 68, y: 38, width: 7, height: 8 },
    encounterPool: [
      { pokemonId: 92, minLevel: 20, maxLevel: 28, encounterRate: 55 },
      { pokemonId: 93, minLevel: 26, maxLevel: 30, encounterRate: 25 },
      { pokemonId: 104, minLevel: 25, maxLevel: 28, encounterRate: 20 },
    ],
  },
  {
    id: "kanto-power-plant",
    name: "Power Plant",
    description: "An abandoned facility crackling with Electric-type Pokemon.",
    theme: "urban",
    region: "kanto",
    position: { x: 84, y: 30, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 81, minLevel: 22, maxLevel: 28, encounterRate: 35 },
      { pokemonId: 100, minLevel: 22, maxLevel: 26, encounterRate: 35 },
      { pokemonId: 125, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 82, minLevel: 25, maxLevel: 30, encounterRate: 10 },
      { pokemonId: 145, minLevel: 50, maxLevel: 50, encounterRate: 1 },
    ],
  },
  {
    id: "kanto-seafoam-islands",
    name: "Seafoam Islands",
    description: "Icy caverns off the southern coast, home to the Freeze Pokemon.",
    theme: "cave",
    region: "kanto",
    position: { x: 28, y: 78, width: 9, height: 8 },
    encounterPool: [
      { pokemonId: 86, minLevel: 32, maxLevel: 38, encounterRate: 30 },
      { pokemonId: 79, minLevel: 30, maxLevel: 35, encounterRate: 25 },
      { pokemonId: 90, minLevel: 30, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 118, minLevel: 30, maxLevel: 35, encounterRate: 15 },
      { pokemonId: 120, minLevel: 32, maxLevel: 36, encounterRate: 9 },
      { pokemonId: 144, minLevel: 50, maxLevel: 50, encounterRate: 1 },
    ],
  },
  {
    id: "kanto-victory-road",
    name: "Victory Road",
    description: "The final gauntlet before the Pokemon League, full of powerful Pokemon.",
    theme: "cave",
    region: "kanto",
    position: { x: 10, y: 12, width: 9, height: 9 },
    encounterPool: [
      { pokemonId: 67, minLevel: 42, maxLevel: 46, encounterRate: 25 },
      { pokemonId: 95, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 75, minLevel: 40, maxLevel: 44, encounterRate: 20 },
      { pokemonId: 42, minLevel: 40, maxLevel: 44, encounterRate: 15 },
      { pokemonId: 105, minLevel: 40, maxLevel: 44, encounterRate: 10 },
      { pokemonId: 49, minLevel: 42, maxLevel: 46, encounterRate: 10 },
    ],
  },
  {
    id: "kanto-pokemon-mansion",
    name: "Pokemon Mansion",
    description: "A crumbling mansion on Cinnabar Island hiding dark secrets.",
    theme: "urban",
    region: "kanto",
    position: { x: 12, y: 78, width: 8, height: 8 },
    encounterPool: [
      { pokemonId: 109, minLevel: 36, maxLevel: 40, encounterRate: 30 },
      { pokemonId: 88, minLevel: 36, maxLevel: 40, encounterRate: 30 },
      { pokemonId: 19, minLevel: 35, maxLevel: 38, encounterRate: 20 },
      { pokemonId: 132, minLevel: 38, maxLevel: 40, encounterRate: 10 },
      { pokemonId: 59, minLevel: 40, maxLevel: 43, encounterRate: 10 },
    ],
  },
];
