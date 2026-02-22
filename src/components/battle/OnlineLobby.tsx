"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { OnlineState, TeamSlot } from "@/types";

interface OnlineLobbyProps {
  state: OnlineState;
  playerTeam: TeamSlot[];
  onCreateLobby: () => void;
  onJoinLobby: (code: string) => void;
  onSubmitTeam: (team: TeamSlot[]) => void;
  onReady: () => void;
  onDisconnect: () => void;
}

export default function OnlineLobby({
  state,
  playerTeam,
  onCreateLobby,
  onJoinLobby,
  onSubmitTeam,
  onReady,
  onDisconnect,
}: OnlineLobbyProps) {
  const [joinCode, setJoinCode] = useState("");
  const [teamSubmitted, setTeamSubmitted] = useState(false);

  const handleJoin = useCallback(() => {
    if (joinCode.trim().length >= 4) {
      onJoinLobby(joinCode.trim());
    }
  }, [joinCode, onJoinLobby]);

  const handleSubmitTeam = useCallback(() => {
    onSubmitTeam(playerTeam);
    setTeamSubmitted(true);
  }, [playerTeam, onSubmitTeam]);

  // Idle state — create or join
  if (state.phase === "idle") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 space-y-6">
        <h3 className="text-lg font-pixel text-[#f0f0e8] text-center">Online Battle</h3>
        <p className="text-xs text-[#8b9bb4] text-center">
          Battle a friend using peer-to-peer connection. No account needed!
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Create Room */}
          <button
            onClick={onCreateLobby}
            className="rounded-lg border border-[#38b764] bg-[#38b764]/10 p-4 text-center hover:bg-[#38b764]/20 transition-colors"
          >
            <span className="block text-sm font-pixel text-[#38b764]">Create Room</span>
            <span className="block text-[10px] text-[#8b9bb4] mt-1">
              Host a battle and share the code
            </span>
          </button>

          {/* Join Room */}
          <div className="rounded-lg border border-[#3a4466] bg-[#1a1c2c] p-4 space-y-2">
            <span className="block text-sm font-pixel text-[#f0f0e8] text-center">Join Room</span>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter code..."
              maxLength={6}
              className="w-full rounded-lg border border-[#3a4466] bg-[#262b44] px-3 py-2 text-center text-sm font-pixel text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f]"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.trim().length < 4}
              className="w-full rounded-lg bg-[#e8433f] px-4 py-2 text-xs font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors disabled:opacity-40"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for opponent to connect
  if (state.phase === "creating_lobby" || state.phase === "waiting") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Waiting for Opponent</h3>
        <div className="space-y-2">
          <p className="text-xs text-[#8b9bb4]">Share this room code:</p>
          <div className="inline-block rounded-lg bg-[#1a1c2c] border border-[#3a4466] px-6 py-3">
            <span className="text-2xl font-pixel text-[#f7a838] tracking-widest">
              {state.roomCode}
            </span>
          </div>
          <p className="text-[10px] text-[#8b9bb4]">
            Your opponent enters this code to connect
          </p>
        </div>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xs text-[#8b9bb4]"
        >
          Waiting for connection...
        </motion.div>
        <button
          onClick={onDisconnect}
          className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
        >
          Cancel
        </button>
        {state.error && (
          <p className="text-[10px] text-[#e8433f]">{state.error}</p>
        )}
      </div>
    );
  }

  // Joining
  if (state.phase === "joining") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-sm font-pixel text-[#f0f0e8]">Connecting...</h3>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xs text-[#8b9bb4]"
        >
          Joining room {state.roomCode}...
        </motion.div>
        <button
          onClick={onDisconnect}
          className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
        >
          Cancel
        </button>
        {state.error && (
          <p className="text-[10px] text-[#e8433f]">{state.error}</p>
        )}
      </div>
    );
  }

  // Connected — submit teams
  if (state.phase === "connected") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#38b764] animate-pulse" />
          <h3 className="text-sm font-pixel text-[#38b764]">Connected!</h3>
        </div>
        {!teamSubmitted ? (
          <>
            <p className="text-xs text-[#8b9bb4]">Submit your team to begin</p>
            <button
              onClick={handleSubmitTeam}
              className="rounded-lg bg-[#38b764] px-6 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#2a9d52] transition-colors"
            >
              Submit Team ({playerTeam.length} Pokemon)
            </button>
          </>
        ) : (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs text-[#8b9bb4]"
          >
            Team submitted! Waiting for opponent&apos;s team...
          </motion.div>
        )}
        <button
          onClick={onDisconnect}
          className="text-[10px] text-[#e8433f] hover:text-[#f0f0e8] transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Team preview
  if (state.phase === "team_preview") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 space-y-4">
        <h3 className="text-sm font-pixel text-[#f0f0e8] text-center">Team Preview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-[10px] font-pixel text-[#38b764] mb-2">Your Team</h4>
            {playerTeam.map((slot) => (
              <p key={slot.pokemon.id} className="text-xs text-[#f0f0e8] capitalize">
                {slot.pokemon.name}
              </p>
            ))}
          </div>
          <div>
            <h4 className="text-[10px] font-pixel text-[#e8433f] mb-2">Opponent</h4>
            {state.opponentTeam?.map((slot) => (
              <p key={slot.pokemon.id} className="text-xs text-[#f0f0e8] capitalize">
                {slot.pokemon.name}
              </p>
            ))}
          </div>
        </div>
        <button
          onClick={onReady}
          className="w-full rounded-lg bg-[#e8433f] px-6 py-3 text-sm font-pixel text-[#f0f0e8] hover:bg-[#c73535] transition-colors"
        >
          Ready to Battle!
        </button>
      </div>
    );
  }

  // Disconnected
  if (state.phase === "disconnected") {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center space-y-4">
        <h3 className="text-sm font-pixel text-[#e8433f]">Disconnected</h3>
        <p className="text-xs text-[#8b9bb4]">{state.error ?? "Connection was lost."}</p>
        <button
          onClick={onDisconnect}
          className="rounded-lg bg-[#3a4466] px-6 py-2 text-xs font-pixel text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // Battling phase — handled by BattleTab
  return null;
}
