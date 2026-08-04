import { describe, it, expect } from "vitest";
import { battleReducer, initialBattleState } from "../battle";
import type { BattleState, BattleAction, TeamSlot, BattleTurnAction } from "@/types";

// Regression test for the CRITICAL online-desync bug: two independently-seeded battle
// reducers, given the same rngSeed and the same scripted action sequence, must produce
// byte-identical outcomes (HP, crits, misses, log text) — this is what makes online PvP
// safe to compute independently on both the host and guest client.

function makeSlot(name: string, moves: string[] = ["tackle"], hp = 100): TeamSlot {
  return {
    pokemon: {
      name,
      id: 1,
      types: [{ slot: 1, type: { name: "normal" } }],
      stats: [
        { base_stat: hp, stat: { name: "hp" } },
        { base_stat: 80, stat: { name: "attack" } },
        { base_stat: 60, stat: { name: "defense" } },
        { base_stat: 80, stat: { name: "special-attack" } },
        { base_stat: 60, stat: { name: "special-defense" } },
        { base_stat: 90, stat: { name: "speed" } },
      ],
      sprites: { front_default: null, other: {} },
      abilities: [{ ability: { name: "run-away" }, is_hidden: false }],
      height: 10,
      weight: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    position: 0,
    selectedMoves: moves,
    nature: null,
    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "run-away",
    heldItem: null,
  };
}

function startSeededBattle(seed: number): BattleState {
  const action: BattleAction = {
    type: "START_BATTLE",
    player1Team: [makeSlot("pikachu"), makeSlot("bulbasaur")],
    player2Team: [makeSlot("squirtle"), makeSlot("charmander")],
    mode: "pvp",
    rngSeed: seed,
  };
  return battleReducer(initialBattleState, action);
}

function runTurns(state: BattleState, turnCount: number): BattleState {
  let s = state;
  for (let i = 0; i < turnCount; i++) {
    const action: BattleAction = {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    };
    s = battleReducer(s, action);
    if (s.phase === "ended") break;
  }
  return s;
}

describe("Battle RNG determinism (online PvP desync fix)", () => {
  it("produces identical HP outcomes across two independent reducer runs with the same seed", () => {
    const runA = runTurns(startSeededBattle(999_331), 5);
    const runB = runTurns(startSeededBattle(999_331), 5);

    expect(runA.player1.pokemon.map(p => p.currentHp)).toEqual(runB.player1.pokemon.map(p => p.currentHp));
    expect(runA.player2.pokemon.map(p => p.currentHp)).toEqual(runB.player2.pokemon.map(p => p.currentHp));
  });

  it("produces a byte-identical battle log across two independent reducer runs with the same seed", () => {
    const runA = runTurns(startSeededBattle(42), 5);
    const runB = runTurns(startSeededBattle(42), 5);

    expect(runA.log.map(l => l.message)).toEqual(runB.log.map(l => l.message));
  });

  it("different seeds are highly likely to diverge (sanity check the seed actually matters)", () => {
    const runA = runTurns(startSeededBattle(1), 5);
    const runB = runTurns(startSeededBattle(2), 5);

    const same = JSON.stringify(runA.log.map(l => l.message)) === JSON.stringify(runB.log.map(l => l.message));
    expect(same).toBe(false);
  });

  it("stores the rngSeed on BattleState after START_BATTLE", () => {
    const state = startSeededBattle(555);
    expect(state.rngSeed).toBe(555);
  });

  it("local/AI battles without a seed are unaffected (rngSeed stays undefined)", () => {
    const action: BattleAction = {
      type: "START_BATTLE",
      player1Team: [makeSlot("pikachu")],
      player2Team: [makeSlot("squirtle")],
      mode: "ai",
    };
    const state = battleReducer(initialBattleState, action);
    expect(state.rngSeed).toBeUndefined();

    // Should not throw and should still resolve a turn normally
    const afterTurn = runTurns(state, 1);
    expect(afterTurn.turn).toBe(1);
  });

  it("doubles turns are also deterministic under a shared seed", () => {
    function startDoubles(seed: number): BattleState {
      const action: BattleAction = {
        type: "START_BATTLE",
        player1Team: [makeSlot("pikachu"), makeSlot("bulbasaur"), makeSlot("eevee")],
        player2Team: [makeSlot("squirtle"), makeSlot("charmander"), makeSlot("meowth")],
        mode: "pvp",
        format: "doubles",
        rngSeed: seed,
      };
      return battleReducer(initialBattleState, action);
    }
    function runDoublesTurns(state: BattleState, turnCount: number): BattleState {
      let s = state;
      for (let i = 0; i < turnCount; i++) {
        const p1Action: BattleTurnAction = { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 };
        const p1Action2: BattleTurnAction = { type: "MOVE", moveIndex: 0, target: "opp1", slot: 1 };
        const p2Action: BattleTurnAction = { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 };
        const p2Action2: BattleTurnAction = { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 };
        s = battleReducer(s, { type: "EXECUTE_TURN", player1Action: p1Action, player1Action2: p1Action2, player2Action: p2Action, player2Action2: p2Action2 });
        if (s.phase === "ended") break;
      }
      return s;
    }

    const runA = runDoublesTurns(startDoubles(31337), 3);
    const runB = runDoublesTurns(startDoubles(31337), 3);
    expect(runA.log.map(l => l.message)).toEqual(runB.log.map(l => l.message));
  });
});
