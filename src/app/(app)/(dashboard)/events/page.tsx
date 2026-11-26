import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/button-styles";
import { eventHasPlacement } from "@/lib/event-placement";
import { prisma } from "@/lib/prisma";
import { showsOnlyNextTerm } from "@/lib/series-schedule";
import { isOmaOriginal } from "@/lib/oma-original";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { getSessionUser } from "@/lib/roles";
import { ChevronDown, Plus, Repeat, Users, EyeOff } from "@/components/icons";
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
import EventsSectionNav from "@/components/events/EventsSectionNav";
import { redirect } from "next/navigation";
import { loadManageAttentionCount } from "@/lib/admin-inbox";
import { getCaptainedSquadIds } from "@/lib/roles";
import { attachCommentCounts } from "@/lib/event-comments";
import { ScrollReveal } from "@/components/ScrollReveal";
import EventCard, { type EventCardData } from "@/components/events/EventCard";
import ForYouStrip, { type ForYouItem } from "@/components/events/ForYouStrip";
import LiveRefresh from "@/app/(app)/(dashboard)/tournament/[id]/LiveRefresh";
import { isPeriodEvent } from "@/lib/event-period";
import { checkInOpensAt } from "@/lib/checkin";
import RecentResultCard, { type RecentResultData } from "@/components/events/RecentResultCard";
import EventFilterShell, { type EventFilterGame, type EventFilterDay } from "@/components/events/EventFilterShell";
import { EVENT_CARD_INCLUDE, isUserRegistered, playersOf, toEventCardData, type EventCardSource } from "@/lib/event-card-data";
import { loadEventViewerContext } from "@/lib/event-viewer";
import { dayBucket, parseRanking, placementOf, startsInLabel } from "@/lib/event-display";
import { gameNameKey } from "@/lib/games/slug";

const MAX_GAME_CHIPS = 5;


