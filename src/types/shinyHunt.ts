/** Method used while shiny hunting. Purely affects the displayed odds
 *  readout — see `oddsFor` in `useShinyHunt.ts` for the odds table. */
export type HuntMethod = "full-odds" | "masuda" | "chain" | "radar";

/** A single shiny hunt — either the active one or an archived entry in history. */
export interface ShinyHunt {
  id: string;
  species: string;
  method: HuntMethod;
  encounters: number;
  chain: number;
  startedAt: string;
  foundAt: string | null;
}

/** A non-target shiny encountered while hunting for something else. */
export interface PhaseEncounter {
  species: string;
  encounterOfHunt: number;
  caughtAt: string;
}

/** Persisted shape for the whole Shiny Hunting feature (STORAGE_KEYS.shinyHunts). */
export interface ShinyHuntState {
  active: ShinyHunt | null;
  phases: PhaseEncounter[];
  history: ShinyHunt[];
}
