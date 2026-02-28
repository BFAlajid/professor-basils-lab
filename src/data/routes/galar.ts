import { RouteArea } from "@/types";

export const GALAR_ROUTES: RouteArea[] = [
  // === GALAR ===
  {
    id: "galar-route-1",
    name: "Route 1",
    description: "A pastoral countryside route dotted with woolly Pokemon and singing birds.",
    theme: "grass",
    region: "galar",
    position: { x: 43, y: 90, width: 9, height: 7 },
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
    position: { x: 36, y: 88, width: 8, height: 7 },
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
    position: { x: 36, y: 52, width: 9, height: 8 },
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
    position: { x: 35, y: 95, width: 10, height: 7 },
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
    position: { x: 46, y: 83, width: 9, height: 7 },
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
    position: { x: 40, y: 75, width: 9, height: 7 },
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
    position: { x: 35, y: 55, width: 9, height: 7 },
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
    position: { x: 45, y: 28, width: 9, height: 7 },
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
    position: { x: 42, y: 15, width: 8, height: 7 },
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
    position: { x: 50, y: 68, width: 9, height: 7 },
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
    position: { x: 45, y: 58, width: 9, height: 7 },
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
    position: { x: 50, y: 50, width: 9, height: 7 },
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
    position: { x: 42, y: 42, width: 9, height: 8 },
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
    position: { x: 48, y: 38, width: 9, height: 7 },
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
    position: { x: 52, y: 65, width: 8, height: 7 },
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
    position: { x: 40, y: 62, width: 8, height: 7 },
    encounterPool: [
      { pokemonId: 355, minLevel: 15, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 562, minLevel: 15, maxLevel: 18, encounterRate: 25 },
      { pokemonId: 425, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 92, minLevel: 15, maxLevel: 18, encounterRate: 20 },
      { pokemonId: 302, minLevel: 17, maxLevel: 20, encounterRate: 10 },
    ],
  },
];
