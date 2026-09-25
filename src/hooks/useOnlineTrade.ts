"use client";

import { useCallback, useRef } from "react";
import { OnlineMessage, OnlineState, PCBoxPokemon, LinkMode, TradeOffer } from "@/types";
import {
  validateSinglePCBoxPokemon,
  validatePCBoxPokemon,
  validateTradeOffer,
  validateLinkMode,
} from "@/utils/validateOnlineMessage";

const ESCROW_TIMEOUT_MS = 15_000;

interface EscrowState {
  mySent: PCBoxPokemon | null;
  opponentSent: PCBoxPokemon | null;
  myFinalized: boolean;
  opponentFinalized: boolean;
  timeout: ReturnType<typeof setTimeout> | null;
}

const initialEscrow: EscrowState = {
  mySent: null,
  opponentSent: null,
  myFinalized: false,
  opponentFinalized: false,
  timeout: null,
};

type TradeDispatchAction =
  | { type: "CONFIRM_TRADE" }
  | { type: "OPPONENT_REJECTED" }
  | { type: "SET_LINK_MODE"; mode: LinkMode }
  | { type: "SHARE_MY_BOX" }
  | { type: "SET_MY_OFFER"; offer: TradeOffer }
  | { type: "RECEIVE_OPPONENT_BOX"; box: PCBoxPokemon[] }
  | { type: "RECEIVE_OPPONENT_OFFER"; offer: TradeOffer }
  | { type: "OPPONENT_ACCEPTED" }
  | { type: "OPPONENT_CONFIRMED" }
  | { type: "TRADE_DONE"; received: PCBoxPokemon }
  | { type: "RESET_TRADE" };

