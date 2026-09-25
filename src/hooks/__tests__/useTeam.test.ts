import {
  mockCharizard,
  mockBlastoise,
  mockVenusaur,
  createMockTeamSlot,
} from "@/test/mocks/pokemon";
import type { Pokemon, TeamSlot, TeamAction, Nature, EVSpread, IVSpread, TypeName } from "@/types";

// ---------------------------------------------------------------------------
// We test the teamReducer as a pure function (no hooks, no localStorage).
// The reducer is not exported directly, so we import the module and extract
// the reducer via a test-only re-export pattern. Since the reducer is private,
// we replicate its logic signature and test the createSlot + reducer contract
// by importing the hook's encode/decode helpers and testing them alongside a
// minimal reimport of the reducer.
//
// Actually the reducer IS internal, so we re-create it from the source to keep
// tests behavioral. Instead we'll use a thin wrapper that dispatches actions
// through useReducer via renderHook.
// ---------------------------------------------------------------------------

// We need to mock the modules the hook file imports at the top level
vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
}));

vi.mock("@/utils/silentWarn", () => ({
  silentWarn: vi.fn(),
}));

import { renderHook, act } from "@testing-library/react";
import { useTeam, encodeTeam, decodeTeam } from "../useTeam";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Build a minimal Pokemon with unique id and an ability. */
function buildPokemon(overrides: Partial<Pokemon> & { id: number; name: string }): Pokemon {
  return {
    sprites: { front_default: null },
    stats: [
      { base_stat: 80, stat: { name: "hp" } },
      { base_stat: 80, stat: { name: "attack" } },
      { base_stat: 80, stat: { name: "defense" } },
      { base_stat: 80, stat: { name: "special-attack" } },
      { base_stat: 80, stat: { name: "special-defense" } },
      { base_stat: 80, stat: { name: "speed" } },
    ],
    types: [{ slot: 1, type: { name: "normal" } }],
    moves: [],
    abilities: [{ ability: { name: "intimidate", url: "" }, is_hidden: false, slot: 1 }],
    ...overrides,
  };
}

const pikachu = buildPokemon({ id: 25, name: "pikachu" });
const eevee = buildPokemon({ id: 133, name: "eevee" });
const snorlax = buildPokemon({ id: 143, name: "snorlax" });
const gengar = buildPokemon({ id: 94, name: "gengar" });
const dragonite = buildPokemon({ id: 149, name: "dragonite" });
const mewtwo = buildPokemon({ id: 150, name: "mewtwo" });
const mew = buildPokemon({ id: 151, name: "mew" });

// ---------------------------------------------------------------------------
// useTeam hook tests — exercises the reducer through the public hook API
// ---------------------------------------------------------------------------

