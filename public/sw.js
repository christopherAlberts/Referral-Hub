/* Referral Hub service worker — push + offline shell */
const CACHE = "referral-hub-v3";
const PRECACHE = ["/", "/login", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  // iOS requires a visible notification for every push. Keep options minimal —
  // WebKit ignores icon/badge/vibrate and can be picky about extras.
  const show = async () => {
    let title = "Referral Hub";
    let body = "Please update today’s capacity.";
    let url = "/therapist";

    try {
      if (event.data) {
        const data = event.data.json();
        if (data && typeof data === "object") {
          if (typeof data.title === "string" && data.title.trim()) title = data.title;
          if (typeof data.body === "string" && data.body.trim()) body = data.body;
          if (typeof data.url === "string" && data.url.trim()) url = data.url;
        }
      }
    } catch {
      try {
        const text = event.data?.text?.();
        if (text) body = text;
      } catch {
        // keep defaults
      }
    }

    await self.registration.showNotification(title, {
      body,
      tag: "referral-hub",
      data: { url },
    });
  };

  event.waitUntil(show());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/therapist";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