export function useOnlineTrade(
  connRef: React.RefObject<import("peerjs").DataConnection | null>,
  dispatch: React.Dispatch<TradeDispatchAction>,
  stateRef: React.RefObject<OnlineState>,
) {
  const escrowRef = useRef<EscrowState>({ ...initialEscrow });

  const resetEscrow = useCallback(() => {
    if (escrowRef.current.timeout) clearTimeout(escrowRef.current.timeout);
    escrowRef.current = { ...initialEscrow };
  }, []);

  const tryFinalizeTrade = useCallback(() => {
    const escrow = escrowRef.current;
    if (escrow.opponentSent && escrow.myFinalized && escrow.opponentFinalized) {
      dispatch({ type: "TRADE_DONE", received: escrow.opponentSent });
      resetEscrow();
    }
  }, [resetEscrow]);

  const setLinkMode = useCallback((mode: LinkMode) => {
    if (!connRef.current?.open) return;
    dispatch({ type: "SET_LINK_MODE", mode });
    connRef.current.send({ type: "LINK_MODE", payload: mode, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const shareMyBox = useCallback((box: PCBoxPokemon[]) => {
    if (!connRef.current?.open) return;
    dispatch({ type: "SHARE_MY_BOX" });
    connRef.current.send({ type: "PC_BOX_SHARE", payload: box, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const sendTradeOffer = useCallback((offer: TradeOffer) => {
    if (!connRef.current?.open) return;
    dispatch({ type: "SET_MY_OFFER", offer });
    connRef.current.send({ type: "TRADE_OFFER", payload: offer, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const acceptTrade = useCallback(() => {
    if (!connRef.current?.open) return;
    connRef.current.send({ type: "TRADE_ACCEPT", payload: null, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const rejectTrade = useCallback(() => {
    if (!connRef.current?.open) return;
    dispatch({ type: "OPPONENT_REJECTED" });
    connRef.current.send({ type: "TRADE_REJECT", payload: null, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const confirmTrade = useCallback(() => {
    if (!connRef.current?.open) return;
    dispatch({ type: "CONFIRM_TRADE" });
    connRef.current.send({ type: "TRADE_CONFIRM", payload: null, timestamp: Date.now() } as OnlineMessage);
  }, []);

  const completeTrade = useCallback((sentPokemon: PCBoxPokemon) => {
    if (!connRef.current?.open) return;

    // Clear any existing timeout without resetting the whole escrow
    if (escrowRef.current.timeout) clearTimeout(escrowRef.current.timeout);

    // Preserve opponentSent if already received, reset the rest
    const previousOpponentSent = escrowRef.current.opponentSent;
    const previousOpponentFinalized = escrowRef.current.opponentFinalized;
    escrowRef.current = {
      ...initialEscrow,
      opponentSent: previousOpponentSent,
      opponentFinalized: previousOpponentFinalized,
      mySent: sentPokemon,
    };

    connRef.current.send({ type: "TRADE_ESCROW", payload: sentPokemon, timestamp: Date.now() } as OnlineMessage);

    if (escrowRef.current.opponentSent && connRef.current.open) {
      escrowRef.current.myFinalized = true;
      connRef.current.send({ type: "TRADE_FINALIZE", payload: null, timestamp: Date.now() } as OnlineMessage);
      tryFinalizeTrade();
    }

    escrowRef.current.timeout = setTimeout(() => {
      if (!escrowRef.current.myFinalized || !escrowRef.current.opponentFinalized) {
        resetEscrow();
        dispatch({ type: "RESET_TRADE" });
      }
    }, ESCROW_TIMEOUT_MS);
  }, [resetEscrow, tryFinalizeTrade]);

  const resetTrade = useCallback(() => {
    resetEscrow();
    dispatch({ type: "RESET_TRADE" });
  }, [resetEscrow]);

  const handleTradeMessage = useCallback((msg: OnlineMessage, conn: import("peerjs").DataConnection): boolean => {
    switch (msg.type) {
      case "LINK_MODE": {
        const mode = validateLinkMode(msg.payload);
        if (!mode) return true;
        dispatch({ type: "SET_LINK_MODE", mode });
        return true;
      }
      case "PC_BOX_SHARE": {
        const box = validatePCBoxPokemon(msg.payload, 30);
        if (!box) return true;
        dispatch({ type: "RECEIVE_OPPONENT_BOX", box });
        return true;
      }
      case "TRADE_OFFER": {
        const offer = validateTradeOffer(msg.payload);
        if (!offer) return true;
        dispatch({ type: "RECEIVE_OPPONENT_OFFER", offer });
        return true;
      }
      case "TRADE_ACCEPT":
        dispatch({ type: "OPPONENT_ACCEPTED" });
        return true;
      case "TRADE_REJECT":
        dispatch({ type: "OPPONENT_REJECTED" });
        return true;
      case "TRADE_CONFIRM":
        dispatch({ type: "OPPONENT_CONFIRMED" });
        return true;
      case "TRADE_COMPLETE": {
        const received = validateSinglePCBoxPokemon(msg.payload);
        if (!received) return true;
        // VULN-07: verify received pokemon matches the previously agreed offer
        const expectedId = stateRef.current.trade.opponentOffer?.pokemon?.pokemon?.id;
        if (expectedId != null && received.pokemon.id !== expectedId) return true;
        dispatch({ type: "TRADE_DONE", received });
        return true;
      }
      case "TRADE_ESCROW": {
        const escrowed = validateSinglePCBoxPokemon(msg.payload);
        if (!escrowed) return true;
        const expectedEscrowId = stateRef.current.trade.opponentOffer?.pokemon?.pokemon?.id;
        if (expectedEscrowId != null && escrowed.pokemon.id !== expectedEscrowId) return true;
        escrowRef.current.opponentSent = escrowed;
        if (escrowRef.current.mySent && conn.open) {
          escrowRef.current.myFinalized = true;
          conn.send({ type: "TRADE_FINALIZE", payload: null, timestamp: Date.now() } as OnlineMessage);
          tryFinalizeTrade();
        }
        return true;
      }
      case "TRADE_FINALIZE": {
        escrowRef.current.opponentFinalized = true;
        tryFinalizeTrade();
        return true;
      }
      default:
        return false;
    }
  }, [tryFinalizeTrade]);

  const handleConnectionClose = useCallback(() => {
    if (escrowRef.current.mySent && !escrowRef.current.opponentFinalized) {
      resetEscrow();
      dispatch({ type: "RESET_TRADE" });
    }
  }, [resetEscrow]);

  return {
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
  };
}
