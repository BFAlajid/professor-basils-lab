"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { OnlineState, OnlinePhase, OnlineMessage, TeamSlot, BattleTurnAction } from "@/types";

const initialState: OnlineState = {
  phase: "idle",
  roomCode: null,
  isHost: false,
  opponentTeam: null,
  lastPing: 0,
  error: null,
};

type OnlineAction =
  | { type: "SET_PHASE"; phase: OnlinePhase }
  | { type: "CREATE_LOBBY"; roomCode: string }
  | { type: "JOIN_LOBBY"; roomCode: string }
  | { type: "CONNECTED" }
  | { type: "OPPONENT_TEAM"; team: TeamSlot[] }
  | { type: "PING" }
  | { type: "ERROR"; error: string }
  | { type: "DISCONNECT" }
  | { type: "RESET" };

function onlineReducer(state: OnlineState, action: OnlineAction): OnlineState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase, error: null };
    case "CREATE_LOBBY":
      return { ...state, phase: "waiting", roomCode: action.roomCode, isHost: true, error: null };
    case "JOIN_LOBBY":
      return { ...state, phase: "joining", roomCode: action.roomCode, isHost: false, error: null };
    case "CONNECTED":
      return { ...state, phase: "connected", error: null, lastPing: Date.now() };
    case "OPPONENT_TEAM":
      return { ...state, opponentTeam: action.team, phase: "team_preview" };
    case "PING":
      return { ...state, lastPing: Date.now() };
    case "ERROR":
      return { ...state, error: action.error };
    case "DISCONNECT":
      return { ...state, phase: "disconnected", error: "Connection lost." };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useOnlineBattle() {
  const [state, dispatch] = useReducer(onlineReducer, initialState);
  const peerRef = useRef<import("peerjs").default | null>(null);
  const connRef = useRef<import("peerjs").DataConnection | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionResolverRef = useRef<((action: BattleTurnAction) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const setupConnection = useCallback((conn: import("peerjs").DataConnection) => {
    connRef.current = conn;

    conn.on("open", () => {
      dispatch({ type: "CONNECTED" });
      // Start ping/pong heartbeat
      pingInterval.current = setInterval(() => {
        if (conn.open) {
          conn.send({ type: "PING", payload: null, timestamp: Date.now() } as OnlineMessage);
        }
      }, 5000);
    });

    conn.on("data", (raw) => {
      const msg = raw as OnlineMessage;
      switch (msg.type) {
        case "PING":
          conn.send({ type: "PONG", payload: null, timestamp: Date.now() } as OnlineMessage);
          dispatch({ type: "PING" });
          break;
        case "PONG":
          dispatch({ type: "PING" });
          break;
        case "TEAM_SUBMIT":
          dispatch({ type: "OPPONENT_TEAM", team: msg.payload as TeamSlot[] });
          break;
        case "ACTION":
        case "FORCE_SWITCH_ACTION":
          if (actionResolverRef.current) {
            actionResolverRef.current(msg.payload as BattleTurnAction);
            actionResolverRef.current = null;
          }
          break;
        case "READY":
          dispatch({ type: "SET_PHASE", phase: "battling" });
          break;
        case "DISCONNECT":
          dispatch({ type: "DISCONNECT" });
          break;
      }
    });

    conn.on("close", () => {
      dispatch({ type: "DISCONNECT" });
    });

    conn.on("error", (err) => {
      dispatch({ type: "ERROR", error: err.message });
    });
  }, []);

  const createLobby = useCallback(async () => {
    const { default: Peer } = await import("peerjs");
    const roomCode = generateRoomCode();
    const peerId = `pkmn-battle-${roomCode}`;

    dispatch({ type: "CREATE_LOBBY", roomCode });

    const peer = new Peer(peerId);
    peerRef.current = peer;

    peer.on("open", () => {
      // Waiting for opponent to connect
    });

    peer.on("connection", (conn) => {
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      dispatch({ type: "ERROR", error: err.message });
    });
  }, [setupConnection]);

  const joinLobby = useCallback(async (code: string) => {
    const { default: Peer } = await import("peerjs");
    const roomCode = code.toUpperCase().trim();
    const peerId = `pkmn-battle-${roomCode}-guest-${Math.random().toString(36).slice(2, 6)}`;

    dispatch({ type: "JOIN_LOBBY", roomCode });

    const peer = new Peer(peerId);
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(`pkmn-battle-${roomCode}`, { reliable: true });
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      dispatch({ type: "ERROR", error: err.message });
    });
  }, [setupConnection]);

  const submitTeam = useCallback((team: TeamSlot[]) => {
    if (!connRef.current?.open) return;
    connRef.current.send({
      type: "TEAM_SUBMIT",
      payload: team,
      timestamp: Date.now(),
    } as OnlineMessage);
  }, []);

  const sendReady = useCallback(() => {
    if (!connRef.current?.open) return;
    connRef.current.send({
      type: "READY",
      payload: null,
      timestamp: Date.now(),
    } as OnlineMessage);
    dispatch({ type: "SET_PHASE", phase: "battling" });
  }, []);

  const submitAction = useCallback((action: BattleTurnAction) => {
    if (!connRef.current?.open) return;
    connRef.current.send({
      type: "ACTION",
      payload: action,
      timestamp: Date.now(),
    } as OnlineMessage);
  }, []);

  const waitForOpponentAction = useCallback((): Promise<BattleTurnAction> => {
    return new Promise((resolve) => {
      actionResolverRef.current = resolve;
    });
  }, []);

  const disconnect = useCallback(() => {
    if (connRef.current?.open) {
      connRef.current.send({ type: "DISCONNECT", payload: null, timestamp: Date.now() } as OnlineMessage);
      connRef.current.close();
    }
    if (pingInterval.current) clearInterval(pingInterval.current);
    peerRef.current?.destroy();
    peerRef.current = null;
    connRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    createLobby,
    joinLobby,
    submitTeam,
    sendReady,
    submitAction,
    waitForOpponentAction,
    disconnect,
  };
}
