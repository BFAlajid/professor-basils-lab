"use client";

import { useEffect } from "react";
import { fetchPokemon } from "@/hooks/usePokemon";
import { decodeTeam, type DecodedTeamData } from "@/hooks/useTeam";
import { NATURES } from "@/data/natures";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";
import type { Pokemon, TeamSlot } from "@/types";

/**
 * Hydrates the team from URL params on mount.
 * - `?add=<id>` adds a single Pokemon to the current team, then strips the param.
 * - `?team=<encoded>` replaces the team with a decoded shareable team
 *   (supports the legacy id-only format and the current full-data format).
 */
export function useTeamFromUrl(
  addPokemon: (pokemon: Pokemon) => void,
  setTeam: (slots: TeamSlot[]) => void
): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addParam = params.get("add");
    if (addParam) {
      fetchPokemon(addParam).then((pokemon) => {
        if (pokemon) addPokemon(pokemon);
      }).catch(() => { /* add by URL — Pokemon not found, safe to ignore */ });
      window.history.replaceState({}, "", "/");
    }

    const encoded = params.get("team");
    if (encoded) {
      const decoded = decodeTeam(encoded);
      if (decoded.length === 0) return;

      if (typeof decoded[0] === "number") {
        // Old format — just IDs (atomic load via setTeam)
        Promise.all(
          (decoded as number[]).map(async (id) => {
            try {
              return await fetchPokemon(id);
            } catch {
              return null;
            }
          })
        ).then((results) => {
          const validSlots = results
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map((pokemon, i) => ({ pokemon, position: i } as TeamSlot));
          if (validSlots.length > 0) setTeam(validSlots);
        }).catch(() => {});
      } else {
        // New format — full team data
        const slots = decoded as DecodedTeamData;
        Promise.all(
          slots.map(async (s) => {
            try {
              const pokemon = await fetchPokemon(s.id);
              const nature = s.n ? NATURES.find((n) => n.name === s.n) ?? null : null;
              return {
                pokemon,
                position: 0,
                nature,
                evs: s.e ? { hp: s.e[0], attack: s.e[1], defense: s.e[2], spAtk: s.e[3], spDef: s.e[4], speed: s.e[5] } : { ...DEFAULT_EVS },
                ivs: s.i ? { hp: s.i[0], attack: s.i[1], defense: s.i[2], spAtk: s.i[3], spDef: s.i[4], speed: s.i[5] } : { ...DEFAULT_IVS },
                ability: s.a ?? pokemon.abilities?.[0]?.ability.name ?? null,
                heldItem: s.h ?? null,
                selectedMoves: s.m ?? [],
                teraConfig: s.t ? { teraType: s.t as string } : undefined,
                formeOverride: s.f ?? undefined,
              } as TeamSlot;
            } catch {
              return null;
            }
          })
        ).then((results) => {
          const validSlots = results
            .filter((s): s is TeamSlot => s !== null)
            .map((s, i) => ({ ...s, position: i }));
          if (validSlots.length > 0) setTeam(validSlots);
        }).catch(() => { /* URL team decode failed — ignore */ });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
