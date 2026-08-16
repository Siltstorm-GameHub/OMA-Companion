import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { isLinkPreviewBot } from "@/lib/link-preview-bots";
import FloatingPill from "@/components/FloatingPill";
import TopNewsFeed, { type NewsItem } from "@/components/TopNewsFeed";
import MobileTopBar from "@/components/MobileTopBar";
import BottomNav from "@/components/BottomNav";
import { BackToTop } from "@/components/BackToTop";
import { FloatingLobbyChat } from "@/components/FloatingLobbyChat";
import AuroraBackground from "@/components/AuroraBackground";
import PartnerFooter from "@/components/PartnerFooter";
import { prisma } from "@/lib/prisma";
import { getRoomConfig, roomVisibleFor } from "@/lib/room-config";
import { getScopeTitle } from "@/lib/wanderpocal";

// Seiten, die auch ohne Discord-Login sichtbar sein sollen (siehe Anforderung:
// Dashboard, Events, Rangliste als "Schaufenster" für nicht eingeloggte Besucher).
// Bewusst nur die exakten Übersichtsseiten, keine Unterseiten wie /events/series/[id]
// oder /tournament/[id] — die verlangen weiterhin ein Login.
const GUEST_ALLOWED_PATHS = ["/dashboard", "/events", "/leaderboard"];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    // redirect() macht aus der gesamten Antwort eine reine HTTP-Weiterleitung
    // ohne Body — die dynamischen Meta-Tags der jeweiligen Seite
    // (generateMetadata, z.B. Event-Titel/-Bild für Discord-Linkvorschauen)
    // kommen dann nie an.
    //
    // Für bekannte Link-Vorschau-Bots lassen wir den Redirect deshalb weg und
    // rendern direkt {children} — ohne die Chrome und Datenabfragen unten, die
    // eine echte Session voraussetzen. Wichtig: {children} wird von Next.js
    // unabhängig davon ausgeführt, ob dieses Layout es einbaut (kein Weg, das
    // hier zu unterbinden) — die betroffenen Seiten (tournament/[id],
    // leaderboard, profile/[id]) prüfen deshalb selbst auf eine fehlende
    // Session und zeigen dann BotPreviewShell statt echter Daten. Da nur
    // verifizierte Bots ohne redirect() bis hierher kommen, reicht dort ein
    // einfaches "keine Session? → Platzhalter" ohne erneute UA-Prüfung.
    const hdrs = await headers();
    const ua = hdrs.get("user-agent");
    if (isLinkPreviewBot(ua)) return <>{children}</>;

    // Echte (nicht eingeloggte) Besucher dürfen ein paar Übersichtsseiten sehen —
    // die Seiten selbst blenden dort Inhalte aus/hinter Login-Overlays, alles
    // andere (Profil, Quests, Server, Turnier-Detail, …) bleibt hinter dem Login.
    const pathname = hdrs.get("x-pathname") ?? "";
    const isGuestAllowed = GUEST_ALLOWED_PATHS.includes(pathname);
    if (!isGuestAllowed) redirect(`/login?notice=login_required&callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`);
  }

  const userId = session?.user?.id;

  const now = new Date();
  const currentQuestMonth = now.getMonth() + 1;
  const currentQuestYear = now.getFullYear();

  // ── News-Feed-Daten ──────────────────────────────────────────────────
  const [activeOrPollEvent, upcomingEvent, totalMonthQuests, completedMonthQuests, memberCount, myPoints, activeClipContest, activeYearlyClipContest, activeDailyPoll, latestWanderpokal] = await Promise.all([
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
    prisma.quest.count({ where: { month: currentQuestMonth, year: currentQuestYear } }),
    userId
      ? prisma.userQuestProgress.count({
          where: { userId, completed: true, quest: { month: currentQuestMonth, year: currentQuestYear } },
        })
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
    // Clip des Jahres – aktive Abstimmung
    prisma.yearlyClipContest.findFirst({
      where: { status: "voting" },
      orderBy: { year: "desc" },
      select: { year: true },
    }),
    // Tages-Umfrage – aktuell laufend (nicht erst kürzlich beendet)
    prisma.dailyPoll.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, question: true },
    }),
    // Wanderpokal – zuletzt vergebener Titel (nur der Scope, Halter werden unten separat geladen —
    // bei Gleichstand teilen sich mehrere User denselben Scope)
    prisma.wanderpocalHolder.findFirst({
      orderBy: { heldSince: "desc" },
      select: { scopeType: true, scopeValue: true },
    }),
  ]);

  // Wanderpokal – alle Halter des zuletzt vergebenen Scopes (Gleichstand möglich)
  const wanderpokalHolders = latestWanderpokal
    ? await prisma.wanderpocalHolder.findMany({
        where: { scopeType: latestWanderpokal.scopeType, scopeValue: latestWanderpokal.scopeValue },
        select: { winCount: true, user: { select: { username: true, name: true } } },
      })
    : [];

  const nextEvent = activeOrPollEvent ?? upcomingEvent;
  const openQuestsCount = userId ? Math.max(totalMonthQuests - completedMonthQuests, 0) : 0;

  // Gaming-Zimmer: solange room_enabled aus ist, sehen nur Admins den Nav-Eintrag.
  const roomVisible = roomVisibleFor(
    await getRoomConfig(),
    (session?.user as { role?: string } | undefined)?.role,
  );
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

  // Clip des Jahres – aktive Abstimmung
  if (activeYearlyClipContest) {
    newsItems.push({
      id: "yearly-clip-contest",
      icon: "clip",
      text: `Clip des Jahres ${activeYearlyClipContest.year} – Abstimmung läuft`,
      href: "/clip-des-jahres",
      accent: "amber",
    });
  }

  // Tages-Umfrage
  if (activeDailyPoll) {
    newsItems.push({
      id: "daily-poll",
      icon: "poll",
      text: `Umfrage: ${activeDailyPoll.title} – ${activeDailyPoll.question}`,
      href: "/dashboard",
      accent: "teal",
    });
  }

  // Wanderpokal – zuletzt vergebener Titel (bei Gleichstand alle Halter nennen)
  if (latestWanderpokal && wanderpokalHolders.length > 0) {
    const holderNames = wanderpokalHolders.map((h) => h.user.username ?? h.user.name ?? "Unbekannt");
    const namesText = holderNames.length > 1
      ? `${holderNames.slice(0, -1).join(", ")} & ${holderNames[holderNames.length - 1]}`
      : holderNames[0];
    const scopeTitle = getScopeTitle(latestWanderpokal.scopeType, latestWanderpokal.scopeValue);
    const winCount = wanderpokalHolders[0].winCount;
    newsItems.push({
      id: "wanderpokal",
      icon: "wanderpokal",
      text: `${namesText} ${holderNames.length > 1 ? "halten" : "hält"} den Wanderpokal „${scopeTitle}" · ${winCount} ${winCount === 1 ? "Sieg" : "Siege"}`,
      href: "/profile",
      accent: "amber",
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
    <div className="min-h-screen text-white" style={{ background: "var(--bg-base)" }}>

      {/* ── Aurora Hintergrund ───────────────────────────────────── */}
      <AuroraBackground />

      {/* ── News-Ticker (oben) ──────────────────────────────────── */}
      <TopNewsFeed items={newsItems} />

      {/* ── Mobile Top Bar (nur Handy, kein Logo) ───────────────── */}
      <MobileTopBar />

      {/* ── Floating Pill Nav (nur Desktop) ─────────────────────── */}
      <div className="hidden lg:block">
        <FloatingPill roomVisible={roomVisible} />
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
        <BottomNav roomVisible={roomVisible} />
      </div>
    </div>
  );
}
