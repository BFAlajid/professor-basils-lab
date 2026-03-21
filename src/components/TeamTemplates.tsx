"use client";

import { useState, memo, useCallback } from "react";
import { TOAST_DURATION } from "@/data/constants";
import { TEAM_TEMPLATES, TeamTemplate } from "@/data/teamTemplates";

interface TeamTemplatesProps {
  onLoadTeam: (showdownPaste: string) => void;
}

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const ARCHETYPE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  rain:           { icon: "\u2602", color: "#6390F0", bg: "rgba(99,144,240,0.15)" },
  sun:            { icon: "\u2600", color: "#f7a838", bg: "rgba(247,168,56,0.15)" },
  "trick-room":   { icon: "\u29D6", color: "#7B62A1", bg: "rgba(123,98,161,0.15)" },
  "bulky-offense": { icon: "\uD83D\uDEE1", color: "#e8433f", bg: "rgba(232,67,63,0.15)" },
  "hyper-offense": { icon: "\u2694", color: "#e8433f", bg: "rgba(232,67,63,0.15)" },
  stall:          { icon: "\uD83E\uDDF1", color: "#8b9bb4", bg: "rgba(139,155,180,0.15)" },
  sand:           { icon: "\u23F3", color: "#C6B88A", bg: "rgba(198,184,138,0.15)" },
  balanced:       { icon: "\u2696", color: "#38b764", bg: "rgba(56,183,100,0.15)" },
};

function getStyle(archetype: string) {
  return ARCHETYPE_STYLES[archetype] ?? { icon: "\u25CF", color: "#8b9bb4", bg: "rgba(139,155,180,0.15)" };
}

function formatArchetype(archetype: string): string {
  return archetype
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const TemplateCard = memo(function TemplateCard({
  template,
  isLoading,
  loadedName,
  onLoad,
}: {
  template: TeamTemplate;
  isLoading: boolean;
  loadedName: string | null;
  onLoad: () => void;
}) {
  const style = getStyle(template.archetype);
  const isLoaded = loadedName === template.name;

  return (
    <div
      className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-4 flex flex-col gap-3 hover:border-[#4a5577] transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-pixel text-[#f0f0e8] font-bold truncate">
            {template.name}
          </h4>
        </div>
        <span
          className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-pixel font-bold whitespace-nowrap"
          style={{ backgroundColor: style.bg, color: style.color, border: `1px solid ${style.color}33` }}
        >
          <span aria-hidden="true">{style.icon} </span>
          {formatArchetype(template.archetype)}
        </span>
      </div>

      {/* Description */}
      <p className="text-[10px] text-[#8b9bb4] leading-relaxed line-clamp-3">
        {template.description}
      </p>

      {/* Pokemon sprites */}
      <div className="flex items-center gap-1 justify-center">
        {template.pokemon.map((p) => (
          <div
            key={p.pokemonId}
            className="relative w-10 h-10 flex-shrink-0"
            title={`${p.name} - ${p.ability}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${SPRITE_BASE}/${p.pokemonId}.png`}
              alt={p.name}
              width={40}
              height={40}
              loading="lazy"
              className="w-full h-full object-contain pixelated"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        ))}
      </div>

      {/* Pokemon names */}
      <div className="flex flex-wrap gap-1 justify-center">
        {template.pokemon.map((p) => (
          <span
            key={p.pokemonId}
            className="rounded bg-[#262b44] px-1.5 py-0.5 text-[9px] font-pixel text-[#c0c8d8]"
          >
            {p.name}
          </span>
        ))}
      </div>

      {/* Load button */}
      <button
        onClick={onLoad}
        disabled={isLoading}
        aria-label={`Load ${template.name} team`}
        className="mt-auto rounded-lg px-4 py-2 text-xs font-pixel font-bold transition-colors disabled:opacity-50"
        style={{
          backgroundColor: isLoaded ? "#38b764" : "#e8433f",
          color: "#f0f0e8",
        }}
      >
        {isLoading ? "Loading..." : isLoaded ? "Loaded!" : "Load Team"}
      </button>
    </div>
  );
});

export default function TeamTemplates({ onLoadTeam }: TeamTemplatesProps) {
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState<string | null>(null);

  const handleLoad = useCallback(
    (template: TeamTemplate) => {
      setLoadingName(template.name);
      onLoadTeam(template.showdownPaste);
      setLoadingName(null);
      setLoadedName(template.name);
      setTimeout(() => setLoadedName(null), TOAST_DURATION);
    },
    [onLoadTeam],
  );

  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
      <h3 className="mb-4 text-sm font-bold font-pixel text-[#f0f0e8] uppercase tracking-wider">
        Team Templates
      </h3>
      <p className="text-[10px] text-[#8b9bb4] mb-4">
        Pre-built competitive archetypes to get you started. Load a template to replace your current team.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEAM_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.name}
            template={template}
            isLoading={loadingName === template.name}
            loadedName={loadedName}
            onLoad={() => handleLoad(template)}
          />
        ))}
      </div>
    </div>
  );
}
