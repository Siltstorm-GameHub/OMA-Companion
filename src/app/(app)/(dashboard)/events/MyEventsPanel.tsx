import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { getCreatorUsage, isAwaitingApproval } from "@/lib/community-events";
import { formatBerlinDate } from "@/lib/time";
import OmaOriginalMark from "@/components/OmaOriginalMark";
import { isOmaOriginalSeries } from "@/lib/oma-original";
import SeriesIcon from "@/components/SeriesIcon";
import { Plus, Settings, Clock, Check, EyeOff } from "@/components/icons";
import EventCard from "@/components/events/EventCard";
import EventCardActions from "@/components/events/EventCardActions";
import { EVENT_CARD_INCLUDE, toEventCardData } from "@/lib/event-card-data";
import { getCommentCounts } from "@/lib/event-comments";
import { loadEventViewerContext } from "@/lib/event-viewer";

const CLOSED = ["finished", "closed"];

function ApprovalPill({ awaiting, community }: { awaiting: boolean; community: boolean }) {
  if (!community) return null;
  return awaiting ? (
    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
      <Clock className="w-2.5 h-2.5" /> Wartet auf Freigabe
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
      <Check className="w-2.5 h-2.5" /> Freigegeben
    </span>
  );
}

/** Tab "Meine Events" auf /events: selbst erstellte Events und Reihen (mit Verwalten-Link),
 *  Limits und die eigenen Anmeldungen. */
