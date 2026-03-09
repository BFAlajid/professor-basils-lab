import type { BattleState, BattleMode, BattleWinner } from "./battle";

export interface ReplaySnapshot {
  turn: number;
  state: BattleState;
}

export interface BattleReplay {
  id: string;
  date: string;
  player1TeamNames: string[];
  player2TeamNames: string[];
  winner: BattleWinner;
  mode: BattleMode;
  totalTurns: number;
  snapshots: ReplaySnapshot[];
}
