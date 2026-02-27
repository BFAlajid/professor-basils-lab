import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
} from "@/test/mocks/pokemon";
import { Pokemon, BattleLogEntry, BattlePokemon, BattleState } from "@/types";

// --- Mocks ---

vi.mock("@/data/heldItems", () => ({
  getHeldItem: vi.fn((name: string) => {
    if (name === "leftovers") {
      return { name: "leftovers", displayName: "Leftovers", effect: "", battleModifier: { type: "hp_restore", value: 1 / 16 } };
    }
    if (name === "black-sludge") {
      return { name: "black-sludge", displayName: "Black Sludge", effect: "", battleModifier: { type: "hp_restore", value: 1 / 16 } };
    }
    return null;
  }),
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn((_ability: string | null | undefined) => null),
}));

vi.mock("@/data/typeChart", () => ({
  getDefensiveMultiplier: vi.fn((_atkType: string, _defTypes: string[]) => 1),
}));

import { applyHazardsOnSwitchIn, applyEndOfTurnEffects } from "../battleEffects";
import { getAbilityHooks } from "@/data/abilities";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { getHeldItem } from "@/data/heldItems";

// Helpers
function mockMonoType(name: string, typeName: string): Pokemon {
  return {
    id: 1,
    name,
    sprites: { front_default: null },
    stats: [
      { base_stat: 80, stat: { name: "hp" } },
      { base_stat: 80, stat: { name: "attack" } },
      { base_stat: 80, stat: { name: "defense" } },
      { base_stat: 80, stat: { name: "special-attack" } },
      { base_stat: 80, stat: { name: "special-defense" } },
      { base_stat: 80, stat: { name: "speed" } },
    ],
    types: [{ slot: 1, type: { name: typeName as any } }],
    moves: [{ move: { name: "tackle", url: "" } }],
    abilities: [{ ability: { name: "pressure", url: "" }, is_hidden: false, slot: 1 }],
  };
}

function stateWithHazards(
  sideOverrides: Partial<BattleState["field"]["player1Side"]>,
  p1Overrides?: Partial<BattlePokemon>,
  pokemon?: Pokemon,
): { state: BattleState; log: BattleLogEntry[] } {
  const pkmn = pokemon ?? mockBlastoise;
  const slot = createMockTeamSlot(pkmn);
  if (p1Overrides?.slot) Object.assign(slot, p1Overrides.slot);
  const bp = createMockBattlePokemon(slot, p1Overrides);
  const state: BattleState = {
    ...createMockBattleState(),
    player1: { pokemon: [bp], activePokemonIndex: 0, selectedMechanic: null },
    field: {
      weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0,
      player1Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0, ...sideOverrides },
      player2Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
    },
  };
  return { state, log: [] };
}

