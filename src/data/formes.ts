import { capitalize } from "@/utils/format";

// Curated regional variants and alternate formes
// Maps base Pokemon name → array of PokeAPI slugs for their alternate formes

export const REGIONAL_VARIANTS: Record<string, string[]> = {
  // Alolan forms (Gen 7)
  rattata: ["rattata-alola"],
  raticate: ["raticate-alola"],
  raichu: ["raichu-alola"],
  sandshrew: ["sandshrew-alola"],
  sandslash: ["sandslash-alola"],
  vulpix: ["vulpix-alola"],
  ninetales: ["ninetales-alola"],
  diglett: ["diglett-alola"],
  dugtrio: ["dugtrio-alola"],
  meowth: ["meowth-alola", "meowth-galar"],
  persian: ["persian-alola"],
  geodude: ["geodude-alola"],
  graveler: ["graveler-alola"],
  golem: ["golem-alola"],
  grimer: ["grimer-alola"],
  muk: ["muk-alola"],
  exeggutor: ["exeggutor-alola"],
  marowak: ["marowak-alola"],
  // Galarian forms (Gen 8)
  ponyta: ["ponyta-galar"],
  rapidash: ["rapidash-galar"],
  slowpoke: ["slowpoke-galar"],
  slowbro: ["slowbro-galar"],
  farfetchd: ["farfetchd-galar"],
  weezing: ["weezing-galar"],
  "mr-mime": ["mr-mime-galar"],
  corsola: ["corsola-galar"],
  zigzagoon: ["zigzagoon-galar"],
  linoone: ["linoone-galar"],
  darumaka: ["darumaka-galar"],
  darmanitan: ["darmanitan-galar-standard"],
  yamask: ["yamask-galar"],
  stunfisk: ["stunfisk-galar"],
  slowking: ["slowking-galar"],
  articuno: ["articuno-galar"],
  zapdos: ["zapdos-galar"],
  moltres: ["moltres-galar"],
  // Hisuian forms (Gen 8/Legends)
  growlithe: ["growlithe-hisui"],
  arcanine: ["arcanine-hisui"],
  voltorb: ["voltorb-hisui"],
  electrode: ["electrode-hisui"],
  typhlosion: ["typhlosion-hisui"],
  qwilfish: ["qwilfish-hisui"],
  sneasel: ["sneasel-hisui"],
  samurott: ["samurott-hisui"],
  lilligant: ["lilligant-hisui"],
  zorua: ["zorua-hisui"],
  zoroark: ["zoroark-hisui"],
  braviary: ["braviary-hisui"],
  sliggoo: ["sliggoo-hisui"],
  goodra: ["goodra-hisui"],
  avalugg: ["avalugg-hisui"],
  decidueye: ["decidueye-hisui"],
  // Paldean forms (Gen 9)
  tauros: ["tauros-paldea-combat-breed", "tauros-paldea-blaze-breed", "tauros-paldea-aqua-breed"],
  wooper: ["wooper-paldea"],
};

// Other notable multi-forme Pokemon
export const SPECIAL_FORMES: Record<string, string[]> = {
  deoxys: ["deoxys-attack", "deoxys-defense", "deoxys-speed"],
  wormadam: ["wormadam-sandy", "wormadam-trash"],
  rotom: ["rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"],
  giratina: ["giratina-origin"],
  shaymin: ["shaymin-sky"],
  basculin: ["basculin-blue-striped", "basculin-white-striped"],
  tornadus: ["tornadus-therian"],
  thundurus: ["thundurus-therian"],
  landorus: ["landorus-therian"],
  kyurem: ["kyurem-black", "kyurem-white"],
  keldeo: ["keldeo-resolute"],
  meloetta: ["meloetta-pirouette"],
  hoopa: ["hoopa-unbound"],
  lycanroc: ["lycanroc-midnight", "lycanroc-dusk"],
  wishiwashi: ["wishiwashi-school"],
  zygarde: ["zygarde-10", "zygarde-complete"],
  necrozma: ["necrozma-dusk", "necrozma-dawn", "necrozma-ultra"],
  calyrex: ["calyrex-ice", "calyrex-shadow"],
  urshifu: ["urshifu-rapid-strike"],
  enamorus: ["enamorus-therian"],
  ogerpon: ["ogerpon-wellspring-mask", "ogerpon-hearthflame-mask", "ogerpon-cornerstone-mask"],
};

export function getKnownVariants(pokemonName: string): string[] {
  const regional = REGIONAL_VARIANTS[pokemonName] ?? [];
  const special = SPECIAL_FORMES[pokemonName] ?? [];
  return [...regional, ...special];
}

export function formatFormeName(apiSlug: string): string {
  // "raichu-alola" → "Raichu (Alola)"
  // "charizard-mega-x" → "Charizard (Mega X)"
  // "darmanitan-galar-standard" → "Darmanitan (Galar Standard)"
  const parts = apiSlug.split("-");
  if (parts.length < 2) return capitalize(apiSlug);

  const baseName = capitalize(parts[0]);
  const formeParts = parts.slice(1).map(capitalize);
  return `${baseName} (${formeParts.join(" ")})`;
}

