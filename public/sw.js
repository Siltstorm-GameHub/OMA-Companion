self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
// fetch-Handler ist Pflicht damit Chrome beforeinstallprompt feuert
// Nur same-origin GET-Requests abfangen — Cross-Origin-Requests (CDN, Fonts, etc.)
// nicht intercepten, da fehlende CORS-Header den SW in einen Fehlerzustand bringen.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});

// ── Push-Benachrichtigungen ──────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { return; }

  const title   = data.title  ?? "OMA-Companion";
  const options = {
    body:    data.body  ?? "",
    icon:    data.icon  ?? "/OMALogoNew.png",
    badge:   data.badge ?? "/OMALogoNew.png",
    data:    { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      }),
  );
});
