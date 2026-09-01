import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Russo_One } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Eigene, markante Display-Schrift NUR für "OMA Battle Cards" (Kapitel-Titel,
// Sieg/Niederlage-Screen, Karten-Namen) — grenzt den Spielmodus optisch vom
// Rest der App ab (die weiterhin Space Grotesk/Systemfont nutzt), siehe
// .font-battle in globals.css.
const russoOne = Russo_One({
  subsets: ["latin"],
  variable: "--font-battle",
  weight: "400",
  display: "swap",
});
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemedToaster } from "@/components/ThemedToaster";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CursorGlow } from "@/components/CursorGlow";
import { ExitAppGuard } from "@/components/ExitAppGuard";
import { appBaseUrl } from "@/lib/brand";

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
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning className={`${spaceGrotesk.variable} ${russoOne.variable}`}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);})()`,
          }}
        />
        {/* Service Worker registrieren */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js")}`,
          }}
        />
      </head>
      <body className="antialiased" style={{ background: "var(--bg-base, #080c18)" }}>
        {/* Hex-Grid canvas — fixed, behind content but above body bg */}
        <AnimatedBackground />
        {/* Cursor-Lichtschein — folgt der Maus mit Lerp */}
        <CursorGlow />

        <ThemeProvider>
          <div style={{ position: "relative", zIndex: 2, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
            <SessionProvider>{children}</SessionProvider>
          </div>
          <ThemedToaster />
          <ExitAppGuard />
        </ThemeProvider>
      </body>
    </html>
  );
}
