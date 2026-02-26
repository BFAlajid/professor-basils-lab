import { TeamSlot, TournamentTrainer, DifficultyLevel, TypeName } from "@/types";
import { createWildTeamSlot } from "./wildBattle";
import { shuffleArray } from "./random";
import { fetchPokemonData } from "@/utils/pokeApiClient";

// Pokemon IDs grouped by type specialty
const TYPE_THEMED_POOLS: Record<string, number[]> = {
  fire: [6, 59, 78, 136, 157, 229, 257, 392, 467, 609],
  water: [9, 62, 121, 130, 134, 186, 260, 395, 503, 593],
  grass: [3, 45, 71, 103, 154, 254, 389, 497, 673, 724],
  electric: [26, 101, 135, 181, 310, 466, 596, 604, 738, 849],
  psychic: [65, 80, 121, 124, 196, 282, 475, 576, 678, 765],
  fighting: [62, 68, 106, 107, 214, 237, 286, 448, 534, 675],
  dark: [197, 215, 248, 262, 302, 359, 461, 510, 571, 635],
  dragon: [149, 248, 330, 334, 373, 445, 612, 635, 706, 784],
  steel: [208, 227, 303, 376, 395, 462, 530, 601, 681, 707],
  ghost: [94, 200, 292, 302, 354, 426, 478, 563, 609, 711],
  ice: [91, 124, 131, 144, 215, 362, 461, 473, 478, 615],
  poison: [34, 45, 49, 71, 89, 110, 169, 407, 454, 569],
  ground: [31, 51, 76, 105, 232, 329, 423, 450, 530, 623],
  flying: [18, 22, 130, 142, 227, 334, 398, 430, 521, 628],
  bug: [12, 15, 49, 127, 212, 214, 267, 416, 469, 596],
  rock: [76, 139, 141, 142, 248, 306, 369, 409, 526, 699],
  fairy: [36, 40, 282, 303, 468, 546, 700, 707, 730, 785],
  normal: [20, 40, 85, 143, 217, 242, 289, 424, 474, 508],
};

const TRAINER_DATA: { name: string; title: string; theme: TypeName | "mixed" }[] = [
  { name: "Blaze", title: "Fire Ace", theme: "fire" },
  { name: "Marina", title: "Water Expert", theme: "water" },
  { name: "Gaia", title: "Grass Specialist", theme: "grass" },
  { name: "Volt", title: "Electric Master", theme: "electric" },
  { name: "Luna", title: "Psychic Sage", theme: "psychic" },
  { name: "Rex", title: "Fighting Champion", theme: "fighting" },
  { name: "Shadow", title: "Dark Enforcer", theme: "dark" },
  { name: "Drake", title: "Dragon Tamer", theme: "dragon" },
  { name: "Sterling", title: "Steel Commander", theme: "steel" },
  { name: "Phantom", title: "Ghost Whisperer", theme: "ghost" },
  { name: "Crystal", title: "Ice Queen", theme: "ice" },
  { name: "Venom", title: "Poison Master", theme: "poison" },
  { name: "Terra", title: "Ground Shaker", theme: "ground" },
  { name: "Skylar", title: "Flying Ace", theme: "flying" },
  { name: "Atlas", title: "Rock Crusher", theme: "rock" },
  { name: "Faye", title: "Fairy Guardian", theme: "fairy" },
];

function getDifficultyForRound(round: number): DifficultyLevel {
  if (round === 0) return "easy";
  if (round === 1) return "normal";
  return "hard";
}

async function fetchPokemonById(id: number) {
  return fetchPokemonData(id);
}

async function buildTrainerTeam(
  pool: number[],
  teamSize: number
): Promise<TeamSlot[]> {
  const shuffled = shuffleArray(pool);
  const selected = shuffled.slice(0, teamSize);
  const slots: TeamSlot[] = [];

  for (const id of selected) {
    try {
      const pokemon = await fetchPokemonById(id);
      const slot = createWildTeamSlot(pokemon, 50);
      slot.position = slots.length;
      slots.push(slot);
    } catch {
      // skip failed fetches
    }
  }

  return slots;
}

export async function generateTournamentBracket(): Promise<TournamentTrainer[]> {
  const shuffledTrainers = shuffleArray(TRAINER_DATA).slice(0, 8);
  const trainers: TournamentTrainer[] = [];

  // Assign round-based difficulty: first 4 are round 0 (easy), next 2 are round 1 (normal), last 2 are round 2 (hard)
  const roundAssignment = [0, 0, 0, 0, 1, 1, 2, 2];

  for (let i = 0; i < shuffledTrainers.length; i++) {
    const trainerInfo = shuffledTrainers[i];
    const round = roundAssignment[i];
    const difficulty = getDifficultyForRound(round);
    const teamSize = difficulty === "easy" ? 3 : difficulty === "normal" ? 4 : 6;

    const theme = trainerInfo.theme;
    const pool = theme === "mixed"
      ? Object.values(TYPE_THEMED_POOLS).flat()
      : TYPE_THEMED_POOLS[theme] ?? TYPE_THEMED_POOLS.normal;

    const team = await buildTrainerTeam(pool, teamSize);

    trainers.push({
      name: trainerInfo.name,
      title: trainerInfo.title,
      theme: trainerInfo.theme,
      team,
      difficulty,
      defeated: false,
    });
  }

  return trainers;
}
