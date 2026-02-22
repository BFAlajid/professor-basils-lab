// Service Worker for Professor Basil's Lab
// Cache versioning — bump these to invalidate old caches on update
const APP_SHELL_CACHE = "app-shell-v1";
const POKEAPI_CACHE = "pokeapi-v1";
const SPRITE_CACHE = "sprites-v1";

// Static assets to precache on install (app shell)
const APP_SHELL_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
];

// --- Install: precache the app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  // Activate immediately instead of waiting for old SW to retire
  self.skipWaiting();
});

// --- Activate: clean up old versioned caches ---
self.addEventListener("activate", (event) => {
  const currentCaches = [APP_SHELL_CACHE, POKEAPI_CACHE, SPRITE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// --- Fetch: routing strategies ---
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Strategy 1: Sprites / images from PokeAPI — cache-first
  // Once a sprite is loaded, it never changes, so serve from cache forever
  if (
    url.hostname === "raw.githubusercontent.com" &&
    url.pathname.includes("/PokeAPI/sprites/")
  ) {
    event.respondWith(cacheFirst(event.request, SPRITE_CACHE));
    return;
  }

  // Strategy 2: PokeAPI data — network-first with cache fallback
  // This ensures fresh data when online but still works offline
  if (url.hostname === "pokeapi.co") {
    event.respondWith(networkFirst(event.request, POKEAPI_CACHE));
    return;
  }

  // Strategy 3: App shell / static assets — cache-first
  // Next.js static chunks, CSS, HTML, fonts, local assets
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
    return;
  }
});

// --- Cache-first strategy ---
// Check cache, return if found; otherwise fetch from network and cache the response
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not in cache — return a basic offline response
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

// --- Network-first strategy ---
// Try network; if it fails, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "application/json" },
    });
  }
}
