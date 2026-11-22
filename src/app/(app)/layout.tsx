import "../globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemedToaster } from "@/components/ThemedToaster";
import { ExitAppGuard } from "@/components/ExitAppGuard";

/**
 * App-Oberfläche (alles außer den OBS-Overlays) — siehe Kommentar im Root-Layout.
 * Hex-Raster-Hintergrund und Cursor-Lichtschein sind mit dem neuen Design (feste Flächen,
 * kein Leuchten) entfallen.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Service Worker registrieren */}
      <script
        dangerouslySetInnerHTML={{
          __html: `if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js")}`,
        }}
      />

      <ThemeProvider>
        <div style={{ position: "relative", zIndex: 2, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
          <SessionProvider>{children}</SessionProvider>
        </div>
        <ThemedToaster />
        <ExitAppGuard />
      </ThemeProvider>
    </>
  );
}
