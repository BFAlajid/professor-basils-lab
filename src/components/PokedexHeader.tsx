"use client";

interface ProgressRingProps {
  percent: number;
  size: number;
  strokeWidth: number;
}

function ProgressRing({ percent, size, strokeWidth }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#3a4466"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e8433f"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

interface PokedexHeaderProps {
  totalSeen: number;
  totalCaught: number;
  totalPokemon: number;
  completionPercent: number;
  showHabitat: boolean;
  onToggleHabitat: () => void;
  showResetConfirm: boolean;
  onShowResetConfirm: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
}

export default function PokedexHeader({
  totalSeen,
  totalCaught,
  totalPokemon,
  completionPercent,
  showHabitat,
  onToggleHabitat,
  showResetConfirm,
  onShowResetConfirm,
  onCancelReset,
  onConfirmReset,
}: PokedexHeaderProps) {
  return (
    <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-bold font-pixel text-[#f0f0e8] mb-3">
            Pok&eacute;dex
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-[#8b9bb4]">Seen: </span>
              <span className="font-bold text-[#f0f0e8]">{totalSeen}</span>
            </div>
            <div>
              <span className="text-[#8b9bb4]">Caught: </span>
              <span className="font-bold text-[#f0f0e8]">{totalCaught}</span>
            </div>
            <div>
              <span className="text-[#8b9bb4]">Total: </span>
              <span className="font-bold text-[#f0f0e8]">{totalPokemon}</span>
            </div>
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <ProgressRing percent={completionPercent} size={100} strokeWidth={8} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-[#f0f0e8]">
              {completionPercent}%
            </span>
            <span className="text-[10px] text-[#8b9bb4]">Complete</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onToggleHabitat}
          className={`rounded px-3 py-1 text-xs font-pixel transition-colors ${
            showHabitat
              ? "bg-[#38b764] text-[#f0f0e8]"
              : "bg-[#3a4466] text-[#8b9bb4] hover:bg-[#4a5476] hover:text-[#f0f0e8]"
          }`}
        >
          Habitat
        </button>
        <div>
          {showResetConfirm ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8b9bb4]">Reset all data?</span>
              <button
                onClick={onConfirmReset}
                className="rounded bg-[#e8433f] px-3 py-1 text-[#f0f0e8] hover:bg-[#c9362f] transition-colors font-pixel"
              >
                Yes
              </button>
              <button
                onClick={onCancelReset}
                className="rounded bg-[#3a4466] px-3 py-1 text-[#f0f0e8] hover:bg-[#4a5476] transition-colors font-pixel"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={onShowResetConfirm}
              className="rounded bg-[#3a4466] px-3 py-1 text-xs text-[#8b9bb4] hover:bg-[#4a5476] hover:text-[#f0f0e8] transition-colors font-pixel"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
