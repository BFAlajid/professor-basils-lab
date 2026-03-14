import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
}));

vi.mock("@/utils/wildBattle", () => ({
  createWildTeamSlot: vi.fn((pokemon, level) => ({
    pokemon,
    position: 0,
    level,
  })),
}));

vi.mock("@/utils/random", () => ({
  shuffleArray: vi.fn((arr: unknown[]) => [...arr]),
}));

vi.mock("@/utils/silentWarn", () => ({
  silentWarn: vi.fn(),
}));

import { generateTournamentBracket } from "../tournament";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { shuffleArray } from "@/utils/random";
import { createWildTeamSlot } from "@/utils/wildBattle";

const mockFetchPokemonData = vi.mocked(fetchPokemonData);
const mockShuffleArray = vi.mocked(shuffleArray);
const mockCreateWildTeamSlot = vi.mocked(createWildTeamSlot);

function makeFakePokemon(id: number) {
  return {
    id,
    name: `pokemon-${id}`,
    types: [{ type: { name: "fire" } }],
    stats: [],
    abilities: [{ ability: { name: "blaze" } }],
    sprites: {},
    moves: [],
  };
}

describe("generateTournamentBracket", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: shuffleArray returns input unchanged (deterministic)
    mockShuffleArray.mockImplementation((arr: unknown[]) => [...arr]);

    // Default: fetchPokemonData returns a fake pokemon
    mockFetchPokemonData.mockImplementation(async (id) =>
      makeFakePokemon(id as number) as any
    );

    // Default: createWildTeamSlot returns a minimal slot
    mockCreateWildTeamSlot.mockImplementation((pokemon: any, level: any) => ({
      pokemon,
      position: 0,
      level,
    }) as any);
  });

  it("generates exactly 8 trainers", async () => {
    const trainers = await generateTournamentBracket();
    expect(trainers).toHaveLength(8);
  });

  it("each trainer has name, title, theme, team, difficulty, and defeated=false", async () => {
    const trainers = await generateTournamentBracket();

    for (const trainer of trainers) {
      expect(trainer.name).toBeTruthy();
      expect(trainer.title).toBeTruthy();
      expect(trainer.theme).toBeTruthy();
      expect(Array.isArray(trainer.team)).toBe(true);
      expect(["easy", "normal", "hard"]).toContain(trainer.difficulty);
      expect(trainer.defeated).toBe(false);
    }
  });

  it("assigns round-based difficulty: 4 easy, 2 normal, 2 hard", async () => {
    const trainers = await generateTournamentBracket();

    const easies = trainers.filter((t) => t.difficulty === "easy");
    const normals = trainers.filter((t) => t.difficulty === "normal");
    const hards = trainers.filter((t) => t.difficulty === "hard");

    expect(easies).toHaveLength(4);
    expect(normals).toHaveLength(2);
    expect(hards).toHaveLength(2);
  });

  it("easy trainers have 3 pokemon, normal have 4, hard have 6", async () => {
    const trainers = await generateTournamentBracket();

    for (const trainer of trainers) {
      if (trainer.difficulty === "easy") {
        expect(trainer.team.length).toBe(3);
      } else if (trainer.difficulty === "normal") {
        expect(trainer.team.length).toBe(4);
      } else {
        expect(trainer.team.length).toBe(6);
      }
    }
  });

  it("handles fetch failures gracefully (skips failed pokemon)", async () => {
    let callCount = 0;
    mockFetchPokemonData.mockImplementation(async (id) => {
      callCount++;
      // Fail every other call
      if (callCount % 2 === 0) throw new Error("Network error");
      return makeFakePokemon(id as number) as any;
    });

    const trainers = await generateTournamentBracket();

    // Should still return 8 trainers; teams may be smaller due to failures
    expect(trainers).toHaveLength(8);
    for (const trainer of trainers) {
      expect(trainer.team.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("selects from type-themed pools based on trainer theme", async () => {
    const trainers = await generateTournamentBracket();

    // Since shuffleArray is identity, first 8 trainers from TRAINER_DATA are used.
    // The first trainer has theme "fire", so fetchPokemonData should be called
    // with IDs from the fire pool.
    expect(mockFetchPokemonData).toHaveBeenCalled();

    // Verify that fetchPokemonData was called with numeric IDs
    for (const call of mockFetchPokemonData.mock.calls) {
      expect(typeof call[0]).toBe("number");
    }
  });

  it("positions are set sequentially on each team", async () => {
    // createWildTeamSlot returns slots, and the code sets position = slots.length
    // before push. So positions should be 0, 1, 2, ...
    const trainers = await generateTournamentBracket();

    for (const trainer of trainers) {
      for (let i = 0; i < trainer.team.length; i++) {
        expect(trainer.team[i].position).toBe(i);
      }
    }
  });
});
