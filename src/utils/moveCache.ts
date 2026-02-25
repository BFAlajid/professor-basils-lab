import { cacheBattleMove, getCachedMoves } from "./battle";

const pendingFetches = new Map<string, Promise<void>>();

export async function fetchAndCacheMove(moveName: string): Promise<void> {
  const cached = getCachedMoves();
  if (cached.has(moveName)) return;

  const existing = pendingFetches.get(moveName);
  if (existing) return existing;

  const promise = fetchMoveImpl(moveName);
  pendingFetches.set(moveName, promise);
  try {
    await promise;
  } finally {
    pendingFetches.delete(moveName);
  }
}

async function fetchMoveImpl(moveName: string): Promise<void> {
  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`
    );
    if (!res.ok) return;
    const data = await res.json();
    cacheBattleMove(moveName, {
      name: data.name,
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
      type: data.type,
      damage_class: data.damage_class,
      priority: data.priority ?? 0,
      meta: data.meta
        ? {
            ailment: data.meta.ailment,
            ailment_chance: data.meta.ailment_chance,
            stat_chance: data.meta.stat_chance,
            min_hits: data.meta.min_hits,
            max_hits: data.meta.max_hits,
            drain: data.meta.drain,
          }
        : undefined,
    });
  } catch {
    // skip
  }
}

export async function fetchAndCacheMoves(moveNames: string[]): Promise<void> {
  await Promise.all(moveNames.map(fetchAndCacheMove));
}
