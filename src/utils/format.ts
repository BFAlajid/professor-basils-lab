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

/** Get the text for a stat change. e.g. +2 → "rose sharply", +3 → "rose drastically", -1 → "fell" */
export function getStatChangeText(change: number): string {
  if (change > 0) {
    if (change >= 3) return "rose drastically";
    if (change === 2) return "rose sharply";
    return "rose";
  }
  if (change <= -3) return "harshly fell";
  if (change === -2) return "sharply fell";
  return "fell";
}

/** Get the display label for a stat key. e.g. "spAtk" → "Sp. Atk" */
export function getStatLabel(stat: string): string {
  if (stat === "hp") return "HP";
  if (stat === "spAtk") return "Sp. Atk";
  if (stat === "spDef") return "Sp. Def";
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}
