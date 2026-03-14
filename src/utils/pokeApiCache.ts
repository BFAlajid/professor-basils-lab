// ── Shared PokeAPI Cached Fetch ────────────────────────────────────
// In-memory cache for all PokeAPI resource types.
// Every module should import from here instead of raw fetch().

const pokemonCache = new Map<string, any>();
const speciesCache = new Map<string, any>();
const moveCache = new Map<string, any>();
const abilityCache = new Map<string, any>();
const genericCache = new Map<string, any>();

// Dedup in-flight requests so parallel callers share one fetch
const inflight = new Map<string, Promise<any>>();

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

async function cachedFetch(url: string, cache: Map<string, any>): Promise<any> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`PokeAPI ${res.status}: ${url}`);
      return res.json();
    })
    .then((data) => {
      cache.set(url, data);
      inflight.delete(url);
      return data;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });

  inflight.set(url, promise);
  return promise;
}

/** Fetch /pokemon/{idOrName} — full Pokemon object */
export async function fetchPokemonCached(idOrName: string | number): Promise<any> {
  const url = `${POKEAPI_BASE}/pokemon/${idOrName}`;
  return cachedFetch(url, pokemonCache);
}

/** Fetch /pokemon-species/{idOrName} */
export async function fetchSpeciesCached(idOrName: string | number): Promise<any> {
  const url = `${POKEAPI_BASE}/pokemon-species/${idOrName}`;
  return cachedFetch(url, speciesCache);
}

/** Fetch /move/{idOrName} */
export async function fetchMoveCached(idOrName: string | number): Promise<any> {
  const url = `${POKEAPI_BASE}/move/${idOrName}`;
  return cachedFetch(url, moveCache);
}

/** Fetch /ability/{idOrName} */
export async function fetchAbilityCached(idOrName: string | number): Promise<any> {
  const url = `${POKEAPI_BASE}/ability/${idOrName}`;
  return cachedFetch(url, abilityCache);
}

/** Fetch any PokeAPI URL (evolution chains, list endpoints, etc.) */
export async function fetchPokeApiCached(url: string): Promise<any> {
  return cachedFetch(url, genericCache);
}

/** Fetch /pokemon?limit=N&offset=M (list endpoint) */
export async function fetchPokemonListCached(
  limit: number = 1025,
  offset: number = 0
): Promise<{ count: number; results: { name: string; url: string }[] }> {
  const url = `${POKEAPI_BASE}/pokemon?limit=${limit}&offset=${offset}`;
  return cachedFetch(url, genericCache);
}
