import { describe, it, expect, vi, afterEach } from "vitest";
import { battleReducer, initialBattleState } from "../battle";
import { cacheBattleMove } from "../battleHelpers";
import type { BattleState, BattleAction, TeamSlot } from "@/types";

// Regression test: Outrage/Thrash/Petal Dance previously locked the user in for
// 3-4 total attacks (`2 + floor(rand*2)` additional turns on top of the first use).
// The fix sets the additional lock to `1 + floor(rand*2)`, so together with the
// initial use the total is 2-3 attacks before the fatigue confusion kicks in.

function makeSlot(name: string, moves: string[]): TeamSlot {
  return {
    pokemon: {
      name,
      id: 1,
      types: [{ slot: 1, type: { name: "normal" } }],
      stats: [
        { base_stat: 1000, stat: { name: "hp" } },
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

function startBattle(seed: number): BattleState {
  const action: BattleAction = {
    type: "START_BATTLE",
    player1Team: [makeSlot("pikachu", ["outrage"])],
    player2Team: [makeSlot("squirtle", ["tackle"])],
    mode: "pvp",
    rngSeed: seed,
  };
  return battleReducer(initialBattleState, action);
}

/** Counts consecutive "used outrage!" turns before the fatigue-confusion message. */
function countOutrageStreak(state: BattleState): number {
  const messages = state.log.map((l) => l.message);
  const fatigueIdx = messages.findIndex((m) => m.includes("became confused due to fatigue"));
  if (fatigueIdx === -1) return -1; // fatigue never triggered within the turns we ran
  return messages.slice(0, fatigueIdx).filter((m) => m === "pikachu used outrage!").length;
}

// Regression (Wave 7 review, MAJOR #4): applyMoveLocks ran unconditionally
// after executeMove, even on turns where executeMove bailed out early
// (paralysis, sleep, freeze, flinch, Taunt, Disable, Torment, 0 PP) without
// ever touching lastMoveUsed/lastMoveTurn that turn. It then read the STALE
// lastMoveUsed from a previous turn and acted on it as if the move had just
// been used again.
describe("applyMoveLocks — ignores a stale lastMoveUsed when the pokemon didn't move", () => {
  it("does not burn a lock-in turn when the pokemon is asleep and never actually attacks", () => {
    let state = startBattle(1);

    // Mid-Outrage from a previous (real) turn, but this turn the pokemon is
    // asleep — executeMove bails at the sleep check before ever touching
    // lastMoveUsed/lastMoveTurn for the upcoming turn.
    state = {
      ...state,
      player1: {
        ...state.player1,
        pokemon: [
          {
            ...state.player1.pokemon[0],
            lockInMove: "outrage",
            lockInTurns: 2,
            lastMoveUsed: "outrage",
            lastMoveTurn: state.turn, // stale relative to the turn about to execute
            status: "sleep" as const,
            sleepTurns: 1,
          },
        ],
      },
    };

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    // Bug: lockInTurns decremented (or even resolved into fatigue confusion)
    // despite the pokemon never actually attacking this turn.
    expect(result.player1.pokemon[0].lockInMove).toBe("outrage");
    expect(result.player1.pokemon[0].lockInTurns).toBe(2);
    // Sleep still ticked down as normal, proving executeMove ran (it just
    // bailed on the "can't move" branch) — this wasn't a no-op turn.
    expect(result.player1.pokemon[0].sleepTurns).toBe(0);
  });
});

describe("Outrage lock-in duration", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])("locks in for 2-3 total attacks (seed %i)", (seed) => {
    let state = startBattle(seed);
    // Run enough turns to guarantee the lock resolves (max lock is 3 turns + margin)
    for (let i = 0; i < 5 && state.phase !== "ended"; i++) {
      state = battleReducer(state, {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0 },
        player2Action: { type: "MOVE", moveIndex: 0 },
      });
    }

    const streak = countOutrageStreak(state);
    expect(streak).toBeGreaterThanOrEqual(2);
    expect(streak).toBeLessThanOrEqual(3);
    // Old bug: streak was always 3 or 4 — explicitly guard against the upper bound regressing
    expect(streak).not.toBe(4);
  });
});

// Regression (Wave 7 re-review, new MINOR #4): a missed move never reached the
// attacker trailer that stamps lastMoveUsed/lastMoveTurn (only a hit did), so
// applyMoveLocks's `lastMoveTurn !== state.turn` gate silently skipped locking
// in on a miss — a missed Outrage never started its lock-in and a Choice item
// never locked. Real-game behavior: both lock onto the move as soon as it's
// selected and used, whether or not it actually connects. These start a battle
// without an rngSeed so `battleRandom()` delegates to Math.random(), which is
// stubbed to force a guaranteed miss (see feedback_rng_mock_capture_bug in
// agent memory — battleRandom() must keep resolving Math.random() dynamically,
// not via a captured reference, for this stub to take effect turn-to-turn).
describe("applyMoveLocks — engages on a miss (the move was still used, it just didn't land)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("locks a Choice item onto the move even when it misses", () => {
    cacheBattleMove("focus-blast", {
      name: "focus-blast",
      power: 120,
      accuracy: 70,
      pp: 5,
      type: { name: "fighting" },
      damage_class: { name: "special" },
      priority: 0,
    });
    vi.spyOn(Math, "random").mockReturnValue(0.99); // 99 >= 70 -> guaranteed miss

    const p1Slot = makeSlot("pikachu", ["focus-blast"]);
    p1Slot.heldItem = "choice-band";
    const action: BattleAction = {
      type: "START_BATTLE",
      player1Team: [p1Slot],
      player2Team: [makeSlot("squirtle", ["tackle"])],
      mode: "pvp",
    };
    const state = battleReducer(initialBattleState, action);

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.log.some((l) => l.message.includes("attack missed"))).toBe(true);
    expect(result.player1.pokemon[0].choiceLockedMove).toBe("focus-blast");
  });

  it("keeps ticking down the Outrage lock-in even when the move misses", () => {
    cacheBattleMove("outrage", {
      name: "outrage",
      power: 120,
      accuracy: 50,
      pp: 10,
      type: { name: "dragon" },
      damage_class: { name: "physical" },
      priority: 0,
    });
    vi.spyOn(Math, "random").mockReturnValue(0.99); // 99 >= 50 -> guaranteed miss

    const action: BattleAction = {
      type: "START_BATTLE",
      player1Team: [makeSlot("pikachu", ["outrage"])],
      player2Team: [makeSlot("squirtle", ["tackle"])],
      mode: "pvp",
    };
    const state = battleReducer(initialBattleState, action);

    const result = battleReducer(state, {
      type: "EXECUTE_TURN",
      player1Action: { type: "MOVE", moveIndex: 0 },
      player2Action: { type: "MOVE", moveIndex: 0 },
    });

    expect(result.log.some((l) => l.message.includes("attack missed"))).toBe(true);
    expect(result.player1.pokemon[0].lockInMove).toBe("outrage");
    expect(result.player1.pokemon[0].lockInTurns).toBeGreaterThan(0);
  });
});
