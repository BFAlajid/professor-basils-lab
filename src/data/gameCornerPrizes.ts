export interface GameCornerPrize {
  id: string;
  name: string;
  pokemonId: number;
  level: number;
  cost: number;
  description: string;
}

export const GAME_CORNER_PRIZES: GameCornerPrize[] = [
  { id: "porygon", name: "Porygon", pokemonId: 137, level: 25, cost: 6500, description: "The Virtual Pokemon" },
  { id: "dratini", name: "Dratini", pokemonId: 147, level: 18, cost: 4600, description: "Rare Dragon-type" },
  { id: "eevee", name: "Eevee", pokemonId: 133, level: 20, cost: 3000, description: "The Evolution Pokemon" },
  { id: "scyther", name: "Scyther", pokemonId: 123, level: 25, cost: 5500, description: "Mantis Pokemon" },
  { id: "abra", name: "Abra", pokemonId: 63, level: 15, cost: 1500, description: "The Psi Pokemon" },
  { id: "larvitar", name: "Larvitar", pokemonId: 246, level: 20, cost: 8000, description: "Pseudo-legendary" },
  { id: "bagon", name: "Bagon", pokemonId: 371, level: 20, cost: 8000, description: "Rock Head Dragon" },
  { id: "beldum", name: "Beldum", pokemonId: 374, level: 20, cost: 8000, description: "Iron Ball Pokemon" },
];
