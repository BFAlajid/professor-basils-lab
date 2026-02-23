import { RouteArea } from "@/types";

export const REGIONS = [
  { id: "kanto", name: "Kanto", color: "#e8433f" },
  { id: "johto", name: "Johto", color: "#3b82f6" },
  { id: "hoenn", name: "Hoenn", color: "#22c55e" },
  { id: "sinnoh", name: "Sinnoh", color: "#a855f7" },
  { id: "unova", name: "Unova", color: "#6366f1" },
  { id: "kalos", name: "Kalos", color: "#ec4899" },
  { id: "alola", name: "Alola", color: "#f59e0b" },
  { id: "galar", name: "Galar", color: "#14b8a6" },
  { id: "paldea", name: "Paldea", color: "#f97316" },
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

  {
    id: "kanto-route-3",
    name: "Route 3",
    description: "A winding path leading to Mt. Moon, alive with early trainers.",
    theme: "grass",
    region: "kanto",
    position: { x: 68, y: 58, width: 12, height: 10 },
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
    position: { x: 78, y: 48, width: 12, height: 10 },
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
    position: { x: 60, y: 52, width: 12, height: 10 },
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
    position: { x: 38, y: 45, width: 12, height: 10 },
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
    position: { x: 80, y: 38, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 19, minLevel: 18, maxLevel: 22, encounterRate: 30 },
      { pokemonId: 21, minLevel: 18, maxLevel: 22, encounterRate: 30 },
      { pokemonId: 32, minLevel: 18, maxLevel: 20, encounterRate: 20 },
      { pokemonId: 29, minLevel: 18, maxLevel: 20, encounterRate: 20 },
    ],
  },
  {
    id: "kanto-route-11-13",
    name: "Routes 11–13",
    description: "Coastal routes stretching east from Vermilion, home to rare Bug types.",
    theme: "grass",
    region: "kanto",
    position: { x: 80, y: 58, width: 12, height: 10 },
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
    position: { x: 68, y: 48, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 43, minLevel: 22, maxLevel: 26, encounterRate: 30 },
      { pokemonId: 69, minLevel: 22, maxLevel: 26, encounterRate: 30 },
      { pokemonId: 48, minLevel: 22, maxLevel: 25, encounterRate: 25 },
      { pokemonId: 49, minLevel: 26, maxLevel: 28, encounterRate: 15 },
    ],
  },
  {
    id: "kanto-route-16-18",
    name: "Routes 16–18",
    description: "The Cycling Road and surrounding routes west of Celadon.",
    theme: "grass",
    region: "kanto",
    position: { x: 28, y: 55, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 21, minLevel: 20, maxLevel: 25, encounterRate: 35 },
      { pokemonId: 84, minLevel: 22, maxLevel: 26, encounterRate: 35 },
      { pokemonId: 22, minLevel: 25, maxLevel: 28, encounterRate: 30 },
    ],
  },
  {
    id: "kanto-route-19-21",
    name: "Routes 19–21",
    description: "Water routes south of Fuchsia, connecting to Seafoam Islands and Cinnabar.",
    theme: "water",
    region: "kanto",
    position: { x: 18, y: 68, width: 14, height: 10 },
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
    position: { x: 42, y: 22, width: 12, height: 10 },
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
    position: { x: 82, y: 32, width: 12, height: 10 },
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
    position: { x: 80, y: 28, width: 12, height: 12 },
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
    position: { x: 52, y: 58, width: 12, height: 10 },
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
    position: { x: 78, y: 62, width: 12, height: 12 },
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
    position: { x: 85, y: 45, width: 12, height: 12 },
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
    position: { x: 22, y: 58, width: 14, height: 14 },
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
    position: { x: 30, y: 15, width: 16, height: 16 },
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
    position: { x: 10, y: 50, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 109, minLevel: 36, maxLevel: 40, encounterRate: 30 },
      { pokemonId: 88, minLevel: 36, maxLevel: 40, encounterRate: 30 },
      { pokemonId: 19, minLevel: 35, maxLevel: 38, encounterRate: 20 },
      { pokemonId: 132, minLevel: 38, maxLevel: 40, encounterRate: 10 },
      { pokemonId: 59, minLevel: 40, maxLevel: 43, encounterRate: 10 },
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

  {
    id: "johto-route-30",
    name: "Route 30",
    description: "A quiet path north of Cherrygrove City leading to Mr. Pokemon's house.",
    theme: "grass",
    region: "johto",
    position: { x: 60, y: 60, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 16, minLevel: 3, maxLevel: 5, encounterRate: 35 },
      { pokemonId: 10, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 161, minLevel: 3, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 187, minLevel: 4, maxLevel: 6, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-31",
    name: "Route 31",
    description: "A short road connecting Cherrygrove City and Violet City.",
    theme: "grass",
    region: "johto",
    position: { x: 55, y: 55, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 69, minLevel: 4, maxLevel: 6, encounterRate: 30 },
      { pokemonId: 10, minLevel: 4, maxLevel: 6, encounterRate: 25 },
      { pokemonId: 60, minLevel: 4, maxLevel: 6, encounterRate: 20 },
      { pokemonId: 74, minLevel: 4, maxLevel: 6, encounterRate: 15 },
      { pokemonId: 11, minLevel: 5, maxLevel: 7, encounterRate: 10 },
    ],
  },
  {
    id: "johto-route-32",
    name: "Route 32",
    description: "A long route south from Violet City leading to Union Cave.",
    theme: "grass",
    region: "johto",
    position: { x: 48, y: 50, width: 12, height: 14 },
    encounterPool: [
      { pokemonId: 69, minLevel: 6, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 23, minLevel: 5, maxLevel: 7, encounterRate: 20 },
      { pokemonId: 194, minLevel: 5, maxLevel: 7, encounterRate: 20 },
      { pokemonId: 179, minLevel: 6, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 187, minLevel: 6, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-33",
    name: "Route 33",
    description: "A rainy route between Union Cave and Azalea Town.",
    theme: "grass",
    region: "johto",
    position: { x: 42, y: 48, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 187, minLevel: 6, maxLevel: 8, encounterRate: 35 },
      { pokemonId: 19, minLevel: 6, maxLevel: 8, encounterRate: 30 },
      { pokemonId: 41, minLevel: 6, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 23, minLevel: 6, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-34",
    name: "Route 34",
    description: "South of Goldenrod City, where the Daycare is located.",
    theme: "grass",
    region: "johto",
    position: { x: 38, y: 42, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 96, minLevel: 10, maxLevel: 14, encounterRate: 30 },
      { pokemonId: 63, minLevel: 10, maxLevel: 13, encounterRate: 20 },
      { pokemonId: 132, minLevel: 10, maxLevel: 12, encounterRate: 10 },
      { pokemonId: 39, minLevel: 10, maxLevel: 13, encounterRate: 20 },
      { pokemonId: 209, minLevel: 10, maxLevel: 13, encounterRate: 20 },
    ],
  },
  {
    id: "johto-route-35-36",
    name: "Routes 35 & 36",
    description: "Northern routes from Goldenrod, passing the National Park to Ecruteak.",
    theme: "grass",
    region: "johto",
    position: { x: 32, y: 38, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 29, minLevel: 12, maxLevel: 16, encounterRate: 25 },
      { pokemonId: 32, minLevel: 12, maxLevel: 16, encounterRate: 25 },
      { pokemonId: 96, minLevel: 13, maxLevel: 16, encounterRate: 20 },
      { pokemonId: 58, minLevel: 12, maxLevel: 15, encounterRate: 15 },
      { pokemonId: 193, minLevel: 12, maxLevel: 14, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-38-39",
    name: "Routes 38 & 39",
    description: "Farmland routes west of Ecruteak leading to Olivine City.",
    theme: "grass",
    region: "johto",
    position: { x: 28, y: 32, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 19, minLevel: 16, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 20, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 128, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 241, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 81, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 52, minLevel: 16, maxLevel: 18, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-40-41",
    name: "Routes 40 & 41",
    description: "Ocean routes between Olivine and Cianwood City.",
    theme: "water",
    region: "johto",
    position: { x: 22, y: 45, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 72, minLevel: 20, maxLevel: 24, encounterRate: 40 },
      { pokemonId: 73, minLevel: 22, maxLevel: 25, encounterRate: 15 },
      { pokemonId: 226, minLevel: 20, maxLevel: 24, encounterRate: 20 },
      { pokemonId: 170, minLevel: 20, maxLevel: 24, encounterRate: 25 },
    ],
  },
  {
    id: "johto-route-42-43",
    name: "Routes 42 & 43",
    description: "Mountain routes east of Ecruteak, leading to the Lake of Rage.",
    theme: "grass",
    region: "johto",
    position: { x: 55, y: 28, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 56, minLevel: 20, maxLevel: 24, encounterRate: 25 },
      { pokemonId: 179, minLevel: 20, maxLevel: 23, encounterRate: 20 },
      { pokemonId: 180, minLevel: 22, maxLevel: 24, encounterRate: 15 },
      { pokemonId: 21, minLevel: 20, maxLevel: 23, encounterRate: 25 },
      { pokemonId: 41, minLevel: 20, maxLevel: 23, encounterRate: 15 },
    ],
  },
  {
    id: "johto-route-44",
    name: "Route 44",
    description: "A route east of Mahogany Town on the way to the Ice Path.",
    theme: "grass",
    region: "johto",
    position: { x: 62, y: 25, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 60, minLevel: 22, maxLevel: 26, encounterRate: 25 },
      { pokemonId: 61, minLevel: 24, maxLevel: 26, encounterRate: 15 },
      { pokemonId: 114, minLevel: 22, maxLevel: 25, encounterRate: 20 },
      { pokemonId: 108, minLevel: 22, maxLevel: 25, encounterRate: 15 },
      { pokemonId: 69, minLevel: 22, maxLevel: 25, encounterRate: 25 },
    ],
  },
  {
    id: "johto-route-45-46",
    name: "Routes 45 & 46",
    description: "Steep mountain routes south of Blackthorn with rare Pokemon.",
    theme: "mountain",
    region: "johto",
    position: { x: 72, y: 22, width: 12, height: 14 },
    encounterPool: [
      { pokemonId: 74, minLevel: 24, maxLevel: 28, encounterRate: 25 },
      { pokemonId: 75, minLevel: 26, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 207, minLevel: 24, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 231, minLevel: 24, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 232, minLevel: 28, maxLevel: 30, encounterRate: 10 },
      { pokemonId: 227, minLevel: 26, maxLevel: 30, encounterRate: 15 },
    ],
  },
  {
    id: "johto-sprout-tower",
    name: "Sprout Tower",
    description: "A swaying tower in Violet City built around a massive Bellsprout pillar.",
    theme: "urban",
    region: "johto",
    position: { x: 65, y: 52, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 19, minLevel: 3, maxLevel: 5, encounterRate: 40 },
      { pokemonId: 92, minLevel: 3, maxLevel: 6, encounterRate: 35 },
      { pokemonId: 69, minLevel: 3, maxLevel: 5, encounterRate: 25 },
    ],
  },
  {
    id: "johto-union-cave",
    name: "Union Cave",
    description: "A cave connecting Route 32 and Azalea Town, home to rock dwellers.",
    theme: "cave",
    region: "johto",
    position: { x: 45, y: 45, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 41, minLevel: 6, maxLevel: 8, encounterRate: 30 },
      { pokemonId: 74, minLevel: 6, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 95, minLevel: 6, maxLevel: 8, encounterRate: 15 },
      { pokemonId: 27, minLevel: 6, maxLevel: 8, encounterRate: 15 },
      { pokemonId: 194, minLevel: 6, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "johto-slowpoke-well",
    name: "Slowpoke Well",
    description: "A cave beneath Azalea Town where Slowpoke gather to drink.",
    theme: "cave",
    region: "johto",
    position: { x: 38, y: 50, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 79, minLevel: 6, maxLevel: 10, encounterRate: 55 },
      { pokemonId: 41, minLevel: 5, maxLevel: 8, encounterRate: 30 },
      { pokemonId: 118, minLevel: 6, maxLevel: 10, encounterRate: 15 },
    ],
  },
  {
    id: "johto-national-park",
    name: "National Park",
    description: "A sprawling park north of Goldenrod famous for its Bug-Catching Contest.",
    theme: "grass",
    region: "johto",
    position: { x: 40, y: 35, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 10, minLevel: 10, maxLevel: 13, encounterRate: 20 },
      { pokemonId: 11, minLevel: 10, maxLevel: 13, encounterRate: 15 },
      { pokemonId: 123, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 127, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 15, minLevel: 12, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 12, minLevel: 12, maxLevel: 14, encounterRate: 20 },
    ],
  },
  {
    id: "johto-burned-tower",
    name: "Burned Tower",
    description: "The charred ruins of a tower in Ecruteak where legendary beasts awakened.",
    theme: "cave",
    region: "johto",
    position: { x: 30, y: 28, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 19, minLevel: 14, maxLevel: 16, encounterRate: 25 },
      { pokemonId: 109, minLevel: 14, maxLevel: 16, encounterRate: 25 },
      { pokemonId: 41, minLevel: 14, maxLevel: 16, encounterRate: 25 },
      { pokemonId: 126, minLevel: 16, maxLevel: 18, encounterRate: 15 },
      { pokemonId: 243, minLevel: 40, maxLevel: 40, encounterRate: 5 },
      { pokemonId: 244, minLevel: 40, maxLevel: 40, encounterRate: 5 },
    ],
  },
  {
    id: "johto-dark-cave",
    name: "Dark Cave",
    description: "A pitch-black cave between Routes 31 and 46 hiding rare Pokemon.",
    theme: "cave",
    region: "johto",
    position: { x: 68, y: 48, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 41, minLevel: 4, maxLevel: 8, encounterRate: 30 },
      { pokemonId: 74, minLevel: 4, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 75, minLevel: 22, maxLevel: 26, encounterRate: 15 },
      { pokemonId: 202, minLevel: 10, maxLevel: 15, encounterRate: 15 },
      { pokemonId: 206, minLevel: 4, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "johto-whirl-islands",
    name: "Whirl Islands",
    description: "A chain of island caves in the sea, where the guardian of the seas resides.",
    theme: "water",
    region: "johto",
    position: { x: 18, y: 40, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 116, minLevel: 20, maxLevel: 25, encounterRate: 30 },
      { pokemonId: 98, minLevel: 20, maxLevel: 24, encounterRate: 25 },
      { pokemonId: 86, minLevel: 22, maxLevel: 26, encounterRate: 20 },
      { pokemonId: 72, minLevel: 20, maxLevel: 24, encounterRate: 20 },
      { pokemonId: 249, minLevel: 45, maxLevel: 45, encounterRate: 1 },
    ],
  },
  {
    id: "johto-mt-mortar",
    name: "Mt. Mortar",
    description: "A sprawling cave between Ecruteak and Mahogany, rumored to hold Tyrogue.",
    theme: "cave",
    region: "johto",
    position: { x: 50, y: 30, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 41, minLevel: 14, maxLevel: 20, encounterRate: 30 },
      { pokemonId: 66, minLevel: 14, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 67, minLevel: 18, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 183, minLevel: 16, maxLevel: 20, encounterRate: 15 },
      { pokemonId: 236, minLevel: 18, maxLevel: 20, encounterRate: 5 },
      { pokemonId: 118, minLevel: 14, maxLevel: 18, encounterRate: 10 },
    ],
  },
  {
    id: "johto-ice-path",
    name: "Ice Path",
    description: "A frozen cavern between Mahogany and Blackthorn, treacherous with sliding ice.",
    theme: "cave",
    region: "johto",
    position: { x: 65, y: 20, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 220, minLevel: 22, maxLevel: 26, encounterRate: 30 },
      { pokemonId: 124, minLevel: 24, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 225, minLevel: 22, maxLevel: 26, encounterRate: 15 },
      { pokemonId: 41, minLevel: 22, maxLevel: 26, encounterRate: 20 },
      { pokemonId: 42, minLevel: 24, maxLevel: 28, encounterRate: 15 },
    ],
  },
  {
    id: "johto-mt-silver",
    name: "Mt. Silver",
    description: "The ultimate challenge — a harsh mountain where only the strongest dare climb.",
    theme: "mountain",
    region: "johto",
    position: { x: 15, y: 15, width: 16, height: 16 },
    encounterPool: [
      { pokemonId: 217, minLevel: 42, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 232, minLevel: 42, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 246, minLevel: 42, maxLevel: 46, encounterRate: 15 },
      { pokemonId: 200, minLevel: 42, maxLevel: 45, encounterRate: 15 },
      { pokemonId: 55, minLevel: 42, maxLevel: 45, encounterRate: 15 },
      { pokemonId: 215, minLevel: 42, maxLevel: 45, encounterRate: 15 },
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

  {
    id: "hoenn-route-102",
    name: "Route 102",
    description: "A grassy path west of Oldale Town where beginning trainers hone their skills.",
    theme: "grass",
    region: "hoenn",
    position: { x: 38, y: 70, width: 12, height: 10 },
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
    position: { x: 30, y: 65, width: 12, height: 10 },
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
    position: { x: 52, y: 58, width: 12, height: 14 },
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
    position: { x: 60, y: 50, width: 12, height: 14 },
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
    position: { x: 48, y: 38, width: 12, height: 10 },
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
    position: { x: 42, y: 30, width: 14, height: 12 },
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
    position: { x: 32, y: 48, width: 12, height: 10 },
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
    position: { x: 62, y: 44, width: 14, height: 12 },
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
    name: "Routes 121–123",
    description: "Western routes near Lilycove and the Safari Zone, with diverse Pokemon.",
    theme: "grass",
    region: "hoenn",
    position: { x: 72, y: 50, width: 14, height: 10 },
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
    name: "Ocean Routes 124–131",
    description: "Vast seas spanning eastern Hoenn, rich with aquatic life.",
    theme: "water",
    region: "hoenn",
    position: { x: 78, y: 60, width: 16, height: 12 },
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
    position: { x: 35, y: 52, width: 10, height: 10 },
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
    position: { x: 20, y: 62, width: 12, height: 12 },
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
    position: { x: 50, y: 42, width: 12, height: 10 },
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
    position: { x: 68, y: 35, width: 12, height: 14 },
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
    position: { x: 80, y: 35, width: 12, height: 12 },
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
    position: { x: 82, y: 25, width: 12, height: 14 },
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
    position: { x: 85, y: 18, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 42, minLevel: 38, maxLevel: 42, encounterRate: 25 },
      { pokemonId: 305, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 297, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 308, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 75, minLevel: 38, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 356, minLevel: 40, maxLevel: 42, encounterRate: 10 },
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

  {
    id: "sinnoh-route-202-203",
    name: "Routes 202 & 203",
    description: "Early routes near Sandgem and Jubilife with common Sinnoh Pokemon.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 42, y: 70, width: 12, height: 10 },
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
    position: { x: 35, y: 60, width: 12, height: 12 },
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
    position: { x: 48, y: 55, width: 12, height: 12 },
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
    name: "Routes 208–210",
    description: "Mountainous routes between Hearthome and the foggy Route 210.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 60, y: 48, width: 14, height: 12 },
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
    position: { x: 52, y: 42, width: 14, height: 10 },
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
    name: "Routes 213–215",
    description: "Coastal and woodland routes around Veilstone and Pastoria City.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 68, y: 55, width: 14, height: 10 },
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
    position: { x: 45, y: 22, width: 14, height: 12 },
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
    position: { x: 25, y: 58, width: 14, height: 10 },
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
    name: "Routes 222–224",
    description: "Sunny beach routes approaching Sunyshore and beyond.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 78, y: 45, width: 14, height: 10 },
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
    name: "Routes 225–228",
    description: "Post-game routes in the Battle Zone with high-level encounters.",
    theme: "grass",
    region: "sinnoh",
    position: { x: 80, y: 25, width: 14, height: 14 },
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
    position: { x: 40, y: 65, width: 10, height: 10 },
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
    position: { x: 50, y: 50, width: 10, height: 10 },
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
    position: { x: 28, y: 45, width: 12, height: 12 },
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
    position: { x: 62, y: 52, width: 10, height: 12 },
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
    position: { x: 40, y: 18, width: 14, height: 12 },
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
    position: { x: 65, y: 18, width: 14, height: 14 },
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
    position: { x: 85, y: 20, width: 12, height: 12 },
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
    position: { x: 72, y: 28, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 42, minLevel: 45, maxLevel: 55, encounterRate: 30 },
      { pokemonId: 356, minLevel: 45, maxLevel: 55, encounterRate: 25 },
      { pokemonId: 353, minLevel: 45, maxLevel: 52, encounterRate: 20 },
      { pokemonId: 433, minLevel: 45, maxLevel: 50, encounterRate: 15 },
      { pokemonId: 487, minLevel: 70, maxLevel: 70, encounterRate: 1 },
    ],
  },

  // === UNOVA ===
  {
    id: "unova-route-1",
    name: "Route 1",
    description: "A peaceful path stretching from Nuvema Town through rolling hills.",
    theme: "grass",
    region: "unova",
    position: { x: 50, y: 75, width: 12, height: 10 },
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
    position: { x: 25, y: 55, width: 15, height: 16 },
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
    position: { x: 55, y: 35, width: 14, height: 14 },
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
    position: { x: 70, y: 20, width: 13, height: 16 },
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
    position: { x: 15, y: 25, width: 14, height: 14 },
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
    position: { x: 42, y: 68, width: 12, height: 10 },
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
    position: { x: 38, y: 60, width: 12, height: 10 },
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
    position: { x: 34, y: 52, width: 12, height: 10 },
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
    position: { x: 46, y: 48, width: 12, height: 10 },
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
    name: "Routes 10–13",
    description: "A stretch of varied terrain from Badge Check Gates to giant bridges.",
    theme: "grass",
    region: "unova",
    position: { x: 56, y: 42, width: 14, height: 12 },
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
    name: "Routes 14–16",
    description: "Waterfalls and forests in Unova's western wilderness.",
    theme: "forest",
    region: "unova",
    position: { x: 30, y: 38, width: 14, height: 12 },
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
    position: { x: 20, y: 45, width: 14, height: 10 },
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
    position: { x: 42, y: 62, width: 10, height: 10 },
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
    position: { x: 35, y: 55, width: 12, height: 12 },
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
    position: { x: 48, y: 38, width: 12, height: 10 },
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
    position: { x: 40, y: 30, width: 14, height: 12 },
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
    position: { x: 55, y: 30, width: 10, height: 12 },
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
    description: "Unova's final trial — a treacherous cave before the Pokemon League.",
    theme: "cave",
    region: "unova",
    position: { x: 60, y: 18, width: 14, height: 14 },
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

  // === KALOS ===
  {
    id: "kalos-route-2",
    name: "Route 2",
    description: "A sunlit trail winding through the outskirts of Aquacorde Town.",
    theme: "grass",
    region: "kalos",
    position: { x: 50, y: 75, width: 12, height: 10 },
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
    position: { x: 25, y: 55, width: 15, height: 16 },
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
    position: { x: 60, y: 40, width: 14, height: 14 },
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
    position: { x: 30, y: 25, width: 14, height: 14 },
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
    position: { x: 70, y: 15, width: 14, height: 14 },
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
    name: "Routes 3–5",
    description: "Rolling hills and flower fields between Santalune and Lumiose City.",
    theme: "grass",
    region: "kalos",
    position: { x: 38, y: 65, width: 14, height: 10 },
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
    position: { x: 32, y: 58, width: 12, height: 10 },
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
    position: { x: 55, y: 52, width: 14, height: 10 },
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
    position: { x: 42, y: 48, width: 12, height: 10 },
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
    name: "Routes 12–14",
    description: "Coastal and swamp routes between Shalour, Coumarine, and Laverre.",
    theme: "grass",
    region: "kalos",
    position: { x: 35, y: 42, width: 14, height: 10 },
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
    position: { x: 28, y: 35, width: 14, height: 10 },
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
    position: { x: 55, y: 22, width: 14, height: 12 },
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
    name: "Routes 20–22",
    description: "Winding Woodlands and the path to Victory Road's entrance.",
    theme: "forest",
    region: "kalos",
    position: { x: 48, y: 18, width: 14, height: 10 },
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
    position: { x: 48, y: 55, width: 10, height: 10 },
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
    position: { x: 40, y: 44, width: 12, height: 12 },
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
    position: { x: 62, y: 28, width: 12, height: 12 },
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
    position: { x: 42, y: 12, width: 14, height: 14 },
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

  // === ALOLA ===
  {
    id: "alola-route-1",
    name: "Route 1",
    description: "A tropical path on Melemele Island with ocean views and wild Pokemon.",
    theme: "grass",
    region: "alola",
    position: { x: 50, y: 75, width: 12, height: 10 },
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
    position: { x: 25, y: 55, width: 14, height: 14 },
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
    position: { x: 60, y: 40, width: 15, height: 16 },
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
    position: { x: 30, y: 20, width: 14, height: 16 },
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
    position: { x: 70, y: 15, width: 14, height: 14 },
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
    position: { x: 40, y: 68, width: 12, height: 10 },
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
    name: "Routes 4–6",
    description: "Akala Island routes through Paniola Ranch and lush meadows.",
    theme: "grass",
    region: "alola",
    position: { x: 35, y: 60, width: 14, height: 10 },
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
    position: { x: 45, y: 52, width: 14, height: 10 },
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
    name: "Routes 10–12",
    description: "Ula'ula Island routes around Mt. Hokulani and Secluded Shore.",
    theme: "grass",
    region: "alola",
    position: { x: 55, y: 45, width: 14, height: 12 },
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
    name: "Routes 13–15",
    description: "Desolate coast and Tapu Village ruins on Ula'ula Island.",
    theme: "desert",
    region: "alola",
    position: { x: 40, y: 35, width: 14, height: 12 },
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
    position: { x: 32, y: 28, width: 14, height: 10 },
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
    position: { x: 38, y: 72, width: 10, height: 10 },
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
    position: { x: 48, y: 58, width: 12, height: 12 },
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
    position: { x: 52, y: 48, width: 12, height: 12 },
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
    position: { x: 45, y: 32, width: 14, height: 12 },
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
    position: { x: 55, y: 22, width: 14, height: 14 },
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
    position: { x: 62, y: 18, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 42, minLevel: 46, maxLevel: 50, encounterRate: 25 },
      { pokemonId: 621, minLevel: 46, maxLevel: 50, encounterRate: 20 },
      { pokemonId: 782, minLevel: 46, maxLevel: 50, encounterRate: 20 },
      { pokemonId: 783, minLevel: 48, maxLevel: 52, encounterRate: 15 },
      { pokemonId: 784, minLevel: 50, maxLevel: 54, encounterRate: 10 },
      { pokemonId: 718, minLevel: 60, maxLevel: 60, encounterRate: 1 },
    ],
  },

  // === GALAR ===
  {
    id: "galar-route-1",
    name: "Route 1",
    description: "A pastoral countryside route dotted with woolly Pokemon and singing birds.",
    theme: "grass",
    region: "galar",
    position: { x: 50, y: 75, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 819, minLevel: 2, maxLevel: 4, encounterRate: 35 }, // Skwovet
      { pokemonId: 821, minLevel: 2, maxLevel: 4, encounterRate: 35 }, // Rookidee
      { pokemonId: 824, minLevel: 2, maxLevel: 3, encounterRate: 20 }, // Blipbug
      { pokemonId: 831, minLevel: 3, maxLevel: 5, encounterRate: 10 }, // Wooloo
    ],
  },
  {
    id: "galar-slumbering-weald",
    name: "Slumbering Weald",
    description: "A mysterious fog-shrouded forest where ancient legends slumber.",
    theme: "forest",
    region: "galar",
    position: { x: 30, y: 55, width: 14, height: 16 },
    encounterPool: [
      { pokemonId: 163, minLevel: 5, maxLevel: 7, encounterRate: 30 }, // Hoothoot
      { pokemonId: 43, minLevel: 5, maxLevel: 7, encounterRate: 25 },  // Oddish
      { pokemonId: 263, minLevel: 5, maxLevel: 7, encounterRate: 25 }, // Galarian Zigzagoon
      { pokemonId: 821, minLevel: 6, maxLevel: 8, encounterRate: 15 }, // Rookidee
      { pokemonId: 823, minLevel: 8, maxLevel: 10, encounterRate: 5 }, // Corviknight
    ],
  },
  {
    id: "galar-glimwood-tangle",
    name: "Glimwood Tangle",
    description: "An enchanted bioluminescent forest where fairy lights flicker among the mushrooms.",
    theme: "forest",
    region: "galar",
    position: { x: 60, y: 35, width: 15, height: 16 },
    encounterPool: [
      { pokemonId: 859, minLevel: 34, maxLevel: 37, encounterRate: 25 }, // Impidimp
      { pokemonId: 856, minLevel: 34, maxLevel: 36, encounterRate: 25 }, // Hatenna
      { pokemonId: 860, minLevel: 36, maxLevel: 38, encounterRate: 15 }, // Morgrem
      { pokemonId: 755, minLevel: 34, maxLevel: 36, encounterRate: 15 }, // Morelull
      { pokemonId: 756, minLevel: 36, maxLevel: 38, encounterRate: 10 }, // Shiinotic
      { pokemonId: 708, minLevel: 35, maxLevel: 37, encounterRate: 10 }, // Phantump
    ],
  },
  {
    id: "galar-crown-tundra",
    name: "Crown Tundra",
    description: "A vast frozen wilderness in southern Galar hiding legendary treasures beneath the snow.",
    theme: "mountain",
    region: "galar",
    position: { x: 20, y: 20, width: 16, height: 16 },
    encounterPool: [
      { pokemonId: 872, minLevel: 60, maxLevel: 63, encounterRate: 25 }, // Snom
      { pokemonId: 878, minLevel: 60, maxLevel: 62, encounterRate: 20 }, // Cufant
      { pokemonId: 359, minLevel: 61, maxLevel: 64, encounterRate: 15 }, // Absol
      { pokemonId: 698, minLevel: 60, maxLevel: 62, encounterRate: 15 }, // Amaura
      { pokemonId: 699, minLevel: 63, maxLevel: 65, encounterRate: 10 }, // Aurorus
      { pokemonId: 894, minLevel: 65, maxLevel: 70, encounterRate: 5 },  // Regieleki
      { pokemonId: 895, minLevel: 65, maxLevel: 70, encounterRate: 10 }, // Regidrago
    ],
  },

  {
    id: "galar-route-2-3",
    name: "Routes 2 & 3",
    description: "Early routes past the Professor's lab with diverse starter-area Pokemon.",
    theme: "grass",
    region: "galar",
    position: { x: 42, y: 68, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 819, minLevel: 5, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 831, minLevel: 5, maxLevel: 8, encounterRate: 25 },
      { pokemonId: 821, minLevel: 5, maxLevel: 8, encounterRate: 20 },
      { pokemonId: 833, minLevel: 5, maxLevel: 8, encounterRate: 15 },
      { pokemonId: 827, minLevel: 5, maxLevel: 8, encounterRate: 15 },
    ],
  },
  {
    id: "galar-route-4-5",
    name: "Routes 4 & 5",
    description: "Farmland and the bridge to Hulbury with Grass and Water types.",
    theme: "grass",
    region: "galar",
    position: { x: 38, y: 60, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 831, minLevel: 14, maxLevel: 17, encounterRate: 20 },
      { pokemonId: 194, minLevel: 14, maxLevel: 17, encounterRate: 20 },
      { pokemonId: 843, minLevel: 14, maxLevel: 17, encounterRate: 15 },
      { pokemonId: 846, minLevel: 14, maxLevel: 17, encounterRate: 15 },
      { pokemonId: 309, minLevel: 14, maxLevel: 16, encounterRate: 15 },
      { pokemonId: 837, minLevel: 14, maxLevel: 17, encounterRate: 15 },
    ],
  },
  {
    id: "galar-route-6-7",
    name: "Routes 6 & 7",
    description: "Rocky paths near Stow-on-Side with Fighting and Ground types.",
    theme: "mountain",
    region: "galar",
    position: { x: 55, y: 52, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 837, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 838, minLevel: 30, maxLevel: 33, encounterRate: 15 },
      { pokemonId: 843, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 559, minLevel: 28, maxLevel: 31, encounterRate: 15 },
      { pokemonId: 525, minLevel: 28, maxLevel: 31, encounterRate: 15 },
      { pokemonId: 214, minLevel: 28, maxLevel: 32, encounterRate: 15 },
    ],
  },
  {
    id: "galar-route-8-9",
    name: "Routes 8 & 9",
    description: "Snowy Circhester outskirts and the coastal route to Spikemuth.",
    theme: "mountain",
    region: "galar",
    position: { x: 48, y: 42, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 872, minLevel: 38, maxLevel: 42, encounterRate: 25 },
      { pokemonId: 860, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 875, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 845, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 215, minLevel: 38, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 873, minLevel: 40, maxLevel: 42, encounterRate: 15 },
    ],
  },
  {
    id: "galar-route-10",
    name: "Route 10",
    description: "The final route to Wyndon, blanketed in snow.",
    theme: "mountain",
    region: "galar",
    position: { x: 40, y: 32, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 872, minLevel: 42, maxLevel: 46, encounterRate: 25 },
      { pokemonId: 875, minLevel: 42, maxLevel: 46, encounterRate: 20 },
      { pokemonId: 225, minLevel: 42, maxLevel: 45, encounterRate: 20 },
      { pokemonId: 460, minLevel: 44, maxLevel: 46, encounterRate: 15 },
      { pokemonId: 832, minLevel: 42, maxLevel: 46, encounterRate: 10 },
      { pokemonId: 879, minLevel: 44, maxLevel: 46, encounterRate: 10 },
    ],
  },
  {
    id: "galar-rolling-fields",
    name: "Rolling Fields",
    description: "Wide open Wild Area grasslands near Motostoke with roaming Pokemon.",
    theme: "grass",
    region: "galar",
    position: { x: 55, y: 62, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 831, minLevel: 8, maxLevel: 15, encounterRate: 20 },
      { pokemonId: 519, minLevel: 8, maxLevel: 14, encounterRate: 20 },
      { pokemonId: 843, minLevel: 10, maxLevel: 15, encounterRate: 15 },
      { pokemonId: 827, minLevel: 8, maxLevel: 13, encounterRate: 15 },
      { pokemonId: 309, minLevel: 10, maxLevel: 14, encounterRate: 15 },
      { pokemonId: 133, minLevel: 12, maxLevel: 15, encounterRate: 10 },
      { pokemonId: 143, minLevel: 36, maxLevel: 36, encounterRate: 5 },
    ],
  },
  {
    id: "galar-dusty-bowl",
    name: "Dusty Bowl",
    description: "A windswept Wild Area bowl with sandstorms and Ground types.",
    theme: "desert",
    region: "galar",
    position: { x: 65, y: 48, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 844, minLevel: 38, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 450, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 553, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 843, minLevel: 36, maxLevel: 40, encounterRate: 20 },
      { pokemonId: 623, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 879, minLevel: 40, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 445, minLevel: 42, maxLevel: 46, encounterRate: 5 },
    ],
  },
  {
    id: "galar-giants-mirror",
    name: "Giant's Mirror",
    description: "A misty lakeside area in the Wild Area with Steel and Fairy types.",
    theme: "grass",
    region: "galar",
    position: { x: 70, y: 38, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 856, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 859, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 624, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 436, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 876, minLevel: 30, maxLevel: 34, encounterRate: 15 },
      { pokemonId: 437, minLevel: 32, maxLevel: 35, encounterRate: 10 },
      { pokemonId: 857, minLevel: 32, maxLevel: 35, encounterRate: 5 },
    ],
  },
  {
    id: "galar-lake-of-outrage",
    name: "Lake of Outrage",
    description: "A remote Wild Area lake with powerful evolved Pokemon and Ditto.",
    theme: "water",
    region: "galar",
    position: { x: 28, y: 30, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 132, minLevel: 56, maxLevel: 60, encounterRate: 15 },
      { pokemonId: 612, minLevel: 56, maxLevel: 60, encounterRate: 15 },
      { pokemonId: 445, minLevel: 56, maxLevel: 60, encounterRate: 10 },
      { pokemonId: 823, minLevel: 56, maxLevel: 60, encounterRate: 15 },
      { pokemonId: 635, minLevel: 56, maxLevel: 60, encounterRate: 10 },
      { pokemonId: 248, minLevel: 56, maxLevel: 60, encounterRate: 10 },
      { pokemonId: 706, minLevel: 56, maxLevel: 60, encounterRate: 10 },
      { pokemonId: 784, minLevel: 56, maxLevel: 60, encounterRate: 10 },
      { pokemonId: 148, minLevel: 56, maxLevel: 60, encounterRate: 5 },
    ],
  },
  {
    id: "galar-hammerlocke-hills",
    name: "Hammerlocke Hills",
    description: "Elevated Wild Area terrain near the grand Hammerlocke stadium.",
    theme: "grass",
    region: "galar",
    position: { x: 50, y: 35, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 841, minLevel: 36, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 842, minLevel: 36, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 860, minLevel: 36, maxLevel: 40, encounterRate: 20 },
      { pokemonId: 832, minLevel: 36, maxLevel: 40, encounterRate: 20 },
      { pokemonId: 839, minLevel: 36, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 861, minLevel: 38, maxLevel: 42, encounterRate: 10 },
      { pokemonId: 884, minLevel: 40, maxLevel: 44, encounterRate: 5 },
    ],
  },
  {
    id: "galar-motostoke-riverbank",
    name: "Motostoke Riverbank",
    description: "A river area in the Wild Area with Water and Electric types.",
    theme: "water",
    region: "galar",
    position: { x: 60, y: 58, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 833, minLevel: 18, maxLevel: 22, encounterRate: 25 },
      { pokemonId: 846, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 309, minLevel: 18, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 848, minLevel: 18, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 834, minLevel: 22, maxLevel: 26, encounterRate: 10 },
      { pokemonId: 847, minLevel: 22, maxLevel: 26, encounterRate: 10 },
      { pokemonId: 849, minLevel: 25, maxLevel: 28, encounterRate: 5 },
    ],
  },
  {
    id: "galar-watchtower-ruins",
    name: "Watchtower Ruins",
    description: "Ancient ruins in the Wild Area where Ghost types lurk at night.",
    theme: "urban",
    region: "galar",
    position: { x: 48, y: 55, width: 10, height: 10 },
    encounterPool: [
      { pokemonId: 355, minLevel: 15, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 562, minLevel: 15, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 425, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 92, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 302, minLevel: 17, maxLevel: 20, encounterRate: 10 },
    ],
  },

  // === PALDEA ===
  {
    id: "paldea-south-province-area-1",
    name: "South Province Area 1",
    description: "A wide open grassland near Mesagoza, perfect for beginning trainers.",
    theme: "grass",
    region: "paldea",
    position: { x: 50, y: 75, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 915, minLevel: 2, maxLevel: 4, encounterRate: 30 },  // Lechonk
      { pokemonId: 917, minLevel: 2, maxLevel: 4, encounterRate: 25 },  // Tarountula
      { pokemonId: 921, minLevel: 3, maxLevel: 5, encounterRate: 25 },  // Pawmi
      { pokemonId: 187, minLevel: 3, maxLevel: 5, encounterRate: 15 },  // Hoppip
      { pokemonId: 661, minLevel: 3, maxLevel: 5, encounterRate: 5 },   // Fletchling
    ],
  },
  {
    id: "paldea-casseroya-lake",
    name: "Casseroya Lake",
    description: "A sprawling mountain lake harboring powerful aquatic Pokemon in its depths.",
    theme: "water",
    region: "paldea",
    position: { x: 25, y: 40, width: 16, height: 14 },
    encounterPool: [
      { pokemonId: 129, minLevel: 35, maxLevel: 38, encounterRate: 30 }, // Magikarp
      { pokemonId: 147, minLevel: 36, maxLevel: 39, encounterRate: 20 }, // Dratini
      { pokemonId: 130, minLevel: 38, maxLevel: 42, encounterRate: 10 }, // Gyarados
      { pokemonId: 978, minLevel: 36, maxLevel: 39, encounterRate: 15 }, // Tatsugiri
      { pokemonId: 976, minLevel: 37, maxLevel: 40, encounterRate: 15 }, // Veluza
      { pokemonId: 977, minLevel: 40, maxLevel: 44, encounterRate: 10 }, // Dondozo
    ],
  },
  {
    id: "paldea-alfornada-cavern",
    name: "Alfornada Cavern",
    description: "A hidden cave system near Alfornada where rare pseudo-legendary Pokemon lurk.",
    theme: "cave",
    region: "paldea",
    position: { x: 60, y: 50, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 443, minLevel: 28, maxLevel: 32, encounterRate: 25 }, // Gible
      { pokemonId: 246, minLevel: 28, maxLevel: 32, encounterRate: 25 }, // Larvitar
      { pokemonId: 206, minLevel: 29, maxLevel: 31, encounterRate: 20 }, // Dunsparce
      { pokemonId: 371, minLevel: 30, maxLevel: 33, encounterRate: 15 }, // Bagon
      { pokemonId: 633, minLevel: 30, maxLevel: 34, encounterRate: 10 }, // Deino
      { pokemonId: 885, minLevel: 32, maxLevel: 35, encounterRate: 5 },  // Dreepy
    ],
  },
  {
    id: "paldea-area-zero",
    name: "Area Zero",
    description: "The deepest reaches of the Great Crater of Paldea, warped by Terastal energy.",
    theme: "cave",
    region: "paldea",
    position: { x: 35, y: 15, width: 16, height: 16 },
    encounterPool: [
      { pokemonId: 1005, minLevel: 55, maxLevel: 60, encounterRate: 15 }, // Roaring Moon
      { pokemonId: 1006, minLevel: 55, maxLevel: 60, encounterRate: 15 }, // Iron Valiant
      { pokemonId: 970, minLevel: 54, maxLevel: 58, encounterRate: 20 },  // Glimmora
      { pokemonId: 956, minLevel: 54, maxLevel: 57, encounterRate: 15 },  // Espathra
      { pokemonId: 934, minLevel: 55, maxLevel: 58, encounterRate: 15 },  // Garganacl
      { pokemonId: 637, minLevel: 56, maxLevel: 60, encounterRate: 10 },  // Volcarona
      { pokemonId: 635, minLevel: 58, maxLevel: 62, encounterRate: 10 },  // Hydreigon
    ],
  },
  {
    id: "paldea-south-province-2-3",
    name: "South Province Areas 2 & 3",
    description: "Rolling grasslands south of Mesagoza with diverse early-game Pokemon.",
    theme: "grass",
    region: "paldea",
    position: { x: 42, y: 68, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 396, minLevel: 5, maxLevel: 10, encounterRate: 25 },
      { pokemonId: 921, minLevel: 5, maxLevel: 10, encounterRate: 20 },
      { pokemonId: 48, minLevel: 5, maxLevel: 10, encounterRate: 15 },
      { pokemonId: 926, minLevel: 5, maxLevel: 10, encounterRate: 20 },
      { pokemonId: 133, minLevel: 8, maxLevel: 12, encounterRate: 10 },
      { pokemonId: 951, minLevel: 5, maxLevel: 10, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-south-province-4-6",
    name: "South Province Areas 4–6",
    description: "Higher-level grasslands expanding south toward the coast.",
    theme: "grass",
    region: "paldea",
    position: { x: 55, y: 62, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 951, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 952, minLevel: 22, maxLevel: 26, encounterRate: 10 },
      { pokemonId: 128, minLevel: 18, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 926, minLevel: 18, maxLevel: 22, encounterRate: 20 },
      { pokemonId: 941, minLevel: 18, maxLevel: 22, encounterRate: 15 },
      { pokemonId: 942, minLevel: 22, maxLevel: 26, encounterRate: 10 },
      { pokemonId: 280, minLevel: 18, maxLevel: 22, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-west-province-1-3",
    name: "West Province Areas 1–3",
    description: "Rugged western terrain with Rock and Fighting types near Cascarrafa.",
    theme: "mountain",
    region: "paldea",
    position: { x: 18, y: 55, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 744, minLevel: 20, maxLevel: 28, encounterRate: 20 },
      { pokemonId: 932, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 933, minLevel: 28, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 938, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 447, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 878, minLevel: 20, maxLevel: 26, encounterRate: 15 },
      { pokemonId: 968, minLevel: 24, maxLevel: 28, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-east-province-1-3",
    name: "East Province Areas 1–3",
    description: "Diverse eastern terrain from beaches to forests near Levincia.",
    theme: "grass",
    region: "paldea",
    position: { x: 72, y: 55, width: 14, height: 14 },
    encounterPool: [
      { pokemonId: 947, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 948, minLevel: 28, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 81, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 956, minLevel: 24, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 741, minLevel: 22, maxLevel: 28, encounterRate: 15 },
      { pokemonId: 960, minLevel: 22, maxLevel: 26, encounterRate: 15 },
      { pokemonId: 961, minLevel: 28, maxLevel: 32, encounterRate: 10 },
      { pokemonId: 194, minLevel: 22, maxLevel: 28, encounterRate: 5 },
    ],
  },
  {
    id: "paldea-north-province-1-3",
    name: "North Province Areas 1–3",
    description: "Harsh northern highlands with powerful Pokemon near Montenevera.",
    theme: "mountain",
    region: "paldea",
    position: { x: 35, y: 28, width: 16, height: 14 },
    encounterPool: [
      { pokemonId: 459, minLevel: 35, maxLevel: 40, encounterRate: 20 },
      { pokemonId: 225, minLevel: 35, maxLevel: 38, encounterRate: 15 },
      { pokemonId: 215, minLevel: 35, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 969, minLevel: 35, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 970, minLevel: 40, maxLevel: 44, encounterRate: 10 },
      { pokemonId: 962, minLevel: 35, maxLevel: 40, encounterRate: 15 },
      { pokemonId: 963, minLevel: 40, maxLevel: 44, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-dalizapa-passage",
    name: "Dalizapa Passage",
    description: "A snowy mountain pass connecting Medali to the northern reaches.",
    theme: "mountain",
    region: "paldea",
    position: { x: 28, y: 38, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 220, minLevel: 30, maxLevel: 35, encounterRate: 25 },
      { pokemonId: 221, minLevel: 34, maxLevel: 38, encounterRate: 15 },
      { pokemonId: 872, minLevel: 30, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 225, minLevel: 30, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 873, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 361, minLevel: 30, maxLevel: 35, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-glaseado-mountain",
    name: "Glaseado Mountain",
    description: "A massive snow-capped mountain in central Paldea with ice-dwelling Pokemon.",
    theme: "mountain",
    region: "paldea",
    position: { x: 42, y: 32, width: 16, height: 14 },
    encounterPool: [
      { pokemonId: 459, minLevel: 36, maxLevel: 42, encounterRate: 20 },
      { pokemonId: 460, minLevel: 42, maxLevel: 46, encounterRate: 10 },
      { pokemonId: 872, minLevel: 36, maxLevel: 40, encounterRate: 20 },
      { pokemonId: 873, minLevel: 40, maxLevel: 44, encounterRate: 10 },
      { pokemonId: 964, minLevel: 38, maxLevel: 42, encounterRate: 15 },
      { pokemonId: 965, minLevel: 42, maxLevel: 46, encounterRate: 10 },
      { pokemonId: 215, minLevel: 38, maxLevel: 42, encounterRate: 15 },
    ],
  },
  {
    id: "paldea-tagtree-thicket",
    name: "Tagtree Thicket",
    description: "A dense forest in eastern Paldea where Bug and Grass types thrive.",
    theme: "forest",
    region: "paldea",
    position: { x: 68, y: 42, width: 14, height: 12 },
    encounterPool: [
      { pokemonId: 285, minLevel: 25, maxLevel: 30, encounterRate: 20 },
      { pokemonId: 286, minLevel: 30, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 951, minLevel: 25, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 755, minLevel: 25, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 756, minLevel: 30, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 204, minLevel: 25, maxLevel: 30, encounterRate: 15 },
      { pokemonId: 205, minLevel: 30, maxLevel: 34, encounterRate: 10 },
      { pokemonId: 953, minLevel: 28, maxLevel: 32, encounterRate: 5 },
    ],
  },
  {
    id: "paldea-socarrat-trail",
    name: "Socarrat Trail",
    description: "A winding desert trail in western Paldea with Fire and Ground types.",
    theme: "desert",
    region: "paldea",
    position: { x: 15, y: 45, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 322, minLevel: 30, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 323, minLevel: 36, maxLevel: 40, encounterRate: 10 },
      { pokemonId: 328, minLevel: 30, maxLevel: 35, encounterRate: 20 },
      { pokemonId: 329, minLevel: 35, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 551, minLevel: 30, maxLevel: 36, encounterRate: 20 },
      { pokemonId: 552, minLevel: 36, maxLevel: 40, encounterRate: 10 },
      { pokemonId: 324, minLevel: 32, maxLevel: 36, encounterRate: 10 },
    ],
  },
  {
    id: "paldea-asado-desert",
    name: "Asado Desert",
    description: "A scorching desert in western Paldea full of Ground and Rock types.",
    theme: "desert",
    region: "paldea",
    position: { x: 20, y: 52, width: 14, height: 10 },
    encounterPool: [
      { pokemonId: 449, minLevel: 28, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 450, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 551, minLevel: 28, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 328, minLevel: 28, maxLevel: 32, encounterRate: 20 },
      { pokemonId: 246, minLevel: 28, maxLevel: 32, encounterRate: 15 },
      { pokemonId: 969, minLevel: 30, maxLevel: 34, encounterRate: 15 },
    ],
  },
  {
    id: "paldea-inlet-grotto",
    name: "Inlet Grotto",
    description: "A hidden seaside cave with rare Water and Dragon types.",
    theme: "cave",
    region: "paldea",
    position: { x: 75, y: 65, width: 12, height: 12 },
    encounterPool: [
      { pokemonId: 147, minLevel: 30, maxLevel: 36, encounterRate: 15 },
      { pokemonId: 148, minLevel: 36, maxLevel: 40, encounterRate: 10 },
      { pokemonId: 116, minLevel: 28, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 117, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 339, minLevel: 28, maxLevel: 34, encounterRate: 20 },
      { pokemonId: 340, minLevel: 34, maxLevel: 38, encounterRate: 10 },
      { pokemonId: 978, minLevel: 30, maxLevel: 36, encounterRate: 15 },
    ],
  },
  {
    id: "paldea-poco-path",
    name: "Poco Path",
    description: "The starting area near the Lighthouse where new trainers begin their journey.",
    theme: "grass",
    region: "paldea",
    position: { x: 60, y: 78, width: 12, height: 10 },
    encounterPool: [
      { pokemonId: 915, minLevel: 2, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 921, minLevel: 2, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 661, minLevel: 2, maxLevel: 5, encounterRate: 20 },
      { pokemonId: 183, minLevel: 3, maxLevel: 5, encounterRate: 15 },
      { pokemonId: 194, minLevel: 3, maxLevel: 5, encounterRate: 10 },
    ],
  },
];

export function getAreasForRegion(regionId: string): RouteArea[] {
  return ROUTE_AREAS.filter((area) => area.region === regionId);
}

export function getAreaById(areaId: string): RouteArea | undefined {
  return ROUTE_AREAS.find((area) => area.id === areaId);
}
