import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/button-styles";
import { eventHasPlacement } from "@/lib/event-placement";
import { prisma } from "@/lib/prisma";
import { parseCycleConfig } from "@/lib/series-cycles-config";
import { isOmaOriginal } from "@/lib/oma-original";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { getSessionUser } from "@/lib/roles";
import { ExternalLink, Plus, Users, EyeOff } from "@/components/icons";
import SyncButton from "./SyncButton";
import { GateLink, GuestMoreCta } from "@/components/GuestGate";
import EventCardActions from "@/components/events/EventCardActions";
import { GUEST_UPCOMING_EVENTS_LIMIT, GUEST_FINISHED_EVENTS_LIMIT } from "@/lib/guest-access";
import { EmptyState } from "@/components/EmptyState";
import GameCover from "@/components/GameCover";
import EventCardLink from "./EventCardLink";
import { getEventEndedAt, RECENTLY_FINISHED_MS } from "@/lib/event-completion";
import { formatBerlinDate, getBerlinDateParts, BERLIN_TZ } from "@/lib/time";
import { syncDueEventActivations } from "@/lib/event-lifecycle";
import EventsTabs from "./EventsTabs";
import { attachCommentCounts } from "@/lib/event-comments";
import MyEventsPanel from "./MyEventsPanel";
import SquadsList from "../squads/SquadsList";
import EventPredictionsPanel from "./EventPredictionsPanel";
import type { MyPrediction } from "@/components/MyPredictionsList";
import { ScrollReveal } from "@/components/ScrollReveal";
import EventCard, { type EventCardData } from "@/components/events/EventCard";
import NextEventHero from "@/components/events/NextEventHero";
import RecentResultCard, { type RecentResultData } from "@/components/events/RecentResultCard";
import EventFilterShell, { type EventFilterGame } from "@/components/events/EventFilterShell";
import { EVENT_CARD_INCLUDE, eventDiscordUrl, isUserRegistered, playersOf, toEventCardData, type EventCardSource } from "@/lib/event-card-data";
import { loadEventViewerContext } from "@/lib/event-viewer";
import { dayBucket, parseRanking, placementOf, startsInLabel } from "@/lib/event-display";
import { gameNameKey } from "@/lib/games/slug";

const MAX_GAME_CHIPS = 5;


