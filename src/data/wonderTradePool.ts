export interface WonderTradePoolEntry {
  pokemonId: number;
  rarity: "common" | "uncommon" | "rare" | "ultra_rare";
}

export const WONDER_TRADE_POOL: WonderTradePoolEntry[] = [
  // ── Common (70%) — Regular Pokemon from all regions ──────────────────
  { pokemonId: 16, rarity: "common" },   // Pidgey
  { pokemonId: 19, rarity: "common" },   // Rattata
  { pokemonId: 10, rarity: "common" },   // Caterpie
  { pokemonId: 13, rarity: "common" },   // Weedle
  { pokemonId: 41, rarity: "common" },   // Zubat
  { pokemonId: 74, rarity: "common" },   // Geodude
  { pokemonId: 66, rarity: "common" },   // Machop
  { pokemonId: 63, rarity: "common" },   // Abra
  { pokemonId: 129, rarity: "common" },  // Magikarp
  { pokemonId: 72, rarity: "common" },   // Tentacool
  { pokemonId: 60, rarity: "common" },   // Poliwag
  { pokemonId: 43, rarity: "common" },   // Oddish
  { pokemonId: 69, rarity: "common" },   // Bellsprout
  { pokemonId: 79, rarity: "common" },   // Slowpoke
  { pokemonId: 54, rarity: "common" },   // Psyduck
  { pokemonId: 161, rarity: "common" },  // Sentret
  { pokemonId: 163, rarity: "common" },  // Hoothoot
  { pokemonId: 165, rarity: "common" },  // Ledyba
  { pokemonId: 167, rarity: "common" },  // Spinarak
  { pokemonId: 183, rarity: "common" },  // Marill
  { pokemonId: 187, rarity: "common" },  // Hoppip
  { pokemonId: 194, rarity: "common" },  // Wooper
  { pokemonId: 263, rarity: "common" },  // Zigzagoon
  { pokemonId: 265, rarity: "common" },  // Wurmple
  { pokemonId: 270, rarity: "common" },  // Lotad
  { pokemonId: 273, rarity: "common" },  // Seedot
  { pokemonId: 278, rarity: "common" },  // Wingull
  { pokemonId: 280, rarity: "common" },  // Ralts
  { pokemonId: 287, rarity: "common" },  // Slakoth
  { pokemonId: 293, rarity: "common" },  // Whismur
  { pokemonId: 296, rarity: "common" },  // Makuhita
  { pokemonId: 299, rarity: "common" },  // Nosepass
  { pokemonId: 399, rarity: "common" },  // Bidoof
  { pokemonId: 396, rarity: "common" },  // Starly
  { pokemonId: 403, rarity: "common" },  // Shinx
  { pokemonId: 401, rarity: "common" },  // Kricketot
  { pokemonId: 406, rarity: "common" },  // Budew
  { pokemonId: 504, rarity: "common" },  // Patrat
  { pokemonId: 506, rarity: "common" },  // Lillipup
  { pokemonId: 509, rarity: "common" },  // Purrloin
  { pokemonId: 519, rarity: "common" },  // Pidove
  { pokemonId: 524, rarity: "common" },  // Roggenrola
  { pokemonId: 527, rarity: "common" },  // Woobat
  { pokemonId: 661, rarity: "common" },  // Fletchling
  { pokemonId: 659, rarity: "common" },  // Bunnelby
  { pokemonId: 667, rarity: "common" },  // Litleo
  { pokemonId: 664, rarity: "common" },  // Scatterbug
  { pokemonId: 734, rarity: "common" },  // Yungoos
  { pokemonId: 731, rarity: "common" },  // Pikipek
  { pokemonId: 736, rarity: "common" },  // Grubbin
  { pokemonId: 819, rarity: "common" },  // Skwovet
  { pokemonId: 821, rarity: "common" },  // Rookidee
  { pokemonId: 831, rarity: "common" },  // Wooloo
  { pokemonId: 827, rarity: "common" },  // Nickit
  { pokemonId: 915, rarity: "common" },  // Lechonk
  { pokemonId: 917, rarity: "common" },  // Tarountula
  { pokemonId: 921, rarity: "common" },  // Pawmi

  // ── Uncommon (20%) — Pseudo-legendary first stages, popular Pokemon ──
  { pokemonId: 147, rarity: "uncommon" }, // Dratini
  { pokemonId: 246, rarity: "uncommon" }, // Larvitar
  { pokemonId: 371, rarity: "uncommon" }, // Bagon
  { pokemonId: 374, rarity: "uncommon" }, // Beldum
  { pokemonId: 443, rarity: "uncommon" }, // Gible
  { pokemonId: 633, rarity: "uncommon" }, // Deino
  { pokemonId: 704, rarity: "uncommon" }, // Goomy
  { pokemonId: 782, rarity: "uncommon" }, // Jangmo-o
  { pokemonId: 885, rarity: "uncommon" }, // Dreepy
  { pokemonId: 996, rarity: "uncommon" }, // Frigibax
  { pokemonId: 133, rarity: "uncommon" }, // Eevee
  { pokemonId: 25, rarity: "uncommon" },  // Pikachu
  { pokemonId: 447, rarity: "uncommon" }, // Riolu
  { pokemonId: 58, rarity: "uncommon" },  // Growlithe
  { pokemonId: 37, rarity: "uncommon" },  // Vulpix
  { pokemonId: 77, rarity: "uncommon" },  // Ponyta
  { pokemonId: 123, rarity: "uncommon" }, // Scyther
  { pokemonId: 127, rarity: "uncommon" }, // Pinsir
  { pokemonId: 131, rarity: "uncommon" }, // Lapras
  { pokemonId: 143, rarity: "uncommon" }, // Snorlax
  { pokemonId: 175, rarity: "uncommon" }, // Togepi
  { pokemonId: 215, rarity: "uncommon" }, // Sneasel
  { pokemonId: 227, rarity: "uncommon" }, // Skarmory
  { pokemonId: 241, rarity: "uncommon" }, // Miltank
  { pokemonId: 328, rarity: "uncommon" }, // Trapinch
  { pokemonId: 359, rarity: "uncommon" }, // Absol
  { pokemonId: 349, rarity: "uncommon" }, // Feebas
  { pokemonId: 361, rarity: "uncommon" }, // Snorunt
  { pokemonId: 679, rarity: "uncommon" }, // Honedge
  { pokemonId: 778, rarity: "uncommon" }, // Mimikyu
  { pokemonId: 610, rarity: "uncommon" }, // Axew
  { pokemonId: 570, rarity: "uncommon" }, // Zorua
  { pokemonId: 551, rarity: "uncommon" }, // Sandile
  { pokemonId: 607, rarity: "uncommon" }, // Litwick

  // ── Rare (8%) — Fossil Pokemon, version exclusives, starters ─────────
  { pokemonId: 138, rarity: "rare" },     // Omanyte
  { pokemonId: 140, rarity: "rare" },     // Kabuto
  { pokemonId: 142, rarity: "rare" },     // Aerodactyl
  { pokemonId: 345, rarity: "rare" },     // Lileep
  { pokemonId: 347, rarity: "rare" },     // Anorith
  { pokemonId: 408, rarity: "rare" },     // Cranidos
  { pokemonId: 410, rarity: "rare" },     // Shieldon
  { pokemonId: 564, rarity: "rare" },     // Tirtouga
  { pokemonId: 566, rarity: "rare" },     // Archen
  { pokemonId: 696, rarity: "rare" },     // Tyrunt
  { pokemonId: 698, rarity: "rare" },     // Amaura
  { pokemonId: 1, rarity: "rare" },       // Bulbasaur
  { pokemonId: 4, rarity: "rare" },       // Charmander
  { pokemonId: 7, rarity: "rare" },       // Squirtle
  { pokemonId: 152, rarity: "rare" },     // Chikorita
  { pokemonId: 155, rarity: "rare" },     // Cyndaquil
  { pokemonId: 158, rarity: "rare" },     // Totodile
  { pokemonId: 252, rarity: "rare" },     // Treecko
  { pokemonId: 255, rarity: "rare" },     // Torchic
  { pokemonId: 258, rarity: "rare" },     // Mudkip
  { pokemonId: 387, rarity: "rare" },     // Turtwig
  { pokemonId: 390, rarity: "rare" },     // Chimchar
  { pokemonId: 393, rarity: "rare" },     // Piplup
  { pokemonId: 495, rarity: "rare" },     // Snivy
  { pokemonId: 498, rarity: "rare" },     // Tepig
  { pokemonId: 501, rarity: "rare" },     // Oshawott
  { pokemonId: 650, rarity: "rare" },     // Chespin
  { pokemonId: 653, rarity: "rare" },     // Fennekin
  { pokemonId: 656, rarity: "rare" },     // Froakie
  { pokemonId: 722, rarity: "rare" },     // Rowlet
  { pokemonId: 725, rarity: "rare" },     // Litten
  { pokemonId: 728, rarity: "rare" },     // Popplio
  { pokemonId: 810, rarity: "rare" },     // Grookey
  { pokemonId: 813, rarity: "rare" },     // Scorbunny
  { pokemonId: 816, rarity: "rare" },     // Sobble
  { pokemonId: 906, rarity: "rare" },     // Sprigatito
  { pokemonId: 909, rarity: "rare" },     // Fuecoco
  { pokemonId: 912, rarity: "rare" },     // Quaxly

  // ── Ultra Rare (2%) — Baby Pokemon with special vibes ────────────────
  { pokemonId: 446, rarity: "ultra_rare" }, // Munchlax
  { pokemonId: 440, rarity: "ultra_rare" }, // Happiny
  { pokemonId: 438, rarity: "ultra_rare" }, // Bonsly
  { pokemonId: 439, rarity: "ultra_rare" }, // Mime Jr.
  { pokemonId: 360, rarity: "ultra_rare" }, // Wynaut
  { pokemonId: 298, rarity: "ultra_rare" }, // Azurill
  { pokemonId: 173, rarity: "ultra_rare" }, // Cleffa
  { pokemonId: 174, rarity: "ultra_rare" }, // Igglybuff
  { pokemonId: 172, rarity: "ultra_rare" }, // Pichu
  { pokemonId: 238, rarity: "ultra_rare" }, // Smoochum
  { pokemonId: 239, rarity: "ultra_rare" }, // Elekid
  { pokemonId: 240, rarity: "ultra_rare" }, // Magby
  { pokemonId: 236, rarity: "ultra_rare" }, // Tyrogue
  { pokemonId: 433, rarity: "ultra_rare" }, // Chingling
  { pokemonId: 458, rarity: "ultra_rare" }, // Mantyke
  { pokemonId: 489, rarity: "ultra_rare" }, // Phione
];

/**
 * Pick a random Pokemon from the Wonder Trade pool using weighted rarity tiers.
 *
 * Rarity distribution:
 *  - ultra_rare: 2%
 *  - rare:       8%
 *  - uncommon:  20%
 *  - common:    70%
 */
export function pickRandomFromPool(): WonderTradePoolEntry {
  const roll = Math.random();
  let tier: WonderTradePoolEntry["rarity"];
  if (roll < 0.02) tier = "ultra_rare";
  else if (roll < 0.10) tier = "rare";
  else if (roll < 0.30) tier = "uncommon";
  else tier = "common";

  const candidates = WONDER_TRADE_POOL.filter(p => p.rarity === tier);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
