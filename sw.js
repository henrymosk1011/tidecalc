// Retires the offline cache the original tidecalc installed.
//
// tidecalc.com now redirects to the hlix calculator, but anyone who visited
// the old site still has a cache-first service worker serving the old page.
// Browsers re-check this file on their next visit; this version wipes the
// cache, unregisters itself and reloads open tabs so the redirect takes over.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    self.clients.claim()
      .then(function () { return caches.keys(); })
      .then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      })
  );
});