describe("useTeam", () => {
  // -----------------------------------------------------------------------
  // ADD_POKEMON
  // -----------------------------------------------------------------------
  describe("addPokemon", () => {
    it("adds a Pokemon to an empty team", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      expect(result.current.team).toHaveLength(1);
      expect(result.current.team[0].pokemon.id).toBe(25);
      expect(result.current.team[0].pokemon.name).toBe("pikachu");
    });

    it("assigns position 0 for the first Pokemon", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      expect(result.current.team[0].position).toBe(0);
    });

    it("assigns incrementing positions", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
        result.current.addPokemon(snorlax);
      });

      expect(result.current.team[0].position).toBe(0);
      expect(result.current.team[1].position).toBe(1);
      expect(result.current.team[2].position).toBe(2);
    });

    it("sets default nature, evs, ivs, ability, moves on new slot", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      const slot = result.current.team[0];
      expect(slot.nature).toBeNull();
      expect(slot.evs).toEqual({ hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 });
      expect(slot.ivs).toEqual({ hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 });
      expect(slot.ability).toBe("intimidate");
      expect(slot.heldItem).toBeNull();
      expect(slot.selectedMoves).toEqual([]);
    });

    it("does not add past MAX_TEAM_SIZE (6)", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
        result.current.addPokemon(snorlax);
        result.current.addPokemon(gengar);
        result.current.addPokemon(dragonite);
        result.current.addPokemon(mewtwo);
      });

      expect(result.current.team).toHaveLength(6);
      expect(result.current.isFull).toBe(true);

      // Attempt to add a 7th
      act(() => result.current.addPokemon(mew));

      expect(result.current.team).toHaveLength(6);
    });

    it("does not add a duplicate Pokemon (same id)", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(pikachu);
      });

      expect(result.current.team).toHaveLength(1);
    });

    it("isFull is false when team has fewer than 6", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      expect(result.current.isFull).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // REMOVE_POKEMON
  // -----------------------------------------------------------------------
  describe("removePokemon", () => {
    it("removes a Pokemon by position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
      });

      const positionToRemove = result.current.team[0].position;
      act(() => result.current.removePokemon(positionToRemove));

      expect(result.current.team).toHaveLength(1);
      expect(result.current.team[0].pokemon.id).toBe(133); // eevee remains
    });

    it("removing the last Pokemon leaves an empty team", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      act(() => result.current.removePokemon(result.current.team[0].position));

      expect(result.current.team).toHaveLength(0);
    });

    it("removing from an empty team is a no-op", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.removePokemon(0));

      expect(result.current.team).toHaveLength(0);
    });

    it("removing a non-existent position is a no-op", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.removePokemon(999));

      expect(result.current.team).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // REORDER
  // -----------------------------------------------------------------------
  describe("reorder", () => {
    it("swaps Pokemon positions", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
        result.current.addPokemon(snorlax);
      });

      // Move pikachu (index 0) to index 2
      act(() => result.current.reorder(0, 2));

      expect(result.current.team[0].pokemon.name).toBe("eevee");
      expect(result.current.team[1].pokemon.name).toBe("snorlax");
      expect(result.current.team[2].pokemon.name).toBe("pikachu");
    });

    it("reassigns position values after reorder", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
        result.current.addPokemon(snorlax);
      });

      act(() => result.current.reorder(2, 0));

      // Positions should be sequential 0, 1, 2 regardless of reorder
      expect(result.current.team[0].position).toBe(0);
      expect(result.current.team[1].position).toBe(1);
      expect(result.current.team[2].position).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // CLEAR_TEAM
  // -----------------------------------------------------------------------
  describe("clearTeam", () => {
    it("removes all Pokemon from the team", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
        result.current.addPokemon(snorlax);
      });

      act(() => result.current.clearTeam());

      expect(result.current.team).toHaveLength(0);
      expect(result.current.isFull).toBe(false);
    });

    it("clearing an empty team is a no-op", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.clearTeam());

      expect(result.current.team).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // SET_TEAM
  // -----------------------------------------------------------------------
  describe("setTeam", () => {
    it("replaces the entire team with provided slots", () => {
      const { result } = renderHook(() => useTeam());

      const slots: TeamSlot[] = [
        createMockTeamSlot(mockCharizard, 0),
        createMockTeamSlot(mockBlastoise, 1),
      ];

      act(() => result.current.setTeam(slots));

      expect(result.current.team).toHaveLength(2);
      expect(result.current.team[0].pokemon.name).toBe("charizard");
      expect(result.current.team[1].pokemon.name).toBe("blastoise");
    });

    it("can set an empty team", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setTeam([]));

      expect(result.current.team).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // SET_NATURE
  // -----------------------------------------------------------------------
  describe("setNature", () => {
    it("sets the nature for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      const jolly: Nature = { name: "jolly", increased: "speed", decreased: "spAtk" };
      act(() => result.current.setNature(result.current.team[0].position, jolly));

      expect(result.current.team[0].nature).toEqual(jolly);
    });

    it("does not affect other team members", () => {
      const { result } = renderHook(() => useTeam());

      act(() => {
        result.current.addPokemon(pikachu);
        result.current.addPokemon(eevee);
      });

      const modest: Nature = { name: "modest", increased: "spAtk", decreased: "attack" };
      act(() => result.current.setNature(result.current.team[0].position, modest));

      expect(result.current.team[0].nature).toEqual(modest);
      expect(result.current.team[1].nature).toBeNull(); // untouched
    });
  });

  // -----------------------------------------------------------------------
  // SET_EVS
  // -----------------------------------------------------------------------
  describe("setEvs", () => {
    it("sets EVs for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      const evs: EVSpread = { hp: 252, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 0 };
      act(() => result.current.setEvs(result.current.team[0].position, evs));

      expect(result.current.team[0].evs).toEqual(evs);
    });
  });

  // -----------------------------------------------------------------------
  // SET_IVS
  // -----------------------------------------------------------------------
  describe("setIvs", () => {
    it("sets IVs for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      const ivs: IVSpread = { hp: 0, attack: 0, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
      act(() => result.current.setIvs(result.current.team[0].position, ivs));

      expect(result.current.team[0].ivs).toEqual(ivs);
    });
  });

  // -----------------------------------------------------------------------
  // SET_ABILITY
  // -----------------------------------------------------------------------
  describe("setAbility", () => {
    it("sets the ability for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setAbility(result.current.team[0].position, "lightning-rod"));

      expect(result.current.team[0].ability).toBe("lightning-rod");
    });
  });

  // -----------------------------------------------------------------------
  // SET_HELD_ITEM
  // -----------------------------------------------------------------------
  describe("setHeldItem", () => {
    it("sets the held item for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setHeldItem(result.current.team[0].position, "light-ball"));

      expect(result.current.team[0].heldItem).toBe("light-ball");
    });
  });

  // -----------------------------------------------------------------------
  // SET_MOVES
  // -----------------------------------------------------------------------
  describe("setMoves", () => {
    it("sets selected moves for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));

      const moves = ["thunderbolt", "volt-tackle", "iron-tail", "quick-attack"];
      act(() => result.current.setMoves(result.current.team[0].position, moves));

      expect(result.current.team[0].selectedMoves).toEqual(moves);
    });

    it("can set an empty move list", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setMoves(result.current.team[0].position, ["thunderbolt"]));
      act(() => result.current.setMoves(result.current.team[0].position, []));

      expect(result.current.team[0].selectedMoves).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // SET_TERA_TYPE
  // -----------------------------------------------------------------------
  describe("setTeraType", () => {
    it("sets the tera type for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setTeraType(result.current.team[0].position, "flying"));

      expect(result.current.team[0].teraConfig).toEqual({ teraType: "flying" });
    });
  });

  // -----------------------------------------------------------------------
  // SET_FORME
  // -----------------------------------------------------------------------
  describe("setForme", () => {
    it("sets a forme override for a specific position", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setForme(result.current.team[0].position, "pikachu-gmax"));

      expect(result.current.team[0].formeOverride).toBe("pikachu-gmax");
    });

    it("can clear the forme override with null", () => {
      const { result } = renderHook(() => useTeam());

      act(() => result.current.addPokemon(pikachu));
      act(() => result.current.setForme(result.current.team[0].position, "pikachu-gmax"));
      act(() => result.current.setForme(result.current.team[0].position, null));

      expect(result.current.team[0].formeOverride).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// encodeTeam / decodeTeam — pure functions for URL sharing
// ---------------------------------------------------------------------------

describe("encodeTeam / decodeTeam", () => {
  it("round-trips a team through encode and decode", () => {
    const slots: TeamSlot[] = [
      {
        ...createMockTeamSlot(mockCharizard, 0),
        teraConfig: { teraType: "dragon" },
        formeOverride: "charizard-mega-x",
      },
    ];

    const encoded = encodeTeam(slots);
    const decoded = decodeTeam(encoded);

    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded).toHaveLength(1);

    // New format returns ShareableSlot objects
    const first = decoded[0] as { id: number; t?: string; f?: string | null };
    expect(first.id).toBe(6);
    expect(first.t).toBe("dragon");
    expect(first.f).toBe("charizard-mega-x");
  });

  it("decodeTeam returns empty array for invalid base64", () => {
    expect(decodeTeam("!!!not-valid-base64!!!")).toEqual([]);
  });

  it("decodeTeam returns empty array for empty array payload", () => {
    const encoded = btoa(JSON.stringify([]));
    expect(decodeTeam(encoded)).toEqual([]);
  });

  it("decodeTeam returns empty array when array exceeds 6 elements", () => {
    const arr = Array.from({ length: 7 }, (_, i) => ({ id: i + 1 }));
    const encoded = btoa(JSON.stringify(arr));
    expect(decodeTeam(encoded)).toEqual([]);
  });

  it("decodeTeam handles old format (number array)", () => {
    const encoded = btoa(JSON.stringify([25, 133]));
    const decoded = decodeTeam(encoded);

    expect(decoded).toEqual([25, 133]);
  });

  it("decodeTeam rejects invalid id in slot", () => {
    const encoded = btoa(JSON.stringify([{ id: -1 }]));
    expect(decodeTeam(encoded)).toEqual([]);
  });

  it("decodeTeam rejects EV array with wrong length", () => {
    const encoded = btoa(JSON.stringify([{ id: 1, e: [0, 0, 0] }]));
    expect(decodeTeam(encoded)).toEqual([]);
  });

  it("decodeTeam rejects IV values out of range", () => {
    const encoded = btoa(JSON.stringify([{ id: 1, i: [0, 0, 0, 0, 0, 32] }]));
    expect(decodeTeam(encoded)).toEqual([]);
  });
});
