// Barrel re-export: maintains backward compatibility for all consumers
export {
  initStatStages,
  getActivePokemon,
  getActivePokemonBySlot,
  getActiveDoublesSlots,
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
  SPREAD_MOVES,
  ALLY_TARGET_MOVES,
  SPREAD_DAMAGE_MODIFIER,
} from "./battleReducer";
