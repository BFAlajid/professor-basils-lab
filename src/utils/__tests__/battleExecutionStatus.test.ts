import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
  mockVenusaur,
} from "@/test/mocks/pokemon";
import { BattleLogEntry, BattlePokemon, BattleState } from "@/types";

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
}));

import { applyStatusMoveEffect } from "../battleExecutionStatus";
import { StatusMoveEffect } from "@/data/statusMoves";
import { getAbilityHooks } from "@/data/abilities";

beforeEach(() => {
  vi.mocked(getAbilityHooks).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Helpers ---

function buildState(
  p1Overrides?: Partial<BattlePokemon>,
  p2Overrides?: Partial<BattlePokemon>,
  fieldOverrides?: Partial<BattleState["field"]>,
): BattleState {
  return createMockBattleState({
    p1Overrides,
    p2Overrides,
    ...(fieldOverrides
      ? {
          field: {
            weather: null,
            weatherTurnsLeft: 0,
            terrain: null,
            terrainTurnsLeft: 0,
            trickRoom: 0,
            player1Side: {
              stealthRock: false,
              spikesLayers: 0,
              toxicSpikesLayers: 0,
              stickyWeb: false,
              reflect: 0,
              lightScreen: 0,
              tailwind: 0,
            },
            player2Side: {
              stealthRock: false,
              spikesLayers: 0,
              toxicSpikesLayers: 0,
              stickyWeb: false,
              reflect: 0,
              lightScreen: 0,
              tailwind: 0,
            },
            ...fieldOverrides,
          },
        }
      : {}),
  });
}

function apply(
  state: BattleState,
  effect: StatusMoveEffect,
  moveName: string,
  attackerPlayer: "player1" | "player2" = "player1",
  defenderPlayer: "player1" | "player2" = "player2",
): { state: BattleState; log: BattleLogEntry[] } {
  const log: BattleLogEntry[] = [];
  const newState = applyStatusMoveEffect(state, attackerPlayer, defenderPlayer, effect, moveName, log);
  return { state: newState, log };
}

// ========== Protect Mechanics ==========

describe("applyStatusMoveEffect", () => {
  describe("protect mechanics", () => {
    it("first use of Protect always succeeds", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const state = buildState({ consecutiveProtects: 0 });
      const { state: result, log } = apply(state, { protect: true }, "protect");

      expect(result.player1.pokemon[0].isProtected).toBe(true);
      expect(result.player1.pokemon[0].consecutiveProtects).toBe(1);
      expect(log.some((l) => l.message.includes("protected itself"))).toBe(true);
    });

    it("consecutive Protect has 1/3 success rate", () => {
      // consecutiveUses = 1 -> successChance = (1/3)^1 = 0.333
      // random = 0.5 > 0.333 -> should fail
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const state = buildState({ consecutiveProtects: 1 });
      const { state: result, log } = apply(state, { protect: true }, "protect");

      expect(result.player1.pokemon[0].isProtected).not.toBe(true);
      expect(log.some((l) => l.message.includes("Protect failed"))).toBe(true);
    });

    it("consecutive Protect succeeds when random is below threshold", () => {
      // consecutiveUses = 1 -> successChance = (1/3)^1 = 0.333
      // random = 0.1 < 0.333 -> should succeed
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      const state = buildState({ consecutiveProtects: 1 });
      const { state: result, log } = apply(state, { protect: true }, "protect");

      expect(result.player1.pokemon[0].isProtected).toBe(true);
      expect(log.some((l) => l.message.includes("protected itself"))).toBe(true);
    });

    it("third consecutive use has (1/3)^2 = 1/9 success rate", () => {
      // consecutiveUses = 2 -> successChance = (1/3)^2 = 0.111
      // random = 0.2 > 0.111 -> should fail
      vi.spyOn(Math, "random").mockReturnValue(0.2);
      const state = buildState({ consecutiveProtects: 2 });
      const { state: result, log } = apply(state, { protect: true }, "protect");

      expect(result.player1.pokemon[0].isProtected).not.toBe(true);
      expect(log.some((l) => l.message.includes("Protect failed"))).toBe(true);
    });

    it("increments consecutiveProtects even on failure", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const state = buildState({ consecutiveProtects: 2 });
      const { state: result } = apply(state, { protect: true }, "protect");

      expect(result.player1.pokemon[0].consecutiveProtects).toBe(3);
    });
  });

  // ========== Self Stat Changes ==========

  describe("self stat changes", () => {
    it.todo("Swords Dance raises attack by 2 stages", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { attack: 2 } },
        "swords-dance",
      );

      expect(result.player1.pokemon[0].statStages.attack).toBe(2);
      expect(log.some((l) => l.message.includes("Attack") && l.message.includes("rose drastically"))).toBe(true);
    });

    it.todo("Iron Defense raises defense by 2 stages", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { defense: 2 } },
        "iron-defense",
      );

      expect(result.player1.pokemon[0].statStages.defense).toBe(2);
      expect(log.some((l) => l.message.includes("Defense") && l.message.includes("rose drastically"))).toBe(true);
    });

    it("Dragon Dance raises attack and speed by 1 each", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { attack: 1, speed: 1 } },
        "dragon-dance",
      );

      expect(result.player1.pokemon[0].statStages.attack).toBe(1);
      expect(result.player1.pokemon[0].statStages.speed).toBe(1);
      expect(log.some((l) => l.message.includes("Attack") && l.message.includes("rose!"))).toBe(true);
      expect(log.some((l) => l.message.includes("Speed") && l.message.includes("rose!"))).toBe(true);
    });

    it("stat stage clamps at maximum of +6", () => {
      const state = buildState({
        statStages: { attack: 5, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      });
      const { state: result } = apply(
        state,
        { selfStatChanges: { attack: 2 } },
        "swords-dance",
      );

      expect(result.player1.pokemon[0].statStages.attack).toBe(6);
    });

    it("stat stage clamps at minimum of -6", () => {
      const state = buildState({
        statStages: { attack: 0, defense: -5, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      });
      const { state: result } = apply(
        state,
        { selfStatChanges: { defense: -2 } },
        "shell-smash",
      );

      expect(result.player1.pokemon[0].statStages.defense).toBe(-6);
    });

    it("Shell Smash raises offenses and drops defenses", () => {
      const state = buildState();
      const { state: result } = apply(
        state,
        { selfStatChanges: { attack: 2, spAtk: 2, speed: 2, defense: -1, spDef: -1 } },
        "shell-smash",
      );

      expect(result.player1.pokemon[0].statStages.attack).toBe(2);
      expect(result.player1.pokemon[0].statStages.spAtk).toBe(2);
      expect(result.player1.pokemon[0].statStages.speed).toBe(2);
      expect(result.player1.pokemon[0].statStages.defense).toBe(-1);
      expect(result.player1.pokemon[0].statStages.spDef).toBe(-1);
    });

    it("no log message when stat is already at cap", () => {
      const state = buildState({
        statStages: { attack: 6, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      });
      const { log } = apply(
        state,
        { selfStatChanges: { attack: 2 } },
        "swords-dance",
      );

      // No change occurred, so no status log
      expect(log.filter((l) => l.kind === "status")).toHaveLength(0);
    });
  });

  // ========== Belly Drum ==========

  describe("belly drum", () => {
    it("costs 50% HP and maximizes attack", () => {
      const state = buildState({ currentHp: 300, maxHp: 300 });
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { attack: 6 } },
        "belly-drum",
      );

      expect(result.player1.pokemon[0].currentHp).toBe(150);
      expect(result.player1.pokemon[0].statStages.attack).toBe(6);
      expect(log.some((l) => l.message.includes("maximized Attack"))).toBe(true);
    });

    it("fails when HP is not enough", () => {
      const state = buildState({ currentHp: 100, maxHp: 300 });
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { attack: 6 } },
        "belly-drum",
      );

      // State should not change — HP cost = floor(300/2) = 150, currentHp (100) is not > 150
      expect(result.player1.pokemon[0].currentHp).toBe(100);
      expect(result.player1.pokemon[0].statStages.attack).toBe(0);
      expect(log.some((l) => l.message.includes("doesn't have enough HP"))).toBe(true);
    });

    it("fails when HP is exactly equal to the cost", () => {
      // cost = floor(300/2) = 150; currentHp = 150, condition is > cost, not >=
      const state = buildState({ currentHp: 150, maxHp: 300 });
      const { state: result, log } = apply(
        state,
        { selfStatChanges: { attack: 6 } },
        "belly-drum",
      );

      expect(result.player1.pokemon[0].currentHp).toBe(150);
      expect(log.some((l) => l.message.includes("doesn't have enough HP"))).toBe(true);
    });
  });

  // ========== Target Stat Changes ==========

  describe("target stat changes", () => {
    it.todo("Charm lowers target attack by 2", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatChanges: { attack: -2 } },
        "charm",
      );

      expect(result.player2.pokemon[0].statStages.attack).toBe(-2);
      expect(log.some((l) => l.message.includes("Attack") && l.message.includes("fell drastically"))).toBe(true);
    });

    it("Growl lowers target attack by 1", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatChanges: { attack: -1 } },
        "growl",
      );

      expect(result.player2.pokemon[0].statStages.attack).toBe(-1);
      expect(log.some((l) => l.message.includes("Attack") && l.message.includes("fell!"))).toBe(true);
    });

    it("target stat clamps at -6", () => {
      const state = buildState(undefined, {
        statStages: { attack: -5, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      });
      const { state: result } = apply(
        state,
        { targetStatChanges: { attack: -2 } },
        "charm",
      );

      expect(result.player2.pokemon[0].statStages.attack).toBe(-6);
    });
  });

  // ========== Status Infliction ==========

  describe("status infliction", () => {
    it("applies sleep to target", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatus: "sleep" },
        "spore",
      );

      expect(result.player2.pokemon[0].status).toBe("sleep");
      // sleepTurns = 1 + floor(0.5 * 3) = 1 + 1 = 2
      expect(result.player2.pokemon[0].sleepTurns).toBe(2);
      expect(log.some((l) => l.message.includes("put to sleep"))).toBe(true);
    });

    it("applies paralysis to target", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatus: "paralyze" },
        "thunder-wave",
      );

      expect(result.player2.pokemon[0].status).toBe("paralyze");
      expect(log.some((l) => l.message.includes("paralyzed"))).toBe(true);
    });

    it("applies poison to target", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatus: "poison" },
        "toxic",
      );

      expect(result.player2.pokemon[0].status).toBe("poison");
      expect(log.some((l) => l.message.includes("poisoned"))).toBe(true);
    });

    it("does not apply status if target already has one", () => {
      const state = buildState(undefined, { status: "burn" });
      const { state: result, log } = apply(
        state,
        { targetStatus: "paralyze" },
        "thunder-wave",
      );

      expect(result.player2.pokemon[0].status).toBe("burn");
      expect(log.some((l) => l.message.includes("already affected"))).toBe(true);
    });

    it("ability can prevent status infliction", () => {
      vi.mocked(getAbilityHooks).mockReturnValue({
        preventStatus: () => true,
      } as any);
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { targetStatus: "paralyze" },
        "thunder-wave",
      );

      expect(result.player2.pokemon[0].status).toBeNull();
      expect(log.some((l) => l.message.includes("ability prevented"))).toBe(true);
    });
  });

  // ========== Hazards ==========

  describe("hazards", () => {
    it("sets stealth rock on opponent side", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { hazard: "stealth-rock" },
        "stealth-rock",
      );

      expect(result.field.player2Side.stealthRock).toBe(true);
      expect(log.some((l) => l.message.includes("Pointed stones"))).toBe(true);
    });

    it("does not stack stealth rock if already set", () => {
      const state = buildState(undefined, undefined, {
        player2Side: { stealthRock: true, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0, tailwind: 0 },
      } as any);
      const { log } = apply(
        state,
        { hazard: "stealth-rock" },
        "stealth-rock",
      );

      expect(log.some((l) => l.message.includes("already set"))).toBe(true);
    });

    it("spikes stack up to 3 layers", () => {
      const state = buildState();
      let current = state;

      for (let i = 0; i < 3; i++) {
        const { state: newState } = apply(
          current,
          { hazard: "spikes" },
          "spikes",
        );
        current = newState;
      }

      expect(current.field.player2Side.spikesLayers).toBe(3);

      // Fourth use should fail
      const { log } = apply(
        current,
        { hazard: "spikes" },
        "spikes",
      );
      expect(log.some((l) => l.message.includes("already at maximum"))).toBe(true);
    });

    it("toxic spikes stack up to 2 layers", () => {
      const state = buildState();
      let current = state;

      for (let i = 0; i < 2; i++) {
        const { state: newState } = apply(
          current,
          { hazard: "toxic-spikes" },
          "toxic-spikes",
        );
        current = newState;
      }

      expect(current.field.player2Side.toxicSpikesLayers).toBe(2);

      const { log } = apply(
        current,
        { hazard: "toxic-spikes" },
        "toxic-spikes",
      );
      expect(log.some((l) => l.message.includes("already at maximum"))).toBe(true);
    });

    it("sets sticky web on opponent side", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { hazard: "sticky-web" },
        "sticky-web",
      );

      expect(result.field.player2Side.stickyWeb).toBe(true);
      expect(log.some((l) => l.message.includes("sticky web"))).toBe(true);
    });
  });

  // ========== Hazard Removal ==========

  describe("hazard removal", () => {
    it("rapid spin clears own-side hazards and raises speed", () => {
      const state = buildState(undefined, undefined, {
        player1Side: {
          stealthRock: true,
          spikesLayers: 2,
          toxicSpikesLayers: 1,
          stickyWeb: true,
          reflect: 0,
          lightScreen: 0,
          tailwind: 0,
        },
      } as any);
      const { state: result, log } = apply(
        state,
        { clearHazards: "rapid-spin" },
        "rapid-spin",
      );

      expect(result.field.player1Side.stealthRock).toBe(false);
      expect(result.field.player1Side.spikesLayers).toBe(0);
      expect(result.field.player1Side.toxicSpikesLayers).toBe(0);
      expect(result.field.player1Side.stickyWeb).toBe(false);
      expect(log.some((l) => l.message.includes("blew away the hazards"))).toBe(true);
      expect(log.some((l) => l.message.includes("Speed rose"))).toBe(true);
    });

    it("defog clears hazards from both sides and lowers target evasion", () => {
      const state = buildState(undefined, undefined, {
        player1Side: {
          stealthRock: true,
          spikesLayers: 0,
          toxicSpikesLayers: 0,
          stickyWeb: false,
          reflect: 0,
          lightScreen: 0,
          tailwind: 0,
        },
        player2Side: {
          stealthRock: true,
          spikesLayers: 1,
          toxicSpikesLayers: 0,
          stickyWeb: false,
          reflect: 5,
          lightScreen: 0,
          tailwind: 0,
        },
      } as any);
      const { state: result, log } = apply(
        state,
        { clearHazards: "defog" },
        "defog",
      );

      expect(result.field.player1Side.stealthRock).toBe(false);
      expect(result.field.player2Side.stealthRock).toBe(false);
      expect(result.field.player2Side.spikesLayers).toBe(0);
      expect(result.field.player2Side.reflect).toBe(0);
      expect(log.some((l) => l.message.includes("blown away"))).toBe(true);
      expect(result.player2.pokemon[0].statStages.evasion).toBe(-1);
    });
  });

  // ========== Screens ==========

  describe("screens", () => {
    it("sets Reflect for 5 turns", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { reflect: true },
        "reflect",
      );

      expect(result.field.player1Side.reflect).toBe(5);
      expect(log.some((l) => l.message.includes("Reflect raised"))).toBe(true);
    });

    it("sets Light Screen for 5 turns", () => {
      const state = buildState();
      const { state: result, log } = apply(
        state,
        { lightScreen: true },
        "light-screen",
      );

      expect(result.field.player1Side.lightScreen).toBe(5);
      expect(log.some((l) => l.message.includes("Light Screen raised"))).toBe(true);
    });

    it("does not stack Reflect if already active", () => {
      const state = buildState(undefined, undefined, {
        player1Side: {
          stealthRock: false,
          spikesLayers: 0,
          toxicSpikesLayers: 0,
          stickyWeb: false,
          reflect: 3,
          lightScreen: 0,
          tailwind: 0,
        },
      } as any);
      const { log } = apply(
        state,
        { reflect: true },
        "reflect",
      );

      expect(log.some((l) => l.message.includes("already active"))).toBe(true);
    });
  });

  // ========== Healing ==========

  describe("healing", () => {
    it("restores HP by heal percent", () => {
      const state = buildState({ currentHp: 100, maxHp: 300 });
      const { state: result, log } = apply(
        state,
        { healPercent: 50 },
        "recover",
      );

      // healAmount = floor(300 * 50 / 100) = 150
      // newHp = min(300, 100 + 150) = 250
      expect(result.player1.pokemon[0].currentHp).toBe(250);
      expect(log.some((l) => l.message.includes("restored HP"))).toBe(true);
    });

    it("does not heal above max HP", () => {
      const state = buildState({ currentHp: 280, maxHp: 300 });
      const { state: result } = apply(
        state,
        { healPercent: 50 },
        "recover",
      );

      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });

    it.todo("Rest fully heals and inflicts sleep with 2 turns", () => {
      const state = buildState({ currentHp: 50, maxHp: 300 });
      const { state: result, log } = apply(
        state,
        { healPercent: 100, targetStatus: "sleep" },
        "rest",
      );

      expect(result.player1.pokemon[0].currentHp).toBe(300);
      expect(result.player1.pokemon[0].status).toBe("sleep");
      expect(result.player1.pokemon[0].sleepTurns).toBe(2);
      expect(log.some((l) => l.message.includes("went to sleep and restored HP"))).toBe(true);
    });
  });

  // ========== Combined Effects ==========

  describe("combined effects", () => {
    it("self stat changes and target status applied together", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const state = buildState();
      const { state: result } = apply(
        state,
        { selfStatChanges: { attack: 1 }, targetStatus: "paralyze" },
        "some-move",
      );

      expect(result.player1.pokemon[0].statStages.attack).toBe(1);
      expect(result.player2.pokemon[0].status).toBe("paralyze");
    });

    it("hazard-setting moves track lastMoveUsed and reset consecutiveProtects", () => {
      const state = buildState({ consecutiveProtects: 3 });
      const { state: result } = apply(
        state,
        { hazard: "stealth-rock" },
        "stealth-rock",
      );

      expect(result.player1.pokemon[0].lastMoveUsed).toBe("stealth-rock");
      expect(result.player1.pokemon[0].consecutiveProtects).toBe(0);
    });

    it.todo("selfStatChanges does not modify consecutiveProtects (caller responsibility)", () => {
      const state = buildState({ consecutiveProtects: 3 });
      const { state: result } = apply(
        state,
        { selfStatChanges: { attack: 2 } },
        "swords-dance",
      );

      // applyStatusMoveEffect does not reset these for pure stat boost moves
      // The caller (executeMove) handles lastMoveUsed and consecutiveProtects
      expect(result.player1.pokemon[0].consecutiveProtects).toBe(3);
    });
  });
});
