// Maat service worker. It stores only the "no connection" page. Everything else, including
// every page with account data, always comes from the network.
const CACHE = "maat-offline-v1";
const OFFLINE_PAGE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_PAGE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => await caches.match(OFFLINE_PAGE) ?? Response.error()));
});
