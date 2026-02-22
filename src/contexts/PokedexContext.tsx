"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePokedex } from "@/hooks/usePokedex";

type PokedexContextValue = ReturnType<typeof usePokedex>;

const PokedexContext = createContext<PokedexContextValue | null>(null);

export function PokedexProvider({ children }: { children: ReactNode }) {
  const pokedex = usePokedex();
  return (
    <PokedexContext.Provider value={pokedex}>
      {children}
    </PokedexContext.Provider>
  );
}

export function usePokedexContext(): PokedexContextValue {
  const ctx = useContext(PokedexContext);
  if (!ctx) throw new Error("usePokedexContext must be used within PokedexProvider");
  return ctx;
}
