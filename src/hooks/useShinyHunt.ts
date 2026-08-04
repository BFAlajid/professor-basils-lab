"use client";

import { useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/utils/persistence";
import { SHINY_RATE } from "@/data/constants";
import type {
  HuntMethod,
  ShinyHunt,
  PhaseEncounter,
  ShinyHuntState,
} from "@/types/shinyHunt";

/** Cap on both `phases` and `history` — oldest entries are dropped first. */
const MAX_LIST = 50;

const initialState: ShinyHuntState = { active: null, phases: [], history: [] };

// ── Odds table ───────────────────────────────────────────────────────────
//
// This is a *display-only* odds readout. The actual per-encounter shiny
// roll lives in `useWildEncounter.ts` as a flat `SHINY_RATE` and is not
// method-aware — this workstream must not touch that file, so selecting
// "chain"/"masuda"/"radar" cannot change the real roll. The numbers below
// exist to give the classic shiny-hunting flavor (and a satisfying number
// to watch shrink) while staying anchored to the game's real base rate.
//
//  - full-odds: the game's actual flat rate, 1 / SHINY_RATE (4096).
//  - masuda:    ~5x boost, modeled on the Gen 4/5 Masuda breeding method
//               (no Shiny Charm stacking modeled).
//  - chain:     mirrors the shiny-chain readout already shown in
//               WildTab.tsx (`4096 / (1 + count * 0.5)`, floored at
//               BASE/8) so the two odds displays agree in shape.
//  - radar:     stepped breakpoints modeled on the Gen 6 Poké Radar patch
//               odds table (chain-length bands), approximate.
const BASE_ODDS = Math.round(1 / SHINY_RATE); // 4096

const RADAR_BREAKPOINTS: { minChain: number; odds: number }[] = [
  { minChain: 90, odds: 41 },
  { minChain: 80, odds: 75 },
  { minChain: 70, odds: 100 },
  { minChain: 60, odds: 150 },
  { minChain: 50, odds: 200 },
  { minChain: 40, odds: 256 },
  { minChain: 30, odds: 512 },
  { minChain: 20, odds: 1024 },
  { minChain: 10, odds: 2048 },
  { minChain: 0, odds: BASE_ODDS },
];

/** Returns N such that the displayed odds are "1 in N" for the given method/chain. */
export function oddsFor(method: HuntMethod, chain: number): number {
  const safeChain = Math.max(0, chain);
  switch (method) {
    case "full-odds":
      return BASE_ODDS;
    case "masuda":
      return Math.max(1, Math.round(BASE_ODDS / 5));
    case "chain":
      return Math.max(
        Math.round(BASE_ODDS / 8),
        Math.floor(BASE_ODDS / (1 + safeChain * 0.5))
      );
    case "radar": {
      const bp = RADAR_BREAKPOINTS.find((b) => safeChain >= b.minChain);
      return bp ? bp.odds : BASE_ODDS;
    }
    default:
      return BASE_ODDS;
  }
}

function generateHuntId(): string {
  return `hunt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Validation (defense-in-depth against tampered/legacy localStorage) ───

function isHuntMethod(v: unknown): v is HuntMethod {
  return v === "full-odds" || v === "masuda" || v === "chain" || v === "radar";
}

function validateHunt(raw: unknown): ShinyHunt | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<ShinyHunt>;
  if (typeof r.id !== "string" || typeof r.species !== "string" || !isHuntMethod(r.method)) {
    return null;
  }
  return {
    id: r.id,
    species: r.species,
    method: r.method,
    encounters: typeof r.encounters === "number" && r.encounters >= 0 ? r.encounters : 0,
    chain: typeof r.chain === "number" && r.chain >= 0 ? r.chain : 0,
    startedAt: typeof r.startedAt === "string" ? r.startedAt : new Date().toISOString(),
    foundAt: typeof r.foundAt === "string" ? r.foundAt : null,
  };
}

function validatePhase(raw: unknown): PhaseEncounter | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<PhaseEncounter>;
  if (typeof r.species !== "string" || typeof r.caughtAt !== "string") return null;
  return {
    species: r.species,
    encounterOfHunt: typeof r.encounterOfHunt === "number" ? r.encounterOfHunt : 0,
    caughtAt: r.caughtAt,
  };
}

function validateShinyHuntState(raw: unknown): ShinyHuntState | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Partial<ShinyHuntState>;

  const active = r.active == null ? null : validateHunt(r.active);

  const phases = Array.isArray(r.phases)
    ? r.phases.map(validatePhase).filter((p): p is PhaseEncounter => p !== null).slice(0, MAX_LIST)
    : [];

  const history = Array.isArray(r.history)
    ? r.history.map(validateHunt).filter((h): h is ShinyHunt => h !== null).slice(0, MAX_LIST)
    : [];

  return { active, phases, history };
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useShinyHunt() {
  const [state, setState] = usePersistedState<ShinyHuntState>(
    STORAGE_KEYS.shinyHunts,
    initialState,
    validateShinyHuntState
  );

  /** Begin a fresh hunt. No-op if one is already active — use `switchTarget` to replace it. */
  const startHunt = useCallback(
    (species: string, method: HuntMethod) => {
      setState((prev) => {
        if (prev.active) return prev;
        const hunt: ShinyHunt = {
          id: generateHuntId(),
          species,
          method,
          encounters: 0,
          chain: 0,
          startedAt: new Date().toISOString(),
          foundAt: null,
        };
        return { active: hunt, phases: [], history: prev.history };
      });
    },
    [setState]
  );

  /** Record one wild encounter against the active hunt. No-op if nothing is active.
   *  - Same species as the target: increments the chain; if shiny, completes the hunt.
   *  - Different species: breaks the chain back to 0; if shiny, logs a phase. */
  const recordEncounter = useCallback(
    (speciesSeen: string, wasShiny: boolean) => {
      setState((prev) => {
        const active = prev.active;
        if (!active) return prev;

        const encounters = active.encounters + 1;
        const isTarget = speciesSeen === active.species;
        const chain = isTarget ? active.chain + 1 : 0;

        if (wasShiny && isTarget) {
          // Target found — complete and archive the hunt, clear phases for the next one.
          const completed: ShinyHunt = {
            ...active,
            encounters,
            chain,
            foundAt: new Date().toISOString(),
          };
          return {
            active: null,
            phases: [],
            history: [completed, ...prev.history].slice(0, MAX_LIST),
          };
        }

        const updatedActive: ShinyHunt = { ...active, encounters, chain };

        if (wasShiny) {
          // A different species turned up shiny — log it as a phase, hunt continues.
          const phase: PhaseEncounter = {
            species: speciesSeen,
            encounterOfHunt: encounters,
            caughtAt: new Date().toISOString(),
          };
          return {
            active: updatedActive,
            phases: [phase, ...prev.phases].slice(0, MAX_LIST),
            history: prev.history,
          };
        }

        return { active: updatedActive, phases: prev.phases, history: prev.history };
      });
    },
    [setState]
  );

  /** Archive the current hunt (if any) to history and start a new one. */
  const switchTarget = useCallback(
    (species: string, method: HuntMethod) => {
      setState((prev) => {
        const history = prev.active ? [prev.active, ...prev.history].slice(0, MAX_LIST) : prev.history;
        const hunt: ShinyHunt = {
          id: generateHuntId(),
          species,
          method,
          encounters: 0,
          chain: 0,
          startedAt: new Date().toISOString(),
          foundAt: null,
        };
        return { active: hunt, phases: [], history };
      });
    },
    [setState]
  );

  /** Give up on the active hunt — archives it (foundAt stays null) without starting a new one. */
  const abandonHunt = useCallback(() => {
    setState((prev) => {
      if (!prev.active) return prev;
      return {
        active: null,
        phases: [],
        history: [prev.active, ...prev.history].slice(0, MAX_LIST),
      };
    });
  }, [setState]);

  return { state, startHunt, recordEncounter, switchTarget, abandonHunt };
}
