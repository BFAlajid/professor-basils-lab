/**
 * WASM-accelerated battle utilities.
 *
 * The battle reducer itself stays in JS (too many complex JS dependencies like ability
 * hooks, item lookups, status move effects). This wrapper re-exports the full battle
 * module, augmenting it with WASM-accelerated turn ordering via the pkmn-battle crate.
 *
 * The main WASM benefits for battle come from:
 * 1. AI action selection (see aiWasm.ts)
 * 2. Damage calculation (see damageWasm.ts)
 * 3. Turn priority resolution (this file)
 */

// Re-export everything from the JS battle module unchanged
export {
  battleReducer,
  initialBattleState,
  initBattlePokemon,
  initBattleTeam,
  getActivePokemon,
  getStatStageMultiplier,
  getEffectiveTypes,
  cacheBattleMove,
  getCachedMoves,
  initStatStages,
} from "./battle";

// Re-export types
export type { } from "./battle";
