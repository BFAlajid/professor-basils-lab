import { HeldItem } from "@/types";
import { MEGA_STONES } from "./megaStones";

export const HELD_ITEMS: HeldItem[] = [
  // Mega Stones
  ...MEGA_STONES,

  // Choice items
  { name: "choice-band", displayName: "Choice Band", effect: "1.5x Attack, locked into one move", battleModifier: { type: "damage_boost", value: 1.5, condition: "physical" } },
  { name: "choice-specs", displayName: "Choice Specs", effect: "1.5x Sp.Atk, locked into one move", battleModifier: { type: "damage_boost", value: 1.5, condition: "special" } },
  { name: "choice-scarf", displayName: "Choice Scarf", effect: "1.5x Speed, locked into one move", battleModifier: { type: "speed_boost", value: 1.5 } },

  // Damage boosters
  { name: "life-orb", displayName: "Life Orb", effect: "1.3x damage, lose 10% HP per attack", battleModifier: { type: "damage_boost", value: 1.3 } },
  { name: "expert-belt", displayName: "Expert Belt", effect: "1.2x damage on super effective moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "super_effective" } },
  { name: "muscle-band", displayName: "Muscle Band", effect: "1.1x physical move damage", battleModifier: { type: "damage_boost", value: 1.1, condition: "physical" } },
  { name: "wise-glasses", displayName: "Wise Glasses", effect: "1.1x special move damage", battleModifier: { type: "damage_boost", value: 1.1, condition: "special" } },

  // Type-boosting items
  { name: "charcoal", displayName: "Charcoal", effect: "1.2x Fire-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:fire" } },
  { name: "mystic-water", displayName: "Mystic Water", effect: "1.2x Water-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:water" } },
  { name: "miracle-seed", displayName: "Miracle Seed", effect: "1.2x Grass-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:grass" } },
  { name: "magnet", displayName: "Magnet", effect: "1.2x Electric-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:electric" } },
  { name: "never-melt-ice", displayName: "Never-Melt Ice", effect: "1.2x Ice-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:ice" } },
  { name: "black-belt", displayName: "Black Belt", effect: "1.2x Fighting-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:fighting" } },
  { name: "poison-barb", displayName: "Poison Barb", effect: "1.2x Poison-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:poison" } },
  { name: "sharp-beak", displayName: "Sharp Beak", effect: "1.2x Flying-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:flying" } },
  { name: "spell-tag", displayName: "Spell Tag", effect: "1.2x Ghost-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:ghost" } },
  { name: "dragon-fang", displayName: "Dragon Fang", effect: "1.2x Dragon-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:dragon" } },
  { name: "silk-scarf", displayName: "Silk Scarf", effect: "1.2x Normal-type moves", battleModifier: { type: "damage_boost", value: 1.2, condition: "type:normal" } },

  // Defensive items
  { name: "leftovers", displayName: "Leftovers", effect: "Restore 1/16 max HP each turn", battleModifier: { type: "hp_restore", value: 1/16 } },
  { name: "black-sludge", displayName: "Black Sludge", effect: "Restore 1/16 HP (Poison-type only)", battleModifier: { type: "hp_restore", value: 1/16, condition: "type:poison" } },
  { name: "focus-sash", displayName: "Focus Sash", effect: "Survive a KO hit at 1 HP (once, full HP only)", battleModifier: { type: "survive_ko" } },
  { name: "assault-vest", displayName: "Assault Vest", effect: "1.5x Sp.Def, can only use attacking moves", battleModifier: { type: "stat_boost", value: 1.5, condition: "spDef" } },
  { name: "eviolite", displayName: "Eviolite", effect: "1.5x Def and Sp.Def (unevolved Pokemon only)", battleModifier: { type: "stat_boost", value: 1.5, condition: "def_spdef" } },
  { name: "rocky-helmet", displayName: "Rocky Helmet", effect: "Attacker loses 1/6 HP on contact", battleModifier: { type: "damage_boost", value: 1/6, condition: "contact_recoil" } },

  // Berries
  { name: "sitrus-berry", displayName: "Sitrus Berry", effect: "Restore 25% HP when below 50% (once)", battleModifier: { type: "hp_restore", value: 0.25, condition: "below_half" } },
  { name: "lum-berry", displayName: "Lum Berry", effect: "Cure any status condition (once)" },

  // Utility
  { name: "heavy-duty-boots", displayName: "Heavy-Duty Boots", effect: "Immune to entry hazards" },
  { name: "safety-goggles", displayName: "Safety Goggles", effect: "Immune to weather damage and powder moves" },
  { name: "mental-herb", displayName: "Mental Herb", effect: "Cure Taunt/Encore/Disable (once)" },
];

export function getHeldItem(name: string): HeldItem | undefined {
  return HELD_ITEMS.find((i) => i.name === name);
}
