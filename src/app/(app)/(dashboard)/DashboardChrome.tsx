"use client";
import { BackToTop } from "@/components/BackToTop";
import { CommunityHub } from "@/components/CommunityHub";
import { GuestGateProvider, GuestBanner } from "@/components/GuestGate";
import { Sidebar, type SupportView } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { BottomNav } from "@/components/shell/BottomNav";

/**
 * App-Rahmen nach dem Designentwurf (OMA 2.0, Richtung G): Desktop = Seitenleiste links +
 * Kopfzeile, Handy = Kopfzeile + untere Leiste. Benachrichtigungen öffnen sich über die Glocke.
 *
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
  children, partnerFooter, isGuest, inviteUrl, support,
}: {
  children: React.ReactNode;
  partnerFooter: React.ReactNode;
  isGuest: boolean;
  inviteUrl: string | null;
  support: SupportView;
}) {
  return (
    <GuestGateProvider isGuest={isGuest} inviteUrl={inviteUrl}>
      <div className="min-h-dvh bg-canvas text-fg lg:flex">
        <Sidebar support={support} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <main className="min-w-0 flex-1 px-0 pt-3 pb-28 lg:pt-5 lg:pb-10">
            <GuestBanner />
            {children}
            {partnerFooter}
          </main>
        </div>

        <BackToTop />

        {/* Benachrichtigungen, Event-Absprachen, Online-Liste — geöffnet über die Glocke */}
        <CommunityHub />

        <BottomNav />
      </div>
    </GuestGateProvider>
  );
}
