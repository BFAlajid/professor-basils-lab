import { vi } from "vitest";
import { Pokemon } from "@/types";
import { PokemonSpeciesData } from "@/utils/pokeApiClient";

vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
  fetchSpeciesData: vi.fn(),
}));

import { fetchEggMoves } from "../eggMoves";
import { fetchPokemonData, fetchSpeciesData } from "@/utils/pokeApiClient";

describe("fetchEggMoves", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns EggMoveChain array with correct parents", async () => {
    // Target Pokemon knows "dragon-dance" as an egg move
    vi.mocked(fetchPokemonData).mockImplementation(async (nameOrId: string | number) => {
      if (nameOrId === 6 || nameOrId === "6") {
        return {
          id: 6,
          name: "charizard",
          moves: [
            {
              move: { name: "dragon-dance", url: "https://pokeapi.co/api/v2/move/349/" },
              version_group_details: [
                { move_learn_method: { name: "egg" }, version_group: { name: "sword-shield" }, level_learned_at: 0 },
              ],
            },
          ],
        } as unknown as Pokemon;
      }
      // Parent "dragonite" learns dragon-dance by level-up
      if (nameOrId === "dragonite") {
        return {
          id: 149,
          name: "dragonite",
          moves: [
            {
              move: { name: "dragon-dance", url: "https://pokeapi.co/api/v2/move/349/" },
              version_group_details: [
                { move_learn_method: { name: "level-up" }, version_group: { name: "sword-shield" }, level_learned_at: 55 },
              ],
            },
          ],
        } as unknown as Pokemon;
      }
      return { id: 0, name: String(nameOrId), moves: [] } as unknown as Pokemon;
    });

    vi.mocked(fetchSpeciesData).mockResolvedValue({
      id: 6,
      name: "charizard",
      egg_groups: [
        { name: "monster", url: "https://pokeapi.co/api/v2/egg-group/1/" },
      ],
      evolution_chain: null,
      varieties: [],
    } as PokemonSpeciesData);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          pokemon_species: [
            { name: "dragonite", url: "https://pokeapi.co/api/v2/pokemon-species/149/" },
          ],
        }),
    } as Response);

    const result = await fetchEggMoves(6);
    expect(result).toHaveLength(1);
    expect(result[0].moveName).toBe("dragon-dance");
    expect(result[0].parents.length).toBeGreaterThanOrEqual(1);
    expect(result[0].parents[0].speciesName).toBe("dragonite");
    // Regression: speciesId must come from the fetched parent data (id: 149),
    // not be parsed out of a species-name URL (which previously always yielded 0).
    expect(result[0].parents[0].speciesId).toBe(149);
  });

  it("returns empty array when no egg moves exist", async () => {
    vi.mocked(fetchPokemonData).mockResolvedValue({
      id: 25,
      name: "pikachu",
      moves: [
        {
          move: { name: "thunderbolt", url: "" },
          version_group_details: [
            { move_learn_method: { name: "level-up" }, version_group: { name: "sword-shield" }, level_learned_at: 30 },
          ],
        },
      ],
    } as unknown as Pokemon);

    const result = await fetchEggMoves(25);
    expect(result).toEqual([]);
  });

  it("returns empty array on fetch error", async () => {
    vi.mocked(fetchPokemonData).mockRejectedValue(new Error("Network error"));

    const result = await fetchEggMoves(999);
    expect(result).toEqual([]);
  });
});
