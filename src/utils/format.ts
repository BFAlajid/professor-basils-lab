/** Capitalize the first letter of a string. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Get the display label for a stat key. e.g. "spAtk" → "Sp. Atk" */
export function getStatLabel(stat: string): string {
  if (stat === "spAtk") return "Sp. Atk";
  if (stat === "spDef") return "Sp. Def";
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}
