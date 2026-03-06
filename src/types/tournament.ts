import type { TypeName } from "./pokemon";
import type { TeamSlot } from "./team";
import type { DifficultyLevel } from "./battle";

export interface TournamentTrainer {
  name: string;
  title: string;
  theme: TypeName | "mixed";
  team: TeamSlot[];
  difficulty: DifficultyLevel;
  defeated: boolean;
}

export type TournamentPhase = "bracket" | "pre_match" | "battling" | "post_match" | "completed";

export interface TournamentState {
  phase: TournamentPhase;
  round: number;
  trainers: TournamentTrainer[];
  currentOpponentIndex: number;
  playerWins: number;
  isChampion: boolean;
}

export type TournamentAction =
  | { type: "START_TOURNAMENT"; trainers: TournamentTrainer[] }
  | { type: "BEGIN_MATCH"; opponentIndex: number }
  | { type: "MATCH_WON" }
  | { type: "MATCH_LOST" }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_TOURNAMENT" };