export default async function EventsPage() {
  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen), muss vor dem Event-Fetch
  // unten abgeschlossen sein (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const me     = await getSessionUser();
  const userId = me?.id;
  const isMod  = me?.role === "moderator" || me?.role === "admin";
  const now    = new Date();

  const [events, hiddenEvents, viewer] = await Promise.all([
    prisma.event.findMany({
      where:   { hidden: false, OR: [{ seriesId: null }, { series: { hidden: false } }] },
      orderBy: { startAt: "asc" },
      include: EVENT_CARD_INCLUDE,
    }),
    isMod
      ? prisma.event.findMany({
          where:   { OR: [{ hidden: true }, { series: { hidden: true } }] },
          orderBy: { startAt: "desc" },
          include: {
            _count: { select: { registrations: true } },
            series: { select: { id: true, name: true, icon: true, coverImageUrl: true } },
          },
        })
      : Promise.resolve([]),
    loadEventViewerContext(userId),
  ]);

  const emptyPredictionRows: { event: { id: string; title: string; startAt: Date }; predictedUser: { id: string; username: string | null; name: string | null; image: string | null }; wager: number; resolved: boolean; correct: boolean | null; coinsAwarded: number }[] = [];

  const [myPredictionRows, predictionStreakRow, pendingPredictions] = userId
    ? await Promise.all([
        prisma.eventWinnerPrediction.findMany({
          where: { userId },
          include: {
            event: { select: { id: true, title: true, startAt: true } },
            predictedUser: { select: { id: true, username: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.predictionStreak.findUnique({ where: { userId } }),
        prisma.eventWinnerPrediction.count({ where: { userId, resolved: false } }),
      ])
    : [emptyPredictionRows, null, 0];

  const myPredictions: MyPrediction[] = myPredictionRows.map(p => ({
    eventId: p.event.id,
    eventTitle: p.event.title,
    eventStartAt: p.event.startAt.toISOString(),
    predictedUser: p.predictedUser,
    wager: p.wager,
    resolved: p.resolved,
    correct: p.correct,
    coinsAwarded: p.coinsAwarded,
  }));

  type Item = { ev: EventCardSource; finished: boolean; endedAt: number };
  const allItems: Item[] = events.map(ev => ({
    ev,
    finished: ev.status === "finished",
    endedAt:  getEventEndedAt(ev).getTime(),
  }));

  // Still beendete Events ohne Spieler-Anmeldung (siehe complete/route.ts) tauchen nicht im
  // "Kürzlich beendet"-Bereich auf — sie landen direkt im eingeklappten "Abgeschlossen"-Bereich.
  const isRecentlyFinished = (i: Item) =>
    i.finished && (now.getTime() - i.endedAt) <= RECENTLY_FINISHED_MS && playersOf(i.ev).length > 0;

  // Kürzlich (≤3 Tage) beendete Events bleiben ganz oben sichtbar, damit Nutzer die Ergebnisse
  // nicht verpassen — erst danach wandern sie in den eingeklappten "Abgeschlossen"-Bereich.
  const recentFinishedItems = allItems.filter(isRecentlyFinished).sort((a, b) => b.endedAt - a.endedAt);
  // Dauer-Reihen (Zyklus-Automatik): Kommende Zyklen sind vorab veröffentlicht, damit man sich früh
  // anmelden kann — in der Übersicht steht aber nur der nächste (bzw. laufende) Zyklus je Reihe, damit
  // einzelne Events nicht untergehen. Die weiteren Zyklen erreicht man über die Reihe.
  const upcomingAll = allItems.filter(i => !i.finished).sort((a, b) => a.ev.startAt.getTime() - b.ev.startAt.getTime());
  const moreCyclesBySeries = new Map<string, number>();
  const upcomingItems = upcomingAll.filter(i => {
    const sid = i.ev.series && parseCycleConfig(i.ev.series.cycleConfigJson).enabled ? i.ev.series.id : null;
    if (!sid) return true;
    const seen = moreCyclesBySeries.get(sid);
    if (seen === undefined) { moreCyclesBySeries.set(sid, 0); return true; }
    // Weitere Zyklen, für die der User schon angemeldet ist, bleiben trotzdem ausgeblendet — sie stehen
    // unter "Meine Events" und in der Reihe
    moreCyclesBySeries.set(sid, seen + 1);
    return false;
  });
  const finishedItems = allItems.filter(i => i.finished && !isRecentlyFinished(i)).sort((a, b) => b.endedAt - a.endedAt);

  const openCount = upcomingItems.filter(i => i.ev.status === "open" || i.ev.status === "active").length;

  // Gäste sehen nur einen Ausschnitt der Events als Vorgeschmack.
  const visibleUpcoming = userId ? upcomingItems : upcomingItems.slice(0, GUEST_UPCOMING_EVENTS_LIMIT);
  const visibleFinished = userId ? finishedItems : finishedItems.slice(0, GUEST_FINISHED_EVENTS_LIMIT);
  const guestHasMore = !userId && (upcomingItems.length > visibleUpcoming.length || finishedItems.length > visibleFinished.length);

  const cards = new Map<string, EventCardData>(visibleUpcoming.map(i => [i.ev.id, toEventCardData(i.ev, viewer, userId, now)]));
  await attachCommentCounts([...cards.values()], userId);

  // ── "Dein nächstes Event": laufend vor anstehend, Umfragephase zählt nicht mehr ──
  const heroItem = userId
    ? visibleUpcoming.find(i => i.ev.status === "active" && isUserRegistered(i.ev, userId))
      ?? visibleUpcoming.find(i => (i.ev.status === "open" || i.ev.status === "closed") && isUserRegistered(i.ev, userId))
    : undefined;

  // ── Gruppen: Heute / Diese Woche / danach pro Monat ──
  const MONTH_FORMATTER = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: BERLIN_TZ });
  const groups: { key: string; label: string; items: Item[] }[] = [];
  const groupOf = (i: Item) => {
    const running = i.ev.status === "active" || i.ev.status === "umfrage";
    const bucket = dayBucket(i.ev.startAt, now, running);
    if (bucket === "today") return { key: "today", label: "Heute" };
    if (bucket === "week") return { key: "week", label: "Diese Woche" };
    const p = getBerlinDateParts(i.ev.startAt);
    const label = MONTH_FORMATTER.format(i.ev.startAt);
    return { key: `${p.year}-${p.month}`, label: label.charAt(0).toUpperCase() + label.slice(1) };
  };
  for (const item of visibleUpcoming) {
    const g = groupOf(item);
    let group = groups.find(x => x.key === g.key);
    if (!group) { group = { ...g, items: [] }; groups.push(group); }
    group.items.push(item);
  }

  // ── Spiel-Chips: die häufigsten Spiele unter den anstehenden Events ──
  const gameCounts = new Map<string, { label: string; n: number }>();
  for (const i of visibleUpcoming) {
    if (!i.ev.game) continue;
    const key = gameNameKey(i.ev.game);
    if (!key) continue;
    const cur = gameCounts.get(key);
    gameCounts.set(key, { label: cur?.label ?? i.ev.game, n: (cur?.n ?? 0) + 1 });
  }
  const gameChips: EventFilterGame[] = [...gameCounts.entries()]
    .filter(([, v]) => v.n >= 1)
    .sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label, "de"))
    .slice(0, MAX_GAME_CHIPS)
    .map(([key, v]) => ({ key, label: v.label }));

  // ── Kürzlich beendet: Treppchen + eigene Platzierung ──
  // Community-Events haben keine Platzierung (lib/event-placement.ts) — kein Treppchen, kein eigener Platz
  const rankingJsonOf = (ev: { type: string; finalRankingJson: string | null }) => eventHasPlacement(ev) ? ev.finalRankingJson : null;
  const podiumIds = [...new Set(recentFinishedItems.flatMap(i => parseRanking(rankingJsonOf(i.ev)).slice(0, 3)))];
  const podiumUsers = podiumIds.length
    ? await prisma.user.findMany({ where: { id: { in: podiumIds } }, select: { id: true, name: true, username: true, image: true } })
    : [];
  const podiumMap = new Map(podiumUsers.map(u => [u.id, u]));
  const recentResults: RecentResultData[] = recentFinishedItems.map(({ ev }) => ({
    id: ev.id,
    // completionData wird nur beim Abschluss-Flow gesetzt — ohne ihn gibt es keine Ergebnisse zu zeigen.
    href: ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`,
    title: ev.title,
    game: ev.game,
    coverUrl: ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null,
    omaOriginal: isOmaOriginal(ev),
    dateLabel: formatBerlinDate(ev.startAt, { day: "2-digit", month: "short" }),
    seriesName: ev.series?.name ?? null,
    podium: parseRanking(rankingJsonOf(ev)).slice(0, 3).map(id => podiumMap.get(id)).filter((u): u is NonNullable<typeof u> => !!u),
    myPlace: placementOf(rankingJsonOf(ev), userId),
    playerCount: playersOf(ev).length,
    hasResults: !!ev.completionData,
  }));


  const hasAnything = recentFinishedItems.length > 0 || upcomingItems.length > 0 || finishedItems.length > 0;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

      <PageHeader
        title="Events"
        description={openCount > 0 ? <><span className="font-semibold text-primary-fg">{openCount}</span> offene Events · Turniere, Community-Abende und Reihen</> : "Turniere, Community-Abende und Reihen"}
        actions={<>
          <GateLink href="/events/verwalten/neu" className={buttonClasses("primary", "md")}>
            <Plus className="w-4 h-4" /> Neues Event
          </GateLink>
          {isMod && <SyncButton />}
        </>}
      />

      <EventsTabs
        eventsPanel={<>
      <div className="space-y-5">
        {!hasAnything && (
          <EmptyState
            type="events"
            title="Noch keine Events"
            description="Schau bald wieder vorbei – Events werden hier angekündigt."
          />
        )}

        {heroItem && (
          <NextEventHero
            ev={cards.get(heroItem.ev.id)!}
            startsIn={startsInLabel(heroItem.ev.startAt, now)}
            discordUrl={eventDiscordUrl(heroItem.ev)}
          />
        )}

        {recentResults.length > 0 && (
          <section aria-label="Kürzlich beendet" className="space-y-2">
            <h2 className="flex items-center gap-3 text-xs font-semibold text-gray-300">
              Kürzlich beendet <span className="h-px flex-1 bg-line" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {recentResults.map(r => <RecentResultCard key={r.id} r={r} />)}
            </div>
          </section>
        )}

        {visibleUpcoming.length > 0 && (
          <EventFilterShell games={gameChips} loggedIn={!!userId}>
            {groups.map(group => (
              <section key={group.key} data-ev-section aria-label={group.label} className="mb-5 last:mb-0">
                <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-[4.5rem] z-20 flex items-center gap-3 py-2 -mx-5 px-5 sm:mx-0 sm:px-0 bg-canvas text-xs font-semibold text-gray-300 tracking-wide">
                  {group.label}
                  <span className="text-gray-600 font-normal">{group.items.length}</span>
                  <span className="h-px flex-1 bg-line" />
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mt-2">
                  {group.items.map(item => {
                    const card = cards.get(item.ev.id)!;
                    return (
                      <div key={item.ev.id} data-ev
                        data-registered={card.isRegistered ? "1" : undefined}
                        data-mine={card.relevance.length > 0 ? "1" : undefined}
                        data-game={item.ev.game ? gameNameKey(item.ev.game) : undefined}
                        data-kind={card.kind}>
                        <ScrollReveal className="h-full">
                          <EventCard ev={card} actions={<EventCardActions ev={item.ev} card={card} viewer={viewer} userId={userId} />}
                            extra={item.ev.seriesId && (moreCyclesBySeries.get(item.ev.seriesId) ?? 0) > 0 ? (
                              <Link href={`/events/series/${item.ev.seriesId}`} className="text-xs text-teal-300 hover:text-white">
                                🔁 +{moreCyclesBySeries.get(item.ev.seriesId)} weitere {moreCyclesBySeries.get(item.ev.seriesId) === 1 ? "Zyklus" : "Zyklen"} · Anmeldung offen
                              </Link>
                            ) : undefined} />
                        </ScrollReveal>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </EventFilterShell>
        )}
      </div>

      {isMod && hiddenEvents.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 pb-1">
            <div className="h-px flex-1 bg-rose-500/10" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 uppercase tracking-widest">
              <EyeOff className="w-3 h-3" /> Ausgeblendet · nur für Admins/Mods sichtbar
            </span>
            <div className="h-px flex-1 bg-rose-500/10" />
          </div>

          {hiddenEvents.map(ev => (
            <GateLink key={`hidden-${ev.id}`}
              href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.07] transition-colors group">
              <GameCover game={ev.game} coverUrl={ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null} className="w-9 h-6 shrink-0" rounded="rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 font-medium truncate group-hover:text-white transition-colors">
                  {ev.title}
                </p>
                <p className="text-xs text-gray-600">
                  {formatBerlinDate(ev.startAt, { day: "2-digit", month: "short", year: "numeric" })}
                  {ev.series && <> · {ev.series.name}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <Users className="w-3 h-3" />{ev._count.registrations}
                </span>
                <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                  <EyeOff className="w-2.5 h-2.5" /> Ausgeblendet
                </span>
              </div>
            </GateLink>
          ))}
        </div>
      )}

      {visibleFinished.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 pb-1">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Abgeschlossen</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {visibleFinished.map(({ ev }) => {
              const discordUrl = eventDiscordUrl(ev);
              const cardHref = ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`;
              return (
                <EventCardLink key={`ev-fin-${ev.id}`}
                  href={cardHref}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-line bg-surface-2 opacity-50 hover:opacity-75 transition-opacity group">
                  <GameCover game={ev.game} coverUrl={ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null} className="w-9 h-6 shrink-0" rounded="rounded" />
                  <div className="flex-1 min-w-0">
                    <GateLink href={`/tournament/${ev.id}`}
                      className="text-sm text-gray-400 font-medium truncate block group-hover:text-gray-300 transition-colors">
                      {isOmaOriginal(ev) && <OmaTitlePrefix title={ev.title} />}
                      {ev.title}
                    </GateLink>
                    <p className="text-xs text-gray-600">
                      {formatBerlinDate(ev.startAt, { day: "2-digit", month: "short", year: "numeric" })}
                      {ev.series && <> · {ev.series.name}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Users className="w-3 h-3" />{playersOf(ev).length}
                    </span>
                    {discordUrl && (
                      <a href={discordUrl} target="_blank" rel="noopener noreferrer"
                        className="text-gray-700 hover:text-gray-500 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-xs text-gray-600 bg-gray-800/60 border border-line px-1.5 py-0.5 rounded">
                      Beendet
                    </span>
                  </div>
                </EventCardLink>
              );
          })}
        </div>
      )}
      {guestHasMore && <GuestMoreCta message="Alle Events gibt's nach dem Login" />}
        </>}
        myEventsPanel={userId ? <MyEventsPanel userId={userId} isModerator={isMod} /> : null}
        predictionsPanel={
          userId ? (
            <EventPredictionsPanel
              myPredictions={myPredictions}
              predictionStreak={{ current: predictionStreakRow?.current ?? 0, best: predictionStreakRow?.best ?? 0 }}
              pendingPredictions={pendingPredictions}
            />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-gray-500 text-sm">
              Melde dich an, um deine Vorhersagen zu sehen.
            </div>
          )
        }
        squadsPanel={<SquadsList />}
      />
    </div>
  );
}
