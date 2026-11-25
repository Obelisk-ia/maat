// Maat service worker.
// - Shows push notifications and opens the matching card.
// - Keeps the offline fallback page for failed document navigations.
// - Cache-first local storage for immutable card media (/api/media/*) and static art (/maat/*, /icons/*),
//   shared across every role (owner, staff, client). Because every uploaded card image receives a brand-new
//   Convex storageId, updating a logo/background/cover automatically requests a new URL with zero stale cache.
const OFFLINE_CACHE = "maat-offline-v1";
const MEDIA_CACHE = "maat-media-v1";
const KEEP_CACHES = new Set([OFFLINE_CACHE, MEDIA_CACHE]);
const OFFLINE_PAGE = "/offline.html";
const MAX_MEDIA_ENTRIES = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_PAGE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !KEEP_CACHES.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() ?? {};
  } catch {
    // An unreadable message still has to show something.
  }
  // Browsers require every push to show a notification, or they withdraw permission.
  event.waitUntil(self.registration.showNotification(String(message.title || "Maat"), {
    body: String(message.body || ""),
    icon: "/icons/maat-192.png",
    // Android's status bar uses only the shape.
    badge: "/icons/maat-badge.png",
    tag: message.tag || undefined,
    // When it replaces an earlier one, still sound or vibrate. Browsers allow this only with a tag.
    renotify: Boolean(message.tag),
    data: { url: message.url },
  }));
});

/** Shows a notification's page: in a window that's already open, or a new one. Only our own pages. */
async function showPage(wanted) {
  const target = new URL(typeof wanted === "string" ? wanted : "/cuenta", self.location.origin);
  const path = target.origin === self.location.origin ? target.pathname + target.search : "/cuenta";
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const open = windows.find((client) => client.visibilityState === "visible") ?? windows[0];
  if (!open) return self.clients.openWindow(path);
  // The page decides whether it can show this without reloading.
  open.postMessage({ type: "maat:open", url: path });
  await open.focus().catch(() => {});
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(showPage(event.notification.data?.url));
});

function isCacheableMedia(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/api/media/") ||
    url.pathname.startsWith("/maat/") ||
    url.pathname.startsWith("/icons/")
  );
}

async function trimMediaCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_MEDIA_ENTRIES) return;
  const excess = keys.length - MAX_MEDIA_ENTRIES;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function cacheFirstMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      await cache.put(request, response.clone());
      void trimMediaCache(cache);
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (isCacheableMedia(event.request)) {
    event.respondWith(cacheFirstMedia(event.request));
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => await caches.match(OFFLINE_PAGE) ?? Response.error()));
});
