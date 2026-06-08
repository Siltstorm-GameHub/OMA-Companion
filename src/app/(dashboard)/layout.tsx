import { redirect } from "next/navigation";
import { auth } from "@/auth";
import FloatingPill from "@/components/FloatingPill";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BackToTop } from "@/components/BackToTop";
import AuroraBackground from "@/components/AuroraBackground";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user?.id;

  // ── News-Feed-Daten ──────────────────────────────────────────────────
  const [nextEvent, activeLulSeason, openQuestsCount, memberCount, myPoints] = await Promise.all([
    prisma.event.findFirst({
      where: { startAt: { gt: new Date() }, status: { not: "finished" } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true, game: true, status: true },
    }),
    prisma.lulSeason.findFirst({
      where: { status: "active" },
      include: { spieltage: { where: { status: { not: "finished" } }, orderBy: { number: "asc" }, take: 1, select: { game: true, scheduledAt: true } } },
    }),
    userId
      ? prisma.userQuestProgress.count({ where: { userId, completed: false } })
      : 0,
    prisma.user.count(),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true, rankPoints: true } })
      : null,
  ]);

  const newsItems: NewsItem[] = [];

  // Nächstes Event
  if (nextEvent) {
    const d = new Date(nextEvent.startAt);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    const when = diff === 0 ? "Heute" : diff === 1 ? "Morgen" : `in ${diff} Tagen`;
    newsItems.push({
      id: "event-next",
      icon: "event",
      text: `${when}: ${nextEvent.title}${nextEvent.game ? ` · ${nextEvent.game}` : ""}`,
      href: "/events",
      accent: nextEvent.status === "active" ? "amber" : "teal",
    });
  }

  // LuL-Saison
  if (activeLulSeason) {
    const nextST     = activeLulSeason.spieltage[0];
    const seasonName = activeLulSeason.name ?? `Saison ${activeLulSeason.number}`;
    newsItems.push({
      id: "lul-season",
      icon: "lul",
      text: nextST
        ? `LuL ${seasonName} läuft · Nächster Spieltag: ${nextST.game}`
        : `Level-Up-League ${seasonName} ist aktiv`,
      href: "/lul",
      accent: "red",
    });
  }

  // Offene Quests
  if (userId && openQuestsCount > 0) {
    newsItems.push({
      id: "quests-open",
      icon: "quest",
      text: `${openQuestsCount} offene Quest${openQuestsCount !== 1 ? "s" : ""} diesen Monat`,
      href: "/quests",
      accent: "teal",
    });
  }

  // Punkte-Stand
  if (myPoints) {
    newsItems.push({
      id: "my-points",
      icon: "points",
      text: `Deine Punkte: ${myPoints.points.toLocaleString("de-DE")} · RankPts: ${myPoints.rankPoints.toLocaleString("de-DE")}`,
      accent: "amber",
    });
  }

  // Community-Größe
  newsItems.push({
    id: "members",
    icon: "members",
    text: `${memberCount} Mitglieder in der OMA-Community`,
    accent: "white",
  });

  return (
    <div className="min-h-screen text-white" style={{ background: "#0d0d0f" }}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      <AuroraBackground />

      {/* ── News-Ticker (oben) ──────────────────────────────────── */}
      <TopNewsFeed items={newsItems} />

      {/* ── Mobile Top Bar (nur Handy, kein Logo) ───────────────── */}
      <MobileTopBar />

      {/* ── Floating Pill Nav (nur Desktop) ─────────────────────── */}
      <FloatingPill />

      {/* ── Main Content ────────────────────────────────────────── */}
      {/* Mobile:  36px Ticker + 56px MobileTopBar + 12px gap = 104px */}
      {/* Desktop: 36px Ticker + 44px Pill + 20px gap = 100px        */}
      <main
        className="min-w-0 px-0 pb-24 lg:pb-10 pt-[104px] lg:pt-[100px]"
        style={{ position: "relative", zIndex: 2 }}
      >
        {children}
      </main>

      {/* Onboarding für neue User */}
      <OnboardingModal />

      {/* Back to top */}
      <BackToTop />

      {/* ── Mobile Bottom Nav ───────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
