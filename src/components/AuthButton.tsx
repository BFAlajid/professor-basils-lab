"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { user, player, isLoading, isConfigured, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    setShowMenu(false);
  }, [logout]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  if (isLoading || !isConfigured) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-[#6390F0] px-3 py-2 text-base font-pixel text-[#f0f0e8] hover:bg-[#4a78d8] transition-colors"
        >
          Sign In
        </button>
        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu((s) => !s)}
        className="rounded-lg bg-[#3a4466] px-3 py-2 text-base font-pixel text-[#f0f0e8] hover:bg-[#4a5577] transition-colors truncate max-w-[120px]"
        title={player?.display_name ?? "Trainer"}
      >
        {player?.display_name ?? "..."}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-40 w-40 rounded-lg border border-[#3a4466] bg-[#262b44] shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#3a4466]">
            <p className="text-[10px] font-pixel text-[#f0f0e8] truncate">
              {player?.display_name}
            </p>
            <p className="text-[8px] font-pixel text-[#8b9bb4]">
              ELO: {player?.season_elo ?? 1000}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-[10px] font-pixel text-[#e8433f] hover:bg-[#1a1c2c] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
