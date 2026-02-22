import { Nature, StatKey } from "@/types";

export const NATURES: Nature[] = [
  { name: "adamant", increased: "attack", decreased: "spAtk" },
  { name: "bashful", increased: null, decreased: null },
  { name: "bold", increased: "defense", decreased: "attack" },
  { name: "brave", increased: "attack", decreased: "speed" },
  { name: "calm", increased: "spDef", decreased: "attack" },
  { name: "careful", increased: "spDef", decreased: "spAtk" },
  { name: "docile", increased: null, decreased: null },
  { name: "gentle", increased: "spDef", decreased: "defense" },
  { name: "hardy", increased: null, decreased: null },
  { name: "hasty", increased: "speed", decreased: "defense" },
  { name: "impish", increased: "defense", decreased: "spAtk" },
  { name: "jolly", increased: "speed", decreased: "spAtk" },
  { name: "lax", increased: "defense", decreased: "spDef" },
  { name: "lonely", increased: "attack", decreased: "defense" },
  { name: "mild", increased: "spAtk", decreased: "defense" },
  { name: "modest", increased: "spAtk", decreased: "attack" },
  { name: "naive", increased: "speed", decreased: "spDef" },
  { name: "naughty", increased: "attack", decreased: "spDef" },
  { name: "quiet", increased: "spAtk", decreased: "speed" },
  { name: "quirky", increased: null, decreased: null },
  { name: "rash", increased: "spAtk", decreased: "spDef" },
  { name: "relaxed", increased: "defense", decreased: "speed" },
  { name: "sassy", increased: "spDef", decreased: "speed" },
  { name: "serious", increased: null, decreased: null },
  { name: "timid", increased: "speed", decreased: "attack" },
];

const STAT_DISPLAY: Record<StatKey, string> = {
  attack: "Atk",
  defense: "Def",
  spAtk: "SpA",
  spDef: "SpD",
  speed: "Spe",
};

export function getNatureModifier(nature: Nature, stat: StatKey): number {
  if (!nature.increased || !nature.decreased) return 1.0;
  if (stat === nature.increased) return 1.1;
  if (stat === nature.decreased) return 0.9;
  return 1.0;
}

export function getNatureLabel(nature: Nature): string {
  const name = nature.name.charAt(0).toUpperCase() + nature.name.slice(1);
  if (!nature.increased || !nature.decreased) return `${name} (Neutral)`;
  return `${name} (+${STAT_DISPLAY[nature.increased]} / -${STAT_DISPLAY[nature.decreased]})`;
}
