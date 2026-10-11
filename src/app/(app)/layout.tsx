import "../globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemedToaster } from "@/components/ThemedToaster";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CursorGlow } from "@/components/CursorGlow";
import { ExitAppGuard } from "@/components/ExitAppGuard";

/** App-Oberfläche (alles außer den OBS-Overlays) — siehe Kommentar im Root-Layout. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Prevent flash of wrong theme — steht vor allem sichtbaren Inhalt, läuft also vor dem ersten Paint */}
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
    </>
  );
}
