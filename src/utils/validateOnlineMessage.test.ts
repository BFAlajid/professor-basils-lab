import { describe, it, expect } from "vitest";
import {
  validateOnlineMessage,
  validateTeamSlots,
  validateBattleTurnAction,
  validatePCBoxPokemon,
  validateSinglePCBoxPokemon,
  validateTradeOffer,
  validateLinkMode,
} from "@/utils/validateOnlineMessage";

// -- Helpers --

function makePokemon(id = 25) {
  return {
    id,
    name: "pikachu",
    sprites: { front_default: null },
    stats: [],
    types: [{ slot: 1, type: { name: "electric" } }],
    moves: [],
  };
}

function makePCBoxPokemon(id = 25) {
  return {
    pokemon: makePokemon(id),
    nickname: "Sparky",
    caughtWith: "poke-ball",
    caughtInArea: "Route 1",
    caughtDate: "2024-01-01T00:00:00.000Z",
    level: 50,
    nature: { name: "Adamant", increased: "attack", decreased: "spAtk" },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "Static",
    isShiny: false,
  };
}

// -- validateOnlineMessage --

describe("validateOnlineMessage", () => {
  it("accepts a valid message", () => {
    const raw = { type: "PING", payload: null, timestamp: 1234567890 };
    expect(validateOnlineMessage(raw)).toEqual(raw);
  });

  it("rejects non-object input", () => {
    expect(validateOnlineMessage("hello")).toBeNull();
    expect(validateOnlineMessage(42)).toBeNull();
    expect(validateOnlineMessage(null)).toBeNull();
    expect(validateOnlineMessage(undefined)).toBeNull();
  });

  it("rejects unknown message type", () => {
    expect(validateOnlineMessage({ type: "HACK", payload: null, timestamp: 1 })).toBeNull();
  });

  it("rejects missing timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null })).toBeNull();
  });

  it("rejects non-number timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null, timestamp: "now" })).toBeNull();
  });

  it("rejects NaN timestamp", () => {
    expect(validateOnlineMessage({ type: "PING", payload: null, timestamp: NaN })).toBeNull();
  });

  it("accepts all valid message types", () => {
    const types = [
      "TEAM_SUBMIT", "ACTION", "FORCE_SWITCH_ACTION", "READY", "PING", "PONG",
      "DISCONNECT", "LINK_MODE", "PC_BOX_SHARE", "TRADE_OFFER", "TRADE_ACCEPT",
      "TRADE_REJECT", "TRADE_CONFIRM", "TRADE_COMPLETE",
    ];
    for (const type of types) {
      expect(validateOnlineMessage({ type, payload: null, timestamp: 1 })).not.toBeNull();
    }
  });
});

// -- validateTeamSlots --

describe("validateTeamSlots", () => {
  it("accepts a valid team of 1-6 slots", () => {
    const slots = [{ pokemon: makePokemon(), position: 0 }];
    expect(validateTeamSlots(slots)).toEqual(slots);
  });

  it("rejects empty array", () => {
    expect(validateTeamSlots([])).toBeNull();
  });

  it("rejects more than 6 slots", () => {
    const slots = Array.from({ length: 7 }, (_, i) => ({ pokemon: makePokemon(), position: i }));
    expect(validateTeamSlots(slots)).toBeNull();
  });

  it("rejects slot with non-numeric pokemon id", () => {
    expect(validateTeamSlots([{ pokemon: { ...makePokemon(), id: "bad" }, position: 0 }])).toBeNull();
  });

  it("rejects slot with missing pokemon name", () => {
    expect(validateTeamSlots([{ pokemon: { id: 25 }, position: 0 }])).toBeNull();
  });

  it("rejects non-array input", () => {
    expect(validateTeamSlots("team")).toBeNull();
    expect(validateTeamSlots(null)).toBeNull();
  });
});

// -- validateBattleTurnAction --

