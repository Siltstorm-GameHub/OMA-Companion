"use client";
import { usePathname } from "next/navigation";
import FloatingPill from "@/components/FloatingPill";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";
import { BackToTop } from "@/components/BackToTop";
import { FloatingLobbyChat } from "@/components/FloatingLobbyChat";
import AuroraBackground from "@/components/AuroraBackground";
import { GuestGateProvider, GuestBanner } from "@/components/GuestGate";

/**
 * `partnerFooter` kommt bewusst als bereits gerendertes ReactNode vom Server-
 * Layout rein, statt hier `<PartnerFooter />` selbst zu importieren:
 * PartnerFooter ist eine ASYNC SERVER COMPONENT, die direkt `prisma` aufruft.
 * Ein direkter Import in dieser "use client"-Datei zieht Prisma (und alles,
 * was es braucht) mit in den Client-Bundle — führte live zum Absturz
 * ("PrismaClient is unable to run in this browser environment", dazu ein
 * kaskadierender React-Fehler). Server-Komponenten mit Server-only-Code
 * IMMER per Composition (als Prop/Children) an Client-Komponenten
 * durchreichen, nie direkt importieren.
 */
export default function DashboardChrome({
  children, newsItems, partnerFooter, isGuest, inviteUrl,
}: {
  children: React.ReactNode;
  newsItems: NewsItem[];
  partnerFooter: React.ReactNode;
  isGuest: boolean;
  inviteUrl: string | null;
}) {
  const pathname = usePathname();
  // Laufender OMA-Gems-Kampf rendert sich selbst als
  // Vollbild-Overlay mit eigenem "Verlassen"-Button (siehe LiveBattlePage) —
  // die mobile BottomNav braucht es dort nicht zum Verlassen, überlappt aber
  // (gleicher z-index 50, im DOM nach dem Kampf-Overlay) unten die Karten.
  const isLiveBattle = pathname.startsWith("/gems/live/");

  return (
    <GuestGateProvider isGuest={isGuest} inviteUrl={inviteUrl}>
    <div className="min-h-screen text-white" style={{ background: "var(--bg-base)", "--top-ticker": "2.25rem" } as React.CSSProperties}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      <AuroraBackground />

      {/* ── News-Ticker (oben) ──────────────────────────────────── */}
      <TopNewsFeed items={newsItems} />

      {/* ── Mobile Top Bar (nur Handy, kein Logo) ───────────────── */}
      <MobileTopBar />

      {/* ── Floating Pill Nav (nur Desktop) ─────────────────────── */}
      <div className="hidden lg:block">
        <FloatingPill />
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      {/* Mobile:  2.25rem Ticker + 3.5rem MobileTopBar = 5.75rem (ohne Ticker: 3.5rem) */}
      {/* Desktop: 36px Ticker + 44px Pill + 20px gap = 100px (ohne Ticker: 72px)      */}
      <main
        className="min-w-0 px-0 pb-24 lg:pb-10 pt-[5.75rem] lg:pt-[100px]"
        style={{ position: "relative", zIndex: 2 }}
      >
        <GuestBanner />
        {children}
        {partnerFooter}
      </main>

      {/* Back to top */}
      <BackToTop />

      {/* Community-Lobby-Chat */}
      <FloatingLobbyChat />

      {/* ── Mobile Bottom Nav (immer sichtbar auf Handy, außer im laufenden Kampf) ───────── */}
      {!isLiveBattle && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
    </GuestGateProvider>
  );
}
