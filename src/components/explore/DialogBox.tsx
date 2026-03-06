"use client";

import { useEffect, useRef, useState } from "react";
import type { DialogState } from "@/types/explore";

interface DialogBoxProps {
  dialog: DialogState;
  onAdvance: () => void;
}

const CHARS_PER_SEC = 30;

export default function DialogBox({ dialog, onAdvance }: DialogBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLine = dialog.lines[dialog.currentLine] ?? "";

  useEffect(() => {
    if (dialog.isComplete) {
      setDisplayedText(currentLine);
      return;
    }

    setDisplayedText("");
    let charIdx = 0;

    intervalRef.current = setInterval(() => {
      charIdx++;
      setDisplayedText(currentLine.slice(0, charIdx));
      if (charIdx >= currentLine.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onAdvance(); // mark line complete
      }
    }, 1000 / CHARS_PER_SEC);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dialog.currentLine, dialog.isComplete, currentLine, onAdvance]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 p-2"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="rounded-lg border-2 px-4 py-3 mx-auto max-w-lg"
        style={{
          backgroundColor: "#262b44",
          borderColor: "#3a4466",
          color: "#f0f0e8",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.5",
          minHeight: "60px",
        }}
        onClick={onAdvance}
        role="dialog"
        aria-live="polite"
      >
        <p>{displayedText}</p>
        {dialog.isComplete && (
          <span
            className="block text-right text-xs mt-1 animate-pulse"
            style={{ color: "#8b9bb4" }}
          >
            {dialog.currentLine < dialog.lines.length - 1 ? "▼" : "✕"}
          </span>
        )}
      </div>
    </div>
  );
}
