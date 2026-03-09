"use client";

import { motion, AnimatePresence } from "framer-motion";
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

interface TypeQuizQuestionProps {
  score: number;
  streak: number;
  mode: "timed" | "practice";
  timeLeft: number;
  attackType: string;
  defenderTypes: string[];
  correctAnswer: string;
  lastAnswerCorrect: boolean | null;
  questionsAnswered: number;
  accuracy: number;
  onAnswer: (choice: string) => void;
  onNextQuestion: () => void;
  onEndQuiz: () => void;
}

export default function TypeQuizQuestion({
  score,
  streak,
  mode,
  timeLeft,
  attackType,
  defenderTypes,
  correctAnswer,
  lastAnswerCorrect,
  questionsAnswered,
  accuracy,
  onAnswer,
  onNextQuestion,
  onEndQuiz,
}: TypeQuizQuestionProps) {
  return (
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
          Score: <span className="text-[#f7a838]">{score}</span>
        </span>
        {streak > 1 && (
          <motion.span
            key={streak}
            initial={{ scale: 1.4, color: "#f7a838" }}
            animate={{ scale: 1, color: "#38b764" }}
            className="text-[#38b764]"
          >
            {streak}x Streak
          </motion.span>
        )}
        {mode === "timed" ? (
          <span
            className={`${
              timeLeft <= 10
                ? "text-[#e8433f]"
                : "text-[#8b9bb4]"
            }`}
          >
            {timeLeft}s
          </span>
        ) : (
          <button
            onClick={onEndQuiz}
            className="text-[9px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            End Quiz
          </button>
        )}
      </div>

      {/* Timer bar (timed mode) */}
      {mode === "timed" && (
        <div className="w-full h-1.5 bg-[#1a1c2c] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor:
                timeLeft <= 10 ? "#e8433f" : "#38b764",
            }}
            initial={false}
            animate={{ width: `${(timeLeft / 60) * 100}%` }}
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
          <TypeBadge typeName={attackType} />
          <span className="text-[10px] text-[#8b9bb4] font-pixel">
            vs
          </span>
          {defenderTypes.map((dt, i) => (
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
          const answered = lastAnswerCorrect !== null;
          const isCorrect = choice === correctAnswer;
          const wasChosen =
            answered && !isCorrect && lastAnswerCorrect === false;

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
              onClick={() => onAnswer(choice)}
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
      {mode === "practice" && lastAnswerCorrect !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p
            className={`text-center text-xs font-pixel ${
              lastAnswerCorrect
                ? "text-[#38b764]"
                : "text-[#e8433f]"
            }`}
          >
            {lastAnswerCorrect
              ? "Correct!"
              : `Wrong! It's "${correctAnswer}"`}
          </p>
          <button
            onClick={onNextQuestion}
            className="w-full px-4 py-2 bg-[#4a90d9] hover:bg-[#5a9ee5] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
          >
            Next Question
          </button>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-[9px] text-[#8b9bb4] px-1">
        <span>
          Answered: {questionsAnswered}
        </span>
        <span>
          Accuracy: {accuracy}%
        </span>
      </div>
    </motion.div>
  );
}
