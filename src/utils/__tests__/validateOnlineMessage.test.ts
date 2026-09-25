import { describe, it, expect } from "vitest";
import {
  validateOnlineMessage,
  validateTeamSlots,
  validateBattleTurnAction,
  validatePCBoxPokemon,
  validateSinglePCBoxPokemon,
  validateTradeOffer,
  validateLinkMode,
} from "../validateOnlineMessage";

// --- Helpers ---

function validPokemonShape() {
  return { id: 25, name: "pikachu", types: [{ type: { name: "electric" } }] };
}

function validPCBoxPokemon() {
  return {
    pokemon: validPokemonShape(),
    nickname: undefined,
    caughtWith: "poke-ball",
    caughtInArea: "Route 1",
    caughtDate: "2024-01-01T00:00:00.000Z",
    level: 25,
    nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "static",
  };
}

// --- validateOnlineMessage ---

describe("validateOnlineMessage", () => {
  it("validates a correct message", () => {
    const msg = { type: "PING", payload: null, timestamp: 1234567890 };
    const result = validateOnlineMessage(msg);
    expect(result).toEqual(msg);
  });

  it("accepts all valid message types", () => {
    const types = [
      "TEAM_SUBMIT", "ACTION", "FORCE_SWITCH_ACTION", "READY", "PING", "PONG",
      "DISCONNECT", "LINK_MODE", "PC_BOX_SHARE", "TRADE_OFFER", "TRADE_ACCEPT",
      "TRADE_REJECT", "TRADE_CONFIRM", "TRADE_COMPLETE", "TRADE_ESCROW", "TRADE_FINALIZE",
    ];

    for (const type of types) {
      const result = validateOnlineMessage({ type, payload: null, timestamp: 1 });
      expect(result).not.toBeNull();
      expect(result!.type).toBe(type);
    }
  });

  it("rejects non-object input", () => {
    expect(validateOnlineMessage(null)).toBeNull();
    expect(validateOnlineMessage(undefined)).toBeNull();
    expect(validateOnlineMessage("string")).toBeNull();
    expect(validateOnlineMessage(42)).toBeNull();
    expect(validateOnlineMessage([])).toBeNull();
  });

  it("rejects message with missing type", () => {
    expect(validateOnlineMessage({ payload: null, timestamp: 1 })).toBeNull();
  });

  it("rejects message with invalid type", () => {
    expect(validateOnlineMessage({ type: "INVALID", payload: null, timestamp: 1 })).toBeNull();
  });

  it("rejects message with non-string type", () => {
    expect(validateOnlineMessage({ type: 123, payload: null, timestamp: 1 })).toBeNull();
  });

  it("rejects message with missing timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null })).toBeNull();
  });

  it("rejects message with non-numeric timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null, timestamp: "abc" })).toBeNull();
  });

  it("rejects message with NaN timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null, timestamp: NaN })).toBeNull();
  });

  it("rejects message with Infinity timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null, timestamp: Infinity })).toBeNull();
  });
});

// --- validateTeamSlots ---

describe("validateTeamSlots", () => {
  it("validates correct team slots", () => {
    const slots = [
      { pokemon: validPokemonShape(), position: 0 },
      { pokemon: validPokemonShape(), position: 1 },
    ];
    expect(validateTeamSlots(slots)).toEqual(slots);
  });

  it("rejects non-array", () => {
    expect(validateTeamSlots("not array")).toBeNull();
    expect(validateTeamSlots({})).toBeNull();
  });

  it("rejects empty array", () => {
    expect(validateTeamSlots([])).toBeNull();
  });

  it("rejects array with more than 6 slots", () => {
    const slots = Array.from({ length: 7 }, (_, i) => ({
      pokemon: validPokemonShape(),
      position: i,
    }));
    expect(validateTeamSlots(slots)).toBeNull();
  });

  it("rejects slot without valid pokemon shape", () => {
    expect(validateTeamSlots([{ pokemon: null, position: 0 }])).toBeNull();
  });

  it("rejects slot with non-object pokemon", () => {
    expect(validateTeamSlots([{ pokemon: "not-an-object", position: 0 }])).toBeNull();
  });

  it("rejects slot with missing pokemon name", () => {
    expect(validateTeamSlots([{ pokemon: { id: 1 }, position: 0 }])).toBeNull();
  });

  it("rejects slot with non-numeric pokemon id", () => {
    const bad = { pokemon: { id: "abc", name: "fake" }, position: 0 };
    expect(validateTeamSlots([bad])).toBeNull();
  });
});

// --- validateBattleTurnAction ---

