import { BattleReplay } from "@/types";
import { silentWarn } from "@/utils/silentWarn";

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
    if (typeof data !== "object" || data === null) return null;
    if (typeof data.id !== "string") return null;
    if (typeof data.date !== "string") return null;
    if (!Array.isArray(data.p1) || !data.p1.every((v: unknown) => typeof v === "string")) return null;
    if (!Array.isArray(data.p2) || !data.p2.every((v: unknown) => typeof v === "string")) return null;
    if (data.winner !== "player1" && data.winner !== "player2" && data.winner !== null) return null;
    if (typeof data.mode !== "string") return null;
    if (typeof data.turns !== "number" || !Number.isFinite(data.turns)) return null;
    if (!Array.isArray(data.snapshots)) return null;
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
  } catch (e) {
    silentWarn("decodeReplay", e);
    return null;
  }
}
