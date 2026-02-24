"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────

export interface VoltorbFlipState {
  board: number[][];       // 5x5, values 0/1/2/3
  revealed: boolean[][];   // 5x5
  level: number;           // 1-7
  currentCoins: number;    // coins earned this round (product of flipped multipliers)
  totalCoins: number;      // bank
  phase: "playing" | "game_over" | "level_clear";
  rowHints: { total: number; voltorbs: number }[];
  colHints: { total: number; voltorbs: number }[];
}

type VoltorbFlipAction =
  | { type: "FLIP_TILE"; row: number; col: number }
  | { type: "NEW_GAME"; level?: number }
  | { type: "ADVANCE_LEVEL" }
  | { type: "SPEND_COINS"; amount: number }
  | { type: "LOAD"; totalCoins: number };

// ── Level definitions ────────────────────────────────────────────────────
// Each level: [voltorbs, twos, threes]

const LEVEL_DEFS: Record<number, [number, number, number]> = {
  1: [3, 3, 1],
  2: [4, 4, 1],
  3: [5, 4, 2],
  4: [6, 5, 2],
  5: [7, 5, 3],
  6: [8, 5, 3],
  7: [9, 4, 4],
};

// ── Board generation ─────────────────────────────────────────────────────

function generateBoard(level: number): number[][] {
  const [voltorbs, twos, threes] = LEVEL_DEFS[level] ?? LEVEL_DEFS[1];
  const totalCells = 25;
  const ones = totalCells - voltorbs - twos - threes;

  const flat: number[] = [
    ...Array(voltorbs).fill(0),
    ...Array(ones).fill(1),
    ...Array(twos).fill(2),
    ...Array(threes).fill(3),
  ];

  // Fisher-Yates shuffle
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }

  // Convert to 5x5 grid
  const board: number[][] = [];
  for (let r = 0; r < 5; r++) {
    board.push(flat.slice(r * 5, r * 5 + 5));
  }
  return board;
}

// ── Hint computation ─────────────────────────────────────────────────────

function computeRowHints(board: number[][]): { total: number; voltorbs: number }[] {
  return board.map((row) => ({
    total: row.reduce((sum, v) => sum + v, 0),
    voltorbs: row.filter((v) => v === 0).length,
  }));
}

function computeColHints(board: number[][]): { total: number; voltorbs: number }[] {
  const hints: { total: number; voltorbs: number }[] = [];
  for (let c = 0; c < 5; c++) {
    let total = 0;
    let voltorbs = 0;
    for (let r = 0; r < 5; r++) {
      total += board[r][c];
      if (board[r][c] === 0) voltorbs++;
    }
    hints.push({ total, voltorbs });
  }
  return hints;
}

// ── Initial state factory ────────────────────────────────────────────────

function createInitialState(level: number = 1, totalCoins: number = 0): VoltorbFlipState {
  const board = generateBoard(level);
  return {
    board,
    revealed: Array.from({ length: 5 }, () => Array(5).fill(false)),
    level,
    currentCoins: 0,
    totalCoins,
    phase: "playing",
    rowHints: computeRowHints(board),
    colHints: computeColHints(board),
  };
}

// ── Check if all multipliers have been revealed ──────────────────────────

function checkLevelClear(board: number[][], revealed: boolean[][]): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if ((board[r][c] === 2 || board[r][c] === 3) && !revealed[r][c]) {
        return false;
      }
    }
  }
  return true;
}

// ── Reducer ──────────────────────────────────────────────────────────────

function voltorbFlipReducer(
  state: VoltorbFlipState,
  action: VoltorbFlipAction
): VoltorbFlipState {
  switch (action.type) {
    case "FLIP_TILE": {
      if (state.phase !== "playing") return state;

      const { row, col } = action;
      if (row < 0 || row >= 5 || col < 0 || col >= 5) return state;
      if (state.revealed[row][col]) return state;

      const value = state.board[row][col];
      const newRevealed = state.revealed.map((r, ri) =>
        r.map((c, ci) => (ri === row && ci === col ? true : c))
      );

      // Hit a Voltorb
      if (value === 0) {
        // Reveal entire board on game over
        const allRevealed = state.board.map((r) => r.map(() => true));
        // Drop level: lose 1 level (min 1)
        const newLevel = Math.max(1, state.level - 1);
        return {
          ...state,
          revealed: allRevealed,
          phase: "game_over",
          currentCoins: 0,
        };
      }

      // Compute new coin total
      let newCoins = state.currentCoins;
      if (value >= 2) {
        // Multiplier tile: multiply into running product
        newCoins = newCoins === 0 ? value : newCoins * value;
      }
      // value === 1: doesn't change the product (but needs to start at 0 still)

      // Check for level clear
      const cleared = checkLevelClear(state.board, newRevealed);
      if (cleared) {
        // Ensure minimum 1 coin reward when clearing
        const earnedCoins = newCoins === 0 ? 1 : newCoins;
        return {
          ...state,
          revealed: newRevealed,
          currentCoins: earnedCoins,
          totalCoins: state.totalCoins + earnedCoins,
          phase: "level_clear",
        };
      }

      return {
        ...state,
        revealed: newRevealed,
        currentCoins: newCoins,
      };
    }

    case "NEW_GAME": {
      const level = action.level ?? Math.max(1, state.level - 1);
      return createInitialState(level, state.totalCoins);
    }

    case "ADVANCE_LEVEL": {
      const nextLevel = Math.min(7, state.level + 1);
      return createInitialState(nextLevel, state.totalCoins);
    }

    case "SPEND_COINS": {
      if (action.amount <= 0 || action.amount > state.totalCoins) return state;
      return {
        ...state,
        totalCoins: state.totalCoins - action.amount,
      };
    }

    case "LOAD": {
      return {
        ...state,
        totalCoins: action.totalCoins,
      };
    }

    default:
      return state;
  }
}

// ── LocalStorage key ─────────────────────────────────────────────────────

const COINS_KEY = "pokemon-game-corner-coins";

// ── Hook ─────────────────────────────────────────────────────────────────

export function useVoltorbFlip() {
  const [state, dispatch] = useReducer(voltorbFlipReducer, createInitialState(1, 0));
  const initialized = useRef(false);

  // Load persisted coins on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const saved = localStorage.getItem(COINS_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          dispatch({ type: "LOAD", totalCoins: parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist totalCoins whenever it changes
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(COINS_KEY, String(state.totalCoins));
    } catch {
      // ignore
    }
  }, [state.totalCoins]);

  const flipTile = useCallback((row: number, col: number) => {
    dispatch({ type: "FLIP_TILE", row, col });
  }, []);

  const newGame = useCallback(() => {
    dispatch({ type: "NEW_GAME" });
  }, []);

  const advanceLevel = useCallback(() => {
    dispatch({ type: "ADVANCE_LEVEL" });
  }, []);

  const spendCoins = useCallback((amount: number) => {
    dispatch({ type: "SPEND_COINS", amount });
  }, []);

  return {
    state,
    flipTile,
    newGame,
    advanceLevel,
    spendCoins,
  };
}
