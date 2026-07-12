import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemedToaster } from "@/components/ThemedToaster";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CursorGlow } from "@/components/CursorGlow";

export const metadata: Metadata = {
  title: "Old Masters Ally – Companion App",
  description: "Events, Turniere und Punktesystem für Old Masters",
  icons: { icon: "/OMALogoNew.png", apple: "/OMALogoNew.png" },
  manifest: "/manifest.json",
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
    <html lang="de" data-theme="dark" suppressHydrationWarning className={spaceGrotesk.variable}>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
