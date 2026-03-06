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

// UI timing constants (ms)
export const DROPDOWN_BLUR_DELAY = 200;
export const TOAST_DURATION = 2000;
