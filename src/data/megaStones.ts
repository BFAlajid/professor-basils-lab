import { HeldItem } from "@/types";

export interface MegaStoneItem extends HeldItem {
  megaTarget: string;
  formeApiName: string;
}

export const MEGA_STONES: MegaStoneItem[] = [
  // Gen 1
  { name: "venusaurite", displayName: "Venusaurite", effect: "Mega Evolves Venusaur", battleModifier: { type: "mega_stone" }, megaTarget: "venusaur", formeApiName: "venusaur-mega" },
  { name: "charizardite-x", displayName: "Charizardite X", effect: "Mega Evolves Charizard (X)", battleModifier: { type: "mega_stone" }, megaTarget: "charizard", formeApiName: "charizard-mega-x" },
  { name: "charizardite-y", displayName: "Charizardite Y", effect: "Mega Evolves Charizard (Y)", battleModifier: { type: "mega_stone" }, megaTarget: "charizard", formeApiName: "charizard-mega-y" },
  { name: "blastoisinite", displayName: "Blastoisinite", effect: "Mega Evolves Blastoise", battleModifier: { type: "mega_stone" }, megaTarget: "blastoise", formeApiName: "blastoise-mega" },
  { name: "alakazite", displayName: "Alakazite", effect: "Mega Evolves Alakazam", battleModifier: { type: "mega_stone" }, megaTarget: "alakazam", formeApiName: "alakazam-mega" },
  { name: "gengarite", displayName: "Gengarite", effect: "Mega Evolves Gengar", battleModifier: { type: "mega_stone" }, megaTarget: "gengar", formeApiName: "gengar-mega" },
  { name: "kangaskhanite", displayName: "Kangaskhanite", effect: "Mega Evolves Kangaskhan", battleModifier: { type: "mega_stone" }, megaTarget: "kangaskhan", formeApiName: "kangaskhan-mega" },
  { name: "pinsirite", displayName: "Pinsirite", effect: "Mega Evolves Pinsir", battleModifier: { type: "mega_stone" }, megaTarget: "pinsir", formeApiName: "pinsir-mega" },
  { name: "gyaradosite", displayName: "Gyaradosite", effect: "Mega Evolves Gyarados", battleModifier: { type: "mega_stone" }, megaTarget: "gyarados", formeApiName: "gyarados-mega" },
  { name: "aerodactylite", displayName: "Aerodactylite", effect: "Mega Evolves Aerodactyl", battleModifier: { type: "mega_stone" }, megaTarget: "aerodactyl", formeApiName: "aerodactyl-mega" },
  { name: "mewtwonite-x", displayName: "Mewtwonite X", effect: "Mega Evolves Mewtwo (X)", battleModifier: { type: "mega_stone" }, megaTarget: "mewtwo", formeApiName: "mewtwo-mega-x" },
  { name: "mewtwonite-y", displayName: "Mewtwonite Y", effect: "Mega Evolves Mewtwo (Y)", battleModifier: { type: "mega_stone" }, megaTarget: "mewtwo", formeApiName: "mewtwo-mega-y" },
  // Gen 2
  { name: "ampharosite", displayName: "Ampharosite", effect: "Mega Evolves Ampharos", battleModifier: { type: "mega_stone" }, megaTarget: "ampharos", formeApiName: "ampharos-mega" },
  { name: "steelixite", displayName: "Steelixite", effect: "Mega Evolves Steelix", battleModifier: { type: "mega_stone" }, megaTarget: "steelix", formeApiName: "steelix-mega" },
  { name: "scizorite", displayName: "Scizorite", effect: "Mega Evolves Scizor", battleModifier: { type: "mega_stone" }, megaTarget: "scizor", formeApiName: "scizor-mega" },
  { name: "heracronite", displayName: "Heracronite", effect: "Mega Evolves Heracross", battleModifier: { type: "mega_stone" }, megaTarget: "heracross", formeApiName: "heracross-mega" },
  { name: "houndoominite", displayName: "Houndoominite", effect: "Mega Evolves Houndoom", battleModifier: { type: "mega_stone" }, megaTarget: "houndoom", formeApiName: "houndoom-mega" },
  { name: "tyranitarite", displayName: "Tyranitarite", effect: "Mega Evolves Tyranitar", battleModifier: { type: "mega_stone" }, megaTarget: "tyranitar", formeApiName: "tyranitar-mega" },
  // Gen 3
  { name: "blazikenite", displayName: "Blazikenite", effect: "Mega Evolves Blaziken", battleModifier: { type: "mega_stone" }, megaTarget: "blaziken", formeApiName: "blaziken-mega" },
  { name: "gardevoirite", displayName: "Gardevoirite", effect: "Mega Evolves Gardevoir", battleModifier: { type: "mega_stone" }, megaTarget: "gardevoir", formeApiName: "gardevoir-mega" },
  { name: "mawilite", displayName: "Mawilite", effect: "Mega Evolves Mawile", battleModifier: { type: "mega_stone" }, megaTarget: "mawile", formeApiName: "mawile-mega" },
  { name: "aggronite", displayName: "Aggronite", effect: "Mega Evolves Aggron", battleModifier: { type: "mega_stone" }, megaTarget: "aggron", formeApiName: "aggron-mega" },
  { name: "medichamite", displayName: "Medichamite", effect: "Mega Evolves Medicham", battleModifier: { type: "mega_stone" }, megaTarget: "medicham", formeApiName: "medicham-mega" },
  { name: "manectite", displayName: "Manectite", effect: "Mega Evolves Manectric", battleModifier: { type: "mega_stone" }, megaTarget: "manectric", formeApiName: "manectric-mega" },
  { name: "banettite", displayName: "Banettite", effect: "Mega Evolves Banette", battleModifier: { type: "mega_stone" }, megaTarget: "banette", formeApiName: "banette-mega" },
  { name: "absolite", displayName: "Absolite", effect: "Mega Evolves Absol", battleModifier: { type: "mega_stone" }, megaTarget: "absol", formeApiName: "absol-mega" },
  { name: "garchompite", displayName: "Garchompite", effect: "Mega Evolves Garchomp", battleModifier: { type: "mega_stone" }, megaTarget: "garchomp", formeApiName: "garchomp-mega" },
  { name: "sablenite", displayName: "Sablenite", effect: "Mega Evolves Sableye", battleModifier: { type: "mega_stone" }, megaTarget: "sableye", formeApiName: "sableye-mega" },
  { name: "sharpedonite", displayName: "Sharpedonite", effect: "Mega Evolves Sharpedo", battleModifier: { type: "mega_stone" }, megaTarget: "sharpedo", formeApiName: "sharpedo-mega" },
  { name: "slowbronite", displayName: "Slowbronite", effect: "Mega Evolves Slowbro", battleModifier: { type: "mega_stone" }, megaTarget: "slowbro", formeApiName: "slowbro-mega" },
  { name: "cameruptite", displayName: "Cameruptite", effect: "Mega Evolves Camerupt", battleModifier: { type: "mega_stone" }, megaTarget: "camerupt", formeApiName: "camerupt-mega" },
  { name: "altarianite", displayName: "Altarianite", effect: "Mega Evolves Altaria", battleModifier: { type: "mega_stone" }, megaTarget: "altaria", formeApiName: "altaria-mega" },
  { name: "glalitite", displayName: "Glalitite", effect: "Mega Evolves Glalie", battleModifier: { type: "mega_stone" }, megaTarget: "glalie", formeApiName: "glalie-mega" },
  { name: "salamencite", displayName: "Salamencite", effect: "Mega Evolves Salamence", battleModifier: { type: "mega_stone" }, megaTarget: "salamence", formeApiName: "salamence-mega" },
  { name: "metagrossite", displayName: "Metagrossite", effect: "Mega Evolves Metagross", battleModifier: { type: "mega_stone" }, megaTarget: "metagross", formeApiName: "metagross-mega" },
  { name: "latiasite", displayName: "Latiasite", effect: "Mega Evolves Latias", battleModifier: { type: "mega_stone" }, megaTarget: "latias", formeApiName: "latias-mega" },
  { name: "latiosite", displayName: "Latiosite", effect: "Mega Evolves Latios", battleModifier: { type: "mega_stone" }, megaTarget: "latios", formeApiName: "latios-mega" },
  // Gen 4
  { name: "lucarionite", displayName: "Lucarionite", effect: "Mega Evolves Lucario", battleModifier: { type: "mega_stone" }, megaTarget: "lucario", formeApiName: "lucario-mega" },
  { name: "abomasite", displayName: "Abomasite", effect: "Mega Evolves Abomasnow", battleModifier: { type: "mega_stone" }, megaTarget: "abomasnow", formeApiName: "abomasnow-mega" },
  { name: "galladite", displayName: "Galladite", effect: "Mega Evolves Gallade", battleModifier: { type: "mega_stone" }, megaTarget: "gallade", formeApiName: "gallade-mega" },
  { name: "lopunnite", displayName: "Lopunnite", effect: "Mega Evolves Lopunny", battleModifier: { type: "mega_stone" }, megaTarget: "lopunny", formeApiName: "lopunny-mega" },
  // Gen 5
  { name: "audinite", displayName: "Audinite", effect: "Mega Evolves Audino", battleModifier: { type: "mega_stone" }, megaTarget: "audino", formeApiName: "audino-mega" },
  // Gen 6
  { name: "diancite", displayName: "Diancite", effect: "Mega Evolves Diancie", battleModifier: { type: "mega_stone" }, megaTarget: "diancie", formeApiName: "diancie-mega" },
  // Special - Rayquaza doesn't use a stone (Dragon Ascent), but we include it for data completeness
  { name: "rayquaza-mega-trigger", displayName: "Dragon Ascent", effect: "Mega Evolves Rayquaza (knows Dragon Ascent)", battleModifier: { type: "mega_stone" }, megaTarget: "rayquaza", formeApiName: "rayquaza-mega" },
  // Beedrill & Pidgeot
  { name: "beedrillite", displayName: "Beedrillite", effect: "Mega Evolves Beedrill", battleModifier: { type: "mega_stone" }, megaTarget: "beedrill", formeApiName: "beedrill-mega" },
  { name: "pidgeotite", displayName: "Pidgeotite", effect: "Mega Evolves Pidgeot", battleModifier: { type: "mega_stone" }, megaTarget: "pidgeot", formeApiName: "pidgeot-mega" },
];

export function getMegaStone(name: string): MegaStoneItem | undefined {
  return MEGA_STONES.find((s) => s.name === name);
}

export function getMegaStoneForPokemon(pokemonName: string): MegaStoneItem[] {
  return MEGA_STONES.filter((s) => s.megaTarget === pokemonName);
}

export function isMegaStone(itemName: string): boolean {
  return MEGA_STONES.some((s) => s.name === itemName);
}