beforeEach(() => {
  vi.mocked(getAbilityHooks).mockReturnValue(null);
  vi.mocked(getDefensiveMultiplier).mockReturnValue(1);
  vi.mocked(getHeldItem).mockImplementation((name: string) => {
    if (name === "leftovers") {
      return { name: "leftovers", displayName: "Leftovers", effect: "", battleModifier: { type: "hp_restore" as const, value: 1 / 16 } };
    }
    if (name === "black-sludge") {
      return { name: "black-sludge", displayName: "Black Sludge", effect: "", battleModifier: { type: "hp_restore" as const, value: 1 / 16 } };
    }
    return null;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ========== applyHazardsOnSwitchIn ==========

describe("applyHazardsOnSwitchIn", () => {
  it("returns unchanged state for fainted Pokemon", () => {
    const { state, log } = stateWithHazards(
      { stealthRock: true, spikesLayers: 3 },
      { isFainted: true },
    );
    const result = applyHazardsOnSwitchIn(state, "player1", log);
    expect(result.player1.pokemon[0].currentHp).toBe(state.player1.pokemon[0].currentHp);
    expect(log).toHaveLength(0);
  });

  it("Heavy-Duty Boots blocks all entry hazards", () => {
    const pkmn = mockMonoType("donphan", "ground");
    const slot = createMockTeamSlot(pkmn);
    slot.heldItem = "heavy-duty-boots";
    const { state, log } = stateWithHazards(
      { stealthRock: true, spikesLayers: 3, toxicSpikesLayers: 2, stickyWeb: true },
      { slot },
      pkmn,
    );
    const result = applyHazardsOnSwitchIn(state, "player1", log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
    expect(log).toHaveLength(0);
  });

  describe("Stealth Rock", () => {
    it("deals damage scaled by type effectiveness", () => {
      vi.mocked(getDefensiveMultiplier).mockReturnValue(2);
      const { state, log } = stateWithHazards({ stealthRock: true });
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      // damage = max(1, floor(300 * 2 / 8)) = 75
      expect(result.player1.pokemon[0].currentHp).toBe(300 - 75);
      expect(log.some((l) => l.kind === "hazard" && l.message.includes("Pointed stones"))).toBe(true);
    });

    it("deals reduced damage to resistant types", () => {
      vi.mocked(getDefensiveMultiplier).mockReturnValue(0.25);
      const { state, log } = stateWithHazards({ stealthRock: true });
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      // damage = max(1, floor(300 * 0.25 / 8)) = max(1, 9) = 9
      expect(result.player1.pokemon[0].currentHp).toBe(300 - 9);
    });
  });

  describe("Spikes", () => {
    it("deals damage at each layer count for grounded Pokemon", () => {
      const expectedFractions = [1 / 8, 1 / 6, 1 / 4];
      for (let layers = 1; layers <= 3; layers++) {
        const pkmn = mockMonoType("steelix", "steel");
        const { state, log } = stateWithHazards({ spikesLayers: layers }, undefined, pkmn);
        const result = applyHazardsOnSwitchIn(state, "player1", log);
        const expectedDmg = Math.max(1, Math.floor(300 * expectedFractions[layers - 1]));
        expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDmg);
      }
    });

    it("does not affect flying types", () => {
      // Charizard is fire/flying
      const slot = createMockTeamSlot(mockCharizard);
      const { state, log } = stateWithHazards({ spikesLayers: 3 }, { slot }, mockCharizard);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });

    it("does not affect Levitate users", () => {
      const pkmn = mockMonoType("bronzong", "steel");
      const slot = createMockTeamSlot(pkmn);
      slot.ability = "Levitate";
      const { state, log } = stateWithHazards({ spikesLayers: 3 }, { slot }, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });
  });

  describe("Toxic Spikes", () => {
    it("poisons grounded non-poison/steel Pokemon with 1 layer", () => {
      const pkmn = mockMonoType("machamp", "fighting");
      const { state, log } = stateWithHazards({ toxicSpikesLayers: 1 }, undefined, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].status).toBe("poison");
    });

    it("badly poisons with 2 layers", () => {
      const pkmn = mockMonoType("machamp", "fighting");
      const { state, log } = stateWithHazards({ toxicSpikesLayers: 2 }, undefined, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].status).toBe("toxic");
      expect(result.player1.pokemon[0].toxicCounter).toBe(0);
    });

    it("poison types absorb and remove toxic spikes", () => {
      const pkmn: Pokemon = {
        ...mockMonoType("gengar", "poison"),
        types: [{ slot: 1, type: { name: "ghost" } }, { slot: 2, type: { name: "poison" } }],
      };
      const { state, log } = stateWithHazards({ toxicSpikesLayers: 2 }, undefined, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.field.player1Side.toxicSpikesLayers).toBe(0);
      expect(result.player1.pokemon[0].status).toBeNull();
      expect(log.some((l) => l.message.includes("absorbed"))).toBe(true);
    });

    it("steel types are immune", () => {
      const pkmn = mockMonoType("steelix", "steel");
      const { state, log } = stateWithHazards({ toxicSpikesLayers: 2 }, undefined, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].status).toBeNull();
    });

    it("flying types are immune", () => {
      const slot = createMockTeamSlot(mockCharizard);
      const { state, log } = stateWithHazards({ toxicSpikesLayers: 2 }, { slot }, mockCharizard);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].status).toBeNull();
    });
  });

  describe("Sticky Web", () => {
    it("lowers speed of grounded Pokemon by 1 stage", () => {
      const pkmn = mockMonoType("machamp", "fighting");
      const { state, log } = stateWithHazards({ stickyWeb: true }, undefined, pkmn);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].statStages.speed).toBe(-1);
      expect(log.some((l) => l.message.includes("Sticky Web"))).toBe(true);
    });

    it("does not affect flying types", () => {
      const slot = createMockTeamSlot(mockCharizard);
      const { state, log } = stateWithHazards({ stickyWeb: true }, { slot }, mockCharizard);
      const result = applyHazardsOnSwitchIn(state, "player1", log);
      expect(result.player1.pokemon[0].statStages.speed).toBe(0);
    });
  });

  it("hazard damage can cause faint", () => {
    vi.mocked(getDefensiveMultiplier).mockReturnValue(4); // 4x weak to rock
    const { state, log } = stateWithHazards({ stealthRock: true }, { currentHp: 100 });
    // damage = max(1, floor(300 * 4 / 8)) = 150 → 100 - 150 = 0 → faint
    const result = applyHazardsOnSwitchIn(state, "player1", log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });
});

