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
export type StatKey = (typeof STAT_KEYS)[number];

// Abbreviated stat labels for compact display
export const STAT_LABELS_SHORT = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;

// Battle mechanics
export const CRIT_RATE = 1 / 16;
export const STAT_STAGE_MIN = -6;
export const STAT_STAGE_MAX = 6;
export const DRASTIC_THRESHOLD = 2;
export const SLEEP_TURN_MIN = 1;
export const SLEEP_TURN_RANGE = 3;

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

// Rate limiting
export const SHARE_RATE_LIMIT_PER_HOUR = 10;
