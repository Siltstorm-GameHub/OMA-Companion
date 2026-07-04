import { redirect } from "next/navigation";
import { auth } from "@/auth";
import FloatingPill from "@/components/FloatingPill";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";
import { BackToTop } from "@/components/BackToTop";
import { FloatingLobbyChat } from "@/components/FloatingLobbyChat";
import AuroraBackground from "@/components/AuroraBackground";
import PartnerFooter from "@/components/PartnerFooter";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user?.id;

  // ── News-Feed-Daten ──────────────────────────────────────────────────
  const [activeOrPollEvent, upcomingEvent, activeLulSeason, openQuestsCount, memberCount, myPoints, activeClipContest] = await Promise.all([
    // Currently running or in poll phase
    prisma.event.findFirst({
      where: { status: { in: ["active", "umfrage"] } },
      orderBy: { startAt: "desc" },
      select: { id: true, title: true, startAt: true, game: true, status: true },
    }),
    // Next upcoming event
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
    prisma.monthlyClipContest.findFirst({
      where: { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { month: true, year: true },
    }),
  ]);

  const nextEvent = activeOrPollEvent ?? upcomingEvent;
  const newsItems: NewsItem[] = [];

  // Aktives / Umfragephase / Nächstes Event
  if (nextEvent) {
    if (nextEvent.status === "active") {
      newsItems.push({
        id: "event-next",
        icon: "event",
        text: `Läuft gerade: ${nextEvent.title}${nextEvent.game ? ` · ${nextEvent.game}` : ""}`,
        href: "/events",
        accent: "amber",
      });
    } else if (nextEvent.status === "umfrage") {
      newsItems.push({
        id: "event-next",
        icon: "event",
        text: `Umfragephase: ${nextEvent.title}${nextEvent.game ? ` · ${nextEvent.game}` : ""}`,
        href: "/events",
        accent: "amber",
      });
    } else {
      const d = new Date(nextEvent.startAt);
      // Tage-Differenz anhand Kalender-Tage in Berlin-Zeitzone (verhindert Off-by-One)
      const nowStr = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
      const evStr  = d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
      const [nd, nm, ny] = nowStr.split(".").map(Number);
      const [ed, em, ey] = evStr.split(".").map(Number);
      const nowDay = new Date(ny, nm - 1, nd);
      const evDay  = new Date(ey, em - 1, ed);
      const diffDays = Math.round((evDay.getTime() - nowDay.getTime()) / 86_400_000);
      const when = diffDays === 0 ? "Heute" : diffDays === 1 ? "Morgen" : `in ${diffDays} Tagen`;
      newsItems.push({
        id: "event-next",
        icon: "event",
        text: `${when}: ${nextEvent.title}${nextEvent.game ? ` · ${nextEvent.game}` : ""}`,
        href: "/events",
        accent: "teal",
      });
    }
  }

  // Clip des Monats – aktive Abstimmung
  if (activeClipContest) {
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    newsItems.push({
      id: "clip-contest",
      icon: "clip",
      text: `Clip des Monats ${monthNames[activeClipContest.month - 1]} – Abstimmung läuft`,
      href: "/clip-des-monats",
      accent: "amber",
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
      <div className="hidden lg:block">
        <FloatingPill />
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      {/* Mobile:  2.25rem Ticker + 3.5rem MobileTopBar = 5.75rem */}
      {/* Desktop: 36px Ticker + 44px Pill + 20px gap = 100px    */}
      <main
        className="min-w-0 px-0 pb-24 lg:pb-10 pt-[5.75rem] lg:pt-[100px]"
        style={{ position: "relative", zIndex: 2 }}
      >
        {children}
        <PartnerFooter />
      </main>

      {/* Back to top */}
      <BackToTop />

      {/* Community-Lobby-Chat */}
      <FloatingLobbyChat />

      {/* ── Mobile Bottom Nav (immer sichtbar auf Handy) ───────── */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
