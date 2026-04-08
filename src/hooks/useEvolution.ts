import { useState, useCallback, useRef } from "react";
import { silentWarn } from "@/utils/silentWarn";
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
  const requestIdRef = useRef(0);

  const checkEvolution = useCallback(async (pokemon: PCBoxPokemon) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setOptions([]);
    try {
      const evoChain = await fetchEvolutionChain(pokemon.pokemon.id);
      if (requestIdRef.current !== requestId) return;
      setChain(evoChain);
      if (evoChain) {
        const available = getAvailableEvolutions(pokemon.pokemon.id, pokemon.level, evoChain);
        setOptions(available);
      }
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      silentWarn("checkEvolution", e);
      setChain(null);
      setOptions([]);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
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
      } catch (e) {
        silentWarn("evolvePokemon", e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { checkEvolution, evolve, loading, options, chain };
}