export default async function MyEventsPanel({ userId, isModerator = false }: { userId: string; isModerator?: boolean }) {
  const now = new Date();
  const [limits, usage, myEvents, mySeries, registered, viewer] = await Promise.all([
    getCommunityLimits(),
    getCreatorUsage(userId),
    prisma.event.findMany({
      where: { createdById: userId, seriesId: null },
      orderBy: { startAt: "desc" },
      take: 30,
      include: EVENT_CARD_INCLUDE,
    }),
    prisma.eventSeries.findMany({
      where: { createdById: userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true, name: true, icon: true, status: true, hidden: true, approvalStatus: true, seasonNumber: true, omaOriginal: true, fixedGame: true,
        events: {
          where: { status: { notIn: CLOSED }, startAt: { gte: now } },
          orderBy: { startAt: "asc" },
          take: 1,
          select: { startAt: true },
        },
        _count: { select: { events: true } },
      },
    }),
    // Eigene Anmeldungen: alles, was noch nicht beendet ist — auch volle ("closed") Events, für die
    // man ja gerade deshalb einen Platz hat.
    prisma.event.findMany({
      where: {
        status: { not: "finished" }, hidden: false,
        OR: [{ seriesId: null }, { series: { hidden: false } }],
        registrations: { some: { userId } },
      },
      orderBy: { startAt: "asc" },
      take: 20,
      include: EVENT_CARD_INCLUDE,
    }),
    loadEventViewerContext(userId),
  ]);

  const openEvents = myEvents.filter(e => !CLOSED.includes(e.status));
  // Absprachen-Zähler für alle Kacheln dieses Panels (eine Abfrage)
  const commentCounts = await getCommentCounts(
    userId,
    [...new Set([...registered, ...myEvents].map(e => e.id))],
    new Set(registered.map(e => e.id)),
  );
  const pastEvents = myEvents.filter(e => CLOSED.includes(e.status));
  // Mods/Admins: keine Mengenlimits (der Server prüft sie ebenfalls nur für normale User)
  const canCreateEvent = isModerator || usage.openEvents < limits.maxOpenEvents;
  const canCreateSeries = isModerator || usage.activeSeries < limits.maxActiveSeries;

  const sectionTitle = (label: string) => (
    <div className="flex items-center gap-3 pb-1">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
  const rowCls = "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02]";
  const manageCls = "flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg transition-colors shrink-0";

  return (
    <div className="space-y-6">
      {/* ── Erstellen + Limits ── */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-white">Eigene Events veranstalten</p>
          {isModerator ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Offene Einzel-Events: <span className="text-gray-300 tabular-nums">{usage.openEvents}</span>
              {" · "}Aktive Reihen: <span className="text-gray-300 tabular-nums">{usage.activeSeries}</span>
              {" · "}<span className="text-teal-300/80">als Mod/Admin ohne Limit</span>
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-0.5">
                Offene Einzel-Events: <span className="text-gray-300 tabular-nums">{usage.openEvents} / {limits.maxOpenEvents}</span>
                {" · "}Aktive Reihen: <span className="text-gray-300 tabular-nums">{usage.activeSeries} / {limits.maxActiveSeries}</span>
              </p>
              <p className="text-[11px] text-gray-600 mt-1">
                Sofort in der App sichtbar. Discord-Ankündigung und Push gibt es nach der Freigabe durch einen Mod.
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreateEvent ? (
            <Link href="/admin/events/new?mode=event"
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neues Event
            </Link>
          ) : (
            <span className="text-xs text-gray-500">Limit offener Events erreicht</span>
          )}
          {canCreateSeries && (
            <Link href="/admin/events/new?mode=series"
              className="flex items-center gap-1.5 text-sm font-medium text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors px-3 py-1.5 rounded-lg">
              <Plus className="w-4 h-4" /> Neue Eventreihe
            </Link>
          )}
        </div>
      </div>

      {/* ── Eigene Anmeldungen — dieselben Kacheln wie auf der Events-Seite ── */}
      {registered.length > 0 && (
        <div className="space-y-2">
          {sectionTitle("Angemeldet")}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {registered.map(e => {
              const card = toEventCardData(e, viewer, userId, now);
              card.comments = commentCounts.get(e.id) ?? null;
              const asSpectator = e.registrations.find(r => r.userId === userId)?.role === "spectator";
              return (
                <EventCard key={e.id} ev={card}
                  extra={asSpectator ? <span className="text-[11px] text-gray-400">Als Zuschauer angemeldet</span> : undefined}
                  actions={<EventCardActions ev={e} card={card} viewer={viewer} userId={userId} />} />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Eigene Reihen ── */}
      {mySeries.length > 0 && (
        <div className="space-y-1.5">
          {sectionTitle("Deine Eventreihen")}
          {mySeries.map(s => (
            <div key={s.id} className={`${rowCls} ${s.status === "archived" ? "opacity-60" : ""}`}>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 shrink-0">
                <SeriesIcon name={s.icon} className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href={`/events/series/${s.id}`} className="text-sm text-gray-200 font-medium truncate block hover:text-white">
                    {s.name}{s.seasonNumber ? ` · Saison ${s.seasonNumber}` : ""}
                  </Link>
                  {isOmaOriginalSeries(s) && <OmaOriginalMark />}
                </div>
                <p className="text-[11px] text-gray-500">
                  {s._count.events} Termine
                  {s.status === "archived" ? " · abgeschlossen" : s.events[0] ? ` · nächster: ${formatBerlinDate(s.events[0].startAt, { day: "2-digit", month: "short" })}` : ""}
                  {s.hidden && " · ausgeblendet"}
                </p>
              </div>
              {s.status === "active" && <ApprovalPill community={!!s.approvalStatus} awaiting={s.approvalStatus === "pending"} />}
              <Link href={`/admin/series/${s.id}`} className={manageCls}>
                <Settings className="w-3.5 h-3.5" /> Verwalten
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Eigene Einzel-Events (Zeilen-Kacheln mit Verwalten) ── */}
      <div className="space-y-1.5">
        {sectionTitle("Deine Events")}
        {openEvents.length === 0 && pastEvents.length === 0 && (
          <p className="text-sm text-gray-500 px-1">Du hast noch kein eigenes Event erstellt.</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {[...openEvents, ...pastEvents].map(e => {
            const closed = CLOSED.includes(e.status);
            const card = toEventCardData(e, viewer, userId, now);
            card.comments = commentCounts.get(e.id) ?? null;
            card.communityBy = null; // das bist du selbst
            return (
              <EventCard key={e.id} ev={card} variant="row"
                extra={(e.hidden || (!closed && e.approvalStatus)) ? (
                  <>
                    {!closed && <ApprovalPill community={!!e.approvalStatus} awaiting={isAwaitingApproval(e)} />}
                    {e.hidden && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                        <EyeOff className="w-2.5 h-2.5" /> Ausgeblendet
                      </span>
                    )}
                  </>
                ) : undefined}
                actions={
                  <Link href={`/admin/events/${e.id}`} className={manageCls}>
                    <Settings className="w-3.5 h-3.5" /> Verwalten
                  </Link>
                } />
            );
          })}
        </div>
      </div>
    </div>
  );
}
