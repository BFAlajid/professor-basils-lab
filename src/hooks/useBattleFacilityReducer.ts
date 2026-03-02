import {
  BattleFacilityState,
  EliteFourMember,
  StatusCondition,
} from "@/types";
import { ELITE_FOUR } from "@/data/eliteFour";
import { GYM_LEADERS, GYM_BADGE_NAMES } from "@/data/gymLeaders";

// ── Action types ──────────────────────────────────────────────────────

export type FacilityAction =
  | { type: "START_ELITE_FOUR" }
  | { type: "START_BATTLE_TOWER" }
  | { type: "START_GYM_CHALLENGE" }
  | { type: "EARN_BADGE"; badge: string }
  | { type: "SET_OPPONENTS"; opponents: EliteFourMember[] }
  | { type: "BEGIN_BATTLE" }
  | { type: "BATTLE_WON"; hpPercents: number[]; statuses: StatusCondition[] }
  | { type: "BATTLE_LOST" }
  | { type: "NEXT_BATTLE" }
  | { type: "HEAL_TEAM" }
  | { type: "LOAD_BEST_STREAK"; streak: number }
  | { type: "LOAD_BADGES"; badges: string[] }
  | { type: "RESET" };

// ── Initial state ─────────────────────────────────────────────────────

export const initialFacilityState: BattleFacilityState = {
  mode: "elite_four",
  phase: "lobby",
  currentOpponentIndex: 0,
  totalOpponents: 5,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  teamHpPercents: [],
  teamStatuses: [],
  opponents: [],
  badges: [],
};

// ── Reducer ───────────────────────────────────────────────────────────

export function facilityReducer(
  state: BattleFacilityState,
  action: FacilityAction
): BattleFacilityState {
  switch (action.type) {
    case "START_ELITE_FOUR":
      return {
        ...initialFacilityState,
        mode: "elite_four",
        phase: "pre_battle",
        totalOpponents: 5,
        opponents: ELITE_FOUR,
      };

    case "START_BATTLE_TOWER":
      return {
        ...initialFacilityState,
        mode: "battle_tower",
        phase: "pre_battle",
        totalOpponents: Infinity,
        bestStreak: state.bestStreak,
        badges: state.badges,
      };

    case "START_GYM_CHALLENGE":
      return {
        ...initialFacilityState,
        mode: "gym_challenge",
        phase: "pre_battle",
        totalOpponents: 8,
        opponents: GYM_LEADERS,
        badges: state.badges,
      };

    case "EARN_BADGE": {
      const newBadges = state.badges ? [...state.badges] : [];
      if (!newBadges.includes(action.badge)) {
        newBadges.push(action.badge);
      }
      return { ...state, badges: newBadges };
    }

    case "LOAD_BADGES":
      return { ...state, badges: action.badges };

    case "SET_OPPONENTS":
      return { ...state, opponents: action.opponents };

    case "BEGIN_BATTLE":
      return { ...state, phase: "battling" };

    case "BATTLE_WON": {
      const newWins = state.wins + 1;
      const newIndex = state.currentOpponentIndex + 1;

      if (state.mode === "gym_challenge") {
        const badgeName = GYM_BADGE_NAMES[state.currentOpponentIndex] ?? "";
        const updatedBadges = state.badges ? [...state.badges] : [];
        if (badgeName && !updatedBadges.includes(badgeName)) {
          updatedBadges.push(badgeName);
        }
        return {
          ...state,
          wins: newWins,
          currentOpponentIndex: newIndex,
          badges: updatedBadges,
          teamHpPercents: action.hpPercents.map(() => 1),
          teamStatuses: action.statuses.map(() => null),
          phase: newWins >= state.totalOpponents ? "victory" : "between_battles",
        };
      }

      if (state.mode === "elite_four") {
        return {
          ...state,
          wins: newWins,
          currentOpponentIndex: newIndex,
          teamHpPercents: action.hpPercents,
          teamStatuses: action.statuses,
          phase: newWins >= state.totalOpponents ? "victory" : "between_battles",
        };
      }

      // battle_tower
      const newStreak = state.streak + 1;
      const newBest = Math.max(state.bestStreak, newStreak);
      return {
        ...state,
        wins: newWins,
        currentOpponentIndex: newIndex,
        streak: newStreak,
        bestStreak: newBest,
        teamHpPercents: action.hpPercents,
        teamStatuses: action.statuses,
        phase: "between_battles",
      };
    }

    case "BATTLE_LOST":
      return { ...state, phase: "defeat" };

    case "NEXT_BATTLE":
      return { ...state, phase: "pre_battle" };

    case "HEAL_TEAM":
      return {
        ...state,
        teamHpPercents: state.teamHpPercents.map(() => 1),
        teamStatuses: state.teamStatuses.map(() => null),
      };

    case "LOAD_BEST_STREAK":
      return { ...state, bestStreak: action.streak };

    case "RESET":
      return { ...initialFacilityState, bestStreak: state.bestStreak, badges: state.badges };

    default:
      return state;
  }
}
