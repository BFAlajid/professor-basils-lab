"use client";

import { useMemo } from "react";
import { TeamSlot } from "@/types";
import { detectArchetype, Archetype, ArchetypeReport } from "@/utils/archetypeDetector";
import { typeColors } from "@/data/typeColors";

interface TeamArchetypeProps {
  team: TeamSlot[];
}

interface ArchetypeMeta {
  label: string;
  color: string;
}

const ARCHETYPE_META: Record<Archetype, ArchetypeMeta> = {
  rain: { label: "Rain", color: typeColors.water },
  sun: { label: "Sun", color: typeColors.fire },
  sand: { label: "Sand", color: typeColors.ground },
  snow: { label: "Snow", color: typeColors.ice },
  "trick-room": { label: "Trick Room", color: typeColors.psychic },
  "hyper-offense": { label: "Hyper Offense", color: "#e8433f" },
  "bulky-offense": { label: "Bulky Offense", color: "#e8a33f" },
  stall: { label: "Stall", color: "#38b764" },
  "hazard-stack": { label: "Hazard Stack", color: typeColors.rock },
  balance: { label: "Balance", color: "#8b9bb4" },
  weatherless: { label: "Weatherless", color: "#5b6e8f" },
};

type Confidence = ArchetypeReport["confidence"];

const CONFIDENCE_META: Record<Confidence, ArchetypeMeta> = {
  high: { label: "High Confidence", color: "#38b764" },
  medium: { label: "Medium Confidence", color: "#e8a33f" },
  low: { label: "Low Confidence", color: "#8b9bb4" },
  "insufficient-data": { label: "Insufficient Data", color: "#8b9bb4" },
};

const SPEED_PROFILE_META: Record<ArchetypeReport["speedProfile"], ArchetypeMeta> = {
  fast: { label: "Fast", color: "#38b764" },
  mixed: { label: "Mixed", color: "#e8a33f" },
  slow: { label: "Slow", color: "#5b6e8f" },
};

interface EvidenceChipsProps {
  items: string[];
}

function EvidenceChips({ items }: EvidenceChipsProps) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full bg-[#3a4466] px-2 py-0.5 text-[10px] text-[#f0f0e8]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

interface SettersGroupProps {
  label: string;
  items: string[];
}

function SettersGroup({ label, items }: SettersGroupProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5b6e8f]">
        {label}
      </span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="rounded-full bg-[#1a1c2c] px-2 py-0.5 text-[10px] text-[#f0f0e8]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TeamArchetype({ team }: TeamArchetypeProps) {
  const report = useMemo(() => detectArchetype(team), [team]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center font-pixel text-[#8b9bb4]">
        Add Pokemon to your team to see its archetype
      </div>
    );
  }

  const primaryMeta = ARCHETYPE_META[report.primary.archetype];
  const confidenceMeta = CONFIDENCE_META[report.confidence];
  const speedMeta = SPEED_PROFILE_META[report.speedProfile];
  const hasSetters =
    report.setters.weather.length > 0 ||
    report.setters.terrain.length > 0 ||
    report.setters.hazards.length > 0 ||
    report.setters.screens.length > 0;

  return (
    <div className="space-y-4 font-pixel">
      {/* Primary archetype */}
      <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#8b9bb4]">TEAM ARCHETYPE</h3>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${confidenceMeta.color}33`, color: confidenceMeta.color }}
          >
            {confidenceMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-lg px-4 py-2 text-xl font-bold text-[#f0f0e8]"
            style={{ backgroundColor: primaryMeta.color }}
          >
            {primaryMeta.label}
          </span>
          <span className="text-sm text-[#8b9bb4]">
            {Math.round(report.primary.score * 100)}% match
          </span>
        </div>

        <EvidenceChips items={report.primary.evidence} />

        {report.confidence === "low" && (
          <p className="mt-3 text-[10px] text-[#5b6e8f]">
            Set movesets and held items for a more confident read.
          </p>
        )}
      </div>

      {/* Secondary signals */}
      {report.secondary.length > 0 && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">SECONDARY SIGNALS</h3>
          <div className="flex flex-wrap gap-2">
            {report.secondary.map((signal) => (
              <span
                key={signal.archetype}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#f0f0e8]"
                style={{ backgroundColor: ARCHETYPE_META[signal.archetype].color }}
              >
                {ARCHETYPE_META[signal.archetype].label}
                <span className="text-[10px] opacity-80">{Math.round(signal.score * 100)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Setters row */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">FIELD SETTERS</h3>
        {hasSetters ? (
          <>
            <SettersGroup label="Weather" items={report.setters.weather} />
            <SettersGroup label="Terrain" items={report.setters.terrain} />
            <SettersGroup label="Hazards" items={report.setters.hazards} />
            <SettersGroup label="Screens" items={report.setters.screens} />
          </>
        ) : (
          <p className="text-xs text-[#8b9bb4]">No field-setting moves or abilities detected</p>
        )}
      </div>

      {/* Speed profile */}
      <div className="flex items-center justify-between rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="text-sm font-bold text-[#f0f0e8]">SPEED PROFILE</h3>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${speedMeta.color}33`, color: speedMeta.color }}
        >
          {speedMeta.label}
        </span>
      </div>

      {/* Win condition */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">WIN CONDITION</h3>
        <ul className="space-y-2">
          {report.winCondition.map((line, i) => (
            <li key={i} className="text-xs leading-relaxed text-[#8b9bb4]">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
