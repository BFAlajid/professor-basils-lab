"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TeamSlot, GenerationalMechanic } from "@/types";
import {
  ChallengeData,
  encodeChallengeCode,
  decodeChallengeCode,
} from "@/utils/challengeCode";

interface ChallengeCodeProps {
  team: TeamSlot[];
  onAccept: (data: ChallengeData) => void;
}

export default function ChallengeCode({ team, onAccept }: ChallengeCodeProps) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [decoded, setDecoded] = useState<ChallengeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatedCode = encodeChallengeCode({
    team: team.map((s) => ({
      pokemonId: s.pokemon.id,
      moves: s.selectedMoves ?? [],
      nature: s.nature?.name,
      ability: s.ability ?? undefined,
      item: s.heldItem ?? undefined,
    })),
    format: "OU",
    rules: ["Sleep Clause", "Species Clause"],
    mechanic: null,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handlePaste = (value: string) => {
    setCode(value);
    setError(null);
    setDecoded(null);
    if (!value.trim()) return;
    const result = decodeChallengeCode(value.trim());
    if (result) {
      setDecoded(result);
    } else {
      setError("Invalid challenge code");
    }
  };

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-lg font-bold font-pixel text-[#f0f0e8]">
        Challenge Code
      </h3>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
              setDecoded(null);
            }}
            aria-label={`${m === "create" ? "Create" : "Join"} challenge`}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-pixel transition-colors ${
              mode === m
                ? "bg-[#e8433f] text-[#f0f0e8]"
                : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5577]"
            }`}
          >
            {m === "create" ? "Create" : "Join"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === "create" ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {team.length === 0 ? (
              <p className="text-sm text-[#8b9bb4]">
                Add Pokemon to your team to create a challenge.
              </p>
            ) : (
              <>
                <p className="text-xs text-[#8b9bb4] mb-2">
                  Share this code with your opponent:
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedCode}
                    rows={3}
                    aria-label="Challenge code"
                    className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3 text-xs text-[#f0f0e8] font-mono resize-none focus:outline-none focus:border-[#e8433f]"
                  />
                  <button
                    onClick={handleCopy}
                    aria-label="Copy challenge code"
                    className="absolute top-2 right-2 rounded bg-[#3a4466] px-2 py-1 text-[10px] font-pixel text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-[#8b9bb4]">
                    Team: {team.map((s) => s.pokemon.name).join(", ")}
                  </p>
                  <p className="text-[10px] text-[#8b9bb4]">
                    Format: OU | Rules: Sleep Clause, Species Clause
                  </p>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-[#8b9bb4] mb-2">
              Paste a challenge code to preview:
            </p>
            <textarea
              value={code}
              onChange={(e) => handlePaste(e.target.value)}
              placeholder="Paste challenge code here..."
              rows={3}
              aria-label="Paste challenge code"
              className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3 text-xs text-[#f0f0e8] font-mono resize-none placeholder-[#8b9bb4]/50 focus:outline-none focus:border-[#e8433f]"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-xs text-[#e8433f]"
              >
                {error}
              </motion.p>
            )}

            {decoded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 space-y-3"
              >
                <div className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-3">
                  <h4 className="text-xs font-pixel text-[#f7a838] mb-2">
                    Opponent Team Preview
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {decoded.team.map((member, i) => (
                      <div
                        key={i}
                        className="rounded bg-[#262b44] p-2 text-center"
                      >
                        <p className="text-[10px] font-pixel text-[#f0f0e8]">
                          #{member.pokemonId}
                        </p>
                        <p className="text-[8px] text-[#8b9bb4]">
                          {member.moves.length} moves
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-[#8b9bb4]">
                    <span>Format: {decoded.format}</span>
                    {decoded.mechanic && (
                      <span className="rounded bg-[#3a4466] px-1.5 py-0.5 text-[#f7a838]">
                        {decoded.mechanic}
                      </span>
                    )}
                  </div>
                  {decoded.description && (
                    <p className="mt-1 text-[9px] text-[#8b9bb4]">
                      {decoded.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onAccept(decoded)}
                  aria-label="Accept challenge"
                  className="w-full rounded-lg bg-[#38b764] px-4 py-2.5 text-sm font-pixel text-[#f0f0e8] hover:bg-[#2d9a54] transition-colors"
                >
                  Accept Challenge
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
