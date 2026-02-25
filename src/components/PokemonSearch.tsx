"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { usePokemonList } from "@/hooks/usePokemonList";
import { fetchPokemon } from "@/hooks/usePokemon";
import { Pokemon } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

interface PokemonSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pokemon: Pokemon) => void;
}

export default function PokemonSearch({
  isOpen,
  onClose,
  onSelect,
}: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: pokemonList } = usePokemonList();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setError(null);
      setImgErrors(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!pokemonList || !debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    return pokemonList
      .filter((p) => p.name.includes(q))
      .slice(0, 20);
  }, [pokemonList, debouncedQuery]);

  const handleSelect = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      try {
        const pokemon = await fetchPokemon(name);
        onSelect(pokemon);
        onClose();
      } catch {
        setError(`Could not load ${name}. Try again.`);
      } finally {
        setLoading(false);
      }
    },
    [onSelect, onClose]
  );

  const getSpriteUrl = (url: string) => {
    const id = url.split("/").filter(Boolean).pop();
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="w-full max-w-md rounded-xl border border-[#3a4466] bg-[#262b44] p-4 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold font-pixel text-[#f0f0e8] mb-3">Search Pokemon</h2>
            <div className="mb-4 flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                }}
                placeholder="Search Pokemon..."
                aria-label="Search Pokemon by name or ID"
                className="flex-1 rounded-lg border border-[#3a4466] bg-[#1a1c2c] px-4 py-2.5 text-[#f0f0e8] placeholder-[#8b9bb4] outline-none focus:border-[#e8433f] transition-colors"
              />
              {loading && <LoadingSpinner />}
            </div>

            {error && (
              <p className="mb-3 text-center text-xs text-[#e8433f]">{error}</p>
            )}

            <div className="max-h-80 overflow-y-auto">
              {debouncedQuery && filtered.length === 0 && (
                <p className="py-8 text-center text-[#8b9bb4]">
                  No Pokemon found
                </p>
              )}

              {filtered.map((p) => {
                const spriteUrl = getSpriteUrl(p.url);
                const hasImgError = imgErrors.has(p.name);

                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelect(p.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#3a4466] transition-colors"
                  >
                    {hasImgError ? (
                      <div className="w-10 h-10 flex items-center justify-center bg-[#1a1c2c] rounded border border-[#3a4466]">
                        <span className="text-lg text-[#3a4466]">?</span>
                      </div>
                    ) : (
                      <Image
                        src={spriteUrl}
                        alt={p.name}
                        width={40}
                        height={40}
                        unoptimized
                        onError={() => setImgErrors((prev) => new Set(prev).add(p.name))}
                      />
                    )}
                    <span className="capitalize font-medium font-pixel">{p.name}</span>
                  </button>
                );
              })}

              {!debouncedQuery && (
                <p className="py-8 text-center text-[#8b9bb4]">
                  Start typing to search...
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
