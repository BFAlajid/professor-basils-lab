"use client";

import { useEffect, useState, useRef } from "react";

interface ExploreHUDProps {
  mapName: string | null;
}

export default function ExploreHUD({ mapName }: ExploreHUDProps) {
  const [visible, setVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mapName) return;

    setDisplayName(mapName);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mapName]);

  if (!displayName) return null;

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg transition-opacity duration-500 pointer-events-none"
      style={{
        backgroundColor: "rgba(38, 43, 68, 0.9)",
        borderColor: "#3a4466",
        border: "1px solid #3a4466",
        color: "#f0f0e8",
        fontFamily: "monospace",
        fontSize: "12px",
        opacity: visible ? 1 : 0,
      }}
    >
      {displayName}
    </div>
  );
}
