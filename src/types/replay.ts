import type { BattleState, BattleLogEntry, BattleMode, BattleWinner } from "./battle";

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
  // Full, un-truncated battle log across the whole replay — each ReplaySnapshot's
  // own `state.log` is the live BattleState's log, which battleReducer caps at
  // 200 entries for the *live* UI (see capLog in battleReducer.ts); a battle
  // longer than that would otherwise lose its opening turns forever once
  // captured into a snapshot. Optional so replays saved before this field
  // existed still load; consumers should fall back to a snapshot's own log.
  fullLog?: BattleLogEntry[];
}
