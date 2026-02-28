import { capitalize, getStatLabel } from "../format";

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

  it("returns 'Hp' for hp", () => {
    expect(getStatLabel("hp")).toBe("Hp");
  });

  it("returns 'Speed' for speed", () => {
    expect(getStatLabel("speed")).toBe("Speed");
  });

  it("returns 'Defense' for defense", () => {
    expect(getStatLabel("defense")).toBe("Defense");
  });
});
