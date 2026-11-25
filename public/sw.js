// Maat service worker. It shows notifications, and it stores only the "no connection" page.
// Everything else, including every page with account data, always comes from the network.
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

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () => await caches.match(OFFLINE_PAGE) ?? Response.error()));
});
