export interface Fossil {
  id: string;
  name: string;
  pokemonId: number;
  reviveLevel: number;
  description: string;
}

export const FOSSILS: Fossil[] = [
  { id: "helix-fossil", name: "Helix Fossil", pokemonId: 138, reviveLevel: 20, description: "Revives into Omanyte" },
  { id: "dome-fossil", name: "Dome Fossil", pokemonId: 140, reviveLevel: 20, description: "Revives into Kabuto" },
  { id: "old-amber", name: "Old Amber", pokemonId: 142, reviveLevel: 30, description: "Revives into Aerodactyl" },
  { id: "root-fossil", name: "Root Fossil", pokemonId: 345, reviveLevel: 20, description: "Revives into Lileep" },
  { id: "claw-fossil", name: "Claw Fossil", pokemonId: 347, reviveLevel: 20, description: "Revives into Anorith" },
  { id: "skull-fossil", name: "Skull Fossil", pokemonId: 408, reviveLevel: 20, description: "Revives into Cranidos" },
  { id: "armor-fossil", name: "Armor Fossil", pokemonId: 410, reviveLevel: 20, description: "Revives into Shieldon" },
  { id: "cover-fossil", name: "Cover Fossil", pokemonId: 564, reviveLevel: 25, description: "Revives into Tirtouga" },
  { id: "plume-fossil", name: "Plume Fossil", pokemonId: 566, reviveLevel: 25, description: "Revives into Archen" },
  { id: "jaw-fossil", name: "Jaw Fossil", pokemonId: 696, reviveLevel: 20, description: "Revives into Tyrunt" },
  { id: "sail-fossil", name: "Sail Fossil", pokemonId: 698, reviveLevel: 20, description: "Revives into Amaura" },
];

// Drop rates by area theme
export const FOSSIL_DROP_RATES: Record<string, number> = {
  cave: 0.05,
  mountain: 0.03,
  desert: 0.04,
  // All others: 0
};
