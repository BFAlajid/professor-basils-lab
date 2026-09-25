"use client";

import { AnimatePresence, motion } from "framer-motion";
import PokeImage from "@/components/PokeImage";
import TypeBadge from "@/components/TypeBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatName, capitalize } from "@/utils/format";
import { useDamageQuiz } from "@/hooks/useDamageQuiz";
import type { QuizMonSpec, DamageQuizQuestion } from "@/types/damageQuiz";
import type { TeamSlot } from "@/types";

interface DamageQuizProps {
  team?: TeamSlot[];
}

const cardCls = "rounded-xl border border-[#3a4466] bg-[#262b44] p-4 sm:p-6";

function fieldSummary(field: DamageQuizQuestion["field"]): string[] {
  const notes: string[] = [];
  if (field.weather) notes.push(capitalize(field.weather));
  if (field.terrain) notes.push(`${capitalize(field.terrain)} Terrain`);
  if (field.player2Side.reflect > 0) notes.push("Reflect");
  if (field.player2Side.lightScreen > 0) notes.push("Light Screen");
  return notes;
}

function MonSummary({ spec, label }: { spec: QuizMonSpec; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 text-center">
      <span className="text-[10px] uppercase tracking-wide text-[#8b9bb4]">{label}</span>
      {spec.pokemon.sprites.front_default && (
        <PokeImage
          src={spec.pokemon.sprites.front_default}
          alt={spec.pokemon.name}
          width={64}
          height={64}
          unoptimized
        />
      )}
      <p className="capitalize font-semibold text-[#f0f0e8]">{formatName(spec.pokemon.name)}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {spec.pokemon.types.map((t) => (
          <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
        ))}
      </div>
      <div className="space-y-0.5 text-[10px] text-[#8b9bb4]">
        <p>Lv. {spec.level}{spec.nature ? ` · ${capitalize(spec.nature.name)}` : ""}</p>
        {spec.ability && <p>{formatName(spec.ability)}</p>}
        {spec.item && <p>{formatName(spec.item)}</p>}
        <p>{spec.maxHp} HP</p>
      </div>
    </div>
  );
}

function RangeBar({ min, max }: { min: number; max: number }) {
  const left = Math.min(min, max);
  const width = Math.max(1, Math.abs(max - min));
  return (
    <div
      className="relative h-4 w-full overflow-hidden rounded-full border border-[#3a4466] bg-[#1a1c2c]"
      role="img"
      aria-label={`Damage range ${min} to ${max} percent of max HP`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-[#e8433f]"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
    </div>
  );
}

export default function DamageQuiz({ team }: DamageQuizProps) {
  const { state, answer, next, retry } = useDamageQuiz(team);
  const { status, question, score, streak, bestStreak, answered, guessIndex, correct, error } = state;

  return (
    <div className={cardCls}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold font-pixel">Guess the Damage</h3>
        <div className="flex items-center gap-4 text-xs text-[#8b9bb4]">
          <span>
            Score <span className="font-bold text-[#f0f0e8]">{score}</span>
          </span>
          <span>
            Streak <span className="font-bold text-[#f7a838]">{streak}</span>
          </span>
          <span>
            Best <span className="font-bold text-[#38b764]">{bestStreak}</span>
          </span>
        </div>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <LoadingSpinner size={28} />
          <p className="text-sm text-[#8b9bb4]">Building a question...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-[#e8433f]">{error ?? "Something went wrong."}</p>
          <button
            onClick={retry}
            className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-4 py-2 text-xs font-pixel transition-colors hover:border-[#e8433f]"
          >
            Retry
          </button>
        </div>
      )}

      {(status === "ready") && question && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MonSummary spec={question.attacker} label="Attacker" />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-[#8b9bb4]">{"→"}</span>
              <div className="flex items-center gap-1.5 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-2 py-1">
                <TypeBadge type={question.move.type.name} size="sm" />
                <span className="text-xs font-semibold capitalize">{formatName(question.move.name)}</span>
              </div>
              <span className="text-[10px] text-[#8b9bb4]">Power {question.move.power ?? "—"}</span>
            </div>
            <MonSummary spec={question.defender} label="Defender" />
          </div>

          {fieldSummary(question.field).length > 0 && (
            <p className="text-center text-[10px] text-[#8b9bb4]">
              Field: {fieldSummary(question.field).join(", ")}
            </p>
          )}

          <p className="text-center text-sm text-[#f0f0e8]">
            What % of {formatName(question.defender.pokemon.name)}&apos;s HP does this do?
          </p>

          <div className="grid grid-cols-2 gap-2">
            {question.buckets.map((bucket, idx) => {
              const isChosen = guessIndex === idx;
              const isCorrectBucket = idx === question.correctIndex;
              let stateCls = "border-[#3a4466] bg-[#1a1c2c] hover:border-[#e8433f]";
              if (answered) {
                if (isCorrectBucket) {
                  stateCls = "border-[#38b764] bg-[#38b764]/20 text-[#38b764]";
                } else if (isChosen) {
                  stateCls = "border-[#e8433f] bg-[#e8433f]/20 text-[#e8433f]";
                } else {
                  stateCls = "border-[#3a4466] bg-[#1a1c2c] opacity-60";
                }
              }
              return (
                <button
                  key={bucket}
                  onClick={() => answer(idx)}
                  disabled={answered}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${stateCls} disabled:cursor-not-allowed`}
                  aria-pressed={isChosen}
                >
                  {bucket}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
                  <p className={`text-sm font-semibold ${correct ? "text-[#38b764]" : "text-[#e8433f]"}`}>
                    {correct ? "Correct!" : "Not quite."}
                  </p>
                  <RangeBar min={question.actualPercent[0]} max={question.actualPercent[1]} />
                  <p className="text-xs text-[#8b9bb4]">
                    Real roll:{" "}
                    <span className="font-bold text-[#f0f0e8]">
                      {question.actualPercent[0]}-{question.actualPercent[1]}%
                    </span>
                  </p>
                  <button
                    onClick={next}
                    className="w-full rounded-lg border border-[#3a4466] bg-[#262b44] px-4 py-2 text-xs font-pixel transition-colors hover:border-[#e8433f]"
                  >
                    Next Question
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
