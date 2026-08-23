import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // sharp (Discord-Cover-Generierung, siehe src/lib/branded-cover.ts) wird von der automatischen
  // Output-File-Tracing manchmal nicht korrekt mit seinen nativen Plattform-Binaries (@img/sharp-*)
  // ins Vercel-Deployment übernommen -> ERR_DLOPEN_FAILED zur Laufzeit. Explizit einschließen behebt das.
  outputFileTracingIncludes: {
    "/*": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
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
