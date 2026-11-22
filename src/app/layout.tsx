import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { appBaseUrl } from "@/lib/brand";

// Space Grotesk selbst gehostet (variable Schrift 400–700, Zeichensatz Latein, SIL Open Font License,
// Quelle: Google Fonts). Vorher next/font/google — das lädt die Datei bei jedem Build von Google
// und hat Vercel-Builds hängen bzw. scheitern lassen, wenn Google Fonts nicht erreichbar war.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk.woff2",
  variable: "--font-display",
  weight: "400 700",
  display: "swap",
});

// Plus Jakarta Sans – App-Schrift laut Designentwurf (OMA 2.0, docs/specs/00-design.md). Variable Schrift
// 200–800, Zeichensatz Latein, SIL Open Font License, Quelle: @fontsource-variable/plus-jakarta-sans.
// Space Grotesk bleibt nur für die OBS-Overlays (die lesen --font-display).
const plusJakarta = localFont({
  src: "./fonts/PlusJakartaSans.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  // Ohne metadataBase kann Next die von opengraph-image.tsx erzeugte URL nicht
  // absolut auflösen — Discord/Twitter zeigen dann gar kein Vorschaubild.
  metadataBase: new URL(appBaseUrl()),
  title: "Old Masters Ally – Companion App",
  description: "Events, Turniere und Punktesystem für Old Masters",
  // Kleine Ableitungen statt des 2,24-MB-Originals (scripts/generate-brand-assets.ts)
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/logo-256.png" },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Old Masters Ally",
    locale: "de_DE",
    title: "Old Masters Ally – Companion App",
    description: "Events, Turniere und Punktesystem für Old Masters",
  },
  twitter: {
    card: "summary_large_image",
    title: "Old Masters Ally – Companion App",
    description: "Events, Turniere und Punktesystem für Old Masters",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OMA",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Bewusst minimal: nur Dokument-Gerüst, Schriften und Metadaten. Alles, was zur App-Oberfläche
 * gehört (globals.css, Theme, Session, Hintergrund-Animationen, Service Worker, Zurück-Abfänger),
 * steckt in app/(app)/layout.tsx — die OBS-Overlays unter app/(overlay) bekommen davon nichts
 * mit und müssen nichts per `!important` wieder abschalten.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
