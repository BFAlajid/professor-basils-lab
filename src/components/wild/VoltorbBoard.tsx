"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { useVoltorbFlip } from "@/hooks/useVoltorbFlip";

type VoltorbFlipState = ReturnType<typeof useVoltorbFlip>["state"];

interface VoltorbBoardProps {
  state: VoltorbFlipState;
  isPlaying: boolean;
  onFlip: (row: number, col: number) => void;
}

// ── Tile display ─────────────────────────────────────────────────────────

function TileCell({
  value,
  revealed,
  onClick,
  disabled,
  row,
  col,
}: {
  value: number;
  revealed: boolean;
  onClick: () => void;
  disabled: boolean;
  row: number;
  col: number;
}) {
  const colors: Record<number, { bg: string; text: string; label: string }> = {
    0: { bg: "#e8433f", text: "#f0f0e8", label: "V" },
    1: { bg: "#3a4466", text: "#8b9bb4", label: "1" },
    2: { bg: "#38b764", text: "#f0f0e8", label: "2" },
    3: { bg: "#f7a838", text: "#1a1c2c", label: "3" },
  };

  const c = colors[value] ?? colors[1];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || revealed}
      aria-label={revealed ? (value === 0 ? `Voltorb at row ${row + 1} column ${col + 1}` : `Tile value ${value} at row ${row + 1} column ${col + 1}`) : `Flip tile row ${row + 1} column ${col + 1}`}
      className="relative w-full aspect-square rounded-md border-2 font-pixel text-sm flex items-center justify-center transition-colors select-none"
      style={{
        backgroundColor: revealed ? c.bg : "#262b44",
        borderColor: revealed ? c.bg : "#3a4466",
        color: revealed ? c.text : "#3a4466",
        cursor: disabled || revealed ? "default" : "pointer",
      }}
      whileHover={!disabled && !revealed ? { scale: 1.08 } : {}}
      whileTap={!disabled && !revealed ? { scale: 0.92 } : {}}
    >
      <AnimatePresence mode="wait">
        {revealed ? (
          <motion.span
            key="revealed"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="font-pixel text-sm font-bold"
          >
            {value === 0 ? (
              <span className="flex items-center justify-center">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    background: "linear-gradient(to bottom, #e8433f 50%, #f0f0e8 50%)",
                    border: "2px solid #1a1c2c",
                  }}
                />
              </span>
            ) : (
              c.label
            )}
          </motion.span>
        ) : (
          <motion.span
            key="hidden"
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] text-[#8b9bb4]"
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Hint badge ───────────────────────────────────────────────────────────

function HintBadge({ total, voltorbs }: { total: number; voltorbs: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md bg-[#1a1c2c] border border-[#3a4466] p-1 text-center w-full aspect-square">
      <span className="text-[9px] font-pixel text-[#f0f0e8] leading-tight">
        &Sigma;:{total}
      </span>
      <span className="text-[9px] font-pixel text-[#e8433f] leading-tight">
        V:{voltorbs}
      </span>
    </div>
  );
}

export default function VoltorbBoard({ state, isPlaying, onFlip }: VoltorbBoardProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-block">
        {/* Main grid with right-side row hints */}
        <div className="flex gap-1">
          {/* 5x5 tile grid */}
          <div className="grid grid-cols-5 gap-1" style={{ width: 220 }}>
            {state.board.map((row, ri) =>
              row.map((val, ci) => (
                <TileCell
                  key={`${ri}-${ci}`}
                  value={val}
                  revealed={state.revealed[ri][ci]}
                  onClick={() => onFlip(ri, ci)}
                  disabled={!isPlaying}
                  row={ri}
                  col={ci}
                />
              ))
            )}
          </div>

          {/* Row hints (right side) */}
          <div className="flex flex-col gap-1" style={{ width: 40 }}>
            {state.rowHints.map((hint, i) => (
              <HintBadge key={`rh-${i}`} total={hint.total} voltorbs={hint.voltorbs} />
            ))}
          </div>
        </div>

        {/* Column hints (bottom) */}
        <div className="flex gap-1 mt-1">
          <div className="grid grid-cols-5 gap-1" style={{ width: 220 }}>
            {state.colHints.map((hint, i) => (
              <HintBadge key={`ch-${i}`} total={hint.total} voltorbs={hint.voltorbs} />
            ))}
          </div>
          {/* Empty corner space to align with row hints */}
          <div style={{ width: 40 }} />
        </div>
      </div>
    </div>
  );
}
