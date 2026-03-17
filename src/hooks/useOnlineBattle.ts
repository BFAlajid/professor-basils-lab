"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { OnlineState, OnlinePhase, OnlineMessage, TeamSlot, BattleTurnAction, PCBoxPokemon, LinkMode, LinkTradeState, TradeOffer } from "@/types";
import {
  validateOnlineMessage,
  validateTeamSlots,
  validateBattleTurnAction,
} from "@/utils/validateOnlineMessage";
import { useOnlineTrade } from "./useOnlineTrade";

const OPPONENT_ACTION_TIMEOUT_MS = 30_000;
const MIN_MESSAGE_INTERVAL_MS = 50;
const RATE_LIMIT_EXEMPT = new Set(["PING", "PONG", "ACTION", "FORCE_SWITCH_ACTION", "TEAM_SUBMIT", "READY", "DISCONNECT"]);

// PeerJS cloud server config with explicit debug logging
const PEER_CONFIG = { debug: process.env.NODE_ENV === "development" ? 2 : 0 };

const initialTradeState: LinkTradeState = {
  mode: "idle",
  myBoxShared: false,
  opponentBox: [],
  myOffer: null,
  opponentOffer: null,
  myConfirmed: false,
  opponentConfirmed: false,
  tradeComplete: false,
  lastTradedReceived: null,
};

const initialState: OnlineState = {
  phase: "idle",
  roomCode: null,
  isHost: false,
  opponentTeam: null,
  lastPing: 0,
  error: null,
  trade: { ...initialTradeState },
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
  | { type: "RESET" }
  // Trade actions
  | { type: "SET_LINK_MODE"; mode: LinkMode }
  | { type: "SHARE_MY_BOX" }
  | { type: "RECEIVE_OPPONENT_BOX"; box: PCBoxPokemon[] }
  | { type: "SET_MY_OFFER"; offer: TradeOffer }
  | { type: "RECEIVE_OPPONENT_OFFER"; offer: TradeOffer }
  | { type: "OPPONENT_ACCEPTED" }
  | { type: "OPPONENT_REJECTED" }
  | { type: "CONFIRM_TRADE" }
  | { type: "OPPONENT_CONFIRMED" }
  | { type: "TRADE_DONE"; received: PCBoxPokemon }
  | { type: "RESET_TRADE" };

function onlineReducer(state: OnlineState, action: OnlineAction): OnlineState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase, error: null };
    case "CREATE_LOBBY":
      return { ...initialState, phase: "waiting", roomCode: action.roomCode, isHost: true };
    case "JOIN_LOBBY":
      return { ...initialState, phase: "joining", roomCode: action.roomCode, isHost: false };
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

    // Trade reducers
    case "SET_LINK_MODE":
      return { ...state, trade: { ...initialTradeState, mode: action.mode } };
    case "SHARE_MY_BOX":
      return { ...state, trade: { ...state.trade, myBoxShared: true } };
    case "RECEIVE_OPPONENT_BOX":
      return { ...state, trade: { ...state.trade, opponentBox: action.box } };
    case "SET_MY_OFFER":
      return { ...state, trade: { ...state.trade, myOffer: action.offer, myConfirmed: false, opponentConfirmed: false } };
    case "RECEIVE_OPPONENT_OFFER":
      return { ...state, trade: { ...state.trade, opponentOffer: action.offer, myConfirmed: false, opponentConfirmed: false } };
    case "OPPONENT_ACCEPTED":
      return state; // No-op, offer already received
    case "OPPONENT_REJECTED":
      return { ...state, trade: { ...state.trade, opponentOffer: null, myOffer: null, myConfirmed: false, opponentConfirmed: false } };
    case "CONFIRM_TRADE":
      return { ...state, trade: { ...state.trade, myConfirmed: true } };
    case "OPPONENT_CONFIRMED":
      return { ...state, trade: { ...state.trade, opponentConfirmed: true } };
    case "TRADE_DONE":
      return { ...state, trade: { ...state.trade, tradeComplete: true, lastTradedReceived: action.received } };
    case "RESET_TRADE":
      return { ...state, trade: { ...initialTradeState, mode: "trade", opponentBox: state.trade.opponentBox, myBoxShared: state.trade.myBoxShared } };
    default:
      return state;
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join("");
}

