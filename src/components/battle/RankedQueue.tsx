"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useRankedQueue } from "@/hooks/useRankedQueue";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentTier } from "@/data/eloTiers";

interface RankedQueueProps {
  onMatchFound: (roomCode: string, battleId: string, opponentId: string) => void;
  onCancel: () => void;
}

export default function RankedQueue({ onMatchFound, onCancel }: RankedQueueProps) {
  const { player } = useAuth();
  const { phase, match, searchTime, eloRange, joinQueue, leaveQueue } =
    useRankedQueue();

  const handleJoin = useCallback(() => {
    joinQueue("OU");
  }, [joinQueue]);

  const handleCancel = useCallback(() => {
    leaveQueue();
    onCancel();
  }, [leaveQueue, onCancel]);

  // When matched, notify parent
  if (phase === "matched" && match) {
    onMatchFound(match.roomCode, match.battleId, match.opponentId);
  }

  if (!player) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center">
        <p className="text-[10px] font-pixel text-[#8b9bb4]">
          Sign in to play ranked battles
        </p>
      </div>
    );
  }

  const tier = getCurrentTier(player.season_elo);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider text-center">
        Ranked Battle
      </h3>

      {/* Player Info */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-xl" style={{ color: tier.color }}>
          {tier.icon}
        </span>
        <div>
          <p className="text-xs font-pixel text-[#f0f0e8]">
            {player.display_name}
          </p>
          <p className="text-[10px] font-pixel" style={{ color: tier.color }}>
            {tier.name} - {player.season_elo} ELO
          </p>
        </div>
      </div>

      {phase === "idle" && (
        <div className="text-center space-y-3">
          <p className="text-[9px] font-pixel text-[#8b9bb4]">
            Format: OU Singles
          </p>
          <button
            onClick={handleJoin}
            className="rounded-lg bg-[#6390F0] px-6 py-2.5 text-xs font-bold font-pixel text-[#f0f0e8] transition-colors hover:bg-[#4a78d8]"
          >
            Find Match
          </button>
          <button
            onClick={onCancel}
            className="block mx-auto text-[9px] font-pixel text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            Back
          </button>
        </div>
      )}

      {phase === "searching" && (
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block text-2xl"
          >
            *
          </motion.div>
          <p className="text-[10px] font-pixel text-[#f0f0e8]">
            Searching for opponent...
          </p>
          <p className="text-[9px] font-pixel text-[#8b9bb4]">
            Time: {searchTime}s | ELO range: +/-{eloRange}
          </p>
          <button
            onClick={handleCancel}
            className="rounded-lg border border-[#e8433f] px-4 py-2 text-[10px] font-pixel text-[#e8433f] transition-colors hover:bg-[#e8433f]/10"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === "matched" && match && (
        <div className="text-center space-y-2">
          <p className="text-xs font-bold font-pixel text-[#38b764]">
            Match Found!
          </p>
          <p className="text-[10px] font-pixel text-[#f0f0e8]">
            vs {match.opponentName}
          </p>
          <p className="text-[9px] font-pixel text-[#8b9bb4] animate-pulse">
            Connecting...
          </p>
        </div>
      )}
    </div>
  );
}
