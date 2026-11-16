import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCreatorUsage } from "@/lib/community-events";
import { ChevronRight, Settings } from "@/components/icons";
import EventCard from "@/components/events/EventCard";
import EventCardActions from "@/components/events/EventCardActions";
import { EVENT_CARD_INCLUDE, toEventCardData } from "@/lib/event-card-data";
import { getCommentCounts } from "@/lib/event-comments";
import { loadEventViewerContext } from "@/lib/event-viewer";

/**
 * Reiter "Meine Events" auf /events: die eigenen Anmeldungen (Sicht als Spieler). Selbst
 * veranstaltete Events und Reihen verwaltest du im Reiter "Verwalten" (/events/verwalten) —
 * hier steht nur ein Hinweis mit deinem Stand.
 */
export default async function MyEventsPanel({ userId }: { userId: string; isModerator?: boolean }) {
  const now = new Date();
  const [usage, registered, viewer] = await Promise.all([
    getCreatorUsage(userId),
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

  const commentCounts = await getCommentCounts(userId, registered.map(e => e.id), new Set(registered.map(e => e.id)));
  const hosting = usage.openEvents + usage.activeSeries;

  return (
    <div className="space-y-5">
      {/* ── Anmeldungen ── */}
      {registered.length > 0 ? (
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
      ) : (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400">Du bist gerade für kein Event angemeldet.</p>
          <Link href="/events" className="mt-1 inline-block text-xs text-teal-400 hover:text-teal-300">Events ansehen →</Link>
        </div>
      )}

      {/* ── Hinweis: eigene Events verwalten ── */}
      <Link href="/events/verwalten"
        className="group glass rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors">
        <Settings className="w-4 h-4 text-teal-400 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-white">Eigene Events veranstalten</span>
          <span className="block text-xs text-gray-500 truncate">
            {hosting > 0
              ? `Du veranstaltest ${usage.openEvents} ${usage.openEvents === 1 ? "Event" : "Events"} und ${usage.activeSeries} ${usage.activeSeries === 1 ? "Eventreihe" : "Eventreihen"}`
              : "Leg ein Event oder eine Eventreihe für die Community an"}
          </span>
        </span>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-teal-300 shrink-0">Verwalten <ChevronRight className="w-3.5 h-3.5" /></span>
      </Link>
    </div>
  );
}
