import {
  capitalize,
  getStatLabel,
  normalizeAbilityKey,
  formatName,
  getStatChangeText,
} from "../format";

// ---------------------------------------------------------------------------
// normalizeAbilityKey
// ---------------------------------------------------------------------------

describe("normalizeAbilityKey", () => {
  it("converts multi-word ability to lowercase hyphenated key", () => {
    expect(normalizeAbilityKey("Speed Boost")).toBe("speed-boost");
  });

  it("converts single-word ability to lowercase", () => {
    expect(normalizeAbilityKey("Levitate")).toBe("levitate");
  });

  it("handles already-lowercase hyphenated input", () => {
    expect(normalizeAbilityKey("speed-boost")).toBe("speed-boost");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    expect(normalizeAbilityKey("Pure   Power")).toBe("pure-power");
  });

  it("returns empty string for null", () => {
    expect(normalizeAbilityKey(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeAbilityKey(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizeAbilityKey("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------

describe("capitalize", () => {
  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("capitalizes the first letter of a lowercase word", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("only uppercases first char, leaves rest as-is", () => {
    expect(capitalize("HELLO")).toBe("HELLO");
  });

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// formatName
// ---------------------------------------------------------------------------

describe("formatName", () => {
  it("converts hyphenated API name to title case with spaces", () => {
    expect(formatName("fire-punch")).toBe("Fire Punch");
  });

  it("capitalizes a single-word name", () => {
    expect(formatName("thunderbolt")).toBe("Thunderbolt");
  });

  it("uses override for mr-mime", () => {
    expect(formatName("mr-mime")).toBe("Mr. Mime");
  });

  it("uses override for ho-oh", () => {
    expect(formatName("ho-oh")).toBe("Ho-Oh");
  });

  it("uses override for nidoran-f", () => {
    expect(formatName("nidoran-f")).toBe("Nidoran\u2640");
  });

  it("uses override for nidoran-m", () => {
    expect(formatName("nidoran-m")).toBe("Nidoran\u2642");
  });

  it("uses override for porygon-z", () => {
    expect(formatName("porygon-z")).toBe("Porygon-Z");
  });

  it("uses override for type-null", () => {
    expect(formatName("type-null")).toBe("Type: Null");
  });

  it("uses override for tapu-koko", () => {
    expect(formatName("tapu-koko")).toBe("Tapu Koko");
  });

  it("handles a three-word hyphenated name", () => {
    expect(formatName("double-edge-attack")).toBe("Double Edge Attack");
  });
});

// ---------------------------------------------------------------------------
// getStatChangeText
// ---------------------------------------------------------------------------

describe("getStatChangeText", () => {
  it("returns 'rose' for +1", () => {
    expect(getStatChangeText(1)).toBe("rose");
  });

  it("returns 'rose sharply' for +2", () => {
    expect(getStatChangeText(2)).toBe("rose sharply");
  });

  it("returns 'rose drastically' for +3", () => {
    expect(getStatChangeText(3)).toBe("rose drastically");
  });

  it("returns 'rose drastically' for +4 and above", () => {
    expect(getStatChangeText(4)).toBe("rose drastically");
  });

  it("returns 'fell' for -1", () => {
    expect(getStatChangeText(-1)).toBe("fell");
  });

  it("returns 'sharply fell' for -2", () => {
    expect(getStatChangeText(-2)).toBe("sharply fell");
  });

  it("returns 'harshly fell' for -3", () => {
    expect(getStatChangeText(-3)).toBe("harshly fell");
  });

  it("returns 'harshly fell' for -4 and below", () => {
    expect(getStatChangeText(-4)).toBe("harshly fell");
  });
});

// ---------------------------------------------------------------------------
// getStatLabel
// ---------------------------------------------------------------------------

describe("getStatLabel", () => {
  it("returns 'Sp. Atk' for spAtk", () => {
    expect(getStatLabel("spAtk")).toBe("Sp. Atk");
  });

  it("returns 'Sp. Def' for spDef", () => {
    expect(getStatLabel("spDef")).toBe("Sp. Def");
  });

  it("returns 'Attack' for attack", () => {
    expect(getStatLabel("attack")).toBe("Attack");
  });

  it("returns 'HP' for hp", () => {
    expect(getStatLabel("hp")).toBe("HP");
  });

  it("returns 'Speed' for speed", () => {
    expect(getStatLabel("speed")).toBe("Speed");
  });

  it("returns 'Defense' for defense", () => {
    expect(getStatLabel("defense")).toBe("Defense");
  });
});
