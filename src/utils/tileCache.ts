import type { DecodedMetatile } from "@/types/explore";
import { decodeTilesetPair } from "./gen3RomWasm";

const METATILE_SIZE = 16;

interface CachedTileset {
  baseCanvases: OffscreenCanvas[];
  overlayCanvases: OffscreenCanvas[];
  behaviors: number[];
  passable: boolean[];
  isGrass: boolean[];
  isWater: boolean[];
  isLedge: boolean[];
  ledgeDirections: (string | null)[];
}

const cache = new Map<string, CachedTileset>();

function makeKey(primaryPtr: number, secondaryPtr: number): string {
  return `${primaryPtr}-${secondaryPtr}`;
}

function metatileToCanvas(pixels: number[]): OffscreenCanvas {
  const canvas = new OffscreenCanvas(METATILE_SIZE, METATILE_SIZE);
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(METATILE_SIZE, METATILE_SIZE);

  for (let i = 0; i < pixels.length && i < imageData.data.length; i++) {
    imageData.data[i] = pixels[i];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function decodeTileset(
  romBuffer: Uint8Array,
  primaryPtr: number,
  secondaryPtr: number
): CachedTileset | null {
  const key = makeKey(primaryPtr, secondaryPtr);
  const existing = cache.get(key);
  if (existing) return existing;

  const metatiles = decodeTilesetPair(romBuffer, primaryPtr, secondaryPtr);
  if (!metatiles || metatiles.length === 0) {
    console.error("[tileCache] decodeTilesetPair returned null/empty for", primaryPtr, secondaryPtr);
    return null;
  }

  const result: CachedTileset = {
    baseCanvases: [],
    overlayCanvases: [],
    behaviors: [],
    passable: [],
    isGrass: [],
    isWater: [],
    isLedge: [],
    ledgeDirections: [],
  };

  for (const mt of metatiles) {
    result.baseCanvases.push(metatileToCanvas(mt.basePixels));
    result.overlayCanvases.push(metatileToCanvas(mt.overlayPixels));
    result.behaviors.push(mt.behavior);
    result.passable.push(mt.passable);
    result.isGrass.push(mt.isGrass);
    result.isWater.push(mt.isWater);
    result.isLedge.push(mt.isLedge);
    result.ledgeDirections.push(mt.ledgeDirection);
  }

  cache.set(key, result);
  return result;
}

export function getCachedTileset(
  primaryPtr: number,
  secondaryPtr: number
): CachedTileset | null {
  return cache.get(makeKey(primaryPtr, secondaryPtr)) || null;
}

export function clearTileCache(): void {
  cache.clear();
}

export type { CachedTileset };
