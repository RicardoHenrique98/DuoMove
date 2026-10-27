// Funciona offline: arquivos do app em cache; imagens dos exercícios guardadas quando vistas
const VERSION = 'duo-move-v2.3.0';
const CORE = ['./', './index.html', './css/style.css', './manifest.webmanifest', './icon.png',
  './js/app.js', './js/router.js', './js/store.js', './js/data.js', './js/util.js', './js/ui.js', './js/stats.js', './js/charts.js', './js/workout.js', './js/coach.js', './js/techniques.js',
  './js/views/home.js', './js/views/routines.js', './js/views/history.js', './js/views/progress.js', './js/views/profile.js', './js/views/live.js', './js/views/picker.js'];
const IMAGES = 'duo-move-img';

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMAGES).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(IMAGES).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // Rede primeiro (pega atualizações), cache se estiver offline
  e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
