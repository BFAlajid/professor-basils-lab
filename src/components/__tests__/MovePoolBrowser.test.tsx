import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MovePoolBrowser from "../MovePoolBrowser";
import type { PokemonMoveRef } from "@/types";

// ---------------------------------------------------------------------------
// These tests exercise MovePoolBrowser against the REAL pokeApiClient module
// (only the transport-level `fetch` is mocked). That's deliberate: the perf
// fix moved MovePoolBrowser off raw fetch() onto fetchPokemonData/
// fetchMoveData, whose value is the in-memory cache inside pokeApiClient.
// Mocking pokeApiClient wholesale would hide exactly the behavior we need to
// prove -- that switching back to a previously-viewed team member is served
// from cache instead of re-running the full move waterfall.
// ---------------------------------------------------------------------------

const pikachuMoves: PokemonMoveRef[] = [
  {
    move: { name: "thunderbolt", url: "https://pokeapi.co/api/v2/move/85/" },
    version_group_details: [
      { move_learn_method: { name: "level-up" }, level_learned_at: 26, version_group: { name: "x" } },
    ],
  },
  {
    move: { name: "quick-attack", url: "https://pokeapi.co/api/v2/move/98/" },
    version_group_details: [
      { move_learn_method: { name: "level-up" }, level_learned_at: 1, version_group: { name: "x" } },
    ],
  },
];

const charizardMoves: PokemonMoveRef[] = [
  {
    move: { name: "flamethrower", url: "https://pokeapi.co/api/v2/move/126/" },
    version_group_details: [
      { move_learn_method: { name: "level-up" }, level_learned_at: 38, version_group: { name: "x" } },
    ],
  },
];

const bulbasaurMoves: PokemonMoveRef[] = [
  {
    move: { name: "vine-whip", url: "https://pokeapi.co/api/v2/move/22/" },
    version_group_details: [
      { move_learn_method: { name: "level-up" }, level_learned_at: 3, version_group: { name: "x" } },
    ],
  },
];

// id 1 (bulbasaur) is reserved for the standalone "loads and renders" test
// so it doesn't share pokeApiClient's module-level cache with the
// pikachu/charizard pair used by the cache-reuse test below.
const pokemonById: Record<number, unknown> = {
  1: { id: 1, name: "bulbasaur", sprites: { front_default: null }, stats: [], types: [], moves: bulbasaurMoves, abilities: [] },
  25: { id: 25, name: "pikachu", sprites: { front_default: null }, stats: [], types: [], moves: pikachuMoves, abilities: [] },
  6: { id: 6, name: "charizard", sprites: { front_default: null }, stats: [], types: [], moves: charizardMoves, abilities: [] },
};

const moveDetailByName: Record<string, unknown> = {
  "vine-whip": { id: 22, name: "vine-whip", power: 45, accuracy: 100, pp: 25, priority: 0, type: { name: "grass" }, damage_class: { name: "physical" } },
  thunderbolt: { id: 85, name: "thunderbolt", power: 90, accuracy: 100, pp: 15, priority: 0, type: { name: "electric" }, damage_class: { name: "special" } },
  "quick-attack": { id: 98, name: "quick-attack", power: 40, accuracy: 100, pp: 30, priority: 1, type: { name: "normal" }, damage_class: { name: "physical" } },
  flamethrower: { id: 126, name: "flamethrower", power: 90, accuracy: 100, pp: 15, priority: 0, type: { name: "fire" }, damage_class: { name: "special" } },
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

function notFoundResponse(): Response {
  return { ok: false, status: 404, json: () => Promise.resolve({}) } as Response;
}

let fetchCallCount = 0;

beforeEach(() => {
  fetchCallCount = 0;
  vi.mocked(global.fetch).mockReset();
  vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
    fetchCallCount++;
    const url = String(input);

    const pokemonMatch = url.match(/\/pokemon\/(\d+)$/);
    if (pokemonMatch && pokemonById[Number(pokemonMatch[1])]) {
      return Promise.resolve(jsonResponse(pokemonById[Number(pokemonMatch[1])]));
    }

    const moveMatch = url.match(/\/move\/([a-z0-9-]+)$/);
    if (moveMatch && moveDetailByName[moveMatch[1]]) {
      return Promise.resolve(jsonResponse(moveDetailByName[moveMatch[1]]));
    }

    return Promise.resolve(notFoundResponse());
  });
});

async function waitForLoadToFinish() {
  await waitFor(() => expect(screen.queryByText(/Loading moves/i)).not.toBeInTheDocument());
}

describe("MovePoolBrowser", () => {
  it("loads and renders the move pool via the cached pokeApi client", async () => {
    render(<MovePoolBrowser pokemonId={1} />);

    await waitForLoadToFinish();

    expect(screen.queryByText(/Failed to load move data/i)).not.toBeInTheDocument();
    expect(fetchCallCount).toBeGreaterThan(0);
  });

  it("serves a previously-viewed team member's move pool from cache when switching back", async () => {
    const { rerender } = render(<MovePoolBrowser pokemonId={25} />);
    await waitForLoadToFinish();
    const afterFirstLoad = fetchCallCount;
    expect(afterFirstLoad).toBeGreaterThan(0);

    // Switch to a different team member -- expect real network activity.
    rerender(<MovePoolBrowser pokemonId={6} />);
    await waitForLoadToFinish();
    const afterSecondLoad = fetchCallCount;
    expect(afterSecondLoad).toBeGreaterThan(afterFirstLoad);

    // Switch back to the first team member -- pokeApiClient's in-memory
    // cache should serve this without any additional fetch() calls.
    rerender(<MovePoolBrowser pokemonId={25} />);
    await waitForLoadToFinish();

    expect(fetchCallCount).toBe(afterSecondLoad);
  });
});
