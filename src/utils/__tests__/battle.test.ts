import { describe, it, expect } from "vitest";
import { initBattlePokemon, initStatStages, getStatStageMultiplier } from "../battle";
import { mockCharizard, mockBlastoise, createMockTeamSlot } from "@/test/mocks/pokemon";

describe("initStatStages", () => {
  it("initializes all stat stages to 0", () => {
    const stages = initStatStages();
    expect(stages.attack).toBe(0);
    expect(stages.defense).toBe(0);
    expect(stages.spAtk).toBe(0);
    expect(stages.spDef).toBe(0);
    expect(stages.speed).toBe(0);
    expect(stages.accuracy).toBe(0);
    expect(stages.evasion).toBe(0);
  });
});

describe("getStatStageMultiplier", () => {
  it("returns 1 at stage 0", () => {
    expect(getStatStageMultiplier(0)).toBe(1);
  });

  it("increases at positive stages", () => {
    expect(getStatStageMultiplier(1)).toBeGreaterThan(1);
    expect(getStatStageMultiplier(2)).toBeGreaterThan(getStatStageMultiplier(1));
    expect(getStatStageMultiplier(6)).toBeGreaterThan(getStatStageMultiplier(3));
  });

  it("decreases at negative stages", () => {
    expect(getStatStageMultiplier(-1)).toBeLessThan(1);
    expect(getStatStageMultiplier(-2)).toBeLessThan(getStatStageMultiplier(-1));
  });
});

describe("initBattlePokemon", () => {
  it("creates a battle Pokemon from a team slot", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.slot).toBe(slot);
    expect(bp.currentHp).toBeGreaterThan(0);
    expect(bp.maxHp).toBe(bp.currentHp);
    expect(bp.status).toBeNull();
    expect(bp.isFainted).toBe(false);
    expect(bp.isActive).toBe(false);
    expect(bp.isMegaEvolved).toBe(false);
    expect(bp.isTerastallized).toBe(false);
    expect(bp.isDynamaxed).toBe(false);
  });

  it("initializes stat stages to 0", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.statStages.attack).toBe(0);
    expect(bp.statStages.defense).toBe(0);
    expect(bp.statStages.speed).toBe(0);
  });

  it("has tracking fields initialized correctly", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.turnsOnField).toBe(0);
    expect(bp.isProtected).toBe(false);
    expect(bp.lastMoveUsed).toBeNull();
    expect(bp.consecutiveProtects).toBe(0);
    expect(bp.isFlinched).toBe(false);
    expect(bp.toxicCounter).toBe(0);
    expect(bp.sleepTurns).toBe(0);
  });

  it("computes HP based on EVs and IVs", () => {
    const slot = createMockTeamSlot(mockCharizard);
    slot.evs = { hp: 252, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
    const bpWithEvs = initBattlePokemon(slot);

    const bareSlot = createMockTeamSlot(mockCharizard);
    bareSlot.evs = { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
    const bpWithoutEvs = initBattlePokemon(bareSlot);

    expect(bpWithEvs.maxHp).toBeGreaterThan(bpWithoutEvs.maxHp);
  });
});
