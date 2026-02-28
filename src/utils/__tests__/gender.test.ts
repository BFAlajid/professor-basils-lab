import { vi } from "vitest";
import { determineGender, getGenderSymbol, getGenderColor } from "../gender";

describe("determineGender", () => {
  it("returns genderless when genderRate is -1", () => {
    expect(determineGender(-1)).toBe("genderless");
  });

  it("returns male when genderRate is 0 (all male)", () => {
    expect(determineGender(0)).toBe("male");
  });

  it("returns female when genderRate is 8 (all female)", () => {
    expect(determineGender(8)).toBe("female");
  });

  it("returns female when Math.random is below female chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    // genderRate 4 = 50% female chance; 0.1 < 0.5 => female
    expect(determineGender(4)).toBe("female");
    vi.restoreAllMocks();
  });

  it("returns male when Math.random is above female chance", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    // genderRate 4 = 50% female chance; 0.9 >= 0.5 => male
    expect(determineGender(4)).toBe("male");
    vi.restoreAllMocks();
  });
});

describe("getGenderSymbol", () => {
  it("returns male symbol for male", () => {
    expect(getGenderSymbol("male")).toBe("\u2642");
  });

  it("returns female symbol for female", () => {
    expect(getGenderSymbol("female")).toBe("\u2640");
  });

  it("returns empty string for genderless", () => {
    expect(getGenderSymbol("genderless")).toBe("");
  });
});

describe("getGenderColor", () => {
  it("returns blue for male", () => {
    expect(getGenderColor("male")).toBe("#6390F0");
  });

  it("returns pink for female", () => {
    expect(getGenderColor("female")).toBe("#EE99AC");
  });

  it("returns grey for genderless", () => {
    expect(getGenderColor("genderless")).toBe("#8b9bb4");
  });
});
