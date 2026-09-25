import { describe, it, expect } from "vitest";
import { detectArchetype } from "../archetypeDetector";
import { Pokemon, TeamSlot } from "@/types";

// --- Fixture helpers ---
// Archetype detection never reads `pokemon.types`, so fixtures use a single
// generic type and only vary base speed + ability, keeping teams focused on
// the signals under test.

function makeMon(name: string, id: number, baseSpeed: number, abilityKey?: string): Pokemon {
  return {
    id,
    name,
    sprites: { front_default: null },
    stats: [
      { base_stat: 80, stat: { name: "hp" } },
      { base_stat: 80, stat: { name: "attack" } },
      { base_stat: 80, stat: { name: "defense" } },
      { base_stat: 80, stat: { name: "special-attack" } },
      { base_stat: 80, stat: { name: "special-defense" } },
      { base_stat: baseSpeed, stat: { name: "speed" } },
    ],
    types: [{ slot: 1, type: { name: "normal" } }],
    moves: [],
    abilities: abilityKey
      ? [{ ability: { name: abilityKey, url: "" }, is_hidden: false, slot: 1 }]
      : [],
  };
}

function makeSlot(pokemon: Pokemon, overrides: Partial<TeamSlot> = {}): TeamSlot {
  return {
    pokemon,
    position: 0,
    nature: null,
    evs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: pokemon.abilities?.[0]?.ability.name ?? null,
    heldItem: null,
    selectedMoves: [],
    ...overrides,
  };
}

function fillerSlot(name: string, id: number, baseSpeed: number): TeamSlot {
  return makeSlot(makeMon(name, id, baseSpeed), { selectedMoves: ["tackle"] });
}

// --- Rain team ---

describe("detectArchetype - rain team", () => {
  it("classifies rain-primary with ability evidence (Drizzle + Swift Swim)", () => {
    const politoed = makeSlot(makeMon("politoed", 186, 70, "drizzle"), {
      selectedMoves: ["scald", "ice-beam", "toxic", "protect"],
    });
    const barraskewda = makeSlot(makeMon("barraskewda", 851, 136, "swift-swim"), {
      heldItem: "choice-band",
      selectedMoves: ["liquidation", "close-combat", "crunch", "flip-turn"],
    });
    const team: TeamSlot[] = [
      politoed,
      barraskewda,
      fillerSlot("filler-1", 901, 60),
      fillerSlot("filler-2", 902, 60),
      fillerSlot("filler-3", 903, 60),
      fillerSlot("filler-4", 904, 60),
    ];

    const report = detectArchetype(team);

    expect(report.primary.archetype).toBe("rain");
    expect(report.confidence).toBe("high");
    expect(report.primary.evidence.some((e) => e.includes("Politoed") && e.includes("Drizzle"))).toBe(true);
    expect(report.primary.evidence.some((e) => e.includes("Barraskewda") && e.includes("Swift Swim"))).toBe(true);
    expect(report.setters.weather.some((e) => e.includes("Politoed") && e.includes("Drizzle"))).toBe(true);
  });

  it("resolves the active ability through a held mega stone (Charizardite Y -> Drought)", () => {
    const charizard = makeSlot(makeMon("charizard", 6, 100, "blaze"), {
      heldItem: "charizardite-y",
      selectedMoves: ["flamethrower", "solar-beam", "roost", "protect"],
    });
    const team: TeamSlot[] = [
      charizard,
      fillerSlot("filler-1", 905, 60),
      fillerSlot("filler-2", 906, 60),
      fillerSlot("filler-3", 907, 60),
    ];

    const report = detectArchetype(team);

    expect(report.primary.archetype).toBe("sun");
    expect(report.setters.weather.some((e) => e.includes("Charizard") && e.includes("Drought"))).toBe(true);
  });
});

// --- Trick Room team ---

describe("detectArchetype - trick room team", () => {
  it("classifies trick-room-primary with a slow speed profile", () => {
    const bronzong = makeSlot(makeMon("bronzong", 437, 30, "levitate"), {
      selectedMoves: ["trick-room", "gyro-ball", "stealth-rock", "hypnosis"],
    });
    const torkoal = makeSlot(makeMon("torkoal", 324, 30, "white-smoke"), {
      selectedMoves: ["eruption", "curse", "yawn", "rest"],
    });
    const team: TeamSlot[] = [
      bronzong,
      torkoal,
      fillerSlot("filler-3", 908, 30),
      fillerSlot("filler-4", 909, 30),
    ];

    const report = detectArchetype(team);

    expect(report.primary.archetype).toBe("trick-room");
    expect(report.speedProfile).toBe("slow");
    expect(report.confidence).toBe("high");
    expect(report.primary.evidence.some((e) => e.includes("Bronzong") && e.includes("Trick Room"))).toBe(true);
  });
});

// --- Stall team ---