describe("validateBattleTurnAction", () => {
  it("accepts MOVE with valid moveIndex", () => {
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: 0 })).toEqual({ type: "MOVE", moveIndex: 0 });
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: 3 })).toEqual({ type: "MOVE", moveIndex: 3 });
  });

  it("accepts SWITCH with valid pokemonIndex", () => {
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: 0 })).toEqual({ type: "SWITCH", pokemonIndex: 0 });
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: 5 })).toEqual({ type: "SWITCH", pokemonIndex: 5 });
  });

  it("accepts MEGA_EVOLVE, TERASTALLIZE, DYNAMAX", () => {
    expect(validateBattleTurnAction({ type: "MEGA_EVOLVE", moveIndex: 1 })).not.toBeNull();
    expect(validateBattleTurnAction({ type: "TERASTALLIZE", moveIndex: 2 })).not.toBeNull();
    expect(validateBattleTurnAction({ type: "DYNAMAX", moveIndex: 0 })).not.toBeNull();
  });

  it("rejects MOVE with out-of-bounds moveIndex", () => {
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: -1 })).toBeNull();
    expect(validateBattleTurnAction({ type: "MOVE", moveIndex: 4 })).toBeNull();
  });

  it("rejects SWITCH with out-of-bounds pokemonIndex", () => {
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: -1 })).toBeNull();
    expect(validateBattleTurnAction({ type: "SWITCH", pokemonIndex: 6 })).toBeNull();
  });

  it("rejects unknown action type", () => {
    expect(validateBattleTurnAction({ type: "HACK", moveIndex: 0 })).toBeNull();
  });

  it("rejects non-object", () => {
    expect(validateBattleTurnAction("MOVE")).toBeNull();
    expect(validateBattleTurnAction(null)).toBeNull();
  });
});

// -- validatePCBoxPokemon --

describe("validatePCBoxPokemon", () => {
  it("accepts a valid array", () => {
    const box = [makePCBoxPokemon()];
    expect(validatePCBoxPokemon(box)).toEqual(box);
  });

  it("accepts empty array", () => {
    expect(validatePCBoxPokemon([])).toEqual([]);
  });

  it("rejects array exceeding maxItems", () => {
    const box = Array.from({ length: 31 }, () => makePCBoxPokemon());
    expect(validatePCBoxPokemon(box)).toBeNull();
  });

  it("respects custom maxItems", () => {
    const box = [makePCBoxPokemon(), makePCBoxPokemon()];
    expect(validatePCBoxPokemon(box, 1)).toBeNull();
    expect(validatePCBoxPokemon(box, 2)).not.toBeNull();
  });

  it("rejects item with invalid ball type", () => {
    const bad = { ...makePCBoxPokemon(), caughtWith: "hacked-ball" };
    expect(validatePCBoxPokemon([bad])).toBeNull();
  });

  it("rejects item with level > 100", () => {
    const bad = { ...makePCBoxPokemon(), level: 101 };
    expect(validatePCBoxPokemon([bad])).toBeNull();
  });

  it("rejects item with level < 1", () => {
    const bad = { ...makePCBoxPokemon(), level: 0 };
    expect(validatePCBoxPokemon([bad])).toBeNull();
  });

  it("rejects item with invalid pokemon id", () => {
    const bad = { ...makePCBoxPokemon(), pokemon: { ...makePokemon(), id: 0 } };
    expect(validatePCBoxPokemon([bad])).toBeNull();
  });
});

// -- validateSinglePCBoxPokemon --

describe("validateSinglePCBoxPokemon", () => {
  it("accepts valid PCBoxPokemon", () => {
    expect(validateSinglePCBoxPokemon(makePCBoxPokemon())).not.toBeNull();
  });

  it("rejects invalid input", () => {
    expect(validateSinglePCBoxPokemon(null)).toBeNull();
    expect(validateSinglePCBoxPokemon({ pokemon: { id: 0 } })).toBeNull();
  });
});

// -- validateTradeOffer --

describe("validateTradeOffer", () => {
  it("accepts a valid trade offer", () => {
    const offer = { fromHost: true, pokemonIndex: 5, pokemon: makePCBoxPokemon() };
    expect(validateTradeOffer(offer)).not.toBeNull();
  });

  it("rejects missing fromHost", () => {
    expect(validateTradeOffer({ pokemonIndex: 0, pokemon: makePCBoxPokemon() })).toBeNull();
  });

  it("rejects pokemonIndex > 29", () => {
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: 30, pokemon: makePCBoxPokemon() })).toBeNull();
  });

  it("rejects pokemonIndex < 0", () => {
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: -1, pokemon: makePCBoxPokemon() })).toBeNull();
  });

  it("rejects invalid pokemon in offer", () => {
    expect(validateTradeOffer({ fromHost: true, pokemonIndex: 0, pokemon: { bad: true } })).toBeNull();
  });
});

// -- validateLinkMode --

describe("validateLinkMode", () => {
  it("accepts valid modes", () => {
    expect(validateLinkMode("idle")).toBe("idle");
    expect(validateLinkMode("battle")).toBe("battle");
    expect(validateLinkMode("trade")).toBe("trade");
  });

  it("rejects invalid mode", () => {
    expect(validateLinkMode("hack")).toBeNull();
    expect(validateLinkMode(42)).toBeNull();
    expect(validateLinkMode(null)).toBeNull();
  });
});
