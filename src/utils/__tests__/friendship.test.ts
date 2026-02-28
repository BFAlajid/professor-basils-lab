import {
  calculateReturnPower,
  calculateFrustrationPower,
  calculateFriendshipGain,
  DEFAULT_FRIENDSHIP,
  MAX_FRIENDSHIP,
  EVOLUTION_FRIENDSHIP_THRESHOLD,
} from "../friendship";

describe("constants", () => {
  it("has correct default values", () => {
    expect(DEFAULT_FRIENDSHIP).toBe(70);
    expect(MAX_FRIENDSHIP).toBe(255);
    expect(EVOLUTION_FRIENDSHIP_THRESHOLD).toBe(220);
  });
});

describe("calculateReturnPower", () => {
  it("returns 102 at max friendship (255)", () => {
    expect(calculateReturnPower(255)).toBe(102);
  });

  it("returns 0 at friendship 0", () => {
    expect(calculateReturnPower(0)).toBe(0);
  });

  it("scales proportionally", () => {
    expect(calculateReturnPower(125)).toBe(50);
  });
});

describe("calculateFrustrationPower", () => {
  it("returns 102 at friendship 0", () => {
    expect(calculateFrustrationPower(0)).toBe(102);
  });

  it("returns 0 at max friendship (255)", () => {
    expect(calculateFrustrationPower(255)).toBe(0);
  });

  it("scales inversely to friendship", () => {
    expect(calculateFrustrationPower(130)).toBe(50);
  });
});

describe("calculateFriendshipGain", () => {
  it("catch gives 0 regardless of soothe bell", () => {
    expect(calculateFriendshipGain("catch", false)).toBe(0);
    expect(calculateFriendshipGain("catch", true)).toBe(0);
  });

  it("battle_win gives 2 without soothe bell", () => {
    expect(calculateFriendshipGain("battle_win", false)).toBe(2);
  });

  it("battle_win gives 3 with soothe bell (floor of 2*1.5)", () => {
    expect(calculateFriendshipGain("battle_win", true)).toBe(3);
  });

  it("level_up gives 5 without soothe bell", () => {
    expect(calculateFriendshipGain("level_up", false)).toBe(5);
  });

  it("level_up gives 7 with soothe bell (floor of 5*1.5)", () => {
    expect(calculateFriendshipGain("level_up", true)).toBe(7);
  });

  it("vitamin gives 5 without soothe bell", () => {
    expect(calculateFriendshipGain("vitamin", false)).toBe(5);
  });

  it("walk gives 1 without soothe bell", () => {
    expect(calculateFriendshipGain("walk", false)).toBe(1);
  });

  it("walk gives 1 with soothe bell (floor of 1*1.5)", () => {
    expect(calculateFriendshipGain("walk", true)).toBe(1);
  });
});
