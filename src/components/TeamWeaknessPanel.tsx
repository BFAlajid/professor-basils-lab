"use client";

import { useMemo } from "react";
import { TeamSlot, TypeName } from "@/types";
import { TYPE_LIST } from "@/data/typeChart";
import { analyzeTeam, TeamWeaknessReport } from "@/utils/teamAnalysis";
import { typeColors } from "@/data/typeColors";
import { capitalize } from "@/utils/format";

function getThreatColor(score: number): string {
  if (score <= 30) return "#2a5040";
  if (score <= 60) return "#e8a33f";
  return "#e8433f";
}

function getThreatLabel(score: number): string {
  if (score <= 30) return "Low";
  if (score <= 60) return "Moderate";
  return "High";
}

interface TypeBadgeInlineProps {
  type: TypeName;
  warning?: boolean;
}

function TypeBadgeInline({ type, warning }: TypeBadgeInlineProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#f0f0e8]"
      style={{ backgroundColor: typeColors[type as TypeName] ?? "#555" }}
    >
      {warning && (
        <span className="text-[10px]" aria-label="warning">
          !
        </span>
      )}
      {type}
    </span>
  );
}

interface DefensiveCellProps {
  type: TypeName;
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}

function DefensiveCell({ type, weakCount, resistCount, immuneCount }: DefensiveCellProps) {
  let bgColor = "#3a4466"; // neutral
  if (immuneCount > 0) {
    bgColor = "#1a3a2a";
  } else if (resistCount > 0 && weakCount === 0) {
    bgColor = "#2a5040";
  } else if (weakCount > 0 && resistCount === 0) {
    bgColor = weakCount >= 3 ? "#8a1f1f" : "#6b2a2a";
  } else if (weakCount > 0 && resistCount > 0) {
    bgColor = "#4a4020";
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-1"
      style={{ backgroundColor: bgColor }}
      title={`${capitalize(type)}: ${weakCount} weak, ${resistCount} resist, ${immuneCount} immune`}
    >
      <div
        className="mb-0.5 h-1 w-full rounded-full"
        style={{ backgroundColor: typeColors[type as TypeName] }}
      />
      <span className="text-[9px] font-bold uppercase text-[#f0f0e8]">
        {type.slice(0, 3)}
      </span>
      <div className="mt-0.5 flex gap-1 text-[9px]">
        {weakCount > 0 && (
          <span className="text-[#e8433f]">{weakCount}W</span>
        )}
        {resistCount > 0 && (
          <span className="text-[#38b764]">{resistCount}R</span>
        )}
        {immuneCount > 0 && (
          <span className="text-[#98D8D8]">{immuneCount}I</span>
        )}
        {weakCount === 0 && resistCount === 0 && immuneCount === 0 && (
          <span className="text-[#8b9bb4]">-</span>
        )}
      </div>
    </div>
  );
}

interface TeamWeaknessPanelProps {
  team: TeamSlot[];
}

export default function TeamWeaknessPanel({ team }: TeamWeaknessPanelProps) {
  const report: TeamWeaknessReport = useMemo(() => analyzeTeam(team), [team]);

  if (team.length === 0) {
    return (
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-6 text-center font-pixel text-[#8b9bb4]">
        Add Pokemon to your team to see weakness analysis
      </div>
    );
  }

  const threatColor = getThreatColor(report.threatScore);
  const threatLabel = getThreatLabel(report.threatScore);

  return (
    <div className="space-y-4 font-pixel">
      {/* Threat Score */}
      <div className="rounded-xl border border-[#3a4466] bg-[#1a1c2c] p-5">
        <h3 className="mb-3 text-sm font-bold text-[#8b9bb4]">THREAT SCORE</h3>
        <div className="flex items-end gap-3">
          <span
            className="text-5xl font-bold leading-none"
            style={{ color: threatColor }}
          >
            {report.threatScore}
          </span>
          <span
            className="mb-1 text-lg font-semibold"
            style={{ color: threatColor }}
          >
            / 100 &mdash; {threatLabel}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#3a4466]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${report.threatScore}%`,
              backgroundColor: threatColor,
            }}
          />
        </div>
      </div>

      {/* Uncovered Weaknesses */}
      {report.uncoveredWeaknesses.length > 0 && (
        <div className="rounded-xl border border-[#e8433f]/30 bg-[#262b44] p-4">
          <h3 className="mb-3 text-sm font-bold text-[#e8433f]">
            UNCOVERED WEAKNESSES
          </h3>
          <p className="mb-3 text-xs text-[#8b9bb4]">
            3+ team members are weak to these types with no resistor on the team
          </p>
          <div className="flex flex-wrap gap-2">
            {report.uncoveredWeaknesses.map((type) => (
              <TypeBadgeInline key={type} type={type} warning />
            ))}
          </div>
        </div>
      )}

      {/* Defensive Chart */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">
          DEFENSIVE CHART
        </h3>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-18">
          {TYPE_LIST.map((type) => {
            const entry = report.defensiveChart[type];
            return (
              <DefensiveCell
                key={type}
                type={type}
                weakCount={entry.weakCount}
                resistCount={entry.resistCount}
                immuneCount={entry.immuneCount}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#2a5040]" />
            <span className="text-[#8b9bb4]">Resisted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#3a4466]" />
            <span className="text-[#8b9bb4]">Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#6b2a2a]" />
            <span className="text-[#8b9bb4]">Weak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#8a1f1f]" />
            <span className="text-[#8b9bb4]">Critically Weak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#1a3a2a]" />
            <span className="text-[#8b9bb4]">Immune</span>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {report.suggestedTypes.length > 0 && (
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
          <h3 className="mb-3 text-sm font-bold text-[#e8a33f]">
            SUGGESTIONS
          </h3>
          <ul className="space-y-2">
            {report.suggestedTypes.map((suggestion) => (
              <li
                key={suggestion.type}
                className="flex items-start gap-2 text-xs text-[#f0f0e8]"
              >
                <TypeBadgeInline type={suggestion.type} />
                <span className="mt-0.5 leading-relaxed text-[#8b9bb4]">
                  {suggestion.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offensive Coverage */}
      <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#f0f0e8]">
          OFFENSIVE COVERAGE ({report.offensiveCoverage.length}/{TYPE_LIST.length})
        </h3>

        <div className="mb-3">
          <h4 className="mb-2 text-xs font-semibold text-[#38b764]">
            Super Effective Against
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {report.offensiveCoverage.length === 0 ? (
              <span className="text-xs text-[#8b9bb4]">None</span>
            ) : (
              report.offensiveCoverage.map((type) => (
                <TypeBadgeInline key={type} type={type} />
              ))
            )}
          </div>
        </div>

        {report.offensiveGaps.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold text-[#e8433f]">
              No Super Effective Coverage
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.offensiveGaps.map((type) => (
                <TypeBadgeInline key={type} type={type} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
