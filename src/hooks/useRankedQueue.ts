"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface QueueEntry {
  playerId: string;
  displayName: string;
  elo: number;
  format: string;
  joinedAt: number;
}

interface MatchResult {
  opponentId: string;
  opponentName: string;
  roomCode: string;
  battleId: string;
}

type QueuePhase = "idle" | "searching" | "matched";

export function useRankedQueue() {
  const { user, player } = useAuth();
  const [phase, setPhase] = useState<QueuePhase>("idle");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [eloRange, setEloRange] = useState(200);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (channelRef.current) {
      getSupabase()?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    matchedRef.current = false;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const joinQueue = useCallback(
    (format = "OU") => {
      if (!user || !player || phase !== "idle") return;

      setPhase("searching");
      setSearchTime(0);
      setEloRange(200);
      matchedRef.current = false;

      const channel = getSupabase()!.channel("ranked:queue", {
        config: { broadcast: { self: false } },
      });

      channelRef.current = channel;

      const myEntry: QueueEntry = {
        playerId: user.id,
        displayName: player.display_name,
        elo: player.season_elo,
        format,
        joinedAt: Date.now(),
      };

      channel.on("broadcast", { event: "queue_join" }, ({ payload }) => {
        if (matchedRef.current) return;
        const entry = payload as QueueEntry;
        if (entry.playerId === user.id) return;
        if (entry.format !== format) return;

        const eloDiff = Math.abs(entry.elo - myEntry.elo);
        if (eloDiff > eloRange) return;

        // Match found — host is the player with higher ID (deterministic)
        matchedRef.current = true;
        const isHost = user.id > entry.playerId;
        const roomCode = `RANKED-${[user.id.slice(0, 4), entry.playerId.slice(0, 4)].sort().join("-")}`;
        const battleId = `${Date.now()}-${roomCode}`;

        // Notify opponent
        channel.send({
          type: "broadcast",
          event: "queue_match",
          payload: {
            targetId: entry.playerId,
            fromId: user.id,
            fromName: player.display_name,
            roomCode,
            battleId,
          },
        });

        setMatch({
          opponentId: entry.playerId,
          opponentName: entry.displayName,
          roomCode: isHost ? roomCode : roomCode,
          battleId,
        });
        setPhase("matched");
      });

      channel.on("broadcast", { event: "queue_match" }, ({ payload }) => {
        if (matchedRef.current) return;
        const { targetId, fromId, fromName, roomCode, battleId } = payload as {
          targetId: string;
          fromId: string;
          fromName: string;
          roomCode: string;
          battleId: string;
        };
        if (targetId !== user.id) return;

        matchedRef.current = true;
        setMatch({
          opponentId: fromId,
          opponentName: fromName,
          roomCode,
          battleId,
        });
        setPhase("matched");
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Broadcast our entry
          channel.send({
            type: "broadcast",
            event: "queue_join",
            payload: myEntry,
          });

          // Re-broadcast periodically so new joiners see us
          timerRef.current = setInterval(() => {
            if (matchedRef.current) return;
            setSearchTime((t) => t + 5);
            // Expand ELO range over time
            setEloRange((r) => Math.min(r + 50, 800));
            channel.send({
              type: "broadcast",
              event: "queue_join",
              payload: { ...myEntry, joinedAt: Date.now() },
            });
          }, 5000);
        }
      });
    },
    [user, player, phase, eloRange, cleanup]
  );

  const leaveQueue = useCallback(() => {
    cleanup();
    setPhase("idle");
    setMatch(null);
    setSearchTime(0);
    setEloRange(200);
  }, [cleanup]);

  const reportResult = useCallback(
    async (won: boolean) => {
      if (!match || !user) return null;

      const sb = getSupabase();
      if (!sb) return null;
      const session = await sb.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return null;

      const res = await fetch("/api/ranked/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          battleId: match.battleId,
          opponentId: match.opponentId,
          won,
          format: "OU",
        }),
      });

      const data = await res.json();
      return data;
    },
    [match, user]
  );

  return {
    phase,
    match,
    searchTime,
    eloRange,
    joinQueue,
    leaveQueue,
    reportResult,
  };
}
