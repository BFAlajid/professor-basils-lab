import type { Pokemon } from "./pokemon";

export interface NuzlockeState {
  enabled: boolean;
  encounteredAreas: string[];
  graveyard: NuzlockeGravePokemon[];
  isGameOver: boolean;
}

export interface NuzlockeGravePokemon {
  pokemon: Pokemon;
  nickname: string;
  causeOfDeath: string;
  area: string;
  level: number;
}
