// Shiny encounter rate (1 in 4096, matches mainline games Gen 6+)
export const SHINY_RATE = 1 / 4096;

// ELO rating system constants
export const ELO_K_FACTOR_LOW = 40; // K-factor for ratings below 1200
export const ELO_K_FACTOR_MID = 32; // K-factor for ratings 1200-1599
export const ELO_K_FACTOR_HIGH = 24; // K-factor for ratings 1600+
export const ELO_K_THRESHOLD_LOW = 1200;
export const ELO_K_THRESHOLD_HIGH = 1600;
export const ELO_SCALE_FACTOR = 400; // Divisor in expected score formula
export const ELO_MINIMUM = 100;

// Stat keys matching BaseStats/EVSpread/IVSpread property names
export const STAT_KEYS = ["hp", "attack", "defense", "spAtk", "spDef", "speed"] as const;
export type AllStatKey = (typeof STAT_KEYS)[number];

// Abbreviated stat labels for compact display
export const STAT_LABELS_SHORT = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;

// Battle mechanics
export const CRIT_STAGE_RATES = [1 / 24, 1 / 8, 1 / 2, 1, 1]; // stages 0-4, Gen 7+
export const HIGH_CRIT_MOVES = new Set([
  "slash", "stone-edge", "cross-chop", "psycho-cut", "night-slash",
  "leaf-blade", "drill-run", "crabhammer", "shadow-claw", "cross-poison",
  "air-cutter", "attack-order", "razor-leaf", "karate-chop", "aeroblast",
  "spacial-rend", "blaze-kick", "poison-tail", "razor-wind", "sky-attack",
]);
export const STAT_STAGE_MIN = -6;
export const STAT_STAGE_MAX = 6;
export const DRASTIC_THRESHOLD = 2;
export const SLEEP_TURN_MIN = 1;
export const SLEEP_TURN_RANGE = 3;
export const CONFUSION_TURN_MIN = 2;
export const CONFUSION_TURN_RANGE = 4; // 2-5 turns
export const CONFUSION_SELF_HIT_CHANCE = 1 / 3;
export const CONFUSION_SELF_HIT_POWER = 40;

// UI timing constants (ms)
export const DROPDOWN_BLUR_DELAY = 200;
export const TOAST_DURATION = 2000;

// Share upload size limits (bytes)
export const SHARE_MAX_TRAINER_CARD = 200 * 1024; // 200KB
export const SHARE_MAX_REPLAY = 500 * 1024; // 500KB
export const SHARE_MAX_CHALLENGE = 50 * 1024; // 50KB
export const SHARE_EXPIRY_DAYS = 30;

// Leaderboard limits
export const LEADERBOARD_MAX_ENTRIES = 100;
export const LEADERBOARD_MAX_NAME_LENGTH = 20;
export const LEADERBOARD_MAX_ELO = 9999;
export const LEADERBOARD_MAX_STREAK = 999;
export const LEADERBOARD_RATE_LIMIT_PER_HOUR = 5;

// Self-stat drop moves — applied to the attacker after dealing damage
export const SELF_STAT_DROP_MOVES: Record<string, { stat: string; stages: number }[]> = {
  "close-combat": [{ stat: "defense", stages: -1 }, { stat: "spDef", stages: -1 }],
  "superpower": [{ stat: "attack", stages: -1 }, { stat: "defense", stages: -1 }],
  "overheat": [{ stat: "spAtk", stages: -2 }],
  "draco-meteor": [{ stat: "spAtk", stages: -2 }],
  "leaf-storm": [{ stat: "spAtk", stages: -2 }],
  "psycho-boost": [{ stat: "spAtk", stages: -2 }],
  "hammer-arm": [{ stat: "speed", stages: -1 }],
  "v-create": [{ stat: "defense", stages: -1 }, { stat: "spDef", stages: -1 }, { stat: "speed", stages: -1 }],
};

// Contact moves — used for Rocky Helmet, Tough Claws, etc.
export const CONTACT_MOVES = new Set([
  "tackle", "body-slam", "double-edge", "take-down", "headbutt",
  "slam", "stomp", "mega-kick", "jump-kick", "hi-jump-kick",
  "low-kick", "karate-chop", "submission", "seismic-toss",
  "scratch", "slash", "fury-swipes", "cut", "x-scissor",
  "aerial-ace", "wing-attack", "brave-bird", "drill-peck", "fly",
  "peck", "acrobatics", "bounce", "sky-attack", "pluck",
  "waterfall", "aqua-tail", "crabhammer", "liquidation", "dive",
  "wave-crash", "flip-turn",
  "thunder-punch", "ice-punch", "fire-punch", "drain-punch",
  "mach-punch", "mega-punch", "focus-punch", "sky-uppercut",
  "shadow-punch", "bullet-punch", "hammer-arm", "power-up-punch",
  "close-combat", "superpower", "cross-chop",
  "crunch", "bite", "fire-fang", "ice-fang", "thunder-fang",
  "poison-fang", "psychic-fangs", "jaw-lock", "fishious-rend",
  "wild-charge", "volt-tackle", "spark", "nuzzle",
  "flare-blitz", "flame-charge", "blaze-kick", "fire-lash",
  "iron-head", "iron-tail", "meteor-mash", "steel-wing", "smart-strike",
  "zen-headbutt", "psycho-cut", "heart-stamp",
  "poison-jab", "cross-poison", "gunk-shot",
  "earthquake", "bulldoze", "drill-run", "stomping-tantrum",
  "rock-slide", "stone-edge", "rock-tomb", "head-smash",
  "shadow-claw", "shadow-sneak", "phantom-force",
  "dragon-claw", "dragon-rush", "outrage", "dragon-tail",
  "wood-hammer", "leaf-blade", "power-whip", "seed-bomb",
  "u-turn", "leech-life", "bug-bite", "megahorn", "lunge",
  "play-rough", "spirit-break",
  "knock-off", "sucker-punch", "darkest-lariat", "throat-chop",
  "icicle-crash", "ice-shard", "triple-axel",
  "return", "frustration", "facade", "extreme-speed", "quick-attack",
  "fake-out", "rapid-spin", "covet", "thief",
  "v-create",
]);

// Rate limiting
export const SHARE_RATE_LIMIT_PER_HOUR = 10;
