import type { PlayerStats, AchievementCategory } from "@/hooks/useAchievements";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: (stats: PlayerStats) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Catching
  {
    id: "first_catch",
    name: "First Catch",
    description: "Catch your first Pokemon",
    icon: "\u{1F3C6}",
    category: "catching",
    condition: (stats) => stats.totalCaught >= 1,
  },
  {
    id: "bug_catcher",
    name: "Bug Catcher",
    description: "Catch 10 Pokemon",
    icon: "\u{1FAB2}",
    category: "catching",
    condition: (stats) => stats.totalCaught >= 10,
  },
  {
    id: "pokemon_ranger",
    name: "Pokemon Ranger",
    description: "Catch 50 Pokemon",
    icon: "\u{1F9D1}\u{200D}\u{1F9AF}",
    category: "catching",
    condition: (stats) => stats.totalCaught >= 50,
  },
  {
    id: "pokemon_master",
    name: "Pokemon Master",
    description: "Catch 150 Pokemon",
    icon: "\u{1F451}",
    category: "catching",
    condition: (stats) => stats.totalCaught >= 150,
  },
  {
    id: "gotta_catch_em_all",
    name: "Gotta Catch Em All",
    description: "Catch 300 Pokemon",
    icon: "\u{1F31F}",
    category: "catching",
    condition: (stats) => stats.totalCaught >= 300,
  },
  {
    id: "shiny_hunter",
    name: "Shiny Hunter",
    description: "Catch a shiny Pokemon",
    icon: "\u2728",
    category: "catching",
    condition: (stats) => stats.shinyCaught >= 1,
  },
  {
    id: "lucky_star",
    name: "Lucky Star",
    description: "Catch 5 shiny Pokemon",
    icon: "\u{1FA90}",
    category: "catching",
    condition: (stats) => stats.shinyCaught >= 5,
  },

  // Battle
  {
    id: "first_victory",
    name: "First Victory",
    description: "Win your first battle",
    icon: "\u2694\uFE0F",
    category: "battle",
    condition: (stats) => stats.totalBattlesWon >= 1,
  },
  {
    id: "battler",
    name: "Battler",
    description: "Win 10 battles",
    icon: "\u{1F94A}",
    category: "battle",
    condition: (stats) => stats.totalBattlesWon >= 10,
  },
  {
    id: "champion",
    name: "Champion",
    description: "Win 50 battles",
    icon: "\u{1F3C5}",
    category: "battle",
    condition: (stats) => stats.totalBattlesWon >= 50,
  },
  {
    id: "undefeated",
    name: "Undefeated",
    description: "Win 10 battles in a row",
    icon: "\u{1F525}",
    category: "battle",
    condition: (stats) => stats.bestWinStreak >= 10,
  },
  {
    id: "critical_moment",
    name: "Critical Moment",
    description: "Land 50 critical hits",
    icon: "\u{1F4A5}",
    category: "battle",
    condition: (stats) => stats.criticalHits >= 50,
  },
  {
    id: "super_effective",
    name: "Super Effective",
    description: "Land 100 super effective hits",
    icon: "\u26A1",
    category: "battle",
    condition: (stats) => stats.superEffectiveHits >= 100,
  },

  // Collection
  {
    id: "kanto_complete",
    name: "Kanto Complete",
    description: "Own all 151 Kanto Pokemon",
    icon: "\u{1F5FE}",
    category: "collection",
    condition: (stats) => stats.kantoSpeciesOwned.length >= 151,
  },
  {
    id: "type_collector",
    name: "Type Collector",
    description: "Own at least one Pokemon of each type",
    icon: "\u{1F308}",
    category: "collection",
    condition: (stats) => stats.uniqueTypesOwned.length >= 18,
  },
  {
    id: "full_team",
    name: "Full Team",
    description: "Build a team of 6 Pokemon",
    icon: "\u{1F46B}",
    category: "collection",
    condition: (stats) => stats.totalTeamsBuilt >= 1,
  },
  {
    id: "team_builder_pro",
    name: "Team Builder Pro",
    description: "Build 10 different teams",
    icon: "\u{1F3D7}\uFE0F",
    category: "collection",
    condition: (stats) => stats.totalTeamsBuilt >= 10,
  },

  // Exploration
  {
    id: "ball_connoisseur",
    name: "Ball Connoisseur",
    description: "Use 10 different Poke Ball types",
    icon: "\u{1F3B3}",
    category: "exploration",
    condition: (stats) => stats.uniqueBallTypesUsed.length >= 10,
  },
  {
    id: "heavy_thrower",
    name: "Heavy Thrower",
    description: "Throw 100 Poke Balls",
    icon: "\u{1F3AF}",
    category: "exploration",
    condition: (stats) => stats.ballsThrown >= 100,
  },
  {
    id: "legend_seeker",
    name: "Legend Seeker",
    description: "Catch a legendary Pokemon",
    icon: "\u{1F432}",
    category: "exploration",
    condition: (stats) => stats.legendsCaught >= 1,
  },

  // Special
  {
    id: "gba_veteran",
    name: "GBA Veteran",
    description: "Import a Pokemon from a GBA save file",
    icon: "\u{1F3AE}",
    category: "special",
    condition: (stats) => stats.gbaImports >= 1,
  },
  {
    id: "time_traveler",
    name: "Time Traveler",
    description: "Import 20 Pokemon from GBA saves",
    icon: "\u{1F570}\uFE0F",
    category: "special",
    condition: (stats) => stats.gbaImports >= 20,
  },
  {
    id: "showdown_ready",
    name: "Showdown Ready",
    description: "Export a team to Showdown format",
    icon: "\u{1F4CB}",
    category: "special",
    condition: (stats) => stats.showdownExports >= 1,
  },
  {
    id: "species_diversity",
    name: "Species Diversity",
    description: "Catch 50 unique species",
    icon: "\u{1F9EC}",
    category: "collection",
    condition: (stats) => stats.uniqueSpeciesCaught >= 50,
  },

  // Tournament
  {
    id: "tournament_champion",
    name: "Tournament Champion",
    description: "Win a tournament",
    icon: "\u{1F3C6}",
    category: "battle",
    condition: (stats) => stats.tournamentsWon >= 1,
  },
  {
    id: "flawless_victory",
    name: "Flawless Victory",
    description: "Win a tournament without losing a match",
    icon: "\u{1F48E}",
    category: "battle",
    condition: (stats) => stats.flawlessTournaments >= 1,
  },

  // Wonder Trade
  {
    id: "wonder_trader",
    name: "Wonder Trader",
    description: "Complete 10 Wonder Trades",
    icon: "\u{1F500}",
    category: "special",
    condition: (stats) => stats.wonderTradesCompleted >= 10,
  },
  {
    id: "trade_addict",
    name: "Trade Addict",
    description: "Complete 50 Wonder Trades",
    icon: "\u{1F4E6}",
    category: "special",
    condition: (stats) => stats.wonderTradesCompleted >= 50,
  },

  // Mystery Gift
  {
    id: "gift_collector",
    name: "Gift Collector",
    description: "Claim 7 Mystery Gifts",
    icon: "\u{1F381}",
    category: "special",
    condition: (stats) => stats.mysteryGiftsClaimed >= 7,
  },
  {
    id: "daily_devotee",
    name: "Daily Devotee",
    description: "Claim 30 Mystery Gifts",
    icon: "\u{1F4C5}",
    category: "special",
    condition: (stats) => stats.mysteryGiftsClaimed >= 30,
  },

  // Elite Four + Battle Tower
  {
    id: "elite_four_champion",
    name: "Elite Four Champion",
    description: "Defeat the Elite Four and Champion",
    icon: "\u{1F3C6}",
    category: "battle",
    condition: (stats) => stats.eliteFourCleared >= 1,
  },
  {
    id: "tower_tycoon",
    name: "Tower Tycoon",
    description: "Achieve a 21-win Battle Tower streak",
    icon: "\u{1F3E2}",
    category: "battle",
    condition: (stats) => stats.battleTowerBestStreak >= 21,
  },
  {
    id: "tower_legend",
    name: "Tower Legend",
    description: "Achieve a 50-win Battle Tower streak",
    icon: "\u{1F30C}",
    category: "battle",
    condition: (stats) => stats.battleTowerBestStreak >= 50,
  },

  // Shiny Chain
  {
    id: "chain_starter",
    name: "Chain Starter",
    description: "Build a shiny chain of 10",
    icon: "\u{1F517}",
    category: "catching",
    condition: (stats) => stats.shinyChainBest >= 10,
  },
  {
    id: "chain_master",
    name: "Chain Master",
    description: "Build a shiny chain of 40",
    icon: "\u2728",
    category: "catching",
    condition: (stats) => stats.shinyChainBest >= 40,
  },

  // Safari Zone
  {
    id: "safari_novice",
    name: "Safari Novice",
    description: "Catch 5 Pokemon in the Safari Zone",
    icon: "\u{1F333}",
    category: "catching",
    condition: (stats) => stats.safariPokemonCaught >= 5,
  },
  {
    id: "safari_expert",
    name: "Safari Expert",
    description: "Catch 20 Pokemon in the Safari Zone",
    icon: "\u{1F3DE}\uFE0F",
    category: "catching",
    condition: (stats) => stats.safariPokemonCaught >= 20,
  },
  {
    id: "safari_veteran",
    name: "Safari Veteran",
    description: "Complete 5 Safari Zone trips",
    icon: "\u{1F9ED}",
    category: "exploration",
    condition: (stats) => stats.safariTripsCompleted >= 5,
  },

  // Gym Challenge
  {
    id: "boulder_badge",
    name: "Boulder Badge",
    description: "Earn your first Gym Badge",
    icon: "\u{1F48E}",
    category: "battle",
    condition: (stats) => stats.gymBadgesEarned >= 1,
  },
  {
    id: "rising_star",
    name: "Rising Star",
    description: "Earn 4 Gym Badges",
    icon: "\u2B50",
    category: "battle",
    condition: (stats) => stats.gymBadgesEarned >= 4,
  },
  {
    id: "gym_champion",
    name: "Gym Champion",
    description: "Earn all 8 Gym Badges",
    icon: "\u{1F3C5}",
    category: "battle",
    condition: (stats) => stats.gymBadgesEarned >= 8,
  },

  // Battle Factory
  {
    id: "rental_master",
    name: "Rental Master",
    description: "Complete a Battle Factory run (7 wins)",
    icon: "\u{1F3ED}",
    category: "battle",
    condition: (stats) => stats.factoryRuns >= 1,
  },
  {
    id: "factory_tycoon",
    name: "Factory Tycoon",
    description: "Complete 3 Battle Factory runs",
    icon: "\u{1F3AD}",
    category: "battle",
    condition: (stats) => stats.factoryRuns >= 3,
  },

  // Hall of Fame
  {
    id: "legend_entry",
    name: "Legend",
    description: "Enter the Hall of Fame 5 times",
    icon: "\u{1F3C6}",
    category: "special",
    condition: (stats) => stats.hallOfFameEntries >= 5,
  },
  {
    id: "hall_regular",
    name: "Hall of Fame Regular",
    description: "Enter the Hall of Fame 20 times",
    icon: "\u{1F451}",
    category: "special",
    condition: (stats) => stats.hallOfFameEntries >= 20,
  },

  // Game Corner (Voltorb Flip)
  {
    id: "coin_collector",
    name: "Coin Collector",
    description: "Earn 500 coins at the Game Corner",
    icon: "\u{1FA99}",
    category: "exploration",
    condition: (stats) => stats.gameCornerCoinsEarned >= 500,
  },
  {
    id: "high_roller",
    name: "High Roller",
    description: "Earn 5,000 coins at the Game Corner",
    icon: "\u{1F4B0}",
    category: "exploration",
    condition: (stats) => stats.gameCornerCoinsEarned >= 5000,
  },
  {
    id: "prize_winner",
    name: "Prize Winner",
    description: "Claim 3 prizes from the Game Corner",
    icon: "\u{1F3B0}",
    category: "exploration",
    condition: (stats) => stats.gameCornerPrizesClaimed >= 3,
  },

  // Type Quiz
  {
    id: "quiz_ace",
    name: "Quiz Ace",
    description: "Score 10+ in the Type Quiz",
    icon: "\u{1F4DD}",
    category: "exploration",
    condition: (stats) => stats.quizBestScore >= 10,
  },
  {
    id: "type_expert",
    name: "Type Expert",
    description: "Score 30+ in the Type Quiz",
    icon: "\u{1F9E0}",
    category: "exploration",
    condition: (stats) => stats.quizBestScore >= 30,
  },
  {
    id: "type_master",
    name: "Type Master",
    description: "Score 50+ in the Type Quiz",
    icon: "\u{1F393}",
    category: "exploration",
    condition: (stats) => stats.quizBestScore >= 50,
  },

  // Economy
  {
    id: "first_paycheck",
    name: "First Paycheck",
    description: "Earn your first prize money",
    icon: "\u{1F4B0}",
    category: "exploration",
    condition: (stats) => stats.totalMoneyEarned > 0,
  },
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Spend \u00A510,000 at the PokeMart",
    icon: "\u{1F6CD}\uFE0F",
    category: "exploration",
    condition: (stats) => stats.totalMoneySpent >= 10000,
  },
  {
    id: "rising_star_elo",
    name: "Rising Trainer",
    description: "Reach 1200 ELO rating",
    icon: "\u{1F4C8}",
    category: "battle",
    condition: (stats) => stats.eloRating >= 1200,
  },
  {
    id: "ace_trainer",
    name: "Ace Trainer",
    description: "Reach 1500 ELO rating",
    icon: "\u{1F31F}",
    category: "battle",
    condition: (stats) => stats.eloRating >= 1500,
  },
  {
    id: "ev_trainer",
    name: "EV Trainer",
    description: "Complete 10 EV training sessions",
    icon: "\u{1F4AA}",
    category: "exploration",
    condition: (stats) => stats.evTrainingSessions >= 10,
  },
  {
    id: "move_tutor_fan",
    name: "Move Tutor Fan",
    description: "Use the Move Tutor 5 times",
    icon: "\u{1F4DA}",
    category: "exploration",
    condition: (stats) => stats.heartScalesUsed >= 5,
  },

  // Fossil Revival
  {
    id: "fossil_finder",
    name: "Fossil Finder",
    description: "Revive 5 fossil Pokemon",
    icon: "\u{1F9B4}",
    category: "collection",
    condition: (stats) => stats.fossilsRevived >= 5,
  },
  {
    id: "paleontologist",
    name: "Paleontologist",
    description: "Revive all 11 fossil species",
    icon: "\u{1F9EA}",
    category: "collection",
    condition: (stats) => stats.fossilsRevived >= 11,
  },
];
