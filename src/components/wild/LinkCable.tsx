"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OnlineState, LinkMode } from "@/types";

interface LinkCableProps {
  online: {
    state: OnlineState;
    createLobby: () => Promise<void>;
    joinLobby: (code: string) => Promise<void>;
    setLinkMode: (mode: LinkMode) => void;
    disconnect: () => void;
  };
  onBattle: () => void;
  onTrade: () => void;
  onBack: () => void;
}

type InputMode = "none" | "create" | "join";

export default function LinkCable({ online, onBattle, onTrade, onBack }: LinkCableProps) {
  const { state } = online;
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phase = state.phase;
  const connected = phase === "connected" || phase === "team_preview" || phase === "battling";

  // Focus first empty input box when join mode activates
  useEffect(() => {
    if (inputMode === "join" && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [inputMode]);

  const handleCreate = useCallback(async () => {
    setInputMode("create");
    await online.createLobby();
  }, [online]);

  const handleJoin = useCallback(async () => {
    if (joinCode.length !== 6) return;
    await online.joinLobby(joinCode);
  }, [online, joinCode]);

  const handleCodeInput = useCallback((index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (!/[A-Z0-9]/.test(char) && value !== "") return;

    const newCode = joinCode.split("");
    newCode[index] = char;
    const joined = newCode.join("").slice(0, 6);
    setJoinCode(joined);

    // Auto-advance to next input
    if (char && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]!.focus();
    }
  }, [joinCode]);

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !joinCode[index] && index > 0) {
      const newCode = joinCode.split("");
      newCode[index - 1] = "";
      setJoinCode(newCode.join(""));
      inputRefs.current[index - 1]?.focus();
    }
  }, [joinCode]);

  const handleCopy = useCallback(() => {
    if (state.roomCode) {
      navigator.clipboard.writeText(state.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state.roomCode]);

  const handleDisconnect = useCallback(() => {
    online.disconnect();
    setInputMode("none");
    setJoinCode("");
  }, [online]);

  /* ─── Link Cable Visual ─── */
  const CableVisual = ({ isConnected }: { isConnected: boolean }) => (
    <div className="flex items-center justify-center gap-2 py-4">
      <div className="w-8 h-8 rounded-lg bg-[#3a4466] border-2 border-[#8b9bb4] flex items-center justify-center text-[10px] font-pixel text-[#f0f0e8]">
        P1
      </div>
      <div
        className={`flex-1 max-w-32 h-0.5 border-t-2 transition-colors duration-500 ${
          isConnected
            ? "border-solid border-[#38b764]"
            : "border-dashed border-[#8b9bb4] animate-pulse"
        }`}
      />
      <div className="w-8 h-8 rounded-lg bg-[#3a4466] border-2 border-[#8b9bb4] flex items-center justify-center text-[10px] font-pixel text-[#f0f0e8]">
        P2
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border-2 border-[#3a4466] bg-[#262b44] overflow-hidden">
      {/* Title bar */}
      <div className="bg-[#1a1c2c] px-4 py-2 border-b border-[#3a4466] flex items-center justify-between">
        <h3 className="text-sm font-pixel text-[#f7a838]">LINK CABLE</h3>
        {state.roomCode && connected && (
          <span className="text-[9px] font-pixel text-[#8b9bb4]">
            Room: {state.roomCode}
          </span>
        )}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* ═══ IDLE ═══ */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-[10px] text-[#8b9bb4] text-center">
                Connect with another player
              </p>

              <CableVisual isConnected={false} />

              {inputMode === "none" && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCreate}
                    className="w-full py-2.5 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors border border-[#38b764]/50"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setInputMode("join")}
                    className="w-full py-2.5 bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors border border-[#3a4466]"
                  >
                    Join Room
                  </button>
                </div>
              )}

              {inputMode === "join" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-[10px] text-[#8b9bb4] text-center">
                    Enter 6-digit room code:
                  </p>
                  <div className="flex justify-center gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        maxLength={1}
                        value={joinCode[i] ?? ""}
                        onChange={(e) => handleCodeInput(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        aria-label={`Room code digit ${i + 1}`}
                        className="w-9 h-10 text-center text-sm font-pixel text-[#f0f0e8] bg-[#1a1c2c] border-2 border-[#3a4466] rounded-lg focus:border-[#f7a838] focus:outline-none uppercase transition-colors"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setInputMode("none"); setJoinCode(""); }}
                      className="flex-1 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] text-[10px] font-pixel rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleJoin}
                      disabled={joinCode.length !== 6}
                      className="flex-1 py-2 bg-[#38b764] hover:bg-[#45c972] disabled:bg-[#3a4466] disabled:text-[#3a4466] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                </motion.div>
              )}

              <button
                onClick={onBack}
                className="w-full text-[10px] text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors py-1"
              >
                Back
              </button>
            </motion.div>
          )}

          {/* ═══ CREATING / WAITING ═══ */}
          {(phase === "creating_lobby" || phase === "waiting") && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 text-center"
            >
              {state.roomCode ? (
                <>
                  <p className="text-[10px] text-[#8b9bb4]">
                    Share this code with your friend:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-pixel text-[#f7a838] tracking-[0.3em]">
                      {state.roomCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="px-2 py-1 text-[9px] font-pixel bg-[#3a4466] hover:bg-[#4a5577] text-[#f0f0e8] rounded transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-[#8b9bb4]">Creating room...</p>
              )}

              <CableVisual isConnected={false} />

              <p className="text-xs font-pixel text-[#8b9bb4] animate-pulse">
                Waiting for player to connect...
              </p>

              <button
                onClick={handleDisconnect}
                className="px-6 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {/* ═══ JOINING ═══ */}
          {phase === "joining" && (
            <motion.div
              key="joining"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-4 border-[#3a4466] border-t-[#f7a838]"
              />
              <p className="text-xs font-pixel text-[#8b9bb4] animate-pulse">
                Connecting to room...
              </p>
              <button
                onClick={handleDisconnect}
                className="px-6 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {/* ═══ CONNECTED (Union Room Hub) ═══ */}
          {connected && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-xs font-pixel text-[#38b764] text-center">
                Connected!
              </p>

              <CableVisual isConnected={true} />

              <div className="grid grid-cols-2 gap-3">
                {/* Link Battle */}
                <button
                  onClick={onBattle}
                  className="group flex flex-col items-center gap-2 p-4 bg-[#1a1c2c] hover:bg-[#e8433f]/10 border-2 border-[#3a4466] hover:border-[#e8433f] rounded-xl transition-all"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    &#9876;&#65039;
                  </span>
                  <span className="text-[11px] font-pixel text-[#e8433f]">
                    Link Battle
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">
                    Battle your friend!
                  </span>
                </button>

                {/* Link Trade */}
                <button
                  onClick={() => {
                    online.setLinkMode("trade");
                    onTrade();
                  }}
                  className="group flex flex-col items-center gap-2 p-4 bg-[#1a1c2c] hover:bg-[#60a5fa]/10 border-2 border-[#3a4466] hover:border-[#60a5fa] rounded-xl transition-all"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    &#128260;
                  </span>
                  <span className="text-[11px] font-pixel text-[#60a5fa]">
                    Link Trade
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">
                    Trade from your PC Box
                  </span>
                </button>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] text-[10px] font-pixel rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </motion.div>
          )}

          {/* ═══ DISCONNECTED ═══ */}
          {phase === "disconnected" && (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 space-y-4"
            >
              <CableVisual isConnected={false} />

              <p className="text-xs font-pixel text-[#e8433f]">
                Connection lost
              </p>
              {state.error && (
                <p className="text-[9px] text-[#8b9bb4] text-center">
                  {state.error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleDisconnect();
                  }}
                  className="px-4 py-2 bg-[#38b764] hover:bg-[#45c972] text-[#f0f0e8] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Reconnect
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-[#3a4466] hover:bg-[#4a5577] text-[#8b9bb4] text-[10px] font-pixel rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
