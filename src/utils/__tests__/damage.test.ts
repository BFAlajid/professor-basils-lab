import { describe, it, expect } from "vitest";
import { calculateDamage, extractBaseStats, getEffectivenessText } from "../damage";
import { mockCharizard, mockBlastoise, mockVenusaur } from "@/test/mocks/pokemon";
import { Move } from "@/types";

const fireBlast: Move = {
  id: 126,
  name: "fire-blast",
  power: 110,
  accuracy: 85,
  pp: 5,
  priority: 0,
  type: { name: "fire" },
  damage_class: { name: "special" },
};

const hydroPump: Move = {
  id: 56,
  name: "hydro-pump",
  power: 110,
  accuracy: 80,
  pp: 5,
  priority: 0,
  type: { name: "water" },
  damage_class: { name: "special" },
};

const earthquake: Move = {
  id: 89,
  name: "earthquake",
  power: 100,
  accuracy: 100,
  pp: 10,
  priority: 0,
  type: { name: "ground" },
  damage_class: { name: "physical" },
};

const willOWisp: Move = {
  id: 261,
  name: "will-o-wisp",
  power: null,
  accuracy: 85,
  pp: 15,
  priority: 0,
  type: { name: "fire" },
  damage_class: { name: "status" },
};

describe("extractBaseStats", () => {
  it("extracts base stats correctly from Charizard", () => {
    const stats = extractBaseStats(mockCharizard);
    expect(stats.hp).toBe(78);
    expect(stats.attack).toBe(84);
    expect(stats.defense).toBe(78);
    expect(stats.spAtk).toBe(109);
    expect(stats.spDef).toBe(85);
    expect(stats.speed).toBe(100);
  });
});

describe("calculateDamage", () => {
  it("returns 0 damage for status moves", () => {
    const result = calculateDamage(mockCharizard, mockBlastoise, willOWisp);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.stab).toBe(false);
  });

  it("calculates STAB correctly (Charizard Fire Blast)", () => {
    const result = calculateDamage(mockCharizard, mockVenusaur, fireBlast);
    expect(result.stab).toBe(true);
    expect(result.max).toBeGreaterThan(0);
  });

  it("calculates super effective damage (Water vs Fire)", () => {
    const result = calculateDamage(mockBlastoise, mockCharizard, hydroPump);
    expect(result.effectiveness).toBe(2);
    expect(result.max).toBeGreaterThan(0);
  });

  it("calculates not very effective damage (Fire vs Water)", () => {
    const result = calculateDamage(mockCharizard, mockBlastoise, fireBlast);
    expect(result.effectiveness).toBe(0.5);
  });

  it("applies burn penalty to physical attack", () => {
    const normalResult = calculateDamage(mockCharizard, mockBlastoise, earthquake);
    const burnedResult = calculateDamage(mockCharizard, mockBlastoise, earthquake, {
      attackerStatus: "burn",
    });
    expect(burnedResult.max).toBeLessThan(normalResult.max);
  });

  it("applies critical hit multiplier", () => {
    const normalResult = calculateDamage(mockCharizard, mockBlastoise, fireBlast);
    const critResult = calculateDamage(mockCharizard, mockBlastoise, fireBlast, {
      isCritical: true,
    });
    expect(critResult.max).toBeGreaterThan(normalResult.max);
    expect(critResult.isCritical).toBe(true);
  });

  it("calculates damage with EVs/IVs/nature", () => {
    const result = calculateDamage(mockCharizard, mockBlastoise, fireBlast, {
      attackerEvs: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
      attackerIvs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      attackerNature: { name: "modest", increased: "spAtk", decreased: "attack" },
      defenderEvs: { hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 },
      defenderIvs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      defenderNature: { name: "calm", increased: "spDef", decreased: "attack" },
    });
    expect(result.max).toBeGreaterThan(0);
    expect(result.effectiveness).toBe(0.5);
  });
});

describe("getEffectivenessText", () => {
  it("returns correct text for each effectiveness level", () => {
    expect(getEffectivenessText(0)).toBe("has no effect");
    expect(getEffectivenessText(0.5)).toBe("not very effective");
    expect(getEffectivenessText(1)).toBe("neutral");
    expect(getEffectivenessText(2)).toBe("super effective!");
  });
});
