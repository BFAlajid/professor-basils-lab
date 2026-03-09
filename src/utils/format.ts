/** Capitalize the first letter of a string. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert a hyphenated API name to display format. e.g. "fire-punch" → "Fire Punch" */
export function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Get the text for a stat change. e.g. +2 → "rose drastically", -1 → "fell" */
export function getStatChangeText(change: number): string {
  if (change > 0) return change >= 2 ? "rose drastically" : "rose";
  return change <= -2 ? "fell drastically" : "fell";
}

/** Get the display label for a stat key. e.g. "spAtk" → "Sp. Atk" */
export function getStatLabel(stat: string): string {
  if (stat === "spAtk") return "Sp. Atk";
  if (stat === "spDef") return "Sp. Def";
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}
