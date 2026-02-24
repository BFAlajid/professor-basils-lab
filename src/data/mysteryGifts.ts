import { MysteryGiftDefinition, BallType, IVSpread } from "@/types";

// ──────────────────────────────────────────────
// Regular Gifts — Popular Pokemon, cycle daily
// ──────────────────────────────────────────────
export const REGULAR_GIFTS: MysteryGiftDefinition[] = [
  { pokemonId: 133, level: 50, ballType: "premier-ball" },  // Eevee
  { pokemonId: 25,  level: 50, ballType: "premier-ball" },  // Pikachu
  { pokemonId: 448, level: 50, ballType: "premier-ball" },  // Lucario
  { pokemonId: 445, level: 50, ballType: "premier-ball" },  // Garchomp
  { pokemonId: 282, level: 50, ballType: "premier-ball" },  // Gardevoir
  { pokemonId: 468, level: 50, ballType: "premier-ball" },  // Togekiss
  { pokemonId: 94,  level: 50, ballType: "premier-ball" },  // Gengar
  { pokemonId: 149, level: 50, ballType: "premier-ball" },  // Dragonite
  { pokemonId: 248, level: 50, ballType: "premier-ball" },  // Tyranitar
  { pokemonId: 373, level: 50, ballType: "premier-ball" },  // Salamence
  { pokemonId: 376, level: 50, ballType: "premier-ball" },  // Metagross
  { pokemonId: 212, level: 50, ballType: "premier-ball" },  // Scizor
  { pokemonId: 130, level: 50, ballType: "premier-ball" },  // Gyarados
  { pokemonId: 59,  level: 50, ballType: "premier-ball" },  // Arcanine
  { pokemonId: 38,  level: 50, ballType: "premier-ball" },  // Ninetales
  { pokemonId: 65,  level: 50, ballType: "premier-ball" },  // Alakazam
  { pokemonId: 68,  level: 50, ballType: "premier-ball" },  // Machamp
  { pokemonId: 76,  level: 50, ballType: "premier-ball" },  // Golem
  { pokemonId: 131, level: 50, ballType: "premier-ball" },  // Lapras
  { pokemonId: 143, level: 50, ballType: "premier-ball" },  // Snorlax
  { pokemonId: 214, level: 50, ballType: "premier-ball" },  // Heracross
  { pokemonId: 208, level: 50, ballType: "premier-ball" },  // Steelix
  { pokemonId: 230, level: 50, ballType: "premier-ball" },  // Kingdra
  { pokemonId: 350, level: 50, ballType: "premier-ball" },  // Milotic
  { pokemonId: 359, level: 50, ballType: "premier-ball" },  // Absol
  { pokemonId: 330, level: 50, ballType: "premier-ball" },  // Flygon
  { pokemonId: 306, level: 50, ballType: "premier-ball" },  // Aggron
  { pokemonId: 461, level: 50, ballType: "premier-ball" },  // Weavile
  { pokemonId: 405, level: 50, ballType: "premier-ball" },  // Luxray
  { pokemonId: 398, level: 50, ballType: "premier-ball" },  // Staraptor
  { pokemonId: 407, level: 50, ballType: "premier-ball" },  // Roserade
  { pokemonId: 475, level: 50, ballType: "premier-ball" },  // Gallade
  { pokemonId: 571, level: 50, ballType: "premier-ball" },  // Zoroark
  { pokemonId: 612, level: 50, ballType: "premier-ball" },  // Haxorus
  { pokemonId: 635, level: 50, ballType: "premier-ball" },  // Hydreigon
  { pokemonId: 637, level: 50, ballType: "premier-ball" },  // Volcarona
  { pokemonId: 658, level: 50, ballType: "premier-ball" },  // Greninja
  { pokemonId: 778, level: 50, ballType: "premier-ball" },  // Mimikyu
  { pokemonId: 887, level: 50, ballType: "premier-ball" },  // Dragapult
  { pokemonId: 937, level: 50, ballType: "premier-ball" },  // Ceruledge
];

