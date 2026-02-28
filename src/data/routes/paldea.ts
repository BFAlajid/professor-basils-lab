import { RouteArea } from "@/types";

export const PALDEA_ROUTES: RouteArea[] = [
  // === PALDEA ===
  {
    id: "paldea-south-province-area-1",
    name: "South Province Area 1",
    description: "A wide open grassland near Mesagoza, perfect for beginning trainers.",
    theme: "grass",
    region: "paldea",
    position: { x: 45, y: 62, width: 9, height: 8 },
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
    position: { x: 25, y: 22, width: 9, height: 8 },
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
    position: { x: 28, y: 75, width: 9, height: 8 },
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
    position: { x: 44, y: 42, width: 10, height: 10 },
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
    position: { x: 40, y: 72, width: 9, height: 8 },
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
    name: "South Province Areas 4\u20136",
    description: "Higher-level grasslands expanding south toward the coast.",
    theme: "grass",
    region: "paldea",
    position: { x: 55, y: 68, width: 9, height: 8 },
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
    name: "West Province Areas 1\u20133",
    description: "Rugged western terrain with Rock and Fighting types near Cascarrafa.",
    theme: "mountain",
    region: "paldea",
    position: { x: 27, y: 52, width: 9, height: 9 },
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
    name: "East Province Areas 1\u20133",
    description: "Diverse eastern terrain from beaches to forests near Levincia.",
    theme: "grass",
    region: "paldea",
    position: { x: 62, y: 52, width: 9, height: 9 },
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
    name: "North Province Areas 1\u20133",
    description: "Harsh northern highlands with powerful Pokemon near Montenevera.",
    theme: "mountain",
    region: "paldea",
    position: { x: 42, y: 18, width: 10, height: 8 },
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
    position: { x: 32, y: 38, width: 8, height: 8 },
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
    position: { x: 42, y: 25, width: 10, height: 9 },
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
    position: { x: 60, y: 42, width: 8, height: 8 },
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
    position: { x: 26, y: 32, width: 8, height: 8 },
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
    position: { x: 55, y: 48, width: 9, height: 8 },
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
    position: { x: 58, y: 82, width: 8, height: 8 },
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
    position: { x: 50, y: 85, width: 8, height: 7 },
    encounterPool: [
      { pokemonId: 915, minLevel: 2, maxLevel: 5, encounterRate: 30 },
      { pokemonId: 921, minLevel: 2, maxLevel: 5, encounterRate: 25 },
      { pokemonId: 661, minLevel: 2, maxLevel: 5, encounterRate: 20 },
      { pokemonId: 183, minLevel: 3, maxLevel: 5, encounterRate: 15 },
      { pokemonId: 194, minLevel: 3, maxLevel: 5, encounterRate: 10 },
    ],
  },
];
