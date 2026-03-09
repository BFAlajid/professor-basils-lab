"use client";

import { motion } from "framer-motion";

interface TypeQuizResultProps {
  score: number;
  bestScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  mode: "timed" | "practice";
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export default function TypeQuizResult({
  score,
  bestScore,
  questionsAnswered,
  correctAnswers,
  accuracy,
  mode,
  onPlayAgain,
  onBackToMenu,
}: TypeQuizResultProps) {
  return (
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
          {mode === "timed" ? "Time's up!" : "Session ended"}
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
            {score}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] text-[#8b9bb4]">Questions</p>
            <p className="text-sm font-pixel text-[#f0f0e8]">
              {questionsAnswered}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[#8b9bb4]">Correct</p>
            <p className="text-sm font-pixel text-[#38b764]">
              {correctAnswers}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[#8b9bb4]">Accuracy</p>
            <p className="text-sm font-pixel text-[#4a90d9]">
              {accuracy}%
            </p>
          </div>
        </div>

        {score >= bestScore && score > 0 && (
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
            <span className="text-[#f7a838]">{bestScore}</span>
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPlayAgain}
          className="flex-1 px-4 py-2.5 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={onBackToMenu}
          className="flex-1 px-4 py-2.5 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
        >
          Back to Menu
        </button>
      </div>
    </motion.div>
  );
}
