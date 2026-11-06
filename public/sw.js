// Service worker: lets the app open offline once it has been loaded over HTTPS.
// `scripts/make-sw.mjs` fills in PRECACHE and VERSION after each build.
const PRECACHE = ['./'];
const VERSION = 'dev';

const APP = 'my-week-app-' + VERSION;
const TILES = 'my-week-tiles';   // map tiles you have already looked at
const ROUTES = 'my-week-routes'; // road routes you have already looked at
const KEEP = [APP, TILES, ROUTES];
const MAX_TILES = 600;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('my-week-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Map tiles: use the saved copy if there is one, otherwise fetch and save.
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(TILES, MAX_TILES); }
        return res;
      }),
    );
    return;
  }

  // Routes: try the network first, fall back to the last saved answer.
  if (url.hostname === 'router.project-osrm.org') {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) caches.open(ROUTES).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    );
    return;
  }

  // The app itself: saved copy first, so it opens instantly and offline.
  if (url.origin === location.origin) {
    e.respondWith(
      // ignoreVary: module scripts send an Origin header the cached copy was not fetched with
      caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : Response.error()));
      }),
    );
  }
});
