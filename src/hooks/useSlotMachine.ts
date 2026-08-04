"use client";
import { useReducer, useEffect, useRef } from "react";
import { SLOT_SYMBOLS, calculatePayout } from "@/data/slotSymbols";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/utils/persistence";

export interface SlotMachineState {
  reels: [number, number, number];
  spinning: boolean;
  coins: number;
  bet: number;
  lastWin: number;
}

type SlotAction =
  | { type: "SPIN" }
  | { type: "STOP"; reels: [number, number, number] }
  | { type: "SET_BET"; bet: number }
  | { type: "ADD_COINS"; amount: number }
  | { type: "LOAD"; coins: number };

function initialState(): SlotMachineState {
  return { reels: [0, 0, 0], spinning: false, coins: 100, bet: 1, lastWin: 0 };
}

function reducer(state: SlotMachineState, action: SlotAction): SlotMachineState {
  switch (action.type) {
    case "SPIN": {
      if (state.spinning || state.coins < state.bet) return state;
      return {
        ...state,
        spinning: true,
        coins: state.coins - state.bet,
        lastWin: 0,
      };
    }
    case "STOP": {
      const payout = calculatePayout(action.reels, state.bet);
      return {
        ...state,
        reels: action.reels,
        spinning: false,
        coins: state.coins + payout,
        lastWin: payout,
      };
    }
    case "SET_BET":
      return { ...state, bet: Math.max(1, Math.min(10, action.bet)) };
    case "ADD_COINS":
      return { ...state, coins: state.coins + action.amount };
    case "LOAD":
      return { ...state, coins: action.coins };
    default:
      return state;
  }
}

function randomReel(): number {
  return Math.floor(Math.random() * SLOT_SYMBOLS.length);
}

export function useSlotMachine() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const initialized = useRef(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const coins = readStorage(STORAGE_KEYS.slotCoins, 0);
    if (coins > 0) dispatch({ type: "LOAD", coins });
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    writeStorage(STORAGE_KEYS.slotCoins, state.coins);
  }, [state.coins]);

  // Clean up spin timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const spin = () => {
    if (state.spinning || state.coins < state.bet) return;
    dispatch({ type: "SPIN" });
    spinTimerRef.current = setTimeout(() => {
      spinTimerRef.current = null;
      const reels: [number, number, number] = [randomReel(), randomReel(), randomReel()];
      dispatch({ type: "STOP", reels });
    }, 1500);
  };

  const setBet = (bet: number) => dispatch({ type: "SET_BET", bet });
  const addCoins = (amount: number) => dispatch({ type: "ADD_COINS", amount });

  return { state, spin, setBet, addCoins };
}