describe("detectArchetype - stall team", () => {
  it("classifies stall-primary from recovery, Leftovers, and hazards", () => {
    const toxapex = makeSlot(makeMon("toxapex", 748, 40, "regenerator"), {
      heldItem: "leftovers",
      selectedMoves: ["recover", "toxic", "scald", "haze"],
    });
    const ferrothorn = makeSlot(makeMon("ferrothorn", 598, 40, "iron-barbs"), {
      heldItem: "leftovers",
      selectedMoves: ["stealth-rock", "spikes", "leech-seed", "gyro-ball"],
    });
    const blocker = makeSlot(makeMon("blocker", 910, 40), {
      heldItem: "leftovers",
      selectedMoves: ["whirlwind", "protect", "earthquake", "toxic"],
    });
    const cleric = makeSlot(makeMon("cleric", 911, 40), {
      heldItem: "leftovers",
      selectedMoves: ["recover", "toxic", "scald", "protect"],
    });
    const team: TeamSlot[] = [toxapex, ferrothorn, blocker, cleric];

    const report = detectArchetype(team);

    expect(report.primary.archetype).toBe("stall");
    expect(report.confidence).toBe("high");
    expect(report.setters.hazards.length).toBeGreaterThan(0);
    expect(report.secondary.some((s) => s.archetype === "hazard-stack")).toBe(true);
    expect(report.primary.evidence.some((e) => e.includes("Leftovers") || e.includes("Recover"))).toBe(true);
  });
});

// --- Empty team ---

describe("detectArchetype - empty team", () => {
  it("returns insufficient-data with no signals", () => {
    const report = detectArchetype([]);

    expect(report.confidence).toBe("insufficient-data");
    expect(report.secondary).toEqual([]);
    expect(report.winCondition).toEqual([]);
    expect(report.setters).toEqual({ hazards: [], weather: [], terrain: [], screens: [] });
    expect(report.primary).toBeDefined();
    expect(report.primary.score).toBe(0);
  });

  it("does not force insufficient-data for a small non-empty team", () => {
    const solo = makeSlot(makeMon("solo", 1, 70, "drizzle"), { selectedMoves: ["scald"] });
    const report = detectArchetype([solo]);

    expect(report.confidence).not.toBe("insufficient-data");
  });
});

// --- Mixed / unfocused team ---

describe("detectArchetype - mixed signals", () => {
  it("reports multiple secondaries and flags an unfocused team when signals conflict", () => {
    const politoed = makeSlot(makeMon("politoed", 186, 70, "drizzle"), {
      selectedMoves: ["scald", "toxic", "protect", "perish-song"],
    });
    const trUser = makeSlot(makeMon("bronzong", 437, 40, "levitate"), {
      selectedMoves: ["trick-room", "gyro-ball", "curse", "rest"],
    });
    const team: TeamSlot[] = [
      politoed,
      trUser,
      fillerSlot("filler-a", 930, 60),
      fillerSlot("filler-b", 931, 50),
    ];

    const report = detectArchetype(team);

    expect(report.primary.archetype).toBe("trick-room");
    expect(report.secondary.length).toBeGreaterThanOrEqual(2);
    expect(report.secondary.some((s) => s.archetype === "rain")).toBe(true);
    expect(report.confidence).toBe("medium");
    expect(report.winCondition.some((l) => l.toLowerCase().includes("split between"))).toBe(true);
  });
});

// --- Never throws / fuzzing ---

describe("detectArchetype - never throws", () => {
  it("handles a null or undefined team without throwing", () => {
    expect(() => detectArchetype(null as unknown as TeamSlot[])).not.toThrow();
    expect(() => detectArchetype(undefined as unknown as TeamSlot[])).not.toThrow();
    expect(detectArchetype(null as unknown as TeamSlot[]).confidence).toBe("insufficient-data");
  });

  it("handles a slot with missing ability, item, and moves", () => {
    const mon = makeMon("bare-mon", 999, 50);
    const bareSlot: TeamSlot = { pokemon: mon, position: 0 };

    expect(() => detectArchetype([bareSlot])).not.toThrow();
    const report = detectArchetype([bareSlot]);
    expect(report.primary).toBeDefined();
    expect(report.confidence).toBe("low");
  });

  it("handles malformed Pokemon stats without throwing", () => {
    const broken = { ...makeMon("broken", 998, 50), stats: [] } as Pokemon;
    const slot = makeSlot(broken, { selectedMoves: ["tackle"] });

    expect(() => detectArchetype([slot])).not.toThrow();
    const report = detectArchetype([slot]);
    expect(["fast", "mixed", "slow"]).toContain(report.speedProfile);
  });

  it("fuzzes a range of partial slots without throwing and always returns a well-formed report", () => {
    const base = makeMon("fuzz-mon", 1000, 50, "drizzle");
    const variants: TeamSlot[][] = [
      [{ pokemon: base, position: 0 }],
      [{ pokemon: base, position: 0, ability: undefined }],
      [{ pokemon: base, position: 0, selectedMoves: [] }],
      [{ pokemon: base, position: 0, selectedMoves: ["trick-room", "", "unknown-move-xyz"] }],
      [{ pokemon: base, position: 0, heldItem: "nonexistent-item" }],
      [{ pokemon: base, position: 0, formeOverride: "some-unknown-forme" }],
      [{ pokemon: base, position: 0 }, { pokemon: base, position: 1, heldItem: null, ability: null }],
    ];

    for (const team of variants) {
      expect(() => detectArchetype(team)).not.toThrow();
      const report = detectArchetype(team);
      expect(report.primary).toBeDefined();
      expect(typeof report.primary.archetype).toBe("string");
      expect(Array.isArray(report.secondary)).toBe(true);
      expect(["fast", "mixed", "slow"]).toContain(report.speedProfile);
      expect(["high", "medium", "low", "insufficient-data"]).toContain(report.confidence);
      expect(Array.isArray(report.winCondition)).toBe(true);
    }
  });
});
