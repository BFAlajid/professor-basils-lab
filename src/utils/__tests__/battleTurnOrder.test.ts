import { describe, it, expect } from "vitest";
import { battleReducer, initialBattleState, cacheBattleMove } from "../battle";
import type { BattleState, BattleAction, TeamSlot } from "@/types";

// Reducer-level EXECUTE_TURN coverage gap (test-gaps report Top 10 #2): the existing
// battle*.test.ts suites cover initBattlePokemon/initBattleTeam/START_BATTLE/FORCE_SWITCH/
// RESET_BATTLE (battleReducer.test.ts), doubles slot targeting (battleDoubles.test.ts), and
// per-move execution in isolation (battleExecution*.test.ts, mocked damage). None of them
// drive a full, unmocked EXECUTE_TURN to verify: (a) priority/speed turn ordering, (b) a
// fainting move transitioning phase to force_switch/ended, and (c) pendingPivotSwitch being
// consumed into an actual force_switch phase transition (only the "flag gets set" half was
// tested, at the executeMove level, in battleExecution.test.ts / battleExecutionDamage.test.ts).

function makeSlot(name: string, moves: string[], hp = 1000, speedBase = 90): TeamSlot {
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
        { base_stat: speedBase, stat: { name: "speed" } },
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

function startBattle(p1: TeamSlot[], p2: TeamSlot[]): BattleState {
  const action: BattleAction = {
    type: "START_BATTLE",
    player1Team: p1,
    player2Team: p2,
    mode: "ai",
  };
  return battleReducer(initialBattleState, action);
}

describe("EXECUTE_TURN turn order resolution", () => {
  it("a higher-priority move executes before a slower-priority move even when the user is slower", () => {
    cacheBattleMove("quick-attack", {
      name: "quick-attack",
      power: 40,
      accuracy: 100,
      pp: 30,
      type: { name: "normal" },
      damage_class: { name: "physical" },
      priority: 1,
    });

    // pikachu: low speed but priority move. squirtle: high speed but priority-0 tackle.
    const state = startBattle(
      [makeSlot("pikachu", ["quick-attack"], 1000, 5)],
      [makeSlot("squirtle", ["tackle"], 1000, 150)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.turn).toBe(state.turn + 1);
    const messages = result.log.filter((l) => l.turn === result.turn).map((l) => l.message);
    const pikachuIdx = messages.indexOf("pikachu used quick attack!");
    const squirtleIdx = messages.indexOf("squirtle used tackle!");
    expect(pikachuIdx).toBeGreaterThanOrEqual(0);
    expect(squirtleIdx).toBeGreaterThanOrEqual(0);
    expect(pikachuIdx).toBeLessThan(squirtleIdx);
  });

  it("equal priority resolves by speed — the faster Pokemon moves first", () => {
    const state = startBattle(
      [makeSlot("pikachu", ["tackle"], 1000, 5)],
      [makeSlot("squirtle", ["tackle"], 1000, 150)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    const messages = result.log.filter((l) => l.turn === result.turn).map((l) => l.message);
    const pikachuIdx = messages.indexOf("pikachu used tackle!");
    const squirtleIdx = messages.indexOf("squirtle used tackle!");
    expect(squirtleIdx).toBeGreaterThanOrEqual(0);
    expect(squirtleIdx).toBeLessThan(pikachuIdx);
  });
});

describe("EXECUTE_TURN faint handling", () => {
  it("transitions to force_switch for the fainted side when a teammate remains", () => {
    const state = startBattle(
      [makeSlot("pikachu", ["tackle"], 1000, 150)],
      [makeSlot("squirtle", ["tackle"], 1, 5), makeSlot("jigglypuff", ["tackle"], 1000, 5)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.player2.pokemon[0].isFainted).toBe(true);
    expect(result.phase).toBe("force_switch");
    expect(result.waitingForSwitch).toBe("player2");
    expect(result.winner).toBeNull();
  });

  it("transitions to ended with the correct winner when the fainted side has no teammates left", () => {
    const state = startBattle(
      [makeSlot("pikachu", ["tackle"], 1000, 150)],
      [makeSlot("squirtle", ["tackle"], 1, 5)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.phase).toBe("ended");
    expect(result.winner).toBe("player1");
  });
});

describe("EXECUTE_TURN pivot-switch consumption (U-turn)", () => {
  it("consumes pendingPivotSwitch into a force_switch phase for the attacker when a teammate is available", () => {
    const state = startBattle(
      [makeSlot("pikachu", ["u-turn"], 1000, 150), makeSlot("bulbasaur", ["tackle"], 1000, 50)],
      [makeSlot("squirtle", ["tackle"], 1000, 5)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.pendingPivotSwitch).toBeNull();
    expect(result.phase).toBe("force_switch");
    expect(result.waitingForSwitch).toBe("player1");
    const messages = result.log.filter((l) => l.turn === result.turn).map((l) => l.message);
    expect(messages).toContain("pikachu used u turn!");
    expect(messages).toContain("pikachu went back!");
  });

  it("does not force a switch when the attacker has no available teammate", () => {
    const state = startBattle(
      [makeSlot("pikachu", ["u-turn"], 1000, 150)],
      [makeSlot("squirtle", ["tackle"], 1000, 5)]
    );

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.pendingPivotSwitch).toBeNull();
    expect(result.phase).not.toBe("force_switch");
  });
});
