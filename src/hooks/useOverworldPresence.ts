"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Direction } from "@/types/explore";

export interface RemotePlayer {
  id: string;
  displayName: string;
  x: number;
  y: number;
  direction: Direction;
  spriteId: number;
  isMoving: boolean;
  lastUpdate: number;
}

interface PresencePayload {
  x: number;
  y: number;
  direction: Direction;
  spriteId: number;
  displayName: string;
  isMoving: boolean;
}

const MAX_VISIBLE_PLAYERS = 20;
const TRACK_DEBOUNCE_MS = 200;

export function useOverworldPresence() {
  const { user, player } = useAuth();
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentMapRef = useRef<string | null>(null);
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (trackTimerRef.current) {
      clearTimeout(trackTimerRef.current);
      trackTimerRef.current = null;
    }
    if (channelRef.current) {
      const sb = getSupabase();
      sb?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRemotePlayers(new Map());
    currentMapRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const joinMap = useCallback(
    (mapId: string) => {
      const sb = getSupabase();
      if (!sb || !user || !player) return;
      if (currentMapRef.current === mapId) return;

      cleanup();
      currentMapRef.current = mapId;

      const channel = sb.channel(`overworld:${mapId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresencePayload>();
          const players = new Map<string, RemotePlayer>();

          for (const [userId, presences] of Object.entries(state)) {
            if (userId === user.id) continue;
            const p = presences[0] as PresencePayload | undefined;
            if (!p) continue;
            players.set(userId, {
              id: userId,
              displayName: p.displayName,
              x: p.x,
              y: p.y,
              direction: p.direction,
              spriteId: p.spriteId,
              isMoving: p.isMoving,
              lastUpdate: Date.now(),
            });
          }

          // Cap visible players
          if (players.size > MAX_VISIBLE_PLAYERS) {
            const sorted = [...players.entries()].slice(0, MAX_VISIBLE_PLAYERS);
            setRemotePlayers(new Map(sorted));
          } else {
            setRemotePlayers(players);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              x: 0,
              y: 0,
              direction: "down" as Direction,
              spriteId: player.avatar_sprite,
              displayName: player.display_name,
              isMoving: false,
            });
          }
        });

      channelRef.current = channel;
    },
    [user, player, cleanup]
  );

  const leaveMap = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const updatePosition = useCallback(
    (x: number, y: number, direction: Direction, isMoving: boolean) => {
      if (!channelRef.current || !player) return;

      // Debounce position updates
      if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
      trackTimerRef.current = setTimeout(() => {
        channelRef.current?.track({
          x,
          y,
          direction,
          spriteId: player.avatar_sprite,
          displayName: player.display_name,
          isMoving,
        });
      }, TRACK_DEBOUNCE_MS);
    },
    [player]
  );

  return {
    remotePlayers,
    joinMap,
    leaveMap,
    updatePosition,
  };
}
