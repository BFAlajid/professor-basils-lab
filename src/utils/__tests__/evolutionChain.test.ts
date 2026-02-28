import { vi } from "vitest";

vi.mock("@/utils/pokeApiClient", () => ({
  fetchSpeciesData: vi.fn(),
}));

import {
  fetchEvolutionChain,
  getAvailableEvolutions,
  EvolutionNode,
} from "../evolutionChain";
import { fetchSpeciesData } from "@/utils/pokeApiClient";

// --- getAvailableEvolutions ---

describe("getAvailableEvolutions", () => {
  const bulbasaurChain: EvolutionNode = {
    speciesId: 1,
    speciesName: "bulbasaur",
    evolvesTo: [
      {
        speciesId: 2,
        speciesName: "ivysaur",
        evolvesTo: [
          {
            speciesId: 3,
            speciesName: "venusaur",
            evolvesTo: [],
            evolutionDetails: [
              {
                targetSpeciesId: 3,
                targetName: "venusaur",
                method: "level-up",
                minLevel: 32,
                trigger: "Lv. 32",
              },
            ],
          },
        ],
        evolutionDetails: [
          {
            targetSpeciesId: 2,
            targetName: "ivysaur",
            method: "level-up",
            minLevel: 16,
            trigger: "Lv. 16",
          },
        ],
      },
    ],
    evolutionDetails: [],
  };

  const eeveeChain: EvolutionNode = {
    speciesId: 133,
    speciesName: "eevee",
    evolvesTo: [
      {
        speciesId: 134,
        speciesName: "vaporeon",
        evolvesTo: [],
        evolutionDetails: [
          {
            targetSpeciesId: 134,
            targetName: "vaporeon",
            method: "use-item",
            itemRequired: "water-stone",
            trigger: "Water Stone",
          },
        ],
      },
      {
        speciesId: 135,
        speciesName: "jolteon",
        evolvesTo: [],
        evolutionDetails: [
          {
            targetSpeciesId: 135,
            targetName: "jolteon",
            method: "use-item",
            itemRequired: "thunder-stone",
            trigger: "Thunder Stone",
          },
        ],
      },
      {
        speciesId: 136,
        speciesName: "flareon",
        evolvesTo: [],
        evolutionDetails: [
          {
            targetSpeciesId: 136,
            targetName: "flareon",
            method: "use-item",
            itemRequired: "fire-stone",
            trigger: "Fire Stone",
          },
        ],
      },
    ],
    evolutionDetails: [],
  };

  it("returns empty array when Pokemon has no evolutions", () => {
    const options = getAvailableEvolutions(3, 50, bulbasaurChain);
    expect(options).toEqual([]);
  });

  it("returns evolution option when level is met", () => {
    const options = getAvailableEvolutions(1, 16, bulbasaurChain);
    expect(options).toHaveLength(1);
    expect(options[0].targetName).toBe("ivysaur");
    expect(options[0].method).toBe("level-up");
  });

  it("returns empty when level is not met for level-up evolution", () => {
    const options = getAvailableEvolutions(1, 10, bulbasaurChain);
    expect(options).toHaveLength(0);
  });

  it("returns all evolution paths for Eevee", () => {
    const options = getAvailableEvolutions(133, 1, eeveeChain);
    expect(options).toHaveLength(3);
    const names = options.map((o) => o.targetName);
    expect(names).toContain("vaporeon");
    expect(names).toContain("jolteon");
    expect(names).toContain("flareon");
  });

  it("returns empty when Pokemon ID not found in chain", () => {
    const options = getAvailableEvolutions(999, 50, bulbasaurChain);
    expect(options).toEqual([]);
  });
});

// --- fetchEvolutionChain ---

describe("fetchEvolutionChain", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and parses an evolution chain successfully", async () => {
    vi.mocked(fetchSpeciesData).mockResolvedValue({
      id: 1,
      name: "bulbasaur",
      egg_groups: [],
      evolution_chain: { url: "https://pokeapi.co/api/v2/evolution-chain/1/" },
      varieties: [],
    } as any);

    const mockChainData = {
      chain: {
        species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon-species/2/" },
            evolution_details: [
              {
                min_level: 16,
                trigger: { name: "level-up" },
                item: null,
                held_item: null,
                min_happiness: null,
                time_of_day: "",
                known_move: null,
                known_move_type: null,
                location: null,
              },
            ],
            evolves_to: [],
          },
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockChainData),
    } as Response);

    const result = await fetchEvolutionChain(1);
    expect(result).not.toBeNull();
    expect(result!.speciesName).toBe("bulbasaur");
    expect(result!.evolvesTo).toHaveLength(1);
    expect(result!.evolvesTo[0].speciesName).toBe("ivysaur");
  });

  it("returns null when evolution_chain URL is missing", async () => {
    vi.mocked(fetchSpeciesData).mockResolvedValue({
      id: 132,
      name: "ditto",
      egg_groups: [],
      evolution_chain: null,
      varieties: [],
    } as any);

    const result = await fetchEvolutionChain(132);
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    vi.mocked(fetchSpeciesData).mockRejectedValue(new Error("Network error"));

    const result = await fetchEvolutionChain(1);
    expect(result).toBeNull();
  });
});
