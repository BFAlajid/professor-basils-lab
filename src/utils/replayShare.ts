import { BattleReplay } from "@/types";

export function encodeReplay(replay: BattleReplay): string {
  const slim = {
    id: replay.id,
    date: replay.date,
    p1: replay.player1TeamNames,
    p2: replay.player2TeamNames,
    winner: replay.winner,
    mode: replay.mode,
    turns: replay.totalTurns,
    snapshots: replay.snapshots,
  };
  return btoa(JSON.stringify(slim));
}

export function decodeReplay(code: string): BattleReplay | null {
  try {
    const data = JSON.parse(atob(code));
    return {
      id: data.id,
      date: data.date,
      player1TeamNames: data.p1,
      player2TeamNames: data.p2,
      winner: data.winner,
      mode: data.mode,
      totalTurns: data.turns,
      snapshots: data.snapshots,
    };
  } catch {
    return null;
  }
}
