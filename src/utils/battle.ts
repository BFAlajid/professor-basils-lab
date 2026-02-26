// Barrel re-export: maintains backward compatibility for all consumers
export {
  initStatStages,
  getActivePokemon,
  getStatStageMultiplier,
  getEffectiveTypes,
  cacheBattleMove,
  getCachedMoves,
} from "./battleHelpers";

export {
  initBattlePokemon,
  initBattleTeam,
  battleReducer,
  initialBattleState,
} from "./battleReducer";
