import type { DecodedSprite } from "@/types/explore";
import { decodeOverworldSprite } from "./gen3RomWasm";

interface CachedSprite {
  width: number;
  height: number;
  frames: Map<string, OffscreenCanvas>; // key: "direction-frameIndex"
}

const cache = new Map<number, CachedSprite>();

function frameToCanvas(
  pixels: number[],
  width: number,
  height: number
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < pixels.length && i < imageData.data.length; i++) {
    imageData.data[i] = pixels[i];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function decodeSprite(
  romBuffer: Uint8Array,
  graphicsId: number
): CachedSprite | null {
  const existing = cache.get(graphicsId);
  if (existing) return existing;

  const sprite = decodeOverworldSprite(romBuffer, graphicsId);
  if (!sprite || sprite.frames.length === 0) return null;

  const frames = new Map<string, OffscreenCanvas>();
  for (const frame of sprite.frames) {
    const key = `${frame.direction}-${frame.frameIndex}`;
    frames.set(key, frameToCanvas(frame.pixels, sprite.width, sprite.height));
  }

  const result: CachedSprite = {
    width: sprite.width,
    height: sprite.height,
    frames,
  };

  cache.set(graphicsId, result);
  return result;
}

export function getSpriteFrame(
  graphicsId: number,
  direction: string,
  frameIndex: number
): OffscreenCanvas | null {
  const sprite = cache.get(graphicsId);
  if (!sprite) return null;

  // Walking animation cycle: 0-1-2-1
  const walkCycle = [0, 1, 2, 1];
  const actualFrame = walkCycle[frameIndex % walkCycle.length];
  const key = `${direction}-${actualFrame}`;
  return sprite.frames.get(key) || sprite.frames.get(`${direction}-0`) || null;
}

export function getCachedSprite(graphicsId: number): CachedSprite | null {
  return cache.get(graphicsId) || null;
}

export function clearSpriteCache(): void {
  cache.clear();
}

export type { CachedSprite };
