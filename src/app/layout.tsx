import type { Metadata, Viewport } from "next"; // Viewport wird für den viewport-Export benötigt
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CursorGlow } from "@/components/CursorGlow";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Old Masters Ally – Companion App",
  description: "Events, Turniere und Punktesystem für Old Masters",
  icons: { icon: "/OMALogoNew.png", apple: "/OMALogoNew.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);})()`,
          }}
        />
      </head>
      <body className="antialiased" style={{ background: "var(--bg-base, #080c18)" }}>
        {/* Hex-Grid canvas — fixed, behind content but above body bg */}
        <AnimatedBackground />
        {/* Cursor-Lichtschein — folgt der Maus mit Lerp */}
        <CursorGlow />

        <div style={{ position: "relative", zIndex: 2, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
          <ThemeProvider>
            <SessionProvider>{children}</SessionProvider>
          </ThemeProvider>
        </div>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(15,15,23,0.92)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              fontSize: "13px",
              color: "#ededf0",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
          }}
        />
      </body>
    </html>
  );
}
