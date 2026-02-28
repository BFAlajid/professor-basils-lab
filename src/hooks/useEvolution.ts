import { useState, useCallback } from "react";
import { PCBoxPokemon, Pokemon } from "@/types";
import {
  fetchEvolutionChain,
  getAvailableEvolutions,
  EvolutionOption,
  EvolutionNode,
} from "@/utils/evolutionChain";
import { fetchPokemon } from "@/hooks/usePokemon";

export function useEvolution() {
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<EvolutionNode | null>(null);
  const [options, setOptions] = useState<EvolutionOption[]>([]);

  const checkEvolution = useCallback(async (pokemon: PCBoxPokemon) => {
    setLoading(true);
    setOptions([]);
    try {
      const evoChain = await fetchEvolutionChain(pokemon.pokemon.id);
      setChain(evoChain);
      if (evoChain) {
        const available = getAvailableEvolutions(pokemon.pokemon.id, pokemon.level, evoChain);
        setOptions(available);
      }
    } catch {
      setChain(null);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const evolve = useCallback(
    async (pokemon: PCBoxPokemon, option: EvolutionOption): Promise<PCBoxPokemon | null> => {
      setLoading(true);
      try {
        const evolvedData: Pokemon = await fetchPokemon(option.targetSpeciesId);
        const evolved: PCBoxPokemon = {
          ...pokemon,
          pokemon: evolvedData,
          level: option.minLevel && option.minLevel > pokemon.level ? option.minLevel : pokemon.level,
          ability: evolvedData.abilities?.[0]?.ability.name ?? pokemon.ability,
        };
        return evolved;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { checkEvolution, evolve, loading, options, chain };
}
