import { type PlayerStats, DEFAULT_STATS } from "@/hooks/useAchievementsReducer";

const VALID_BALL_TYPES = new Set([
  "poke-ball", "great-ball", "ultra-ball", "master-ball",
  "quick-ball", "dusk-ball", "timer-ball", "net-ball",
  "repeat-ball", "luxury-ball", "premier-ball", "dive-ball",
  "nest-ball", "heal-ball",
]);

const VALID_POKEMON_TYPES = new Set([
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic",
  "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
]);

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== "number" || !isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function nonNegNumber(val: unknown, fallback: number): number {
  if (typeof val !== "number" || !isFinite(val)) return fallback;
  return Math.max(0, Math.floor(val));
}

function validString(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  return val;
}

function validStringArray(val: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string" && allowed.has(v));
}

function validKantoArray(val: unknown): number[] {
  if (!Array.isArray(val)) return [];
  return [...new Set(
    val.filter((v): v is number =>
      typeof v === "number" && isFinite(v) && v >= 1 && v <= 151 && v === Math.floor(v)
    )
  )];
}

export function validatePlayerStats(raw: unknown): PlayerStats {
  if (raw == null || typeof raw !== "object") return { ...DEFAULT_STATS };
  const r = raw as Record<string, unknown>;

  return {
    totalCaught: nonNegNumber(r.totalCaught, DEFAULT_STATS.totalCaught),
    totalBattlesWon: nonNegNumber(r.totalBattlesWon, DEFAULT_STATS.totalBattlesWon),
    totalBattlesPlayed: nonNegNumber(r.totalBattlesPlayed, DEFAULT_STATS.totalBattlesPlayed),
    uniqueSpeciesCaught: nonNegNumber(r.uniqueSpeciesCaught, DEFAULT_STATS.uniqueSpeciesCaught),
    shinyCaught: nonNegNumber(r.shinyCaught, DEFAULT_STATS.shinyCaught),
    legendsCaught: nonNegNumber(r.legendsCaught, DEFAULT_STATS.legendsCaught),
    totalTeamsBuilt: nonNegNumber(r.totalTeamsBuilt, DEFAULT_STATS.totalTeamsBuilt),
    gbaImports: nonNegNumber(r.gbaImports, DEFAULT_STATS.gbaImports),
    ballsThrown: nonNegNumber(r.ballsThrown, DEFAULT_STATS.ballsThrown),
    criticalHits: nonNegNumber(r.criticalHits, DEFAULT_STATS.criticalHits),
    superEffectiveHits: nonNegNumber(r.superEffectiveHits, DEFAULT_STATS.superEffectiveHits),
    winStreak: nonNegNumber(r.winStreak, DEFAULT_STATS.winStreak),
    bestWinStreak: nonNegNumber(r.bestWinStreak, DEFAULT_STATS.bestWinStreak),
    uniqueBallTypesUsed: validStringArray(r.uniqueBallTypesUsed, VALID_BALL_TYPES),
    uniqueTypesOwned: validStringArray(r.uniqueTypesOwned, VALID_POKEMON_TYPES),
    kantoSpeciesOwned: validKantoArray(r.kantoSpeciesOwned),
    showdownExports: nonNegNumber(r.showdownExports, DEFAULT_STATS.showdownExports),
    tournamentsWon: nonNegNumber(r.tournamentsWon, DEFAULT_STATS.tournamentsWon),
    flawlessTournaments: nonNegNumber(r.flawlessTournaments, DEFAULT_STATS.flawlessTournaments),
    wonderTradesCompleted: nonNegNumber(r.wonderTradesCompleted, DEFAULT_STATS.wonderTradesCompleted),
    mysteryGiftsClaimed: nonNegNumber(r.mysteryGiftsClaimed, DEFAULT_STATS.mysteryGiftsClaimed),
    shinyChainCount: nonNegNumber(r.shinyChainCount, DEFAULT_STATS.shinyChainCount),
    shinyChainSpecies: validString(r.shinyChainSpecies, DEFAULT_STATS.shinyChainSpecies),
    shinyChainBest: nonNegNumber(r.shinyChainBest, DEFAULT_STATS.shinyChainBest),
    eliteFourCleared: nonNegNumber(r.eliteFourCleared, DEFAULT_STATS.eliteFourCleared),
    battleTowerBestStreak: nonNegNumber(r.battleTowerBestStreak, DEFAULT_STATS.battleTowerBestStreak),
    safariPokemonCaught: nonNegNumber(r.safariPokemonCaught, DEFAULT_STATS.safariPokemonCaught),
    safariTripsCompleted: nonNegNumber(r.safariTripsCompleted, DEFAULT_STATS.safariTripsCompleted),
    gymBadgesEarned: nonNegNumber(r.gymBadgesEarned, DEFAULT_STATS.gymBadgesEarned),
    factoryBestRun: nonNegNumber(r.factoryBestRun, DEFAULT_STATS.factoryBestRun),
    factoryRuns: nonNegNumber(r.factoryRuns, DEFAULT_STATS.factoryRuns),
    hallOfFameEntries: nonNegNumber(r.hallOfFameEntries, DEFAULT_STATS.hallOfFameEntries),
    gameCornerCoinsEarned: nonNegNumber(r.gameCornerCoinsEarned, DEFAULT_STATS.gameCornerCoinsEarned),
    gameCornerPrizesClaimed: nonNegNumber(r.gameCornerPrizesClaimed, DEFAULT_STATS.gameCornerPrizesClaimed),
    quizBestScore: nonNegNumber(r.quizBestScore, DEFAULT_STATS.quizBestScore),
    quizPerfectRounds: nonNegNumber(r.quizPerfectRounds, DEFAULT_STATS.quizPerfectRounds),
    fossilsRevived: nonNegNumber(r.fossilsRevived, DEFAULT_STATS.fossilsRevived),
    money: clampNumber(r.money, 0, 9999999, DEFAULT_STATS.money),
    eloRating: clampNumber(r.eloRating, 100, 4000, DEFAULT_STATS.eloRating),
    totalMoneyEarned: nonNegNumber(r.totalMoneyEarned, DEFAULT_STATS.totalMoneyEarned),
    totalMoneySpent: nonNegNumber(r.totalMoneySpent, DEFAULT_STATS.totalMoneySpent),
    evTrainingSessions: nonNegNumber(r.evTrainingSessions, DEFAULT_STATS.evTrainingSessions),
    heartScalesUsed: nonNegNumber(r.heartScalesUsed, DEFAULT_STATS.heartScalesUsed),
  };
}
