// Fen Smash service worker: cache the app shell so the game plays offline.
var CACHE = 'fensmash-v1';
var FILES = ['./', 'index.html', 'style.css', 'sim.js', 'levels.js', 'fx.js', 'specials.js', 'game.js', 'manifest.webmanifest', 'icons/icon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf('fensmash-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return r; }).catch(function () { return hit; });
    return hit || net;
  }));
});
