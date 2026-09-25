"use client";

import { StatusCondition } from "@/types";

interface StatusIconProps {
  status: StatusCondition;
}

const STATUS_CONFIG: Record<string, { label: string; fullName: string; color: string }> = {
  burn: { label: "BRN", fullName: "Burned", color: "#f77622" },
  paralyze: { label: "PAR", fullName: "Paralyzed", color: "#f7a838" },
  poison: { label: "PSN", fullName: "Poisoned", color: "#A855F7" },
  toxic: { label: "TOX", fullName: "Badly Poisoned", color: "#7C3AED" },
  sleep: { label: "SLP", fullName: "Asleep", color: "#6B7280" },
  freeze: { label: "FRZ", fullName: "Frozen", color: "#22D3EE" },
};

export default function StatusIcon({ status }: StatusIconProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-[#f0f0e8]"
      style={{ backgroundColor: config.color }}
      title={config.fullName}
      aria-label={config.fullName}
    >
      {config.label}
    </span>
  );
}
