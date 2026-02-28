import { fetchPokemonData, fetchSpeciesData, type PokemonSpeciesData } from "@/utils/pokeApiClient";

export interface EggMoveChain {
  moveName: string;
  parents: { speciesId: number; speciesName: string; learnMethod: string }[];
}

interface PokeAPIMoveVersionDetail {
  move_learn_method: { name: string };
  version_group: { name: string };
  level_learned_at: number;
}

interface PokeAPIMoveEntry {
  move: { name: string; url: string };
  version_group_details: PokeAPIMoveVersionDetail[];
}

interface PokeAPIEggGroupMember {
  name: string;
  url: string;
}

function extractId(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return parseInt(parts[parts.length - 1], 10);
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchEggMoves(pokemonId: number): Promise<EggMoveChain[]> {
  try {
    const pokemonData = await fetchPokemonData(pokemonId);

    const moves: PokeAPIMoveEntry[] = (pokemonData as any).moves;
    const eggMoves = moves.filter((m) =>
      m.version_group_details.some((d) => d.move_learn_method.name === "egg")
    );

    if (eggMoves.length === 0) return [];

    const speciesData = await fetchSpeciesData(pokemonId);

    const eggGroupMembers = new Set<string>();
    const memberResults = await Promise.all(
      speciesData.egg_groups
        .filter((g) => g.name !== "no-eggs")
        .slice(0, 2)
        .map((g) => fetch(g.url).then((r) => (r.ok ? r.json() : null)))
    );

    for (const group of memberResults) {
      if (!group) continue;
      const members: PokeAPIEggGroupMember[] = group.pokemon_species ?? [];
      for (const m of members.slice(0, 40)) {
        eggGroupMembers.add(m.name);
      }
    }

    const results: EggMoveChain[] = [];
    const checkedParents = new Map<string, PokeAPIMoveEntry[]>();

    const parentSample = Array.from(eggGroupMembers).slice(0, 20);
    const parentFetches = await Promise.allSettled(
      parentSample.map((name) =>
        fetchPokemonData(name)
          .then((data) => {
            if (data) checkedParents.set(name, (data as any).moves);
          })
          .catch(() => {})
      )
    );
    void parentFetches;

    for (const eggMove of eggMoves) {
      const moveName = eggMove.move.name;
      const parents: EggMoveChain["parents"] = [];

      for (const [parentName, parentMoves] of checkedParents) {
        const parentMove = parentMoves.find(
          (m: PokeAPIMoveEntry) => m.move.name === moveName
        );
        if (!parentMove) continue;

        const learnsByLevelOrTm = parentMove.version_group_details.some(
          (d: PokeAPIMoveVersionDetail) =>
            d.move_learn_method.name === "level-up" || d.move_learn_method.name === "machine"
        );

        if (learnsByLevelOrTm) {
          const method = parentMove.version_group_details.find(
            (d: PokeAPIMoveVersionDetail) =>
              d.move_learn_method.name === "level-up" || d.move_learn_method.name === "machine"
          );
          parents.push({
            speciesId: extractId(
              parentMoves === checkedParents.get(parentName)
                ? `https://pokeapi.co/api/v2/pokemon-species/${parentName}/`
                : ""
            ) || 0,
            speciesName: parentName,
            learnMethod: method
              ? formatName(method.move_learn_method.name)
              : "Level Up",
          });
        }
      }

      results.push({
        moveName: eggMove.move.name,
        parents: parents.slice(0, 6),
      });
    }

    return results;
  } catch {
    return [];
  }
}
