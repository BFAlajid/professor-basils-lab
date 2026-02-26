export type Gender = "male" | "female" | "genderless";

export function determineGender(genderRate: number): Gender {
  if (genderRate === -1) return "genderless";
  if (genderRate === 0) return "male";
  if (genderRate === 8) return "female";
  const femaleChance = genderRate / 8;
  return Math.random() < femaleChance ? "female" : "male";
}

export function getGenderSymbol(gender: Gender): string {
  if (gender === "male") return "\u2642";
  if (gender === "female") return "\u2640";
  return "";
}

export function getGenderColor(gender: Gender): string {
  if (gender === "male") return "#6390F0";
  if (gender === "female") return "#EE99AC";
  return "#8b9bb4";
}
