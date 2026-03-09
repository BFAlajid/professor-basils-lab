"use client";

import { useState, memo, useCallback } from "react";
import { TOAST_DURATION } from "@/data/constants";
import { motion, AnimatePresence } from "framer-motion";
import { TEAM_PRESETS, TeamPreset } from "@/data/teamPresets";

interface TeamTemplatesProps {
  onLoadTeam: (showdownPaste: string) => void;
}

const ARCHETYPE_ICONS: Record<string, { icon: string; color: string }> = {
  "Sun Team": { icon: "\u2600", color: "#f7a838" },
  "Rain Team": { icon: "\u2602", color: "#6390F0" },
  "Trick Room": { icon: "\u29D6", color: "#7B62A1" },
  "Hyper Offense": { icon: "\u2694", color: "#e8433f" },
  Balanced: { icon: "\u2696", color: "#38b764" },
};

function getArchetypeStyle(name: string) {
  return ARCHETYPE_ICONS[name] ?? { icon: "\u25CF", color: "#8b9bb4" };
}

function extractPokemonNames(paste: string): string[] {
  return paste
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith(" ") && !line.startsWith("-"))
    .map((line) => line.split("@")[0].split("(")[0].trim())
    .filter(Boolean);
}

const PresetItem = memo(function PresetItem({
  preset,
  isExpanded,
  isLoaded,
  onToggle,
  onLoad,
}: {
  preset: TeamPreset;
  isExpanded: boolean;
  isLoaded: boolean;
  onToggle: () => void;
  onLoad: () => void;
}) {
  const style = getArchetypeStyle(preset.name);
  const pokemonNames = extractPokemonNames(preset.showdownPaste);

  return (
    <div>
      <button
        onClick={onToggle}
        aria-label={`${preset.name} template`}
        aria-expanded={isExpanded ? "true" : "false"}
        className="w-full flex items-center gap-3 rounded-lg bg-[#1a1c2c] p-3 border border-[#3a4466] hover:border-[#4a5577] transition-colors text-left"
      >
        <span
          className="text-lg flex-shrink-0"
          style={{ color: style.color }}
          aria-hidden="true"
        >
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-pixel text-[#f0f0e8]">{preset.name}</p>
          <p className="text-[9px] text-[#8b9bb4] truncate">
            {preset.format} &mdash; {pokemonNames.slice(0, 3).join(", ")}
            {pokemonNames.length > 3 && ` +${pokemonNames.length - 3}`}
          </p>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-[#8b9bb4] text-xs"
          aria-hidden="true"
        >
          &#9660;
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg bg-[#1a1c2c] border border-[#3a4466] p-3">
              <p className="text-[10px] text-[#8b9bb4] mb-3">
                {preset.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {pokemonNames.map((name) => (
                  <span
                    key={name}
                    className="rounded bg-[#262b44] px-2 py-0.5 text-[10px] font-pixel text-[#f0f0e8]"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <button
                onClick={onLoad}
                aria-label={`Load ${preset.name} team`}
                className="rounded-lg px-4 py-2 text-xs font-pixel transition-colors"
                style={{
                  backgroundColor: isLoaded ? "#38b764" : "#e8433f",
                  color: "#f0f0e8",
                }}
              >
                {isLoaded ? "Loaded!" : "Load Team"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function TeamTemplates({ onLoadTeam }: TeamTemplatesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);

  const handleLoad = useCallback((preset: TeamPreset) => {
    onLoadTeam(preset.showdownPaste);
    setLoadedName(preset.name);
    setTimeout(() => setLoadedName(null), TOAST_DURATION);
  }, [onLoadTeam]);

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
        Team Templates
      </h3>
      <div className="space-y-2">
        {TEAM_PRESETS.map((preset) => (
          <PresetItem
            key={preset.name}
            preset={preset}
            isExpanded={expanded === preset.name}
            isLoaded={loadedName === preset.name}
            onToggle={() => setExpanded((prev) => prev === preset.name ? null : preset.name)}
            onLoad={() => handleLoad(preset)}
          />
        ))}
      </div>
    </div>
  );
}
