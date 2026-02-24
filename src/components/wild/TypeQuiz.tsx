"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTypeQuiz } from "@/hooks/useTypeQuiz";
import { typeColors } from "@/data/typeColors";
import { TypeName } from "@/types";

const ANSWER_CHOICES = [
  "Super Effective",
  "Not Very Effective",
  "Neutral",
  "No Effect",
] as const;

function TypeBadge({ typeName }: { typeName: string }) {
  const color = typeColors[typeName as TypeName] ?? "#888";
  return (
    <span
      className="inline-block px-3 py-1 rounded text-xs font-pixel capitalize font-bold"
      style={{
        backgroundColor: color,
        color: "#fff",
        textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
      }}
    >
      {typeName}
    </span>
  );
}

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
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* HUD bar */}
            <div className="flex items-center justify-between text-[10px] font-pixel">
              <span className="text-[#f0f0e8]">
                Score: <span className="text-[#f7a838]">{state.score}</span>
              </span>
              {state.streak > 1 && (
                <motion.span
                  key={state.streak}
                  initial={{ scale: 1.4, color: "#f7a838" }}
                  animate={{ scale: 1, color: "#38b764" }}
                  className="text-[#38b764]"
                >
                  {state.streak}x Streak
                </motion.span>
              )}
              {state.mode === "timed" ? (
                <span
                  className={`${
                    state.timeLeft <= 10
                      ? "text-[#e8433f]"
                      : "text-[#8b9bb4]"
                  }`}
                >
                  {state.timeLeft}s
                </span>
              ) : (
                <button
                  onClick={endQuiz}
                  className="text-[9px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
                >
                  End Quiz
                </button>
              )}
            </div>

            {/* Timer bar (timed mode) */}
            {state.mode === "timed" && (
              <div className="w-full h-1.5 bg-[#1a1c2c] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor:
                      state.timeLeft <= 10 ? "#e8433f" : "#38b764",
                  }}
                  initial={false}
                  animate={{ width: `${(state.timeLeft / 60) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Question */}
            <div className="bg-[#1a1c2c] rounded-lg p-4 border border-[#3a4466]">
              <p className="text-[10px] text-[#8b9bb4] font-pixel text-center mb-3">
                What is the effectiveness of...
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <TypeBadge typeName={state.attackType} />
                <span className="text-[10px] text-[#8b9bb4] font-pixel">
                  vs
                </span>
                {state.defenderTypes.map((dt, i) => (
                  <span key={dt + i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-[10px] text-[#8b9bb4] font-pixel">
                        /
                      </span>
                    )}
                    <TypeBadge typeName={dt} />
                  </span>
                ))}
              </div>
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-2">
              {ANSWER_CHOICES.map((choice) => {
                const answered = state.lastAnswerCorrect !== null;
                const isCorrect = choice === state.correctAnswer;
                const wasChosen =
                  answered && !isCorrect && state.lastAnswerCorrect === false;

                let bgColor = "#3a4466";
                let hoverBg = "#4a5577";

                if (answered) {
                  if (isCorrect) {
                    bgColor = "#38b764";
                    hoverBg = "#38b764";
                  } else if (wasChosen) {
                    bgColor = "#e8433f";
                    hoverBg = "#e8433f";
                  }
                }

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleAnswer(choice)}
                    disabled={answered}
                    className="px-3 py-2.5 text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors disabled:cursor-default"
                    style={{
                      backgroundColor: bgColor,
                    }}
                    whileHover={!answered ? { backgroundColor: hoverBg } : {}}
                    whileTap={!answered ? { scale: 0.95 } : {}}
                    animate={
                      answered && isCorrect
                        ? {
                            backgroundColor: [
                              "#38b764",
                              "#45c972",
                              "#38b764",
                            ],
                          }
                        : {}
                    }
                    transition={
                      answered && isCorrect
                        ? { duration: 0.4, repeat: 1 }
                        : {}
                    }
                  >
                    {choice}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback + Next (practice mode) */}
            {state.mode === "practice" && state.lastAnswerCorrect !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p
                  className={`text-center text-xs font-pixel ${
                    state.lastAnswerCorrect
                      ? "text-[#38b764]"
                      : "text-[#e8433f]"
                  }`}
                >
                  {state.lastAnswerCorrect
                    ? "Correct!"
                    : `Wrong! It's "${state.correctAnswer}"`}
                </p>
                <button
                  onClick={nextQuestion}
                  className="w-full px-4 py-2 bg-[#4a90d9] hover:bg-[#5a9ee5] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Next Question
                </button>
              </motion.div>
            )}

            {/* Stats row */}
            <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] px-1">
              <span>
                Answered: {state.questionsAnswered}
              </span>
              <span>
                Accuracy: {accuracy}%
              </span>
            </div>
          </motion.div>
        )}

        {/* ── RESULT ────────────────────────────────────────────── */}
        {state.phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1">
              <h3 className="text-base font-pixel text-[#f7a838]">
                Quiz Complete!
              </h3>
              <p className="text-[10px] text-[#8b9bb4]">
                {state.mode === "timed" ? "Time's up!" : "Session ended"}
              </p>
            </div>

            {/* Score display */}
            <div className="bg-[#1a1c2c] rounded-lg p-4 border border-[#3a4466] space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-center"
              >
                <p className="text-[10px] text-[#8b9bb4] font-pixel">
                  Final Score
                </p>
                <p className="text-2xl font-pixel text-[#f7a838]">
                  {state.score}
                </p>
              </motion.div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-[#8b9bb4]">Questions</p>
                  <p className="text-sm font-pixel text-[#f0f0e8]">
                    {state.questionsAnswered}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[#8b9bb4]">Correct</p>
                  <p className="text-sm font-pixel text-[#38b764]">
                    {state.correctAnswers}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[#8b9bb4]">Accuracy</p>
                  <p className="text-sm font-pixel text-[#4a90d9]">
                    {accuracy}%
                  </p>
                </div>
              </div>

              {state.score >= state.bestScore && state.score > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[10px] font-pixel text-[#f7a838]"
                >
                  New Best Score!
                </motion.p>
              )}

              <div className="text-center">
                <span className="text-[10px] text-[#8b9bb4] font-pixel">
                  Best Score:{" "}
                  <span className="text-[#f7a838]">{state.bestScore}</span>
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  startQuiz(state.mode)
                }
                className="flex-1 px-4 py-2.5 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={resetQuiz}
                className="flex-1 px-4 py-2.5 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