// ========== applyEndOfTurnEffects ==========

describe("applyEndOfTurnEffects", () => {
  function stateForEOT(
    p1Overrides?: Partial<BattlePokemon>,
    fieldOverrides?: Partial<BattleState["field"]>,
    pokemon?: Pokemon,
  ): { state: BattleState; log: BattleLogEntry[] } {
    const pkmn = pokemon ?? mockBlastoise;
    const slot = createMockTeamSlot(pkmn);
    if (p1Overrides?.slot) Object.assign(slot, p1Overrides.slot);
    const bp = createMockBattlePokemon(slot, p1Overrides);
    const state: BattleState = {
      ...createMockBattleState(),
      player1: { pokemon: [bp], activePokemonIndex: 0, selectedMechanic: null },
      // Give player2 a fainted pokemon so it's skipped
      player2: {
        pokemon: [createMockBattlePokemon(createMockTeamSlot(mockCharizard), { isFainted: true })],
        activePokemonIndex: 0,
        selectedMechanic: null,
      },
      field: {
        weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0,
        player1Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
        player2Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
        ...fieldOverrides,
      },
    };
    return { state, log: [] };
  }

  describe("status damage", () => {
    it("burn deals 1/16 maxHp", () => {
      const { state, log } = stateForEOT({ status: "burn" });
      const result = applyEndOfTurnEffects(state, log);
      const expectedDmg = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDmg);
      expect(log.some((l) => l.message.includes("burn"))).toBe(true);
    });

    it("poison deals 1/8 maxHp", () => {
      const { state, log } = stateForEOT({ status: "poison" });
      const result = applyEndOfTurnEffects(state, log);
      const expectedDmg = Math.max(1, Math.floor(300 / 8));
      expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDmg);
      expect(log.some((l) => l.message.includes("poison"))).toBe(true);
    });

    it("toxic damage scales with counter", () => {
      const { state, log } = stateForEOT({ status: "toxic", toxicCounter: 0 });
      const result = applyEndOfTurnEffects(state, log);
      // counter increments to 1 → damage = max(1, floor(300 * 1 / 16)) = 18
      expect(result.player1.pokemon[0].toxicCounter).toBe(1);
      expect(result.player1.pokemon[0].currentHp).toBe(300 - 18);
    });

    it("toxic counter increments each turn", () => {
      const { state, log } = stateForEOT({ status: "toxic", toxicCounter: 3 });
      const result = applyEndOfTurnEffects(state, log);
      // counter increments to 4 → damage = max(1, floor(300 * 4 / 16)) = 75
      expect(result.player1.pokemon[0].toxicCounter).toBe(4);
      expect(result.player1.pokemon[0].currentHp).toBe(300 - 75);
    });
  });

  describe("Poison Heal ability", () => {
    it("heals 1/8 maxHp instead of taking poison damage", () => {
      vi.mocked(getAbilityHooks).mockReturnValue({
        onEndOfTurn: ({ pokemon }: any) => ({
          type: "heal",
          healFraction: 1 / 8,
          message: `${pokemon.slot.pokemon.name}'s Poison Heal restored HP!`,
        }),
      } as any);
      const { state, log } = stateForEOT({ status: "poison", currentHp: 200 });
      const result = applyEndOfTurnEffects(state, log);
      const heal = Math.max(1, Math.floor(300 / 8));
      expect(result.player1.pokemon[0].currentHp).toBe(200 + heal);
      expect(log.some((l) => l.kind === "heal" && l.message.includes("Poison Heal"))).toBe(true);
    });
  });

  describe("Magic Guard", () => {
    it("blocks burn damage", () => {
      vi.mocked(getAbilityHooks).mockReturnValue({ preventIndirectDamage: true } as any);
      const { state, log } = stateForEOT({ status: "burn" });
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });

    it("blocks weather damage", () => {
      vi.mocked(getAbilityHooks).mockReturnValue({ preventIndirectDamage: true } as any);
      const { state, log } = stateForEOT({}, { weather: "sandstorm", weatherTurnsLeft: 5 });
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });
  });

  describe("held item healing", () => {
    it("Leftovers heals 1/16 maxHp", () => {
      const pkmn = mockMonoType("snorlax", "normal");
      const slot = createMockTeamSlot(pkmn);
      slot.heldItem = "leftovers";
      const { state, log } = stateForEOT({ currentHp: 200, slot }, undefined, pkmn);
      const result = applyEndOfTurnEffects(state, log);
      const heal = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(200 + heal);
      expect(log.some((l) => l.message.includes("Leftovers"))).toBe(true);
    });

    it("Black Sludge heals poison types only", () => {
      const poisonMon: Pokemon = {
        ...mockMonoType("muk", "poison"),
      };
      const slot = createMockTeamSlot(poisonMon);
      slot.heldItem = "black-sludge";
      const { state, log } = stateForEOT({ currentHp: 200, slot }, undefined, poisonMon);
      const result = applyEndOfTurnEffects(state, log);
      const heal = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(200 + heal);
      expect(log.some((l) => l.message.includes("Black Sludge"))).toBe(true);
    });

    it("Black Sludge does not heal non-poison types", () => {
      const normalMon = mockMonoType("snorlax", "normal");
      const slot = createMockTeamSlot(normalMon);
      slot.heldItem = "black-sludge";
      const { state, log } = stateForEOT({ currentHp: 200, slot }, undefined, normalMon);
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(200);
    });
  });

  describe("Sitrus Berry", () => {
    it("heals 1/4 maxHp at 50% or below and is consumed", () => {
      const pkmn = mockMonoType("snorlax", "normal");
      const slot = createMockTeamSlot(pkmn);
      slot.heldItem = "sitrus-berry";
      const { state, log } = stateForEOT({ currentHp: 150, slot }, undefined, pkmn); // 150/300 = 50%
      const result = applyEndOfTurnEffects(state, log);
      const heal = Math.floor(300 * 0.25);
      expect(result.player1.pokemon[0].currentHp).toBe(150 + heal);
      expect(result.player1.pokemon[0].slot.heldItem).toBeNull();
      expect(log.some((l) => l.message.includes("Sitrus Berry"))).toBe(true);
    });

    it("does not activate above 50% HP", () => {
      const pkmn = mockMonoType("snorlax", "normal");
      const slot = createMockTeamSlot(pkmn);
      slot.heldItem = "sitrus-berry";
      const { state, log } = stateForEOT({ currentHp: 200, slot }, undefined, pkmn); // 200/300 > 50%
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(200);
      expect(result.player1.pokemon[0].slot.heldItem).toBe("sitrus-berry");
    });
  });

  describe("weather damage", () => {
    it("sandstorm deals 1/16 to non-rock/ground/steel", () => {
      const { state, log } = stateForEOT({}, { weather: "sandstorm", weatherTurnsLeft: 5 });
      const result = applyEndOfTurnEffects(state, log);
      const dmg = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(300 - dmg);
      expect(log.some((l) => l.message.includes("sandstorm"))).toBe(true);
    });

    it("sandstorm does not damage rock types", () => {
      const rockMon = mockMonoType("golem", "rock");
      const { state, log } = stateForEOT({}, { weather: "sandstorm", weatherTurnsLeft: 5 }, rockMon);
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });

    it("hail deals 1/16 to non-ice", () => {
      const { state, log } = stateForEOT({}, { weather: "hail", weatherTurnsLeft: 5 });
      const result = applyEndOfTurnEffects(state, log);
      const dmg = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(300 - dmg);
      expect(log.some((l) => l.message.includes("hail"))).toBe(true);
    });

    it("hail does not damage ice types", () => {
      const iceMon = mockMonoType("lapras", "ice");
      const { state, log } = stateForEOT({}, { weather: "hail", weatherTurnsLeft: 5 }, iceMon);
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });
  });

  describe("Grassy Terrain", () => {
    it("heals 1/16 maxHp", () => {
      const { state, log } = stateForEOT({ currentHp: 200 }, { terrain: "grassy", terrainTurnsLeft: 5 });
      const result = applyEndOfTurnEffects(state, log);
      const heal = Math.max(1, Math.floor(300 / 16));
      expect(result.player1.pokemon[0].currentHp).toBe(200 + heal);
      expect(log.some((l) => l.message.includes("Grassy Terrain"))).toBe(true);
    });
  });

  describe("Speed Boost ability", () => {
    it("raises speed by 1 stage at end of turn", () => {
      vi.mocked(getAbilityHooks).mockReturnValue({
        onEndOfTurn: () => ({
          type: "speed_boost",
          stat: "speed",
          stages: 1,
          message: "Speed Boost raised its speed!",
        }),
      } as any);
      const { state, log } = stateForEOT({});
      const result = applyEndOfTurnEffects(state, log);
      expect(result.player1.pokemon[0].statStages.speed).toBe(1);
    });
  });

  it("faint from status damage", () => {
    const { state, log } = stateForEOT({ status: "burn", currentHp: 1 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });

  it("faint from weather damage", () => {
    const { state, log } = stateForEOT({ currentHp: 1 }, { weather: "sandstorm", weatherTurnsLeft: 5 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });
});
