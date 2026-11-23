import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCreatorUsage } from "@/lib/community-events";
import { ChevronRight } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Glyph } from "@/components/ui/Glyph";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buttonClasses } from "@/components/ui/button-styles";
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
      <section aria-label="Deine Anmeldungen">
        <SectionHeader title={<>Deine Anmeldungen{registered.length > 0 && <span className="rounded-full bg-surface-3 px-2 text-xs font-bold leading-5 tabular-nums text-muted">{registered.length}</span>}</>} />
        {registered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {registered.map(e => {
              const card = toEventCardData(e, viewer, userId, now);
              card.comments = commentCounts.get(e.id) ?? null;
              const asSpectator = e.registrations.find(r => r.userId === userId)?.role === "spectator";
              return (
                <EventCard key={e.id} ev={card}
                  extra={asSpectator ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Glyph name="eye" className="size-3.5" /> Als Zuschauer angemeldet</span> : undefined}
                  actions={<EventCardActions ev={e} card={card} viewer={viewer} userId={userId} />} />
              );
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-control bg-primary-soft text-primary-fg"><Glyph name="calendar" className="size-5" /></span>
            <div>
              <p className="text-base font-extrabold text-fg">Du bist gerade für kein Event angemeldet</p>
              <p className="mt-1 text-sm text-muted">Such dir eins aus — Anmelden geht direkt auf der Karte.</p>
            </div>
            <Link href="/events" className={buttonClasses("primary", "md")}>Events ansehen</Link>
          </Card>
        )}
      </section>

      {/* ── Hinweis: eigene Events verwalten ── */}
      <Link href="/events/verwalten" className="block">
        <Card interactive className="group flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-primary-fg"><Glyph name="megaphone" className="size-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-fg">Eigene Events veranstalten</span>
            <span className="block text-xs text-subtle truncate">
              {hosting > 0
                ? `Du veranstaltest ${usage.openEvents} ${usage.openEvents === 1 ? "Event" : "Events"} und ${usage.activeSeries} ${usage.activeSeries === 1 ? "Eventreihe" : "Eventreihen"}`
                : "Leg ein Event oder eine Eventreihe für die Community an"}
            </span>
          </span>
          <span className="flex items-center gap-0.5 text-sm font-semibold text-primary-fg shrink-0 group-hover:text-fg">Verwalten <ChevronRight className="size-4" /></span>
        </Card>
      </Link>
    </div>
  );
}