// ──────────────────────────────────────────────
// Starter Gifts — All starters, available on weekends
// ──────────────────────────────────────────────
export const STARTER_GIFTS: MysteryGiftDefinition[] = [
  // Gen 1
  { pokemonId: 1,   level: 5, ballType: "poke-ball" },  // Bulbasaur
  { pokemonId: 4,   level: 5, ballType: "poke-ball" },  // Charmander
  { pokemonId: 7,   level: 5, ballType: "poke-ball" },  // Squirtle
  // Gen 2
  { pokemonId: 152, level: 5, ballType: "poke-ball" },  // Chikorita
  { pokemonId: 155, level: 5, ballType: "poke-ball" },  // Cyndaquil
  { pokemonId: 158, level: 5, ballType: "poke-ball" },  // Totodile
  // Gen 3
  { pokemonId: 252, level: 5, ballType: "poke-ball" },  // Treecko
  { pokemonId: 255, level: 5, ballType: "poke-ball" },  // Torchic
  { pokemonId: 258, level: 5, ballType: "poke-ball" },  // Mudkip
  // Gen 4
  { pokemonId: 387, level: 5, ballType: "poke-ball" },  // Turtwig
  { pokemonId: 390, level: 5, ballType: "poke-ball" },  // Chimchar
  { pokemonId: 393, level: 5, ballType: "poke-ball" },  // Piplup
  // Gen 5
  { pokemonId: 495, level: 5, ballType: "poke-ball" },  // Snivy
  { pokemonId: 498, level: 5, ballType: "poke-ball" },  // Tepig
  { pokemonId: 501, level: 5, ballType: "poke-ball" },  // Oshawott
  // Gen 6
  { pokemonId: 650, level: 5, ballType: "poke-ball" },  // Chespin
  { pokemonId: 653, level: 5, ballType: "poke-ball" },  // Fennekin
  { pokemonId: 656, level: 5, ballType: "poke-ball" },  // Froakie
  // Gen 7
  { pokemonId: 722, level: 5, ballType: "poke-ball" },  // Rowlet
  { pokemonId: 725, level: 5, ballType: "poke-ball" },  // Litten
  { pokemonId: 728, level: 5, ballType: "poke-ball" },  // Popplio
  // Gen 8
  { pokemonId: 810, level: 5, ballType: "poke-ball" },  // Grookey
  { pokemonId: 813, level: 5, ballType: "poke-ball" },  // Scorbunny
  { pokemonId: 816, level: 5, ballType: "poke-ball" },  // Sobble
  // Gen 9
  { pokemonId: 906, level: 5, ballType: "poke-ball" },  // Sprigatito
  { pokemonId: 909, level: 5, ballType: "poke-ball" },  // Fuecoco
  { pokemonId: 912, level: 5, ballType: "poke-ball" },  // Quaxly
];

// ──────────────────────────────────────────────
// Legendary Gifts — Legendaries for holidays
// ──────────────────────────────────────────────
const ALL_IV_STATS: (keyof IVSpread)[] = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];

function fivePerfectIVs(excludeIndex: number): (keyof IVSpread)[] {
  return ALL_IV_STATS.filter((_, i) => i !== excludeIndex);
}

export const LEGENDARY_GIFTS: MysteryGiftDefinition[] = [
  { pokemonId: 150,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(0), ribbonText: "Event Pokemon" },  // Mewtwo
  { pokemonId: 249,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(1), ribbonText: "Event Pokemon" },  // Lugia
  { pokemonId: 250,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(2), ribbonText: "Event Pokemon" },  // Ho-Oh
  { pokemonId: 384,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(3), ribbonText: "Event Pokemon" },  // Rayquaza
  { pokemonId: 483,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(4), ribbonText: "Event Pokemon" },  // Dialga
  { pokemonId: 484,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(5), ribbonText: "Event Pokemon" },  // Palkia
  { pokemonId: 487,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(0), ribbonText: "Event Pokemon" },  // Giratina
  { pokemonId: 643,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(1), ribbonText: "Event Pokemon" },  // Reshiram
  { pokemonId: 644,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(2), ribbonText: "Event Pokemon" },  // Zekrom
  { pokemonId: 716,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(3), ribbonText: "Event Pokemon" },  // Xerneas
  { pokemonId: 717,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(4), ribbonText: "Event Pokemon" },  // Yveltal
  { pokemonId: 791,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(5), ribbonText: "Event Pokemon" },  // Solgaleo
  { pokemonId: 792,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(0), ribbonText: "Event Pokemon" },  // Lunala
  { pokemonId: 888,  level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(1), ribbonText: "Event Pokemon" },  // Zacian
  { pokemonId: 1007, level: 70, ballType: "master-ball", perfectIvStats: fivePerfectIVs(2), ribbonText: "Event Pokemon" },  // Miraidon
];

// ──────────────────────────────────────────────
// Holiday calendar + daily gift picker
// ──────────────────────────────────────────────
export const HOLIDAY_DATES: Record<string, string> = {
  "01-01": "New Year",
  "02-14": "Valentine's Day",
  "02-27": "Pokemon Day",
  "07-04": "Independence Day",
  "10-31": "Halloween",
  "12-25": "Christmas",
};

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTodaysGift(): { gift: MysteryGiftDefinition; reason: string } {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const monthDay = dateStr.slice(5); // MM-DD
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const seed = dateSeed(dateStr);

  // Check holidays first
  if (HOLIDAY_DATES[monthDay]) {
    const idx = seed % LEGENDARY_GIFTS.length;
    return { gift: LEGENDARY_GIFTS[idx], reason: `${HOLIDAY_DATES[monthDay]} Special!` };
  }

  // Weekends = starters
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const idx = seed % STARTER_GIFTS.length;
    return { gift: STARTER_GIFTS[idx], reason: "Weekend Starter Gift" };
  }

  // Weekdays = regular
  const idx = seed % REGULAR_GIFTS.length;
  return { gift: REGULAR_GIFTS[idx], reason: "Daily Gift" };
}
