"use client";
import { useState, useEffect } from "react";

export type ThemeMode = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("pokemon-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pokemon-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggleTheme };
}
