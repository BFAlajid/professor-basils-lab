"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import { TYPE_LIST } from "@/data/typeChart";
import { getEffectiveness } from "@/utils/typeChartWasm";

// ── State ───────────────────────────────────────────────────────────────

export interface TypeQuizState {
  phase: "menu" | "playing" | "result";
  mode: "timed" | "practice";
  attackType: string;
  defenderTypes: string[];
  correctAnswer: string;
  score: number;
  streak: number;
  bestScore: number;
  timeLeft: number;
  questionsAnswered: number;
  correctAnswers: number;
  lastAnswerCorrect: boolean | null;
}

// ── Actions ─────────────────────────────────────────────────────────────

type QuizAction =
  | { type: "START"; mode: "timed" | "practice" }
  | { type: "ANSWER"; choice: string }
  | { type: "NEXT_QUESTION" }
  | { type: "TICK" }
  | { type: "END" }
  | { type: "RESET" }
  | { type: "LOAD_BEST"; best: number };

// ── Helpers ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "pokemon-type-quiz-best";

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function effectivenessLabel(multiplier: number): string {
  if (multiplier === 0) return "No Effect";
  if (multiplier > 1) return "Super Effective";
  if (multiplier < 1) return "Not Very Effective";
  return "Neutral";
}

function generateQuestion(): {
  attackType: string;
  defenderTypes: string[];
  correctAnswer: string;
} {
  const attackType = randomFrom(TYPE_LIST);

  // 50% chance dual type
  const isDual = Math.random() < 0.5;
  const firstType = randomFrom(TYPE_LIST);
  let defenderTypes: string[];

  if (isDual) {
    // Pick a second type different from the first
    const remaining = TYPE_LIST.filter((t) => t !== firstType);
    const secondType = randomFrom(remaining);
    defenderTypes = [firstType, secondType];
  } else {
    defenderTypes = [firstType];
  }

  // Calculate effectiveness by multiplying for each defender type
  let multiplier = 1;
  for (const defType of defenderTypes) {
    multiplier *= getEffectiveness(
      attackType as Parameters<typeof getEffectiveness>[0],
      defType as Parameters<typeof getEffectiveness>[1]
    );
  }

  const correctAnswer = effectivenessLabel(multiplier);
  return { attackType, defenderTypes, correctAnswer };
}

// ── Initial state ───────────────────────────────────────────────────────

const initialState: TypeQuizState = {
  phase: "menu",
  mode: "timed",
  attackType: "",
  defenderTypes: [],
  correctAnswer: "",
  score: 0,
  streak: 0,
  bestScore: 0,
  timeLeft: 60,
  questionsAnswered: 0,
  correctAnswers: 0,
  lastAnswerCorrect: null,
};

// ── Reducer ─────────────────────────────────────────────────────────────

function quizReducer(state: TypeQuizState, action: QuizAction): TypeQuizState {
  switch (action.type) {
    case "LOAD_BEST":
      return { ...state, bestScore: action.best };

    case "START": {
      const q = generateQuestion();
      return {
        ...state,
        phase: "playing",
        mode: action.mode,
        attackType: q.attackType,
        defenderTypes: q.defenderTypes,
        correctAnswer: q.correctAnswer,
        score: 0,
        streak: 0,
        timeLeft: 60,
        questionsAnswered: 0,
        correctAnswers: 0,
        lastAnswerCorrect: null,
      };
    }

    case "ANSWER": {
      const isCorrect = action.choice === state.correctAnswer;
      const newStreak = isCorrect ? state.streak + 1 : 0;
      // Streak bonus: base 10 + streak multiplier
      const points = isCorrect ? 10 + Math.min(newStreak - 1, 10) * 2 : 0;

      return {
        ...state,
        lastAnswerCorrect: isCorrect,
        score: state.score + points,
        streak: newStreak,
        questionsAnswered: state.questionsAnswered + 1,
        correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
      };
    }

    case "NEXT_QUESTION": {
      const q = generateQuestion();
      return {
        ...state,
        attackType: q.attackType,
        defenderTypes: q.defenderTypes,
        correctAnswer: q.correctAnswer,
        lastAnswerCorrect: null,
      };
    }

    case "TICK": {
      const newTime = state.timeLeft - 1;
      if (newTime <= 0) {
        return { ...state, timeLeft: 0, phase: "result" };
      }
      return { ...state, timeLeft: newTime };
    }

    case "END": {
      const newBest = Math.max(state.bestScore, state.score);
      return {
        ...state,
        phase: "result",
        bestScore: newBest,
      };
    }

    case "RESET":
      return {
        ...initialState,
        bestScore: state.bestScore,
      };

    default:
      return state;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useTypeQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load best score from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const best = parseInt(stored, 10);
        if (!isNaN(best)) dispatch({ type: "LOAD_BEST", best });
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Persist best score whenever it changes
  useEffect(() => {
    if (state.bestScore > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, String(state.bestScore));
      } catch {
        // localStorage unavailable
      }
    }
  }, [state.bestScore]);

  // Timer for timed mode
  useEffect(() => {
    if (state.phase === "playing" && state.mode === "timed") {
      timerRef.current = setInterval(() => {
        dispatch({ type: "TICK" });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.mode]);

  // When timer ends in timed mode, persist best
  useEffect(() => {
    if (state.phase === "result" && state.score > 0) {
      const newBest = Math.max(state.bestScore, state.score);
      if (newBest > state.bestScore) {
        dispatch({ type: "END" });
      }
    }
  }, [state.phase, state.score, state.bestScore]);

  const startQuiz = useCallback((mode: "timed" | "practice") => {
    dispatch({ type: "START", mode });
  }, []);

  const answer = useCallback(
    (choice: string) => {
      if (state.lastAnswerCorrect !== null) return; // Already answered
      dispatch({ type: "ANSWER", choice });

      // In timed mode, auto-advance after brief delay
      if (state.mode === "timed") {
        setTimeout(() => {
          dispatch({ type: "NEXT_QUESTION" });
        }, 400);
      }
    },
    [state.lastAnswerCorrect, state.mode]
  );

  const nextQuestion = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION" });
  }, []);

  const endQuiz = useCallback(() => {
    dispatch({ type: "END" });
  }, []);

  const resetQuiz = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return { state, startQuiz, answer, nextQuestion, endQuiz, resetQuiz };
}
