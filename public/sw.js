self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
// fetch-Handler ist Pflicht damit Chrome beforeinstallprompt feuert
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
