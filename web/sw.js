/**
 * Always the newest game: every file is checked with the website when the game opens (a
 * cheap "unchanged" answer when nothing changed), so phones never mix old and new files.
 * Offline, the last copy is used. Only this site's own small files are kept.
 */
const CACHE = 'yilmaz-ailesi';
const KEEP_MAX = 5 * 1024 * 1024; // bytes: big files (voices, models) are not copied

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    const size = Number(res.headers.get('content-length') ?? 0);
    if (res.ok && res.type === 'basic' && size < KEEP_MAX) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit ?? Response.error())));
});
