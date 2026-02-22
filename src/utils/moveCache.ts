import { cacheBattleMove, getCachedMoves } from "./battle";

/**
 * Fetch a move from PokeAPI and cache it as BattleMoveData.
 * Skips if already cached. Returns silently on failure.
 */
export async function fetchAndCacheMove(moveName: string): Promise<void> {
  const cached = getCachedMoves();
  if (cached.has(moveName)) return;

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

/**
 * Fetch and cache multiple moves in parallel.
 */
export async function fetchAndCacheMoves(moveNames: string[]): Promise<void> {
  await Promise.all(moveNames.map(fetchAndCacheMove));
}
