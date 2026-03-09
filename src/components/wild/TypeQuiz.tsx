"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTypeQuiz } from "@/hooks/useTypeQuiz";
import TypeQuizQuestion from "./TypeQuizQuestion";
import TypeQuizResult from "./TypeQuizResult";

interface TypeQuizProps {
  onScoreUpdate?: (score: number) => void;
}

export default function TypeQuiz({ onScoreUpdate }: TypeQuizProps = {}) {
  const { state, startQuiz, answer, nextQuestion, endQuiz, resetQuiz } =
    useTypeQuiz();

  const handleAnswer = useCallback(
    (choice: string) => {
      answer(choice);
    },
    [answer]
  );

  // Report score to parent when quiz ends
  useEffect(() => {
    if (state.phase === "result" && onScoreUpdate) {
      onScoreUpdate(state.score);
    }
  }, [state.phase, state.score, onScoreUpdate]);

  const accuracy =
    state.questionsAnswered > 0
      ? Math.round((state.correctAnswers / state.questionsAnswered) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4 space-y-4">
      <AnimatePresence mode="wait">
        {/* ── MENU ──────────────────────────────────────────────── */}
        {state.phase === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1">
              <h3 className="text-base font-pixel text-[#f7a838]">
                Trainer School
              </h3>
              <p className="text-[10px] text-[#8b9bb4]">
                Test your knowledge of type effectiveness!
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => startQuiz("timed")}
                className="px-4 py-3 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors border border-transparent hover:border-[#f7a838]"
              >
                <div>Timed (60s)</div>
                <div className="text-[8px] opacity-70 mt-0.5">
                  Answer fast, score high!
                </div>
              </button>
              <button
                onClick={() => startQuiz("practice")}
                className="px-4 py-3 bg-[#4a90d9] hover:bg-[#5a9ee5] text-[#f0f0e8] text-xs font-pixel rounded-lg transition-colors border border-transparent hover:border-[#f7a838]"
              >
                <div>Practice</div>
                <div className="text-[8px] opacity-70 mt-0.5">
                  Learn at your own pace
                </div>
              </button>
            </div>

            {state.bestScore > 0 && (
              <div className="text-center">
                <span className="text-[10px] text-[#8b9bb4] font-pixel">
                  Best Score:{" "}
                  <span className="text-[#f7a838]">{state.bestScore}</span>
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PLAYING ───────────────────────────────────────────── */}
        {state.phase === "playing" && (
          <TypeQuizQuestion
            score={state.score}
            streak={state.streak}
            mode={state.mode}
            timeLeft={state.timeLeft}
            attackType={state.attackType}
            defenderTypes={state.defenderTypes}
            correctAnswer={state.correctAnswer}
            lastAnswerCorrect={state.lastAnswerCorrect}
            questionsAnswered={state.questionsAnswered}
            accuracy={accuracy}
            onAnswer={handleAnswer}
            onNextQuestion={nextQuestion}
            onEndQuiz={endQuiz}
          />
        )}

        {/* ── RESULT ────────────────────────────────────────────── */}
        {state.phase === "result" && (
          <TypeQuizResult
            score={state.score}
            bestScore={state.bestScore}
            questionsAnswered={state.questionsAnswered}
            correctAnswers={state.correctAnswers}
            accuracy={accuracy}
            mode={state.mode}
            onPlayAgain={() => startQuiz(state.mode)}
            onBackToMenu={resetQuiz}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
