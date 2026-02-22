import { Pokemon, TeamSlot } from "@/types";

export const mockCharizard: Pokemon = {
  id: 6,
  name: "charizard",
  sprites: {
    front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
    other: {
      "official-artwork": {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
      },
    },
  },
  stats: [
    { base_stat: 78, stat: { name: "hp" } },
    { base_stat: 84, stat: { name: "attack" } },
    { base_stat: 78, stat: { name: "defense" } },
    { base_stat: 109, stat: { name: "special-attack" } },
    { base_stat: 85, stat: { name: "special-defense" } },
    { base_stat: 100, stat: { name: "speed" } },
  ],
  types: [
    { slot: 1, type: { name: "fire" } },
    { slot: 2, type: { name: "flying" } },
  ],
  moves: [
    { move: { name: "flamethrower", url: "" } },
    { move: { name: "air-slash", url: "" } },
    { move: { name: "dragon-pulse", url: "" } },
    { move: { name: "solar-beam", url: "" } },
  ],
  abilities: [
    { ability: { name: "blaze", url: "" }, is_hidden: false, slot: 1 },
  ],
};

export const mockBlastoise: Pokemon = {
  id: 9,
  name: "blastoise",
  sprites: {
    front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png",
    other: {
      "official-artwork": {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png",
      },
    },
  },
  stats: [
    { base_stat: 79, stat: { name: "hp" } },
    { base_stat: 83, stat: { name: "attack" } },
    { base_stat: 100, stat: { name: "defense" } },
    { base_stat: 85, stat: { name: "special-attack" } },
    { base_stat: 105, stat: { name: "special-defense" } },
    { base_stat: 78, stat: { name: "speed" } },
  ],
  types: [{ slot: 1, type: { name: "water" } }],
  moves: [
    { move: { name: "hydro-pump", url: "" } },
    { move: { name: "ice-beam", url: "" } },
    { move: { name: "dark-pulse", url: "" } },
    { move: { name: "rapid-spin", url: "" } },
  ],
  abilities: [
    { ability: { name: "torrent", url: "" }, is_hidden: false, slot: 1 },
  ],
};

export const mockVenusaur: Pokemon = {
  id: 3,
  name: "venusaur",
  sprites: {
    front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png",
    other: {
      "official-artwork": {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png",
      },
    },
  },
  stats: [
    { base_stat: 80, stat: { name: "hp" } },
    { base_stat: 82, stat: { name: "attack" } },
    { base_stat: 83, stat: { name: "defense" } },
    { base_stat: 100, stat: { name: "special-attack" } },
    { base_stat: 100, stat: { name: "special-defense" } },
    { base_stat: 80, stat: { name: "speed" } },
  ],
  types: [
    { slot: 1, type: { name: "grass" } },
    { slot: 2, type: { name: "poison" } },
  ],
  moves: [
    { move: { name: "sludge-bomb", url: "" } },
    { move: { name: "energy-ball", url: "" } },
    { move: { name: "synthesis", url: "" } },
    { move: { name: "earthquake", url: "" } },
  ],
  abilities: [
    { ability: { name: "overgrow", url: "" }, is_hidden: false, slot: 1 },
  ],
};

export function createMockTeamSlot(pokemon: Pokemon, position: number = 0): TeamSlot {
  return {
    pokemon,
    position,
    nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
    evs: { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: pokemon.abilities?.[0]?.ability.name ?? null,
    heldItem: null,
    selectedMoves: pokemon.moves.slice(0, 4).map((m) => m.move.name),
  };
}
