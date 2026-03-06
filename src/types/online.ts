import type { TeamSlot, IVSpread } from "./team";
import type { BallType, PCBoxPokemon } from "./wild";

// --- Online Multiplayer ---

export type OnlinePhase = "idle" | "creating_lobby" | "waiting" | "joining" | "connected" | "team_preview" | "battling" | "disconnected";
export type LinkMode = "idle" | "battle" | "trade";

export interface OnlineMessage {
  type: "TEAM_SUBMIT" | "ACTION" | "FORCE_SWITCH_ACTION" | "READY" | "PING" | "PONG" | "DISCONNECT"
    | "LINK_MODE" | "PC_BOX_SHARE" | "TRADE_OFFER" | "TRADE_ACCEPT" | "TRADE_REJECT" | "TRADE_CONFIRM" | "TRADE_COMPLETE"
    | "TRADE_ESCROW" | "TRADE_FINALIZE";
  payload: unknown;
  timestamp: number;
}

export interface TradeOffer {
  fromHost: boolean;
  pokemonIndex: number;
  pokemon: PCBoxPokemon;
}

export interface LinkTradeState {
  mode: LinkMode;
  myBoxShared: boolean;
  opponentBox: PCBoxPokemon[];
  myOffer: TradeOffer | null;
  opponentOffer: TradeOffer | null;
  myConfirmed: boolean;
  opponentConfirmed: boolean;
  tradeComplete: boolean;
  lastTradedReceived: PCBoxPokemon | null;
}

export interface OnlineState {
  phase: OnlinePhase;
  roomCode: string | null;
  isHost: boolean;
  opponentTeam: TeamSlot[] | null;
  lastPing: number;
  error: string | null;
  trade: LinkTradeState;
}

// --- Wonder Trade ---

export interface WonderTradeRecord {
  id: string;
  offeredPokemon: PCBoxPokemon;
  receivedPokemon: PCBoxPokemon;
  timestamp: string;
}

export type WonderTradePhase = "idle" | "selecting" | "searching" | "result";

export interface WonderTradeState {
  phase: WonderTradePhase;
  selectedBoxIndex: number | null;
  receivedPokemon: PCBoxPokemon | null;
  history: WonderTradeRecord[];
}

export type WonderTradeAction =
  | { type: "SELECT_POKEMON"; index: number }
  | { type: "START_TRADE" }
  | { type: "TRADE_COMPLETE"; received: PCBoxPokemon; record: WonderTradeRecord }
  | { type: "RESET" }
  | { type: "LOAD"; history: WonderTradeRecord[] };

// --- Mystery Gift ---

export interface MysteryGiftDefinition {
  pokemonId: number;
  level: number;
  nature?: string;
  perfectIvStats?: (keyof IVSpread)[];
  specialMoves?: string[];
  isShiny?: boolean;
  ballType: BallType;
  ribbonText?: string;
}

export interface MysteryGiftState {
  claimedDates: string[];
  totalClaimed: number;
}

export type MysteryGiftAction =
  | { type: "CLAIM"; date: string }
  | { type: "LOAD"; claimedDates: string[]; totalClaimed: number };