describe("validateBattleTurnAction", () => {
  it("validates MOVE action", () => {
    const result = validateBattleTurnAction({ type: "MOVE", moveIndex: 0 });
    expect(result).toEqual({ type: "MOVE", moveIndex: 0 });
  });

  it("validates SWITCH action", () => {
    const result = validateBattleTurnAction({ type: "SWITCH", pokemonIndex: 3 });
    expect(result).toEqual({ type: "SWITCH", pokemonIndex: 3 });
  });

  it("validates MEGA_EVOLVE action", () => {
    const result = validateBattleTurnAction({ type: "MEGA_EVOLVE", moveIndex: 1 });
    expect(result).toEqual({ type: "MEGA_EVOLVE", moveIndex: 1 });
  });

  it("validates TERASTALLIZE action", () => {
    const result = validateBattleTurnAction({ type: "TERASTALLIZE", moveIndex: 2 });
    expect(result).toEqual({ type: "TERASTALLIZE", moveIndex: 2 });
  });

  it("validates DYNAMAX action", () => {
    const result = validateBattleTurnAction({ type: "DYNAMAX", moveIndex: 3 });
    expect(result).toEqual({ type: "DYNAMAX", moveIndex: 3 });
  });

  it("rejects non-object", () => {
    expect(validateBattleTurnAction(null)).toBeNull();
    expect(validateBattleTurnAction("MOVE")).toBeNull();
  });

  it("rejects invalid action type", () => {
    expect(validateBattleTurnAction({ type: "FLEE", moveIndex: 0 })).toBeNull();
  });

  it("rejects SWITCH with out-of-range pokemonIndex", () => {
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: -1 })).toBeNull();
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: 6 })).toBeNull();
  });

  it("rejects MOVE with out-of-range moveIndex", () => {
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: -1 })).toBeNull();
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: 4 })).toBeNull();
  });

  it("rejects SWITCH with missing pokemonIndex", () => {
    expect(validateBattleTurnAction({ type: "SWITCH" })).toBeNull();
  });

  it("rejects MOVE with missing moveIndex", () => {
    expect(validateBattleTurnAction({ type: "MOVE" })).toBeNull();
  });
});

// --- validatePCBoxPokemon ---

describe("validatePCBoxPokemon", () => {
  it("validates correct PC box pokemon array", () => {
    const result = validatePCBoxPokemon([validPCBoxPokemon()]);
    expect(result).toHaveLength(1);
  });

  it("rejects non-array", () => {
    expect(validatePCBoxPokemon("not array")).toBeNull();
  });

  it("rejects array exceeding maxItems", () => {
    const items = Array.from({ length: 31 }, () => validPCBoxPokemon());
    expect(validatePCBoxPokemon(items)).toBeNull();
  });

  it("respects custom maxItems", () => {
    const items = Array.from({ length: 3 }, () => validPCBoxPokemon());
    expect(validatePCBoxPokemon(items, 2)).toBeNull();
    expect(validatePCBoxPokemon(items, 3)).not.toBeNull();
  });

  it("rejects item with invalid ball type", () => {
    const bad = { ...validPCBoxPokemon(), caughtWith: "pokeball" };
    expect(validatePCBoxPokemon([bad])).toBeNull();
  });

  it("rejects item with level out of range", () => {
    expect(validatePCBoxPokemon([{ ...validPCBoxPokemon(), level: 0 }])).toBeNull();
    expect(validatePCBoxPokemon([{ ...validPCBoxPokemon(), level: 101 }])).toBeNull();
  });

  it("rejects item with non-object nature", () => {
    expect(validatePCBoxPokemon([{ ...validPCBoxPokemon(), nature: "adamant" }])).toBeNull();
  });

  it("accepts item with nickname undefined", () => {
    const p = validPCBoxPokemon();
    delete (p as any).nickname;
    expect(validatePCBoxPokemon([p])).not.toBeNull();
  });

  it("rejects item with numeric nickname", () => {
    expect(validatePCBoxPokemon([{ ...validPCBoxPokemon(), nickname: 123 }])).toBeNull();
  });
});

// --- validateSinglePCBoxPokemon ---

describe("validateSinglePCBoxPokemon", () => {
  it("validates a correct single PCBoxPokemon", () => {
    expect(validateSinglePCBoxPokemon(validPCBoxPokemon())).not.toBeNull();
  });

  it("rejects invalid input", () => {
    expect(validateSinglePCBoxPokemon(null)).toBeNull();
    expect(validateSinglePCBoxPokemon({})).toBeNull();
  });
});

// --- validateTradeOffer ---

describe("validateTradeOffer", () => {
  it("validates correct trade offer", () => {
    const offer = {
      fromHost: true,
      pokemonIndex: 5,
      pokemon: validPCBoxPokemon(),
    };
    expect(validateTradeOffer(offer)).not.toBeNull();
  });

  it("rejects non-object", () => {
    expect(validateTradeOffer(null)).toBeNull();
  });

  it("rejects missing fromHost", () => {
    expect(validateTradeOffer({ pokemonIndex: 0, pokemon: validPCBoxPokemon() })).toBeNull();
  });

  it("rejects pokemonIndex out of range", () => {
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: -1, pokemon: validPCBoxPokemon() })).toBeNull();
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: 30, pokemon: validPCBoxPokemon() })).toBeNull();
  });

  it("rejects invalid pokemon in offer", () => {
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: 0, pokemon: {} })).toBeNull();
  });
});

// --- validateLinkMode ---

describe("validateLinkMode", () => {
  it("validates 'idle', 'battle', 'trade'", () => {
    expect(validateLinkMode("idle")).toBe("idle");
    expect(validateLinkMode("battle")).toBe("battle");
    expect(validateLinkMode("trade")).toBe("trade");
  });

  it("rejects invalid modes", () => {
    expect(validateLinkMode("spectate")).toBeNull();
    expect(validateLinkMode(123)).toBeNull();
    expect(validateLinkMode(null)).toBeNull();
  });
});
