import {
  Pokemon,
  TeamSlot,
  BattlePokemon,
  BattleState,
  BattleTeam,
  BattleLogEntry,
  StatStages,
  SideConditions,
  FieldState,
  StatusCondition,
  TypeName,
} from "@/types";

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

function defaultStatStages(): StatStages {
  return { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

function defaultSideConditions(): SideConditions {
  return { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 };
}

export function createMockBattlePokemon(
  slot: TeamSlot,
  overrides?: Partial<BattlePokemon>
): BattlePokemon {
  return {
    slot,
    currentHp: 300,
    maxHp: 300,
    status: null,
    statStages: defaultStatStages(),
    isActive: true,
    isFainted: false,
    toxicCounter: 0,
    sleepTurns: 0,
    turnsOnField: 0,
    isProtected: false,
    lastMoveUsed: null,
    consecutiveProtects: 0,
    isFlinched: false,
    choiceLockedMove: null,
    isMegaEvolved: false,
    isTerastallized: false,
    isDynamaxed: false,
    dynamaxTurnsLeft: 0,
    teraType: null,
    megaFormeData: null,
    activeStatOverride: null,
    originalMaxHp: 300,
    hasMegaEvolved: false,
    hasTerastallized: false,
    hasDynamaxed: false,
    ...overrides,
  };
}

export function createMockBattleState(
  overrides?: Partial<BattleState> & {
    p1Overrides?: Partial<BattlePokemon>;
    p2Overrides?: Partial<BattlePokemon>;
  }
): BattleState {
  const p1Slot = createMockTeamSlot(mockCharizard, 0);
  const p2Slot = createMockTeamSlot(mockBlastoise, 0);
  const { p1Overrides, p2Overrides, ...stateOverrides } = overrides ?? {};
  return {
    phase: "action_select",
    mode: "ai",
    difficulty: "normal",
    turn: 1,
    player1: {
      pokemon: [createMockBattlePokemon(p1Slot, p1Overrides)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    player2: {
      pokemon: [createMockBattlePokemon(p2Slot, p2Overrides)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    log: [],
    winner: null,
    waitingForSwitch: null,
    currentTurnPlayer: "player1",
    field: {
      weather: null,
      weatherTurnsLeft: 0,
      terrain: null,
      terrainTurnsLeft: 0,
      player1Side: defaultSideConditions(),
      player2Side: defaultSideConditions(),
    },
    pendingPivotSwitch: null,
    ...stateOverrides,
  };
}
