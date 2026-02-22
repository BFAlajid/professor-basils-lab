import { TypeName } from "@/types";

export interface BattleMoveData {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: "physical" | "special" | "status" };
  meta?: {
    ailment?: { name: string };
    ailment_chance?: number;
  };
}

// Max Move names by type
const MAX_MOVE_NAMES: Record<TypeName, string> = {
  normal: "Max Strike",
  fire: "Max Flare",
  water: "Max Geyser",
  electric: "Max Lightning",
  grass: "Max Overgrowth",
  ice: "Max Hailstorm",
  fighting: "Max Knuckle",
  poison: "Max Ooze",
  ground: "Max Quake",
  flying: "Max Airstream",
  psychic: "Max Mindstorm",
  bug: "Max Flutterby",
  rock: "Max Rockfall",
  ghost: "Max Phantasm",
  dragon: "Max Wyrmwind",
  dark: "Max Darkness",
  steel: "Max Steelspike",
  fairy: "Max Starfall",
};

// Max Move for status moves
const MAX_GUARD = "Max Guard";

// Original BP → Max Move BP conversion table
const POWER_TABLE: [number, number][] = [
  [0, 0],      // status moves become Max Guard
  [40, 90],
  [50, 100],
  [60, 110],
  [70, 120],
  [75, 130],
  [100, 130],
  [110, 140],
  [125, 140],
  [130, 150],
  [150, 150],
];

// Field effects set by Max Moves
export type MaxMoveFieldEffect =
  | { type: "weather"; weather: "sun" | "rain" | "sandstorm" | "hail" }
  | { type: "terrain"; terrain: "electric" | "grassy" | "misty" | "psychic" }
  | { type: "stat_boost"; stat: string; target: "self" }
  | { type: "stat_drop"; stat: string; target: "opponent" }
  | null;

const MAX_MOVE_EFFECTS: Record<string, MaxMoveFieldEffect> = {
  "Max Flare": { type: "weather", weather: "sun" },
  "Max Geyser": { type: "weather", weather: "rain" },
  "Max Rockfall": { type: "weather", weather: "sandstorm" },
  "Max Hailstorm": { type: "weather", weather: "hail" },
  "Max Lightning": { type: "terrain", terrain: "electric" },
  "Max Overgrowth": { type: "terrain", terrain: "grassy" },
  "Max Starfall": { type: "terrain", terrain: "misty" },
  "Max Mindstorm": { type: "terrain", terrain: "psychic" },
  "Max Knuckle": { type: "stat_boost", stat: "attack", target: "self" },
  "Max Ooze": { type: "stat_boost", stat: "spAtk", target: "self" },
  "Max Steelspike": { type: "stat_boost", stat: "defense", target: "self" },
  "Max Quake": { type: "stat_boost", stat: "spDef", target: "self" },
  "Max Airstream": { type: "stat_boost", stat: "speed", target: "self" },
  "Max Strike": { type: "stat_drop", stat: "speed", target: "opponent" },
  "Max Flutterby": { type: "stat_drop", stat: "spAtk", target: "opponent" },
  "Max Phantasm": { type: "stat_drop", stat: "defense", target: "opponent" },
  "Max Wyrmwind": { type: "stat_drop", stat: "attack", target: "opponent" },
  "Max Darkness": { type: "stat_drop", stat: "spDef", target: "opponent" },
};

export function getMaxMoveName(moveType: TypeName): string {
  return MAX_MOVE_NAMES[moveType] ?? "Max Strike";
}

export function getMaxMovePower(originalPower: number | null): number {
  if (originalPower === null || originalPower === 0) return 0; // status → Max Guard
  for (let i = POWER_TABLE.length - 1; i >= 0; i--) {
    if (originalPower >= POWER_TABLE[i][0]) {
      return POWER_TABLE[i][1];
    }
  }
  return 90;
}

export function getMaxMoveEffect(maxMoveName: string): MaxMoveFieldEffect {
  return MAX_MOVE_EFFECTS[maxMoveName] ?? null;
}

export function convertToMaxMove(
  moveData: BattleMoveData,
): BattleMoveData {
  if (moveData.damage_class.name === "status") {
    return {
      name: MAX_GUARD,
      power: null,
      accuracy: null,
      pp: null,
      type: { name: "normal" },
      damage_class: { name: "status" },
    };
  }

  const moveType = moveData.type.name as TypeName;
  const maxName = getMaxMoveName(moveType);
  const maxPower = getMaxMovePower(moveData.power);

  return {
    name: maxName,
    power: maxPower,
    accuracy: null, // Max Moves always hit
    pp: null,
    type: moveData.type,
    damage_class: moveData.damage_class,
  };
}
