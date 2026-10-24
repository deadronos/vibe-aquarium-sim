/* global self, caches, URL, Response */
/**
 * Offline support for the installed app. Built by `vite-pwa.ts`, which replaces the two
 * placeholders below with this build's file list and a hash of it.
 *
 * - Install precaches the whole app (it is small: scripts, styles, the three fish models).
 * - Pages are network first, so a new deploy is picked up as soon as the visitor is online,
 *   and fall back to the cached page offline.
 * - Everything else in scope is cache first; the file names are content hashed.
 * - Requests made with `cache: 'no-store'` (the post-stack retry and the new-deploy check in
 *   `effectsChunk.ts`) go straight to the network, as they ask.
 */
const VERSION = '__PWA_VERSION__';
const PRECACHE = __PWA_PRECACHE__;
const CACHE = `vibe-aquarium-${VERSION}`;
const scope = self.registration.scope;
const pageUrl = new URL('./', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new URL(path, scope).href)))
      .then(() => self.skipWaiting())
  );
});

// Old caches go once this version takes over. A page still running an old build then loads its
// lazy chunks from the network, and the HUD already explains a chunk that a new deploy removed.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('vibe-aquarium-') && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );
});

const fromNetwork = async (request) => {
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    void caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

const page = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(pageUrl, copy));
    }
    return response;
  } catch (error) {
    const cached = await caches.match(pageUrl);
    if (cached) return cached;
    throw error;
  }
};

const asset = async (request) => (await caches.match(request)) ?? fromNetwork(request);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.cache === 'no-store') return;
  if (!request.url.startsWith(scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
    return;
  }
  event.respondWith(
    asset(request).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))
  );
});
