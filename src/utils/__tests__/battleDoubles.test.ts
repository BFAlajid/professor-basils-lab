import { describe, it, expect } from "vitest";
import {
  battleReducer,
  initialBattleState,
  initBattleTeam,
  SPREAD_MOVES,
} from "../battle";
import { getActivePokemonBySlot, getActiveDoublesSlots } from "../battleHelpers";
import type { BattleState, BattleAction, TeamSlot } from "@/types";

// Minimal TeamSlot factory for testing
function makeSlot(name: string, moves: string[] = ["tackle"], hp = 100): TeamSlot {
  return {
    pokemon: {
      name,
      id: 1,
      types: [{ slot: 1, type: { name: "normal" } }],
      stats: [
        { base_stat: hp, stat: { name: "hp" } },
        { base_stat: 80, stat: { name: "attack" } },
        { base_stat: 80, stat: { name: "defense" } },
        { base_stat: 80, stat: { name: "special-attack" } },
        { base_stat: 80, stat: { name: "special-defense" } },
        { base_stat: 80, stat: { name: "speed" } },
      ],
      sprites: { front_default: null, other: {} },
      abilities: [{ ability: { name: "overgrow" }, is_hidden: false }],
      height: 10,
      weight: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    position: 0,
    selectedMoves: moves,
    nature: null,
    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "overgrow",
    heldItem: null,
  };
}

function startDoublesBattle(
  p1Slots: TeamSlot[] = [makeSlot("pikachu"), makeSlot("bulbasaur"), makeSlot("charmander")],
  p2Slots: TeamSlot[] = [makeSlot("squirtle"), makeSlot("jigglypuff"), makeSlot("eevee")]
): BattleState {
  const action: BattleAction = {
    type: "START_BATTLE",
    player1Team: p1Slots,
    player2Team: p2Slots,
    mode: "ai",
    format: "doubles",
  };
  return battleReducer(initialBattleState, action);
}

describe("Doubles Battle Format", () => {
  describe("initBattleTeam doubles", () => {
    it("sets 2 active Pokemon when format is doubles", () => {
      const team = initBattleTeam(
        [makeSlot("pikachu"), makeSlot("bulbasaur"), makeSlot("charmander")],
        null,
        undefined,
        "doubles"
      );
      expect(team.activePokemonIndex).toBe(0);
      expect(team.activePokemonIndex2).toBe(1);
      expect(team.pokemon[0].isActive).toBe(true);
      expect(team.pokemon[1].isActive).toBe(true);
      expect(team.pokemon[2].isActive).toBe(false);
    });

    it("sets activePokemonIndex2 to null in singles", () => {
      const team = initBattleTeam(
        [makeSlot("pikachu"), makeSlot("bulbasaur")],
        null,
        undefined,
        "singles"
      );
      expect(team.activePokemonIndex2).toBeNull();
      expect(team.pokemon[0].isActive).toBe(true);
      expect(team.pokemon[1].isActive).toBe(false);
    });
  });

  describe("START_BATTLE with doubles format", () => {
    it("sets format to doubles on state", () => {
      const state = startDoublesBattle();
      expect(state.format).toBe("doubles");
    });

    it("activates 2 Pokemon per side", () => {
      const state = startDoublesBattle();
      expect(state.player1.activePokemonIndex).toBe(0);
      expect(state.player1.activePokemonIndex2).toBe(1);
      expect(state.player2.activePokemonIndex).toBe(0);
      expect(state.player2.activePokemonIndex2).toBe(1);
    });

    it("logs all 4 Pokemon being sent out", () => {
      const state = startDoublesBattle();
      const switchLogs = state.log.filter(l => l.kind === "switch");
      expect(switchLogs.length).toBe(4);
    });

    it("remains in action_select phase", () => {
      const state = startDoublesBattle();
      expect(state.phase).toBe("action_select");
    });
  });

  describe("getActivePokemonBySlot", () => {
    it("returns slot 0 Pokemon", () => {
      const state = startDoublesBattle();
      const p = getActivePokemonBySlot(state.player1, 0);
      expect(p).not.toBeNull();
      expect(p!.slot.pokemon.name).toBe("pikachu");
    });

    it("returns slot 1 Pokemon", () => {
      const state = startDoublesBattle();
      const p = getActivePokemonBySlot(state.player1, 1);
      expect(p).not.toBeNull();
      expect(p!.slot.pokemon.name).toBe("bulbasaur");
    });

    it("returns null for slot 1 in singles", () => {
      const action: BattleAction = {
        type: "START_BATTLE",
        player1Team: [makeSlot("pikachu"), makeSlot("bulbasaur")],
        player2Team: [makeSlot("squirtle"), makeSlot("jigglypuff")],
        mode: "ai",
        format: "singles",
      };
      const state = battleReducer(initialBattleState, action);
      const p = getActivePokemonBySlot(state.player1, 1);
      expect(p).toBeNull();
    });
  });

  describe("getActiveDoublesSlots", () => {
    it("returns both slots for doubles team", () => {
      const state = startDoublesBattle();
      const slots = getActiveDoublesSlots(state.player1);
      expect(slots.length).toBe(2);
      expect(slots[0].slot).toBe(0);
      expect(slots[1].slot).toBe(1);
    });
  });

  describe("EXECUTE_TURN in doubles", () => {
    it("executes 4 actions (2 per player) without crashing", () => {
      const state = startDoublesBattle();
      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp1", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const newState = battleReducer(state, action);
      // Should advance turn
      expect(newState.turn).toBe(state.turn + 1);
      // Should have log entries for the turn
      const turnLogs = newState.log.filter(l => l.turn === newState.turn);
      expect(turnLogs.length).toBeGreaterThan(0);
    });
  });

  describe("Win condition in doubles", () => {
    it("game ends when all Pokemon on one side faint", () => {
      // Create teams where p2 has only 2 Pokemon with 1 HP each
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1), makeSlot("jigglypuff", ["tackle"], 1)];
      const state = startDoublesBattle(undefined, p2Slots);

      // Execute a turn — the p1 attacks should KO the 1 HP Pokemon
      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp1", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const newState = battleReducer(state, action);
      // With 1 HP, they should be KO'd — game should end
      expect(newState.phase).toBe("ended");
      expect(newState.winner).toBe("player1");
    });
  });

  describe("SPREAD_MOVES constant", () => {
    it("contains expected moves", () => {
      expect(SPREAD_MOVES.has("earthquake")).toBe(true);
      expect(SPREAD_MOVES.has("surf")).toBe(true);
      expect(SPREAD_MOVES.has("heat-wave")).toBe(true);
      expect(SPREAD_MOVES.has("tackle")).toBe(false);
    });
  });

  // Regression: a spread move hitting 2 opponent slots ran the FULL executeMove
  // pipeline once per target — PP was decremented twice, "used X!" was logged
  // twice, and attacker-side effects (Life Orb recoil) applied twice for one move.
  describe("Spread move dedup (doubles)", () => {
    it("decrements PP once and logs 'used X!' once for a 2-target spread hit", () => {
      const p1Slots = [makeSlot("pikachu", ["earthquake"], 1000), makeSlot("bulbasaur", ["tackle"], 1000), makeSlot("charmander", ["tackle"], 1000)];
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1000), makeSlot("jigglypuff", ["tackle"], 1000), makeSlot("eevee", ["tackle"], 1000)];
      const state = startDoublesBattle(p1Slots, p2Slots);
      const pikachuMaxPP = state.player1.pokemon[0].movePP[0];

      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "spread", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const p2Slot0StartHp = state.player2.pokemon[0].currentHp;
      const p2Slot1StartHp = state.player2.pokemon[1].currentHp;
      const result = battleReducer(state, action);

      // PP decremented exactly once (14, not 13)
      expect(result.player1.pokemon[0].movePP[0]).toBe(pikachuMaxPP - 1);

      // "used earthquake!" logged exactly once this turn
      const turnLogs = result.log.filter((l) => l.turn === result.turn);
      const usedMessages = turnLogs.filter((l) => l.message === "pikachu used earthquake!");
      expect(usedMessages.length).toBe(1);

      // Both opponent slots took damage from the spread hit
      expect(result.player2.pokemon[0].currentHp).toBeLessThan(p2Slot0StartHp);
      expect(result.player2.pokemon[1].currentHp).toBeLessThan(p2Slot1StartHp);
    });

    it("applies Life Orb recoil once, not once per target", () => {
      const p1Slot0 = makeSlot("pikachu", ["earthquake"], 1000);
      p1Slot0.heldItem = "life-orb";
      const p1Slots = [p1Slot0, makeSlot("bulbasaur", ["tackle"], 1000), makeSlot("charmander", ["tackle"], 1000)];
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1000), makeSlot("jigglypuff", ["tackle"], 1000), makeSlot("eevee", ["tackle"], 1000)];
      const state = startDoublesBattle(p1Slots, p2Slots);

      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "spread", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const result = battleReducer(state, action);

      const turnLogs = result.log.filter((l) => l.turn === result.turn);
      const recoilMessages = turnLogs.filter((l) => l.message.includes("hurt by its Life Orb"));
      expect(recoilMessages.length).toBe(1);
    });

    it("still hits a single, non-spread target only once when target is not spread", () => {
      const p1Slots = [makeSlot("pikachu", ["tackle"], 1000), makeSlot("bulbasaur", ["tackle"], 1000), makeSlot("charmander", ["tackle"], 1000)];
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1000), makeSlot("jigglypuff", ["tackle"], 1000), makeSlot("eevee", ["tackle"], 1000)];
      const state = startDoublesBattle(p1Slots, p2Slots);
      const p2Slot1StartHp = state.player2.pokemon[1].currentHp;

      // Both p1 attackers target opp0 — opp1 (jigglypuff) should take zero damage
      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const result = battleReducer(state, action);

      // The non-targeted opponent slot (index 1) should be untouched by pikachu's single-target tackle
      expect(result.player2.pokemon[1].currentHp).toBe(p2Slot1StartHp);
    });
  });

  // Regression (Wave 7 review, MAJOR #3): applyMoveLocks always resolved the
  // acting pokemon via getActivePokemon(state[player]), which is always slot
  // 0 — in doubles it ran twice against slot 0 per player, and slot-1 mons
  // never received a Choice lock or lock-in at all.
  describe("applyMoveLocks targets the acting slot, not always slot 0", () => {
    it("locks both slots into Outrage independently when both use it", () => {
      const p1Slots = [
        makeSlot("pikachu", ["outrage"], 1000),
        makeSlot("bulbasaur", ["outrage"], 1000),
        makeSlot("charmander", ["tackle"], 1000),
      ];
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1000), makeSlot("jigglypuff", ["tackle"], 1000), makeSlot("eevee", ["tackle"], 1000)];
      const state = startDoublesBattle(p1Slots, p2Slots);

      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp1", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const result = battleReducer(state, action);

      // Bug: the second applyMoveLocks call (nominally for slot 1) actually
      // ran against slot 0 again — decrementing slot 0's fresh lockInTurns
      // immediately (spurious fatigue confusion after one turn) while slot 1
      // never got locked in at all.
      expect(result.player1.pokemon[0].lockInMove).toBe("outrage");
      expect(result.player1.pokemon[0].lockInTurns).toBeGreaterThan(0);
      expect(result.player1.pokemon[1].lockInMove).toBe("outrage");
      expect(result.player1.pokemon[1].lockInTurns).toBeGreaterThan(0);
    });

    it("locks a Choice item onto the acting slot, not slot 0", () => {
      const p1Slot0 = makeSlot("pikachu", ["tackle"], 1000); // no item — must stay unlocked
      const p1Slot1 = makeSlot("bulbasaur", ["tackle"], 1000);
      p1Slot1.heldItem = "choice-band";
      const p1Slots = [p1Slot0, p1Slot1, makeSlot("charmander", ["tackle"], 1000)];
      const p2Slots = [makeSlot("squirtle", ["tackle"], 1000), makeSlot("jigglypuff", ["tackle"], 1000), makeSlot("eevee", ["tackle"], 1000)];
      const state = startDoublesBattle(p1Slots, p2Slots);

      const action: BattleAction = {
        type: "EXECUTE_TURN",
        player1Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player1Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
        player2Action: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 0 },
        player2Action2: { type: "MOVE", moveIndex: 0, target: "opp0", slot: 1 },
      };
      const result = battleReducer(state, action);

      expect(result.player1.pokemon[0].choiceLockedMove).toBeNull();
      expect(result.player1.pokemon[1].choiceLockedMove).toBe("tackle");
    });
  });

  describe("FORCE_SWITCH in doubles", () => {
    it("replaces the correct slot when switching in doubles", () => {
      const state = startDoublesBattle();
      // Simulate slot 1 needing a switch (e.g., fainted)
      const modState: BattleState = {
        ...state,
        phase: "force_switch",
        waitingForSwitch: "player1",
        waitingForSwitchSlot: 1,
      };

      const switchAction: BattleAction = {
        type: "FORCE_SWITCH",
        player: "player1",
        pokemonIndex: 2, // switch in the 3rd team member
        slot: 1,
      };
      const newState = battleReducer(modState, switchAction);
      expect(newState.player1.activePokemonIndex).toBe(0); // slot 0 unchanged
      expect(newState.player1.activePokemonIndex2).toBe(2); // slot 1 now points to index 2
      expect(newState.player1.pokemon[2].isActive).toBe(true);
    });
  });

  describe("Backwards compatibility — singles unchanged", () => {
    it("singles battle has activePokemonIndex2 null", () => {
      const action: BattleAction = {
        type: "START_BATTLE",
        player1Team: [makeSlot("pikachu"), makeSlot("bulbasaur")],
        player2Team: [makeSlot("squirtle"), makeSlot("jigglypuff")],
        mode: "ai",
        format: "singles",
      };
      const state = battleReducer(initialBattleState, action);
      expect(state.format).toBe("singles");
      expect(state.player1.activePokemonIndex2).toBeNull();
      expect(state.player2.activePokemonIndex2).toBeNull();
      expect(state.player1.pokemon[0].isActive).toBe(true);
      expect(state.player1.pokemon[1].isActive).toBe(false);
    });

    it("singles battle with no format specified defaults to singles", () => {
      const action: BattleAction = {
        type: "START_BATTLE",
        player1Team: [makeSlot("pikachu")],
        player2Team: [makeSlot("squirtle")],
        mode: "ai",
      };
      const state = battleReducer(initialBattleState, action);
      expect(state.format).toBe("singles");
    });
  });
});
