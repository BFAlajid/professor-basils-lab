"use client";

import { memo } from "react";
import Image from "@/components/PokeImage";

interface PokedexEntryProps {
  id: number;
  isCaught: boolean;
  isSeen: boolean;
  name: string | undefined;
  spriteUrl: string;
}

function formatDexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export default memo(function PokedexEntry({ id, isCaught, isSeen, name, spriteUrl }: PokedexEntryProps) {
  const bgColor = isCaught ? "bg-[#2a5040]" : isSeen ? "bg-[#3a4466]" : "bg-[#1a1c2c]";

  return (
    <div
      className={`${bgColor} rounded-lg p-2 flex flex-col items-center gap-1 border border-[#3a4466] transition-colors`}
      title={
        isCaught
          ? `${name} - Caught`
          : isSeen
            ? `${name} - Seen`
            : `??? - Unknown`
      }
    >
      <div className="relative h-12 w-12 flex items-center justify-center">
        {isSeen ? (
          <Image
            src={spriteUrl}
            alt={name ?? `Pokemon #${id}`}
            width={48}
            height={48}
            unoptimized
            className={isCaught ? "" : "brightness-50 contrast-125"}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#262b44] text-[#3a4466]">
            <span className="text-lg font-bold">?</span>
          </div>
        )}
      </div>
      <span className="text-[9px] text-[#8b9bb4] font-pixel">
        {formatDexNumber(id)}
      </span>
      <span className="text-[8px] text-center text-[#f0f0e8] font-pixel capitalize truncate w-full">
        {isSeen ? name : "???"}
      </span>
    </div>
  );
});
