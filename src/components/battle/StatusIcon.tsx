"use client";

import { StatusCondition } from "@/types";

interface StatusIconProps {
  status: StatusCondition;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  burn: { label: "BRN", color: "#f77622" },
  paralyze: { label: "PAR", color: "#f7a838" },
  poison: { label: "PSN", color: "#A855F7" },
  toxic: { label: "TOX", color: "#7C3AED" },
  sleep: { label: "SLP", color: "#6B7280" },
  freeze: { label: "FRZ", color: "#22D3EE" },
};

export default function StatusIcon({ status }: StatusIconProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-[#f0f0e8]"
      style={{ backgroundColor: config.color }}
    >
      {config.label}
    </span>
  );
}
