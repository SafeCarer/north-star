// North Star service worker: always the latest version when online, still works offline.
// Bump VERSION (and APP_VERSION in app.js) whenever you change app files.
const VERSION = 'northstar-v5';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
const NET_TIMEOUT_MS = 3000; // on a weak signal, fall back to the saved copy after 3 seconds

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache, so we never save an old file as the "new" version
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'ns-ics').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Calendar reminders: the page stores a generated .ics in Cache Storage, we serve it from our https URL
  if (/\/cal\/[^/]+\.ics$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((r) => r || new Response('This reminder link has expired. Tap the button in North Star again.', { status: 404 })));
    return;
  }

  // Network-first: fresh files when online, the saved copy when offline or the signal is slow.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const network = fetch(new Request(url.href, { cache: 'no-cache' }))
      .then((res) => {
        // Safari refuses redirected responses for page loads: rebuild a clean one
        if (res.redirected) res = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
        if (res.ok) cache.put(key, res.clone());
        return res;
      });
    const cached = await cache.match(key, { ignoreSearch: true });
    if (!cached) return network.catch(() => Response.error());
    return Promise.race([
      network.catch(() => cached),
      new Promise((resolve) => setTimeout(() => resolve(cached), NET_TIMEOUT_MS)),
    ]);
  })());
});
