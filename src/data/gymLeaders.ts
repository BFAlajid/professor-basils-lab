import { EliteFourMember } from "@/types";

export const GYM_BADGE_NAMES = [
  "Boulder",
  "Cascade",
  "Thunder",
  "Rainbow",
  "Soul",
  "Marsh",
  "Volcano",
  "Earth",
] as const;

export const GYM_LEADERS: EliteFourMember[] = [
  // ── Gym #1: Brock ── Boulder Badge ─────────────────────────────────
  {
    name: "Brock",
    title: "Boulder Badge",
    specialty: "rock",
    quote: "My rock-hard willpower is evident even in my Pokemon!",
    prizeMoney: 1680,
    team: [
      {
        pokemonId: 74, // Geodude
        moves: ["rock-slide", "earthquake", "sucker-punch", "stealth-rock"],
        ability: "sturdy",
        nature: "adamant",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 95, // Onix
        moves: ["stone-edge", "earthquake", "iron-tail", "dragon-tail"],
        ability: "sturdy",
        nature: "jolly",
        heldItem: "eviolite",
      },
      {
        pokemonId: 76, // Golem
        moves: ["stone-edge", "earthquake", "explosion", "fire-punch"],
        ability: "sturdy",
        nature: "adamant",
        heldItem: "choice-band",
      },
    ],
  },

  // ── Gym #2: Misty ── Cascade Badge ─────────────────────────────────
  {
    name: "Misty",
    title: "Cascade Badge",
    specialty: "water",
    quote: "My policy is an all-out offensive with water Pokemon!",
    prizeMoney: 2100,
    team: [
      {
        pokemonId: 121, // Starmie
        moves: ["hydro-pump", "ice-beam", "thunderbolt", "psychic"],
        ability: "natural-cure",
        nature: "timid",
        heldItem: "life-orb",
      },
      {
        pokemonId: 55, // Golduck
        moves: ["surf", "ice-beam", "psyshock", "calm-mind"],
        ability: "cloud-nine",
        nature: "modest",
        heldItem: "leftovers",
      },
      {
        pokemonId: 130, // Gyarados
        moves: ["waterfall", "dragon-dance", "earthquake", "ice-fang"],
        ability: "intimidate",
        nature: "jolly",
        heldItem: "sitrus-berry",
      },
    ],
  },

  // ── Gym #3: Lt. Surge ── Thunder Badge ─────────────────────────────
  {
    name: "Lt. Surge",
    title: "Thunder Badge",
    specialty: "electric",
    quote: "I tell you, kid, electric Pokemon saved me during the war!",
    prizeMoney: 2520,
    team: [
      {
        pokemonId: 101, // Electrode
        moves: ["thunderbolt", "volt-switch", "signal-beam", "explosion"],
        ability: "aftermath",
        nature: "timid",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 26, // Raichu
        moves: ["thunderbolt", "surf", "nasty-plot", "focus-blast"],
        ability: "lightning-rod",
        nature: "timid",
        heldItem: "life-orb",
      },
      {
        pokemonId: 135, // Jolteon
        moves: ["thunder", "shadow-ball", "volt-switch", "hidden-power"],
        ability: "volt-absorb",
        nature: "timid",
        heldItem: "choice-specs",
      },
    ],
  },

  // ── Gym #4: Erika ── Rainbow Badge ─────────────────────────────────
  {
    name: "Erika",
    title: "Rainbow Badge",
    specialty: "grass",
    quote: "I am a student of the art of flower arranging... and Pokemon!",
    prizeMoney: 2940,
    team: [
      {
        pokemonId: 71, // Victreebel
        moves: ["leaf-blade", "sludge-bomb", "sucker-punch", "sleep-powder"],
        ability: "chlorophyll",
        nature: "adamant",
        heldItem: "life-orb",
      },
      {
        pokemonId: 45, // Vileplume
        moves: ["giga-drain", "sludge-bomb", "sleep-powder", "moonblast"],
        ability: "effect-spore",
        nature: "bold",
        heldItem: "black-sludge",
      },
      {
        pokemonId: 114, // Tangela
        moves: ["leaf-storm", "sleep-powder", "knock-off", "hidden-power"],
        ability: "regenerator",
        nature: "bold",
        heldItem: "eviolite",
      },
      {
        pokemonId: 103, // Exeggutor
        moves: ["psychic", "giga-drain", "sleep-powder", "leaf-storm"],
        ability: "chlorophyll",
        nature: "modest",
        heldItem: "choice-specs",
      },
    ],
  },

  // ── Gym #5: Koga ── Soul Badge ─────────────────────────────────────
  {
    name: "Koga",
    title: "Soul Badge",
    specialty: "poison",
    quote: "Fwahaha! A Pokemon battle is like a ninja duel!",
    prizeMoney: 3360,
    team: [
      {
        pokemonId: 110, // Weezing
        moves: ["sludge-bomb", "will-o-wisp", "pain-split", "fire-blast"],
        ability: "levitate",
        nature: "bold",
        heldItem: "black-sludge",
      },
      {
        pokemonId: 89, // Muk
        moves: ["gunk-shot", "ice-punch", "shadow-sneak", "curse"],
        ability: "poison-touch",
        nature: "adamant",
        heldItem: "assault-vest",
      },
      {
        pokemonId: 94, // Gengar
        moves: ["shadow-ball", "sludge-bomb", "focus-blast", "nasty-plot"],
        ability: "cursed-body",
        nature: "timid",
        heldItem: "life-orb",
      },
      {
        pokemonId: 169, // Crobat
        moves: ["brave-bird", "cross-poison", "u-turn", "defog"],
        ability: "infiltrator",
        nature: "jolly",
        heldItem: "choice-band",
      },
    ],
  },

  // ── Gym #6: Sabrina ── Marsh Badge ─────────────────────────────────
  {
    name: "Sabrina",
    title: "Marsh Badge",
    specialty: "psychic",
    quote: "I had a vision of your arrival... and your defeat!",
    prizeMoney: 3780,
    team: [
      {
        pokemonId: 65, // Alakazam
        moves: ["psychic", "shadow-ball", "focus-blast", "energy-ball"],
        ability: "magic-guard",
        nature: "timid",
        heldItem: "life-orb",
      },
      {
        pokemonId: 196, // Espeon
        moves: ["psyshock", "shadow-ball", "dazzling-gleam", "calm-mind"],
        ability: "magic-bounce",
        nature: "timid",
        heldItem: "leftovers",
      },
      {
        pokemonId: 122, // Mr. Mime
        moves: ["psychic", "dazzling-gleam", "focus-blast", "nasty-plot"],
        ability: "filter",
        nature: "modest",
        heldItem: "choice-specs",
      },
      {
        pokemonId: 124, // Jynx
        moves: ["ice-beam", "psychic", "lovely-kiss", "focus-blast"],
        ability: "dry-skin",
        nature: "timid",
        heldItem: "focus-sash",
      },
    ],
  },

  // ── Gym #7: Blaine ── Volcano Badge ────────────────────────────────
  {
    name: "Blaine",
    title: "Volcano Badge",
    specialty: "fire",
    quote: "Hah! My fire burns with the intensity of a volcano!",
    prizeMoney: 4200,
    team: [
      {
        pokemonId: 59, // Arcanine
        moves: ["flare-blitz", "extreme-speed", "wild-charge", "close-combat"],
        ability: "intimidate",
        nature: "adamant",
        heldItem: "choice-band",
      },
      {
        pokemonId: 126, // Magmar
        moves: ["fire-blast", "thunderbolt", "focus-blast", "psychic"],
        ability: "vital-spirit",
        nature: "modest",
        heldItem: "life-orb",
      },
      {
        pokemonId: 78, // Rapidash
        moves: ["flare-blitz", "high-horsepower", "wild-charge", "morning-sun"],
        ability: "flash-fire",
        nature: "jolly",
        heldItem: "leftovers",
      },
      {
        pokemonId: 38, // Ninetales
        moves: ["fire-blast", "solar-beam", "nasty-plot", "will-o-wisp"],
        ability: "drought",
        nature: "timid",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 136, // Flareon
        moves: ["flare-blitz", "superpower", "quick-attack", "toxic"],
        ability: "guts",
        nature: "adamant",
        heldItem: "toxic-orb",
      },
    ],
  },

  // ── Gym #8: Giovanni ── Earth Badge ────────────────────────────────
  {
    name: "Giovanni",
    title: "Earth Badge",
    specialty: "ground",
    quote: "I, the leader of Team Rocket, shall make you feel the earth tremble!",
    prizeMoney: 5040,
    team: [
      {
        pokemonId: 34, // Nidoking
        moves: ["earth-power", "sludge-wave", "ice-beam", "thunderbolt"],
        ability: "sheer-force",
        nature: "modest",
        heldItem: "life-orb",
      },
      {
        pokemonId: 51, // Dugtrio
        moves: ["earthquake", "stone-edge", "sucker-punch", "stealth-rock"],
        ability: "arena-trap",
        nature: "jolly",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 112, // Rhydon
        moves: ["earthquake", "stone-edge", "megahorn", "ice-punch"],
        ability: "lightning-rod",
        nature: "adamant",
        heldItem: "eviolite",
      },
      {
        pokemonId: 105, // Marowak
        moves: ["earthquake", "stone-edge", "fire-punch", "swords-dance"],
        ability: "rock-head",
        nature: "adamant",
        heldItem: "thick-club",
      },
      {
        pokemonId: 28, // Sandslash
        moves: ["earthquake", "stone-edge", "knock-off", "rapid-spin"],
        ability: "sand-rush",
        nature: "jolly",
        heldItem: "choice-band",
      },
    ],
  },
];
