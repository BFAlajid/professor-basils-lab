export interface PlayerStats {
  totalCaught: number;
  totalBattlesWon: number;
  totalBattlesPlayed: number;
  uniqueSpeciesCaught: number;
  shinyCaught: number;
  legendsCaught: number;
  totalTeamsBuilt: number;
  gbaImports: number;
  ballsThrown: number;
  criticalHits: number;
  superEffectiveHits: number;
  winStreak: number;
  bestWinStreak: number;
  uniqueBallTypesUsed: string[];
  uniqueTypesOwned: string[];
  kantoSpeciesOwned: number[];
  showdownExports: number;
  tournamentsWon: number;
  flawlessTournaments: number;
  wonderTradesCompleted: number;
  mysteryGiftsClaimed: number;
  shinyChainCount: number;
  shinyChainSpecies: string;
  shinyChainBest: number;
  eliteFourCleared: number;
  battleTowerBestStreak: number;
  safariPokemonCaught: number;
  safariTripsCompleted: number;
  gymBadgesEarned: number;
  factoryBestRun: number;
  factoryRuns: number;
  hallOfFameEntries: number;
  gameCornerCoinsEarned: number;
  gameCornerPrizesClaimed: number;
  quizBestScore: number;
  quizPerfectRounds: number;
  fossilsRevived: number;
  money: number;
  eloRating: number;
  totalMoneyEarned: number;
  totalMoneySpent: number;
  evTrainingSessions: number;
  heartScalesUsed: number;
}

export const DEFAULT_STATS: PlayerStats = {
  totalCaught: 0,
  totalBattlesWon: 0,
  totalBattlesPlayed: 0,
  uniqueSpeciesCaught: 0,
  shinyCaught: 0,
  legendsCaught: 0,
  totalTeamsBuilt: 0,
  gbaImports: 0,
  ballsThrown: 0,
  criticalHits: 0,
  superEffectiveHits: 0,
  winStreak: 0,
  bestWinStreak: 0,
  uniqueBallTypesUsed: [],
  uniqueTypesOwned: [],
  kantoSpeciesOwned: [],
  showdownExports: 0,
  tournamentsWon: 0,
  flawlessTournaments: 0,
  wonderTradesCompleted: 0,
  mysteryGiftsClaimed: 0,
  shinyChainCount: 0,
  shinyChainSpecies: "",
  shinyChainBest: 0,
  eliteFourCleared: 0,
  battleTowerBestStreak: 0,
  safariPokemonCaught: 0,
  safariTripsCompleted: 0,
  gymBadgesEarned: 0,
  factoryBestRun: 0,
  factoryRuns: 0,
  hallOfFameEntries: 0,
  gameCornerCoinsEarned: 0,
  gameCornerPrizesClaimed: 0,
  quizBestScore: 0,
  quizPerfectRounds: 0,
  fossilsRevived: 0,
  money: 3000,
  eloRating: 1000,
  totalMoneyEarned: 0,
  totalMoneySpent: 0,
  evTrainingSessions: 0,
  heartScalesUsed: 0,
};

export type StatsAction =
  | { type: "INCREMENT"; key: keyof PlayerStats; amount: number }
  | { type: "ADD_UNIQUE_BALL"; ball: string }
  | { type: "ADD_UNIQUE_TYPE"; typeName: string }
  | { type: "ADD_KANTO_SPECIES"; speciesId: number }
  | { type: "RECORD_BATTLE_WIN" }
  | { type: "RECORD_BATTLE_LOSS" }
  | { type: "UPDATE_SHINY_CHAIN"; species: string }
  | { type: "RESET_SHINY_CHAIN" }
  | { type: "SET_BATTLE_TOWER_STREAK"; streak: number }
  | { type: "ADD_MONEY"; amount: number }
  | { type: "SPEND_MONEY"; amount: number }
  | { type: "UPDATE_ELO"; won: boolean; opponentRating?: number }
  | { type: "SET_STATS"; stats: PlayerStats };

export function statsReducer(state: PlayerStats, action: StatsAction): PlayerStats {
  switch (action.type) {
    case "INCREMENT": {
      const key = action.key;
      const current = state[key];
      if (typeof current !== "number") return state;
      return { ...state, [key]: current + action.amount };
    }
    case "ADD_UNIQUE_BALL": {
      if (state.uniqueBallTypesUsed.includes(action.ball)) return state;
      return {
        ...state,
        uniqueBallTypesUsed: [...state.uniqueBallTypesUsed, action.ball],
      };
    }
    case "ADD_UNIQUE_TYPE": {
      if (state.uniqueTypesOwned.includes(action.typeName)) return state;
      return {
        ...state,
        uniqueTypesOwned: [...state.uniqueTypesOwned, action.typeName],
      };
    }
    case "ADD_KANTO_SPECIES": {
      if (
        action.speciesId < 1 ||
        action.speciesId > 151 ||
        state.kantoSpeciesOwned.includes(action.speciesId)
      ) {
        return state;
      }
      return {
        ...state,
        kantoSpeciesOwned: [...state.kantoSpeciesOwned, action.speciesId],
      };
    }
    case "RECORD_BATTLE_WIN": {
      const newStreak = state.winStreak + 1;
      return {
        ...state,
        totalBattlesWon: state.totalBattlesWon + 1,
        totalBattlesPlayed: state.totalBattlesPlayed + 1,
        winStreak: newStreak,
        bestWinStreak: Math.max(state.bestWinStreak, newStreak),
      };
    }
    case "RECORD_BATTLE_LOSS": {
      return {
        ...state,
        totalBattlesPlayed: state.totalBattlesPlayed + 1,
        winStreak: 0,
      };
    }
    case "UPDATE_SHINY_CHAIN": {
      if (state.shinyChainSpecies === action.species) {
        const newCount = state.shinyChainCount + 1;
        return {
          ...state,
          shinyChainCount: newCount,
          shinyChainBest: Math.max(state.shinyChainBest, newCount),
        };
      }
      return {
        ...state,
        shinyChainCount: 1,
        shinyChainSpecies: action.species,
      };
    }
    case "RESET_SHINY_CHAIN": {
      return {
        ...state,
        shinyChainCount: 0,
        shinyChainSpecies: "",
      };
    }
    case "SET_BATTLE_TOWER_STREAK": {
      if (action.streak <= state.battleTowerBestStreak) return state;
      return { ...state, battleTowerBestStreak: action.streak };
    }
    case "ADD_MONEY": {
      return {
        ...state,
        money: state.money + action.amount,
        totalMoneyEarned: state.totalMoneyEarned + action.amount,
      };
    }
    case "SPEND_MONEY": {
      if (state.money < action.amount) return state;
      return {
        ...state,
        money: state.money - action.amount,
        totalMoneySpent: state.totalMoneySpent + action.amount,
      };
    }
    case "UPDATE_ELO": {
      const oppRating = action.opponentRating ?? state.eloRating;
      const expected = 1 / (1 + Math.pow(10, (oppRating - state.eloRating) / 400));
      const kFactor = state.eloRating < 1200 ? 40 : state.eloRating < 1600 ? 32 : 24;
      const score = action.won ? 1 : 0;
      const newElo = Math.max(100, Math.round(state.eloRating + kFactor * (score - expected)));
      return { ...state, eloRating: newElo };
    }
    case "SET_STATS":
      return action.stats;
    default:
      return state;
  }
}
