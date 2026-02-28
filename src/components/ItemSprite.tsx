"use client";

import { useState } from "react";
import Image from "@/components/PokeImage";

const ITEM_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

interface ItemSpriteProps {
  name: string;
  size?: number;
  fallbackColor?: string;
  className?: string;
  alt?: string;
}

export default function ItemSprite({
  name,
  size = 24,
  fallbackColor,
  className = "",
  alt,
}: ItemSpriteProps) {
  const [failed, setFailed] = useState(false);

  if (failed && fallbackColor) {
    return (
      <span
        className={`inline-block rounded-full shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: fallbackColor,
        }}
      />
    );
  }

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded shrink-0 bg-[#3a4466] text-[#8b9bb4] ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, size * 0.4),
        }}
      >
        ?
      </span>
    );
  }

  return (
    <Image
      src={`${ITEM_SPRITE_BASE}/${name}.png`}
      alt={alt ?? name.replace(/-/g, " ")}
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 ${className}`}
      style={{ imageRendering: "pixelated" }}
      onError={() => setFailed(true)}
    />
  );
}
