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
];

export function getAreasForRegion(regionId: string): RouteArea[] {
  return ROUTE_AREAS.filter((area) => area.region === regionId);
}

export function getAreaById(areaId: string): RouteArea | undefined {
  return ROUTE_AREAS.find((area) => area.id === areaId);
}
