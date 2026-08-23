"use client";
import { usePathname } from "next/navigation";
import FloatingPill from "@/components/FloatingPill";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";
import { BackToTop } from "@/components/BackToTop";
import { FloatingLobbyChat } from "@/components/FloatingLobbyChat";
import AuroraBackground from "@/components/AuroraBackground";
import PartnerFooter from "@/components/PartnerFooter";

/**
 * Der gesamte Chrome (Ticker/TopBar/Pill-Nav/Main-Wrapper/BottomNav) hängt an
 * `isMancave`, das lange serverseitig aus dem `x-pathname`-Header berechnet
 * wurde (in layout.tsx, einem geteilten Server-Layout). Bug dabei: bei einer
 * clientseitigen Navigation (Link-Klick) wird ein geteiltes Layout nicht
 * garantiert neu ausgeführt — nur das jeweilige `page.tsx` wird sicher
 * ausgetauscht. Verließ man /mancave (dort bekommt <main> h-screen
 * overflow-hidden) per Klick statt F5, blieb diese Klasse auf der neuen
 * Seite hängen → Seite unscrollbar, bis ein harter Reload das Layout
 * komplett neu berechnete.
 *
 * Fix: `isMancave` hier CLIENTSEITIG per usePathname() bestimmen — das ist
 * ein React-Hook, der garantiert bei jeder Navigation neu auswertet, egal
 * wie Next.js das Server-Layout cached/wiederverwendet.
 */
export default function DashboardChrome({
  children, newsItems, mancaveVisible,
}: {
  children: React.ReactNode;
  newsItems: NewsItem[];
  mancaveVisible: boolean;
}) {
  const pathname = usePathname();
  const isMancave = pathname === "/mancave" || pathname.startsWith("/mancave/");

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--bg-base)", "--top-ticker": isMancave ? "0px" : "2.25rem" } as React.CSSProperties}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      {!isMancave && <AuroraBackground />}

      {/* ── News-Ticker (oben) ──────────────────────────────────── */}
      {/* Mancave läuft im Vollbild ohne Ticker — CSS-Var --top-ticker oben
          zieht den restlichen fixierten Chrome (MobileTopBar/FloatingPill)
          dann automatisch mit nach oben, siehe deren top-Styles. */}
      {!isMancave && <TopNewsFeed items={newsItems} />}

      {/* ── Mobile Top Bar (nur Handy, kein Logo) ───────────────── */}
      <MobileTopBar />

      {/* ── Floating Pill Nav (nur Desktop) ─────────────────────── */}
      <div className="hidden lg:block">
        <FloatingPill mancaveVisible={mancaveVisible} />
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      {/* Mobile:  2.25rem Ticker + 3.5rem MobileTopBar = 5.75rem (ohne Ticker: 3.5rem) */}
      {/* Desktop: 36px Ticker + 44px Pill + 20px gap = 100px (ohne Ticker: 72px)      */}
      {isMancave ? (
        <main
          className="min-w-0 px-0 pt-14 lg:pt-[72px] pb-0 h-screen overflow-hidden"
          style={{ position: "relative", zIndex: 2 }}
        >
          {children}
        </main>
      ) : (
        <main
          className="min-w-0 px-0 pb-24 lg:pb-10 pt-[5.75rem] lg:pt-[100px]"
          style={{ position: "relative", zIndex: 2 }}
        >
          {children}
          <PartnerFooter />
        </main>
      )}

      {/* Back to top */}
      {!isMancave && <BackToTop />}

      {/* Community-Lobby-Chat */}
      <FloatingLobbyChat />

      {/* ── Mobile Bottom Nav (immer sichtbar auf Handy) ───────── */}
      <div className="lg:hidden">
        <BottomNav mancaveVisible={mancaveVisible} />
      </div>
    </div>
  );
}
