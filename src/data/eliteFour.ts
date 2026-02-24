import { EliteFourMember } from "@/types";

export const ELITE_FOUR: EliteFourMember[] = [
  // ── E4 #1: Lorelei ──────────────────────────────────────────────
  {
    name: "Lorelei",
    title: "Ice Master",
    specialty: "ice",
    quote: "No one can best me when it comes to icy Pokemon!",
    prizeMoney: 5500,
    team: [
      {
        pokemonId: 87, // Dewgong
        moves: ["ice-beam", "surf", "signal-beam", "aqua-jet"],
        ability: "thick-fat",
        nature: "modest",
        heldItem: "leftovers",
      },
      {
        pokemonId: 91, // Cloyster
        moves: ["icicle-spear", "shell-smash", "rock-blast", "hydro-pump"],
        ability: "skill-link",
        nature: "jolly",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 80, // Slowbro
        moves: ["ice-beam", "scald", "psychic", "slack-off"],
        ability: "regenerator",
        nature: "bold",
        heldItem: "rocky-helmet",
      },
      {
        pokemonId: 124, // Jynx
        moves: ["ice-beam", "psychic", "lovely-kiss", "focus-blast"],
        ability: "dry-skin",
        nature: "timid",
        heldItem: "choice-scarf",
      },
      {
        pokemonId: 131, // Lapras
        moves: ["ice-beam", "thunderbolt", "hydro-pump", "freeze-dry"],
        ability: "water-absorb",
        nature: "modest",
        heldItem: "life-orb",
      },
    ],
  },

  // ── E4 #2: Bruno ────────────────────────────────────────────────
  {
    name: "Bruno",
    title: "Fighting Expert",
    specialty: "fighting",
    quote: "We will grind you down with our superior power!",
    prizeMoney: 5500,
    team: [
      {
        pokemonId: 95, // Onix
        moves: ["earthquake", "rock-slide", "stealth-rock", "explosion"],
        ability: "sturdy",
        nature: "impish",
        heldItem: "custap-berry",
      },
      {
        pokemonId: 107, // Hitmonchan
        moves: ["close-combat", "ice-punch", "thunder-punch", "mach-punch"],
        ability: "iron-fist",
        nature: "adamant",
        heldItem: "life-orb",
      },
      {
        pokemonId: 106, // Hitmonlee
        moves: ["high-jump-kick", "knock-off", "stone-edge", "blaze-kick"],
        ability: "reckless",
        nature: "jolly",
        heldItem: "choice-band",
      },
      {
        pokemonId: 68, // Machamp
        moves: ["cross-chop", "knock-off", "bullet-punch", "stone-edge"],
        ability: "no-guard",
        nature: "adamant",
        heldItem: "assault-vest",
      },
      {
        pokemonId: 62, // Poliwrath
        moves: ["close-combat", "waterfall", "ice-punch", "earthquake"],
        ability: "swift-swim",
        nature: "adamant",
        heldItem: "sitrus-berry",
      },
    ],
  },

  // ── E4 #3: Agatha ───────────────────────────────────────────────
  {
    name: "Agatha",
    title: "Ghost Mistress",
    specialty: "ghost",
    quote: "I'll show you true terror!",
    prizeMoney: 5500,
    team: [
      {
        pokemonId: 94, // Gengar #1
        moves: ["shadow-ball", "sludge-bomb", "thunderbolt", "destiny-bond"],
        ability: "cursed-body",
        nature: "timid",
        heldItem: "focus-sash",
      },
      {
        pokemonId: 94, // Gengar #2
        moves: ["shadow-ball", "focus-blast", "energy-ball", "nasty-plot"],
        ability: "cursed-body",
        nature: "timid",
        heldItem: "life-orb",
      },
      {
        pokemonId: 93, // Haunter
        moves: ["shadow-ball", "sludge-bomb", "dark-pulse", "will-o-wisp"],
        ability: "levitate",
        nature: "timid",
        heldItem: "eviolite",
      },
      {
        pokemonId: 24, // Arbok
        moves: ["gunk-shot", "earthquake", "glare", "sucker-punch"],
        ability: "intimidate",
        nature: "jolly",
        heldItem: "black-sludge",
      },
      {
        pokemonId: 429, // Mismagius
        moves: ["shadow-ball", "power-gem", "mystical-fire", "nasty-plot"],
        ability: "levitate",
        nature: "timid",
        heldItem: "choice-specs",
      },
    ],
  },

  // ── E4 #4: Lance ────────────────────────────────────────────────
  {
    name: "Lance",
    title: "Dragon Tamer",
    specialty: "dragon",
    quote: "You dare challenge the might of dragons?",
    prizeMoney: 6000,
    team: [
      {
        pokemonId: 130, // Gyarados
        moves: ["waterfall", "dragon-dance", "earthquake", "ice-fang"],
        ability: "intimidate",
        nature: "jolly",
        heldItem: "sitrus-berry",
      },
      {
        pokemonId: 148, // Dragonair #1
        moves: ["dragon-pulse", "thunderbolt", "ice-beam", "aqua-tail"],
        ability: "shed-skin",
        nature: "modest",
        heldItem: "eviolite",
      },
      {
        pokemonId: 148, // Dragonair #2
        moves: ["dragon-pulse", "fire-blast", "surf", "thunder-wave"],
        ability: "shed-skin",
        nature: "calm",
        heldItem: "leftovers",
      },
      {
        pokemonId: 142, // Aerodactyl
        moves: ["stone-edge", "earthquake", "aerial-ace", "crunch"],
        ability: "rock-head",
        nature: "jolly",
        heldItem: "choice-band",
      },
      {
        pokemonId: 149, // Dragonite
        moves: ["outrage", "earthquake", "extreme-speed", "dragon-dance"],
        ability: "multiscale",
        nature: "adamant",
        heldItem: "lum-berry",
      },
    ],
  },

  // ── Champion: Blue ──────────────────────────────────────────────
  {
    name: "Champion Blue",
    title: "Pokemon Champion",
    specialty: "mixed",
    quote: "I am the most powerful trainer in the world!",
    prizeMoney: 11000,
    team: [
      {
        pokemonId: 18, // Pidgeot
        moves: ["brave-bird", "u-turn", "roost", "heat-wave"],
        ability: "keen-eye",
        nature: "timid",
        heldItem: "choice-specs",
        evSpread: { hp: 4, attack: 0, defense: 0, spAtk: 252, spDef: 0, speed: 252 },
      },
      {
        pokemonId: 65, // Alakazam
        moves: ["psychic", "shadow-ball", "focus-blast", "energy-ball"],
        ability: "magic-guard",
        nature: "timid",
        heldItem: "life-orb",
        evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
      },
      {
        pokemonId: 112, // Rhydon
        moves: ["earthquake", "stone-edge", "megahorn", "stealth-rock"],
        ability: "lightning-rod",
        nature: "adamant",
        heldItem: "eviolite",
        evSpread: { hp: 252, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 0 },
      },
      {
        pokemonId: 59, // Arcanine
        moves: ["flare-blitz", "extreme-speed", "wild-charge", "close-combat"],
        ability: "intimidate",
        nature: "adamant",
        heldItem: "choice-band",
        evSpread: { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 },
      },
      {
        pokemonId: 103, // Exeggutor
        moves: ["leaf-storm", "psychic", "giga-drain", "sleep-powder"],
        ability: "chlorophyll",
        nature: "modest",
        heldItem: "sitrus-berry",
        evSpread: { hp: 252, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 0 },
      },
      {
        pokemonId: 130, // Gyarados
        moves: ["waterfall", "dragon-dance", "earthquake", "ice-fang"],
        ability: "intimidate",
        nature: "jolly",
        heldItem: "leftovers",
        evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
      },
    ],
  },
];