export function useOnlineBattle() {
  const [state, dispatch] = useReducer(onlineReducer, initialState);
  const peerRef = useRef<import("peerjs").default | null>(null);
  const connRef = useRef<import("peerjs").DataConnection | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionResolverRef = useRef<((action: BattleTurnAction) => void) | null>(null);
  const actionRejectRef = useRef<((reason: Error) => void) | null>(null);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<BattleTurnAction | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const {
    setLinkMode,
    shareMyBox,
    sendTradeOffer,
    acceptTrade,
    rejectTrade,
    confirmTrade,
    completeTrade,
    resetTrade,
    resetEscrow,
    handleTradeMessage,
    handleConnectionClose,
  } = useOnlineTrade(connRef, dispatch, stateRef);

  const setupConnection = useCallback((conn: import("peerjs").DataConnection) => {
    connRef.current = conn;

    conn.on("open", () => {
      console.log("[OnlineBattle] DataConnection open with peer:", conn.peer);
      dispatch({ type: "CONNECTED" });
      // Start ping/pong heartbeat
      pingInterval.current = setInterval(() => {
        if (conn.open) {
          conn.send({ type: "PING", payload: null, timestamp: Date.now() } as OnlineMessage);
        }
      }, 5000);
    });

    conn.on("data", (raw) => {
      const msg = validateOnlineMessage(raw);
      if (!msg) {
        console.warn("[OnlineBattle] Invalid message dropped:", typeof raw, raw);
        return;
      }
      console.log("[OnlineBattle] Received:", msg.type);

      // Rate limit: drop non-critical messages arriving too fast
      const now = Date.now();
      if (!RATE_LIMIT_EXEMPT.has(msg.type)) {
        if (now - lastMessageTimeRef.current < MIN_MESSAGE_INTERVAL_MS) return;
        lastMessageTimeRef.current = now;
      }

      switch (msg.type) {
        case "PING":
          conn.send({ type: "PONG", payload: null, timestamp: Date.now() } as OnlineMessage);
          dispatch({ type: "PING" });
          break;
        case "PONG":
          dispatch({ type: "PING" });
          break;
        case "TEAM_SUBMIT": {
          const team = validateTeamSlots(msg.payload);
          if (!team) {
            console.warn("[OnlineBattle] TEAM_SUBMIT validation failed:", msg.payload);
            return;
          }
          console.log("[OnlineBattle] Opponent team received:", team.length, "pokemon");
          dispatch({ type: "OPPONENT_TEAM", team });
          break;
        }
        case "ACTION":
        case "FORCE_SWITCH_ACTION": {
          const action = validateBattleTurnAction(msg.payload);
          if (!action) return;
          if (actionResolverRef.current) {
            actionResolverRef.current(action);
            actionResolverRef.current = null;
            actionRejectRef.current = null;
          } else {
            // Buffer: action arrived before waitForOpponentAction was called
            pendingActionRef.current = action;
          }
          break;
        }
        case "READY":
          dispatch({ type: "SET_PHASE", phase: "battling" });
          break;
        case "DISCONNECT":
          dispatch({ type: "DISCONNECT" });
          break;
        default:
          handleTradeMessage(msg, conn);
          break;
      }
    });

    conn.on("close", () => {
      if (actionRejectRef.current) {
        actionRejectRef.current(new Error("Opponent disconnected"));
        actionResolverRef.current = null;
        actionRejectRef.current = null;
      }
      handleConnectionClose();
      dispatch({ type: "DISCONNECT" });
    });

    conn.on("error", (err) => {
      dispatch({ type: "ERROR", error: err.message });
    });
  }, [handleTradeMessage, handleConnectionClose]);

  const createLobby = useCallback(async () => {
    const { default: Peer } = await import("peerjs");
    const roomCode = generateRoomCode();
    const peerId = `pkmn-battle-${roomCode}`;

    dispatch({ type: "SET_PHASE", phase: "creating_lobby" });

    const peer = new Peer(peerId, PEER_CONFIG);
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("[OnlineBattle] Host peer open with id:", id);
      // Peer registered with signaling server — safe to share code
      dispatch({ type: "CREATE_LOBBY", roomCode });
    });

    peer.on("connection", (conn) => {
      console.log("[OnlineBattle] Host received connection from:", conn.peer);
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("[OnlineBattle] Host peer error:", err.type, err.message);
      dispatch({ type: "ERROR", error: err.message });
    });
  }, [setupConnection]);

  const joinLobby = useCallback(async (code: string) => {
    const { default: Peer } = await import("peerjs");
    const roomCode = code.toUpperCase().trim();
    const peerId = `pkmn-battle-${roomCode}-guest-${Math.random().toString(36).slice(2, 6)}`;

    dispatch({ type: "JOIN_LOBBY", roomCode });

    const peer = new Peer(peerId, PEER_CONFIG);
    peerRef.current = peer;

    peer.on("open", (id) => {
      console.log("[OnlineBattle] Guest peer open with id:", id);
      const conn = peer.connect(`pkmn-battle-${roomCode}`, { reliable: true });
      console.log("[OnlineBattle] Guest connecting to:", `pkmn-battle-${roomCode}`);
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("[OnlineBattle] Guest peer error:", err.type, err.message);
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

  const submitForceSwitch = useCallback((action: BattleTurnAction) => {
    if (!connRef.current?.open) return;
    connRef.current.send({
      type: "FORCE_SWITCH_ACTION",
      payload: action,
      timestamp: Date.now(),
    } as OnlineMessage);
  }, []);

  const clearPendingAction = useCallback(() => {
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }
    actionResolverRef.current = null;
    actionRejectRef.current = null;
  }, []);

  const waitForOpponentAction = useCallback((): Promise<BattleTurnAction> => {
    // Reject any existing pending wait to prevent overlapping promises
    if (actionRejectRef.current) {
      actionRejectRef.current(new Error("Superseded by new wait"));
      clearPendingAction();
    }

    // Check buffer first — action may have arrived before we started waiting
    if (pendingActionRef.current) {
      const buffered = pendingActionRef.current;
      pendingActionRef.current = null;
      return Promise.resolve(buffered);
    }

    return new Promise((resolve, reject) => {
      actionTimerRef.current = setTimeout(() => {
        actionResolverRef.current = null;
        actionRejectRef.current = null;
        actionTimerRef.current = null;
        reject(new Error("Opponent action timeout"));
      }, OPPONENT_ACTION_TIMEOUT_MS);

      actionResolverRef.current = (action: BattleTurnAction) => {
        clearTimeout(actionTimerRef.current!);
        actionTimerRef.current = null;
        resolve(action);
      };
      actionRejectRef.current = (reason: Error) => {
        clearTimeout(actionTimerRef.current!);
        actionTimerRef.current = null;
        reject(reason);
      };
    });
  }, [clearPendingAction]);

  const disconnect = useCallback(() => {
    resetEscrow();
    clearPendingAction();
    pendingActionRef.current = null;
    if (connRef.current?.open) {
      connRef.current.send({ type: "DISCONNECT", payload: null, timestamp: Date.now() } as OnlineMessage);
      connRef.current.close();
    }
    if (pingInterval.current) clearInterval(pingInterval.current);
    peerRef.current?.destroy();
    peerRef.current = null;
    connRef.current = null;
    dispatch({ type: "RESET" });
  }, [resetEscrow, clearPendingAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    createLobby,
    joinLobby,
    submitTeam,
    sendReady,
    submitAction,
    submitForceSwitch,
    waitForOpponentAction,
    disconnect,
    // Trade
    setLinkMode,
    shareMyBox,
    sendTradeOffer,
    acceptTrade,
    rejectTrade,
    confirmTrade,
    completeTrade,
    resetTrade,
  };
}
