import { IVSpread, PCBoxPokemon, BreedingEgg, Nature } from "@/types";
import { NATURES } from "@/data/natures";
import { generateRandomIVs, randomInt } from "./wildBattle";

// --- Egg Group fetching ---

interface EggGroupData {
  egg_groups: { name: string }[];
  evolution_chain: { url: string } | null;
}

const eggGroupCache = new Map<number, string[]>();

export async function fetchEggGroups(speciesId: number): Promise<string[]> {
  if (eggGroupCache.has(speciesId)) return eggGroupCache.get(speciesId)!;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    if (!res.ok) return [];
    const data: EggGroupData = await res.json();
    const groups = data.egg_groups.map((g) => g.name);
    eggGroupCache.set(speciesId, groups);
    return groups;
  } catch {
    return [];
  }
}

// --- Compatibility ---

export function checkCompatibility(
  groups1: string[],
  groups2: string[],
  isDitto1: boolean,
  isDitto2: boolean
): { compatible: boolean; message: string } {
  // Two Dittos can't breed
  if (isDitto1 && isDitto2) {
    return { compatible: false, message: "Two Ditto cannot breed together." };
  }

  // Undiscovered egg group can never breed (except Manaphy egg, which we skip)
  if (groups1.includes("no-eggs") || groups2.includes("no-eggs")) {
    return { compatible: false, message: "This Pokemon is in the Undiscovered egg group." };
  }

  // Ditto breeds with anything (except Undiscovered and other Ditto)
  if (isDitto1 || isDitto2) {
    return { compatible: true, message: "Ditto can breed with any compatible Pokemon!" };
  }

  // Check shared egg group
  const shared = groups1.some((g) => groups2.includes(g));
  if (shared) {
    return { compatible: true, message: "These Pokemon share an egg group and can breed!" };
  }

  return { compatible: false, message: "These Pokemon don't share an egg group." };
}

// --- Offspring species ---

const evolutionChainCache = new Map<number, number>();

export async function getOffspringSpeciesId(
  parent1: PCBoxPokemon,
  parent2: PCBoxPokemon
): Promise<number> {
  const isDitto1 = parent1.pokemon.name === "ditto";
  const isDitto2 = parent2.pokemon.name === "ditto";

  // If one is Ditto, offspring is the base form of the non-Ditto parent
  const mother = isDitto1 ? parent2 : parent1;
  const speciesId = mother.pokemon.id;

  if (evolutionChainCache.has(speciesId)) {
    return evolutionChainCache.get(speciesId)!;
  }

  try {
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    if (!speciesRes.ok) return speciesId;
    const speciesData = await speciesRes.json();

    if (!speciesData.evolution_chain?.url) return speciesId;

    const chainRes = await fetch(speciesData.evolution_chain.url);
    if (!chainRes.ok) return speciesId;
    const chainData = await chainRes.json();

    // Get the base species from evolution chain
    const baseSpeciesUrl = chainData.chain?.species?.url;
    if (baseSpeciesUrl) {
      const baseId = parseInt(baseSpeciesUrl.split("/").filter(Boolean).pop() ?? String(speciesId));
      evolutionChainCache.set(speciesId, baseId);
      return baseId;
    }
  } catch {
    // fall through
  }

  return speciesId;
}

// --- IV inheritance ---

export function inheritIVs(
  p1: PCBoxPokemon,
  p2: PCBoxPokemon,
  hasDestinyKnot: boolean
): { stat: keyof IVSpread; fromParent: 1 | 2 }[] {
  const statKeys: (keyof IVSpread)[] = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];
  const numInherited = hasDestinyKnot ? 5 : 3;

  // Shuffle stat keys and pick the first N
  const shuffled = [...statKeys].sort(() => Math.random() - 0.5);
  const inherited: { stat: keyof IVSpread; fromParent: 1 | 2 }[] = [];

  for (let i = 0; i < numInherited; i++) {
    const stat = shuffled[i];
    const fromParent = Math.random() < 0.5 ? 1 : 2 as const;
    inherited.push({ stat, fromParent });
  }

  return inherited;
}

// --- Nature inheritance ---

export function inheritNature(
  p1: PCBoxPokemon,
  p2: PCBoxPokemon,
  everstoneHolder: 1 | 2 | null
): { nature: Nature; from: 1 | 2 | "random" } {
  if (everstoneHolder === 1) {
    return { nature: p1.nature, from: 1 };
  }
  if (everstoneHolder === 2) {
    return { nature: p2.nature, from: 2 };
  }
  return { nature: NATURES[Math.floor(Math.random() * NATURES.length)], from: "random" };
}

// --- Build full egg ---

export function createEgg(
  parent1: PCBoxPokemon,
  parent2: PCBoxPokemon,
  speciesId: number,
  speciesName: string,
  hasDestinyKnot: boolean = false,
  everstoneHolder: 1 | 2 | null = null
): BreedingEgg {
  const inherited = inheritIVs(parent1, parent2, hasDestinyKnot);
  const { nature, from: natureFrom } = inheritNature(parent1, parent2, everstoneHolder);

  // Build the IV spread
  const baseIvs = generateRandomIVs();
  for (const { stat, fromParent } of inherited) {
    baseIvs[stat] = fromParent === 1 ? parent1.ivs[stat] : parent2.ivs[stat];
  }

  // Ability from mother (or random)
  const ability = parent1.ability ?? parent2.ability ?? "unknown";

  return {
    id: `egg-${Date.now()}-${randomInt(0, 9999)}`,
    parent1,
    parent2,
    speciesId,
    speciesName,
    stepsRequired: 2560 + randomInt(0, 2560),
    stepsCompleted: 0,
    isHatched: false,
    hatchedPokemon: null,
    inheritedIVs: inherited,
    inheritedNature: natureFrom,
    inheritedAbility: ability,
    eggMoves: [],
  };
}
