export interface LeaderboardEntry {
  trainerName: string;
  trainerId: string; // 5-digit localStorage ID
  score: number;
  teamPokemon: string[]; // up to 6 names
  timestamp: string; // ISO 8601
}

export type LeaderboardType =
  | "battle-tower"
  | "elo-rating"
  | "hall-of-fame"
  | "safari-catches"
  | "pokedex-completion";

export interface LeaderboardSubmission {
  type: LeaderboardType;
  entry: LeaderboardEntry;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  playerRank: number | null;
}
