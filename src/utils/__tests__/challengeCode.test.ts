import { encodeChallengeCode, decodeChallengeCode, ChallengeData } from "../challengeCode";

describe("challengeCode", () => {
  const sampleData: ChallengeData = {
    team: [
      { pokemonId: 6, moves: ["flamethrower", "air-slash"], nature: "timid", ability: "blaze", item: "life-orb" },
    ],
    format: "ou",
    rules: ["Species Clause"],
    mechanic: "mega",
    description: "Test challenge",
  };

  it("round-trip encode/decode returns original data", () => {
    const encoded = encodeChallengeCode(sampleData);
    const decoded = decodeChallengeCode(encoded);

    expect(decoded).toEqual(sampleData);
  });

  it("encoded string is valid base64", () => {
    const encoded = encodeChallengeCode(sampleData);
    expect(() => atob(encoded)).not.toThrow();
  });

  it("returns null for invalid base64", () => {
    expect(decodeChallengeCode("!!!not-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 that is not JSON", () => {
    const notJson = btoa("this is not json");
    expect(decodeChallengeCode(notJson)).toBeNull();
  });
});