export default async function EventsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // Alte Reiter-Links: Vorhersagen und Squads haben eigene Seiten ("duels" = noch älterer Name)
  const { tab } = await searchParams;
  if (tab === "predictions" || tab === "duels") redirect("/events/vorhersagen");
  if (tab === "squads") redirect("/squads");

  // Lazy Auto-Aktivierung fälliger Events (nur bei Spieler-Anmeldungen), muss vor dem Event-Fetch
  // unten abgeschlossen sein (siehe src/lib/event-lifecycle.ts).
  await syncDueEventActivations();

  const me     = await getSessionUser();
  const userId = me?.id;
  const isMod  = me?.role === "moderator" || me?.role === "admin";
  const now    = new Date();

  // Zahl am Reiter "Verwalten": was in der Verwaltung auf dich wartet (Mods: alles, Mitglieder: eigene)
  const manageCountPromise = userId
    ? (async () => loadManageAttentionCount(isMod ? null : { userId, captainedSquadIds: await getCaptainedSquadIds(userId) }, now))()
    : Promise.resolve(0);

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
  // Reihen mit Terminplanung: Kommende Termine/Runden sind vorab veröffentlicht, damit man sich früh
  // anmelden kann — in der Übersicht steht aber nur der nächste (bzw. laufende) Termin je Reihe, damit
  // einzelne Events nicht untergehen. Die weiteren erreicht man über die Reihe.
  const upcomingAll = allItems.filter(i => !i.finished).sort((a, b) => a.ev.startAt.getTime() - b.ev.startAt.getTime());
  const moreCyclesBySeries = new Map<string, number>();
  const upcomingItems = upcomingAll.filter(i => {
    const sid = i.ev.series && showsOnlyNextTerm(i.ev.series) ? i.ev.series.id : null;
    if (!sid) return true;
    const seen = moreCyclesBySeries.get(sid);
    if (seen === undefined) { moreCyclesBySeries.set(sid, 0); return true; }
    // Weitere Termine, für die der User schon angemeldet ist, bleiben trotzdem ausgeblendet — sie stehen
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

  // ── Gruppen: Läuft gerade / Heute / Diese Woche / danach pro Monat ──
  // "Läuft gerade" = laufendes Turnier, Abstimmungsphase oder ein schon gestartetes Zeitraum-Event
  // (Woche/Monat). Früher standen diese unter "Heute", obwohl sie z. B. "bis 30." laufen.
  const MONTH_FORMATTER = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: BERLIN_TZ });
  const groups: { key: string; label: string; rail?: boolean; rank: number; items: Item[] }[] = [];
  // Abstimmungsphase: das Event ist vorbei, nur die Umfrage läuft noch → eigene, kompakte Gruppe
  const isPollPhase = (i: Item) => i.ev.status === "umfrage";
  // Wochen-/Monats-Events, die schon laufen → schmale Leiste statt großer Kacheln
  const isPeriodRunning = (i: Item) => isPeriodEvent(i.ev) && i.ev.startAt.getTime() <= now.getTime()
    && (!i.ev.endAt || i.ev.endAt.getTime() > now.getTime());
  const isRunningNow = (i: Item) =>
    i.ev.status === "active" || i.ev.startAt.getTime() <= now.getTime();
  const groupOf = (i: Item): { key: string; label: string; rail?: boolean; rank: number } => {
    if (isPollPhase(i)) return { key: "vote", label: "Abstimmung läuft", rail: true, rank: 2 };
    if (isPeriodRunning(i)) return { key: "period", label: "Läuft über mehrere Tage", rail: true, rank: 1 };
    if (isRunningNow(i)) return { key: "running", label: "Läuft gerade", rank: 0 };
    const bucket = dayBucket(i.ev.startAt, now, false);
    if (bucket === "today") return { key: "today", label: "Heute", rank: 3 };
    if (bucket === "week") return { key: "week", label: "Diese Woche", rank: 4 };
    const p = getBerlinDateParts(i.ev.startAt);
    const label = MONTH_FORMATTER.format(i.ev.startAt);
    return { key: `${p.year}-${p.month}`, label: label.charAt(0).toUpperCase() + label.slice(1), rank: 5 + p.year * 12 + p.month };
  };
  const moreInGroup = new Map<string, number>();
  for (const item of visibleUpcoming) {
    const g = groupOf(item);
    let group = groups.find(x => x.key === g.key);
    if (!group) { group = { ...g, items: [] }; groups.push(group); }
    const sid = item.ev.seriesId;
    if (sid && !isUserRegistered(item.ev, userId) && group.items.some(x => x.ev.seriesId === sid)) {
      const k = `${g.key}:${sid}`;
      moreInGroup.set(k, (moreInGroup.get(k) ?? 0) + 1);
      continue;
    }
    group.items.push(item);
  }
  groups.sort((a, b) => a.rank - b.rank);
  // (10) Gäste: je Gruppe, wie viele Events erst nach dem Login zu sehen sind
  const guestHiddenByGroup = new Map<string, number>();
  if (!userId) for (const item of upcomingItems.slice(visibleUpcoming.length)) {
    const k = groupOf(item).key;
    guestHiddenByGroup.set(k, (guestHiddenByGroup.get(k) ?? 0) + 1);
  }
  const hasLive = groups.some(g => g.key === "running");
  // Ausgeblendete Termine trotzdem im Wochen-Streifen zählen (Tag-Filter zeigt dann die Reihen-Karte)
  const dayKeyOf = (d: Date) => { const p = getBerlinDateParts(d); return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`; };

  // ── Spiel-Chips: die häufigsten Spiele unter den anstehenden Events ──
  const gameCounts = new Map<string, { label: string; n: number }>();
  for (const i of visibleUpcoming) {
    if (!i.ev.game) continue;
    const key = gameNameKey(i.ev.game);
    if (!key) continue;
    const cur = gameCounts.get(key);
    gameCounts.set(key, { label: cur?.label ?? i.ev.game, n: (cur?.n ?? 0) + 1 });
  }
  const topGames = [...gameCounts.entries()]
    .filter(([, v]) => v.n >= 1)
    .sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label, "de"))
    .slice(0, MAX_GAME_CHIPS);
  const longNames = topGames.filter(([, v]) => v.label.length > 16).map(([key]) => key);
  const aliasRows = longNames.length
    ? await prisma.game.findMany({ where: { nameKey: { in: longNames } }, select: { nameKey: true, aliases: true } })
    : [];
  const shortOf = new Map(aliasRows.map(r => {
    const best = [...r.aliases].filter(a => a.trim().length >= 2).sort((a, b) => a.length - b.length)[0];
    return [r.nameKey, best] as const;
  }));
  const gameChips: EventFilterGame[] = topGames.map(([key, v]) => {
    const short = shortOf.get(key);
    // Ohne Alias: lange Namen kürzen (Untertitel nach ":" oder vorangestellter Herausgeber weg)
    const fallback = v.label.length > 16 ? v.label.replace(/^Tom Clancy's\s+/i, "").replace(/\s*[:–-].*$/, "") : v.label;
    return { key, label: short && short.length < fallback.length ? short : fallback, title: v.label };
  });

  // (9) Wochen-Streifen: die nächsten 7 Tage mit Anzahl der Events (laufende Zeitraum-Events zählen an jedem Tag)
  const dayKeysOf = (i: Item) => {
    const start = i.ev.startAt.getTime();
    const end = i.ev.endAt ? i.ev.endAt.getTime() : start;
    const keys: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(now.getTime() + d * 86_400_000);
      const key = dayKeyOf(dayStart);
      const startKey = dayKeyOf(new Date(start));
      const endKey = dayKeyOf(new Date(Math.max(end, start)));
      if (key >= startKey && key <= endKey) keys.push(key);
    }
    return keys;
  };
  const weekDays: EventFilterDay[] = Array.from({ length: 7 }, (_, d) => {
    const date = new Date(now.getTime() + d * 86_400_000);
    const key = dayKeyOf(date);
    const count = visibleUpcoming.filter(i => !isPeriodEvent(i.ev) && dayKeyOf(i.ev.startAt) === key).length
      + visibleUpcoming.filter(i => isPeriodEvent(i.ev) && dayKeyOf(i.ev.startAt) === key).length;
    const running = visibleUpcoming.filter(i => isPeriodEvent(i.ev) && dayKeyOf(i.ev.startAt) !== key && dayKeysOf(i).includes(key)).length;
    const wd = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: BERLIN_TZ }).format(date).replace(".", "");
    return { key, weekday: d === 0 ? "Heute" : wd, day: getBerlinDateParts(date).day, count, running };
  });

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

  // ── (1) "Für dich": was dich gerade betrifft (Kurzfassung der Karte auf der Detailseite) ──
  const forYouItems: ForYouItem[] = [];
  if (userId) {
    const regItems = visibleUpcoming.filter(i => isUserRegistered(i.ev, userId));
    const regIds = regItems.map(i => i.ev.id);
    const titleOf = new Map(allItems.map(i => [i.ev.id, i.ev.title]));
    const [myRegs, oppReports, openPolls] = await Promise.all([
      regIds.length ? prisma.eventRegistration.findMany({ where: { userId, eventId: { in: regIds } }, select: { eventId: true, checkedInAt: true, role: true } }) : Promise.resolve([]),
      prisma.matchResultSubmission.findMany({
        where: { status: "pending", forUserId: "", userId: { not: userId }, match: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
        select: { eventId: true, user: { select: { username: true, name: true } } },
        take: 3,
      }),
      regIds.length ? prisma.eventPoll.findMany({
        where: { eventId: { in: regIds }, startAt: { lte: now }, endAt: { gt: now } },
        select: { eventId: true, votes: { where: { voterId: userId }, select: { id: true } } },
      }) : Promise.resolve([]),
    ]);
    for (const r of oppReports) {
      const t = titleOf.get(r.eventId);
      if (!t) continue;
      forYouItems.push({ key: `opp-${r.eventId}`, tone: "amber", glyph: "swords", title: `${r.user.username ?? r.user.name ?? "Dein Gegner"} hat ein Ergebnis gemeldet`, text: `${t} · stimmt das?`, href: `/tournament/${r.eventId}#dein-match`, cta: "Prüfen" });
    }
    for (const i of regItems) {
      const reg = myRegs.find(r => r.eventId === i.ev.id);
      if (!reg || reg.role === "spectator" || reg.checkedInAt || !i.ev.checkInEnabled) continue;
      if (now >= checkInOpensAt(i.ev) && now < i.ev.startAt) {
        forYouItems.push({ key: `ready-${i.ev.id}`, tone: "amber", glyph: "clock", title: "Meld dich bereit", text: `${i.ev.title} · startet ${startsInLabel(i.ev.startAt, now) ?? "gleich"}`, href: `/tournament/${i.ev.id}`, cta: "Bin bereit" });
      }
    }
    const unvoted = new Set(openPolls.filter(p => p.votes.length === 0).map(p => p.eventId));
    for (const id of unvoted) {
      forYouItems.push({ key: `vote-${id}`, tone: "violet", glyph: "vote", title: "Deine Stimme fehlt", text: titleOf.get(id) ?? "", href: `/tournament/${id}#abstimmung`, cta: "Abstimmen" });
    }
    const next = regItems.find(i => i.ev.status !== "umfrage" && !isPeriodRunning(i));
    if (next) {
      const live = next.ev.startAt <= now;
      forYouItems.push({
        key: `next-${next.ev.id}`, tone: "teal", glyph: live ? "fire" : "calendar",
        title: live ? `Läuft gerade: ${next.ev.title}` : `Dein nächstes Event: ${next.ev.title}`,
        text: live ? "Du bist dabei" : `startet ${startsInLabel(next.ev.startAt, now) ?? "bald"}${next.ev.game ? ` · ${next.ev.game}` : ""}`,
        href: `/tournament/${next.ev.id}`, cta: "Ansehen",
      });
    }
  }

  // ── (8) Beendet: die letzten Ergebnisse als Karten, der Rest aufklappbar ──
  const finishedCards = recentResults.slice(0, 4);
  const finishedList = [...recentFinishedItems.slice(4), ...visibleFinished];
  const finishedSection = (finishedCards.length > 0 || finishedList.length > 0) ? (
    <section aria-label="Beendet" className="space-y-2">
      <h2 className="flex items-center gap-3 text-base font-extrabold text-fg">
        Beendet <span className="text-xs font-semibold text-subtle">{finishedCards.length + finishedList.length}</span>
        <span className="h-px flex-1 bg-line" />
      </h2>
      {finishedCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {finishedCards.map(r => <RecentResultCard key={r.id} r={r} />)}
        </div>
      )}
      {finishedList.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-fg hover:border-line-strong [&::-webkit-details-marker]:hidden">
            {finishedCards.length > 0 ? "Alle beendeten" : "Beendete Events"} anzeigen
            <span className="text-xs font-semibold text-subtle tabular-nums">{finishedList.length}</span>
            <ChevronDown className="ml-auto size-4 text-subtle transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {finishedList.map(({ ev }) => (
              <li key={`ev-fin-${ev.id}`}>
                <EventCardLink href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`}
                  className="group/row flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-surface-2 transition-colors">
                  <GameCover game={ev.game} coverUrl={ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null} className="w-10 h-7 shrink-0" rounded="rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg group-hover/row:text-primary-fg">
                      {isOmaOriginal(ev) && <OmaTitlePrefix title={ev.title} />}{ev.title}
                    </span>
                    <span className="block truncate text-xs text-subtle">
                      {formatBerlinDate(ev.startAt, { day: "2-digit", month: "short", year: "numeric" })}{ev.series && <> · {ev.series.name}</>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted tabular-nums"><Users className="size-3.5" />{playersOf(ev).length}</span>
                </EventCardLink>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  ) : null;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

      <PageHeader
        title="Events"
        description={openCount === 0
          ? "Turniere, Community-Abende und Reihen"
          : userId
            ? <><span className="font-semibold text-primary-fg">{openCount}</span> offene Events · Turniere, Community-Abende und Reihen</>
            : <>Vorschau: <span className="font-semibold text-primary-fg">{visibleUpcoming.length} von {openCount}</span> offenen Events — alle siehst du nach dem Login</>}
        actions={<>
          <GateLink href="/events/verwalten/neu" className={buttonClasses("primary", "md")}>
            <Plus className="w-4 h-4" /> Neues Event
          </GateLink>
          {isMod && <SyncButton />}
        </>}
      />

      <EventsSectionNav active="events" manageCount={await manageCountPromise} loggedIn={!!userId} />
      <>
      <div className="space-y-5">
        {!hasAnything && (
          <EmptyState
            type="events"
            title="Noch keine Events"
            description="Schau bald wieder vorbei – Events werden hier angekündigt."
          />
        )}

        <ForYouStrip items={forYouItems.slice(0, 4)} />

        {/* Frische Ergebnisse (≤ 3 Tage) oben, sonst steht "Beendet" unten */}
        {recentResults.length > 0 && finishedSection}

        {hasLive && <div className="-mb-2 flex justify-end"><LiveRefresh /></div>}

        {visibleUpcoming.length > 0 && (
          <EventFilterShell games={gameChips} days={weekDays} loggedIn={!!userId}>
            {groups.map(group => {
              const hiddenForGuest = guestHiddenByGroup.get(group.key) ?? 0;
              const renderItem = (item: Item, rail: boolean) => {
                const card = cards.get(item.ev.id)!;
                const actions = <EventCardActions ev={item.ev} card={card} viewer={viewer} userId={userId} />;
                const more = item.ev.seriesId ? (moreCyclesBySeries.get(item.ev.seriesId) ?? 0) + (moreInGroup.get(`${group.key}:${item.ev.seriesId}`) ?? 0) : 0;
                const extra = more > 0 ? (
                  <Link href={`/events/series/${item.ev.seriesId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-fg hover:text-fg">
                    <Repeat className="size-3.5" /> +{more} {more === 1 ? "weiterer Termin" : "weitere Termine"} dieser Reihe
                  </Link>
                ) : undefined;
                return (
                  <div key={item.ev.id} data-ev
                    className={rail ? "w-[85%] shrink-0 snap-start sm:w-[22rem]" : undefined}
                    data-registered={card.isRegistered ? "1" : undefined}
                    data-mine={card.relevance.length > 0 ? "1" : undefined}
                    data-game={item.ev.game ? gameNameKey(item.ev.game) : undefined}
                    data-kind={card.kind}
                    data-days={dayKeysOf(item).join(" ")}
                    data-search={[item.ev.title, item.ev.game, item.ev.series?.name].filter(Boolean).join(" ").toLowerCase()}>
                    {rail ? (
                      <EventCard ev={card} variant="row" actions={actions} extra={extra} />
                    ) : (
                      <>
                        {/* (5) Kacheln oder Liste: beide Varianten, die gewählte zeigt EventFilterShell */}
                        <div className="ev-tile h-full"><ScrollReveal className="h-full"><EventCard ev={card} actions={actions} extra={extra} /></ScrollReveal></div>
                        <div className="ev-row"><EventCard ev={card} variant="row" actions={actions} extra={extra} /></div>
                      </>
                    )}
                  </div>
                );
              };
              return (
                <section key={group.key} data-ev-section aria-label={group.label} className="mb-6 last:mb-0">
                  <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-[4.5rem] z-20 flex items-center gap-3 py-2 -mx-5 px-5 sm:mx-0 sm:px-0 bg-canvas text-base font-extrabold text-fg">
                    {group.key === "running" && <span className="size-2 rounded-full bg-live animate-pulse" aria-hidden />}
                    {group.label}
                    <span className="text-xs font-semibold text-subtle tabular-nums">{group.items.length}</span>
                    <span className="h-px flex-1 bg-line" />
                  </h2>
                  {group.rail ? (
                    // (3) Zeitraum-Events und Abstimmungen: schmale Leiste statt großer Kacheln
                    <div className="mt-2 -mx-5 flex snap-x gap-2 overflow-x-auto scrollbar-none px-5 sm:mx-0 sm:px-0 pb-1">
                      {group.items.map(item => renderItem(item, true))}
                    </div>
                  ) : (
                    <div className="ev-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mt-2">
                      {group.items.map(item => renderItem(item, false))}
                      {/* (10) Gäste: an Ort und Stelle zeigen, dass hier mehr kommt */}
                      {hiddenForGuest > 0 && (
                        <GateLink href="/events" data-ev-placeholder=""
                          className="flex min-h-24 items-center justify-center rounded-card border border-dashed border-line-strong px-4 text-center text-sm font-semibold text-muted hover:border-primary/40 hover:text-fg">
                          +{hiddenForGuest} {hiddenForGuest === 1 ? "weiteres Event" : "weitere Events"} nach dem Login
                        </GateLink>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </EventFilterShell>
        )}
      </div>

      {recentResults.length === 0 && finishedSection}

      {isMod && hiddenEvents.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-warning/30 bg-warning-soft px-4 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
            <EyeOff className="size-4 text-warning" /> Ausgeblendet
            <span className="text-xs font-semibold text-muted tabular-nums">{hiddenEvents.length}</span>
            <span className="text-xs font-normal text-muted">· nur für Mods sichtbar</span>
            <ChevronDown className="ml-auto size-4 text-subtle transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-control border border-line bg-surface">
            {hiddenEvents.map(ev => (
              <li key={`hidden-${ev.id}`}>
                <GateLink href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`}
                  className="group/row flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-surface-2 transition-colors">
                  <GameCover game={ev.game} coverUrl={ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null} className="w-10 h-7 shrink-0" rounded="rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg group-hover/row:text-primary-fg">{ev.title}</span>
                    <span className="block truncate text-xs text-subtle">
                      {formatBerlinDate(ev.startAt, { day: "2-digit", month: "short", year: "numeric" })}{ev.series && <> · {ev.series.name}</>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted tabular-nums"><Users className="size-3.5" />{ev._count.registrations}</span>
                </GateLink>
              </li>
            ))}
          </ul>
        </details>
      )}

      {guestHasMore && <GuestMoreCta message="Alle Events gibt's nach dem Login" />}
      </>
    </div>
  );
}
