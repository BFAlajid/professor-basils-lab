import { encodeReplay, decodeReplay } from "../replayShare";
import type { BattleReplay } from "@/types";

describe("replayShare", () => {
  const sampleReplay: BattleReplay = {
    id: "replay-001",
    date: "2026-01-15",
    player1TeamNames: ["charizard", "blastoise"],
    player2TeamNames: ["venusaur", "pikachu"],
    winner: "player1",
    mode: "ai",
    totalTurns: 12,
    snapshots: [],
  };

  it("round-trip encode/decode preserves all fields", () => {
    const encoded = encodeReplay(sampleReplay);
    const decoded = decodeReplay(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(sampleReplay.id);
    expect(decoded!.date).toBe(sampleReplay.date);
    expect(decoded!.player1TeamNames).toEqual(sampleReplay.player1TeamNames);
    expect(decoded!.player2TeamNames).toEqual(sampleReplay.player2TeamNames);
    expect(decoded!.winner).toBe(sampleReplay.winner);
    expect(decoded!.mode).toBe(sampleReplay.mode);
    expect(decoded!.totalTurns).toBe(sampleReplay.totalTurns);
    expect(decoded!.snapshots).toEqual(sampleReplay.snapshots);
  });

  it("encoded string is valid base64", () => {
    const encoded = encodeReplay(sampleReplay);
    expect(() => atob(encoded)).not.toThrow();
  });

  it("returns null for invalid base64 input", () => {
    expect(decodeReplay("###invalid###")).toBeNull();
  });

  it("returns null for valid base64 that is not JSON", () => {
    const notJson = btoa("not json at all");
    expect(decodeReplay(notJson)).toBeNull();
  });
});
