import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Kennung dieses Builds — wird beim Build fest in Server- UND Browser-Code eingesetzt. Die
  // OBS-Overlays vergleichen damit ihren geladenen Code mit dem des Servers und laden sich nach
  // einem Deployment selbst neu (OBS-Browserquellen lädt sonst niemand je neu, siehe
  // useOverlayStream). Lokal "dev", dann findet nie ein Neuladen statt.
  env: {
    OMA_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // sharp (Discord-Cover-Generierung, siehe src/lib/branded-cover.ts) wird von der automatischen
  // Output-File-Tracing manchmal nicht korrekt mit seinen nativen Plattform-Binaries (@img/sharp-*)
  // ins Vercel-Deployment übernommen -> ERR_DLOPEN_FAILED zur Laufzeit. Explizit einschließen behebt das.
  // NUR für Routen, die sharp (direkt oder über branded-cover → discord-events → event-publish /
  // event-lifecycle) importieren: vorher hing "/*" die ~20-40 MB nativen Binaries an JEDE
  // Function und sprengte fast das Free-Plan-Limit "Functions Storage". Neue Routen, die eine
  // dieser Libs importieren, hier ergänzen (discord-events fällt ohne sharp auf "kein Cover" zurück).
  outputFileTracingIncludes: Object.fromEntries(
    [
      // Seiten (event-lifecycle veröffentlicht fällige Events lazy beim Rendern)
      "/admin/events", "/admin/events/*", "/admin/series/*", "/dashboard", "/events", "/tournament/*",
      // API
      "/api/admin/event-series/generate", "/api/admin/events", "/api/admin/events/**", "/api/admin/series/**",
      "/api/cron/close-event-polls", "/api/cron/event-reminders",
      "/api/discord/cover/*", "/api/discord/podium/*",
      "/api/events", "/api/events/series", "/api/sync", "/api/upload",
    // public/event-covers: Vorlagen-Cover, die branded-cover.ts für Discord von der Platte liest
    ].map((route) => [route, ["node_modules/sharp/**/*", "node_modules/@img/**/*", "public/event-covers/**/*"]]),
  ),
  // Der Games-Hub liegt unter /games (nur noch OMA Blocks). OMA Gems ist entfernt, ebenso das frühere
  // Karten-/Kampfsystem (Battle Cards), OMA Quest und OMA Duels — alte Links leiten dauerhaft (308) weiter.
  async redirects() {
    return [
      { source: "/blocks", destination: "/games/blocks", permanent: false },
      // Bis 2026-11 lag der Hub unter /gems — OMA Blocks zieht mit, alles andere landet im Hub.
      { source: "/gems/blocks", destination: "/games/blocks", permanent: true },
      { source: "/gems/blocks/:path+", destination: "/games/blocks/:path+", permanent: true },
      { source: "/gems", destination: "/games", permanent: true },
      { source: "/gems/:path+", destination: "/games", permanent: true },
      { source: "/gems-assets/:path+", destination: "/games", permanent: true },
      { source: "/battle-cards", destination: "/games", permanent: true },
      { source: "/battle-cards/:path+", destination: "/games", permanent: true },
      { source: "/oma-quest/:path*", destination: "/games", permanent: true },
      { source: "/dnd/:path*", destination: "/games", permanent: true },
      { source: "/admin/gems", destination: "/admin/minigames", permanent: true },
      { source: "/admin/gems/:path+", destination: "/admin/minigames", permanent: true },
      { source: "/admin/battle-cards/:path*", destination: "/admin/minigames", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      // Discord CDN (avatars, server icons)
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" },
      // GitHub avatars (falls NextAuth GitHub-Provider)
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Google (falls NextAuth Google-Provider)
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // Allgemeiner Fallback für weitere OAuth-Provider
      { protocol: "https", hostname: "*.githubusercontent.com" },
      // Twitch (Partner-Logos, Stream-Thumbnails)
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      // Vercel Blob (Event-Cover, Abzeichen — siehe /api/upload)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
