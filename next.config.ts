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
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },
  // OMA Battle Cards ist auf OMA Gems reduziert (siehe docs/gems-reduktion-plan.md) — alte Links
  // leiten dauerhaft (308) weiter.
  async redirects() {
    return [
      // Der Shop ist ein Reiter im Gems-Hub.
      { source: "/shop", destination: "/gems?tab=laden", permanent: true },
      // Alte Seiten-URLs von Battle Cards
      { source: "/battle-cards", destination: "/gems", permanent: true },
      { source: "/battle-cards/:page(live|battles|lineup|leaderboard)", destination: "/gems/:page", permanent: true },
      { source: "/battle-cards/:page(live|battles|lineup|leaderboard)/:rest+", destination: "/gems/:page/:rest+", permanent: true },
      { source: "/battle-cards/:page(challenges|duel-deck|my-card)", destination: "/gems", permanent: true },
      // Alte Asset-URLs: Grafiken und Sounds lagen bis Phase 5 unter /battle-cards/ und wurden von
      // einer früheren Pauschal-Weiterleitung (308, von Browsern gecacht) auf /gems/… umgeleitet.
      // Sie liegen jetzt unter /gems-assets/ — beide Wege führen dorthin.
      { source: "/battle-cards/:asset*", destination: "/gems-assets/:asset*", permanent: true },
      { source: "/gems/:asset(.+\\.(?:png|jpe?g|webp|gif|svg|wav|ogg|mp3))", destination: "/gems-assets/:asset", permanent: true },
      // OMA Quest (vormals /dnd) und OMA Duels sind entfernt.
      { source: "/oma-quest/:path*", destination: "/gems", permanent: true },
      { source: "/dnd/:path*", destination: "/gems", permanent: true },
      { source: "/gems/:sub(challenges|duel-deck|my-card)", destination: "/gems", permanent: true },
      // Interne Umbenennung battle-cards → gems: Admin-Bereich dauerhaft, die Spiel-API nur
      // vorübergehend (307 behält POST und Body), damit noch offene Tabs mit altem JS weiterlaufen.
      { source: "/admin/battle-cards/:path*", destination: "/admin/gems/:path*", permanent: true },
      { source: "/api/battle-cards/:path*", destination: "/api/gems/:path*", permanent: false },
      { source: "/api/admin/battle-cards/:path*", destination: "/api/admin/gems/:path*", permanent: false },
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
