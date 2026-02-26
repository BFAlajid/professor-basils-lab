export interface EvolutionItem {
  id: string;
  name: string;
  displayName: string;
  price: number;
  targetPokemon: string[];
}

export const EVOLUTION_ITEMS: EvolutionItem[] = [
  { id: "fire-stone", name: "fire-stone", displayName: "Fire Stone", price: 2100, targetPokemon: ["vulpix", "growlithe", "eevee"] },
  { id: "water-stone", name: "water-stone", displayName: "Water Stone", price: 2100, targetPokemon: ["poliwhirl", "shellder", "staryu", "eevee"] },
  { id: "thunder-stone", name: "thunder-stone", displayName: "Thunder Stone", price: 2100, targetPokemon: ["pikachu", "eevee"] },
  { id: "leaf-stone", name: "leaf-stone", displayName: "Leaf Stone", price: 2100, targetPokemon: ["gloom", "weepinbell", "exeggcute", "eevee"] },
  { id: "moon-stone", name: "moon-stone", displayName: "Moon Stone", price: 2100, targetPokemon: ["nidorina", "nidorino", "clefairy", "jigglypuff"] },
  { id: "sun-stone", name: "sun-stone", displayName: "Sun Stone", price: 2100, targetPokemon: ["gloom", "sunkern"] },
  { id: "dusk-stone", name: "dusk-stone", displayName: "Dusk Stone", price: 2100, targetPokemon: ["murkrow", "misdreavus", "lampent", "doublade"] },
  { id: "dawn-stone", name: "dawn-stone", displayName: "Dawn Stone", price: 2100, targetPokemon: ["kirlia", "snorunt"] },
  { id: "shiny-stone", name: "shiny-stone", displayName: "Shiny Stone", price: 2100, targetPokemon: ["togetic", "roselia", "minccino", "floette"] },
  { id: "ice-stone", name: "ice-stone", displayName: "Ice Stone", price: 2100, targetPokemon: ["alolan-vulpix", "alolan-sandshrew", "eevee"] },
];
