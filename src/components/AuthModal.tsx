"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      if (mode === "login") {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      } else {
        if (!displayName.trim()) {
          setError("Display name is required");
          setIsSubmitting(false);
          return;
        }
        if (displayName.trim().length < 3 || displayName.trim().length > 20) {
          setError("Display name must be 3-20 characters");
          setIsSubmitting(false);
          return;
        }
        const result = await register(email, password, displayName.trim());
        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      }
      setIsSubmitting(false);
    },
    [mode, email, password, displayName, login, register, onClose]
  );

  const switchMode = useCallback(() => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-xl border border-[#3a4466] bg-[#262b44] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-center text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="block text-[9px] font-pixel text-[#8b9bb4] mb-1">
                    Trainer Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-xs font-pixel text-[#f0f0e8] outline-none focus:border-[#6390F0]"
                    placeholder="Ash"
                    maxLength={20}
                    autoComplete="username"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] font-pixel text-[#8b9bb4] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-xs font-pixel text-[#f0f0e8] outline-none focus:border-[#6390F0]"
                  placeholder="trainer@pokemon.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-[9px] font-pixel text-[#8b9bb4] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-3 py-2 text-xs font-pixel text-[#f0f0e8] outline-none focus:border-[#6390F0]"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <p className="text-[10px] font-pixel text-[#e8433f]">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#6390F0] px-4 py-2.5 text-xs font-bold font-pixel text-[#f0f0e8] transition-colors hover:bg-[#4a78d8] disabled:opacity-50"
              >
                {isSubmitting
                  ? "..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            <button
              onClick={switchMode}
              className="mt-3 block w-full text-center text-[9px] font-pixel text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
            >
              {mode === "login"
                ? "Need an account? Register"
                : "Already have an account? Sign in"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
