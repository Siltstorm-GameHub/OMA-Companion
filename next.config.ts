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
  // OMA Battle Cards ist auf OMA Gems reduziert (siehe docs/gems-reduktion-plan.md). Bewusst
  // vorübergehende Weiterleitungen (307), solange die Umstellung nicht abgeschlossen ist — 308
  // würden Browser dauerhaft cachen.
  async redirects() {
    return [
      // Der Shop ist ein Reiter im Gems-Hub.
      { source: "/shop", destination: "/gems?tab=laden", permanent: false },
      { source: "/battle-cards/:path*", destination: "/gems/:path*", permanent: false },
      // OMA Quest (vormals /dnd) und OMA Duels sind abgeschaltet.
      { source: "/oma-quest/:path*", destination: "/gems", permanent: false },
      { source: "/dnd/:path*", destination: "/gems", permanent: false },
      { source: "/gems/:sub(challenges|duel-deck|my-card|leaderboard)", destination: "/gems", permanent: false },
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
      // Vercel Blob (Event-Cover, Profil-Banner, Abzeichen — siehe /api/upload)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
