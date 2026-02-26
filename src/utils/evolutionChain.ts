import { fetchSpeciesData } from "@/utils/pokeApiClient";

export interface EvolutionOption {
  targetSpeciesId: number;
  targetName: string;
  method: "level-up" | "use-item" | "trade" | "other";
  minLevel?: number;
  itemRequired?: string;
  trigger: string;
}

export interface EvolutionNode {
  speciesId: number;
  speciesName: string;
  evolvesTo: EvolutionNode[];
  evolutionDetails: EvolutionOption[];
}

interface PokeAPIEvolutionDetail {
  min_level: number | null;
  trigger: { name: string };
  item: { name: string } | null;
  held_item: { name: string } | null;
  min_happiness: number | null;
  time_of_day: string;
  known_move: { name: string } | null;
  known_move_type: { name: string } | null;
  location: { name: string } | null;
}

interface PokeAPIChainLink {
  species: { name: string; url: string };
  evolution_details: PokeAPIEvolutionDetail[];
  evolves_to: PokeAPIChainLink[];
}

function extractSpeciesId(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return parseInt(parts[parts.length - 1], 10);
}

function classifyMethod(detail: PokeAPIEvolutionDetail): EvolutionOption["method"] {
  const trigger = detail.trigger.name;
  if (trigger === "level-up") return "level-up";
  if (trigger === "use-item") return "use-item";
  if (trigger === "trade") return "trade";
  return "other";
}

function buildTriggerLabel(detail: PokeAPIEvolutionDetail): string {
  const parts: string[] = [];
  if (detail.min_level) parts.push(`Lv. ${detail.min_level}`);
  if (detail.item) parts.push(formatName(detail.item.name));
  if (detail.held_item) parts.push(`Hold ${formatName(detail.held_item.name)}`);
  if (detail.min_happiness) parts.push(`Friendship ${detail.min_happiness}+`);
  if (detail.time_of_day) parts.push(detail.time_of_day);
  if (detail.known_move) parts.push(`Know ${formatName(detail.known_move.name)}`);
  if (detail.known_move_type) parts.push(`Know ${formatName(detail.known_move_type.name)}-type move`);
  if (detail.location) parts.push(`at ${formatName(detail.location.name)}`);
  if (detail.trigger.name === "trade") parts.push("Trade");
  if (parts.length === 0) parts.push(formatName(detail.trigger.name));
  return parts.join(", ");
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseChainLink(link: PokeAPIChainLink): EvolutionNode {
  const speciesId = extractSpeciesId(link.species.url);
  const options: EvolutionOption[] = link.evolution_details.map((d) => ({
    targetSpeciesId: speciesId,
    targetName: link.species.name,
    method: classifyMethod(d),
    minLevel: d.min_level ?? undefined,
    itemRequired: d.item?.name ?? d.held_item?.name ?? undefined,
    trigger: buildTriggerLabel(d),
  }));

  return {
    speciesId,
    speciesName: link.species.name,
    evolvesTo: link.evolves_to.map(parseChainLink),
    evolutionDetails: options,
  };
}

export async function fetchEvolutionChain(pokemonId: number): Promise<EvolutionNode | null> {
  try {
    const species = await fetchSpeciesData(pokemonId);

    const chainUrl = species.evolution_chain?.url;
    if (!chainUrl) return null;

    const chainRes = await fetch(chainUrl);
    if (!chainRes.ok) return null;
    const chainData = await chainRes.json();

    return parseChainLink(chainData.chain);
  } catch {
    return null;
  }
}

function findNode(node: EvolutionNode, speciesId: number): EvolutionNode | null {
  if (node.speciesId === speciesId) return node;
  for (const child of node.evolvesTo) {
    const found = findNode(child, speciesId);
    if (found) return found;
  }
  return null;
}

export function getAvailableEvolutions(
  pokemonId: number,
  level: number,
  chain: EvolutionNode
): EvolutionOption[] {
  const current = findNode(chain, pokemonId);
  if (!current || current.evolvesTo.length === 0) return [];

  const options: EvolutionOption[] = [];
  for (const child of current.evolvesTo) {
    for (const detail of child.evolutionDetails) {
      const eligible =
        detail.method === "use-item" ||
        detail.method === "trade" ||
        detail.method === "other" ||
        (detail.method === "level-up" && (!detail.minLevel || level >= detail.minLevel));

      if (eligible) {
        options.push({
          ...detail,
          targetSpeciesId: child.speciesId,
          targetName: child.speciesName,
        });
      }
    }

    if (child.evolutionDetails.length === 0) {
      options.push({
        targetSpeciesId: child.speciesId,
        targetName: child.speciesName,
        method: "level-up",
        trigger: "Level Up",
      });
    }
  }

  return options;
}
