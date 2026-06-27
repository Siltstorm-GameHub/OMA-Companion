import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit2, Plus } from "lucide-react";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import { EventCategory } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  open:     "Offen",
  active:   "Aktiv",
  umfrage:  "Umfrage",
  finished: "Beendet",
  closed:   "Geschlossen",
};
const STATUS_STYLES: Record<string, string> = {
  open:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  umfrage:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  finished: "text-gray-500 bg-white/[0.03] border-white/[0.06]",
  closed:   "text-gray-600 bg-white/[0.02] border-white/[0.04]",
};

export default async function AdminEventsPage() {
  await requireRole("moderator");

  const events = await prisma.event.findMany({
    where: { seriesId: null },
    orderBy: [{ status: "asc" }, { startAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      startAt: true,
      game: true,
      format: true,
      category: true,
      completionData: true,
      _count: { select: { registrations: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/events/new"
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Neues Event
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Standalone Events ({events.length})
          </h2>
          <span className="text-[10px] text-gray-600">Events in Reihen → Eventreihen-Tab</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">
            Keine Standalone-Events vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {events.map(ev => {
              const statusStyle = STATUS_STYLES[ev.status] ?? STATUS_STYLES.finished;
              const statusLabel = STATUS_LABELS[ev.status] ?? ev.status;
              const date = new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
              const time = new Date(ev.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
              return (
                <Link
                  key={ev.id}
                  href={`/admin/events/${ev.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                      {ev.category && <EventCategoryBadge category={ev.category as EventCategory} />}
                      {ev.game && (
                        <span className="text-[10px] text-gray-500 border border-white/[0.06] rounded px-1.5 py-0.5 shrink-0">
                          {ev.game}
                        </span>
                      )}
                      {ev.format && (
                        <span className="text-[10px] text-teal-600 border border-teal-800/40 rounded px-1.5 py-0.5 shrink-0">
                          Turnier
                        </span>
                      )}
                      {ev.completionData && (
                        <span className="text-[10px] text-gray-600 border border-white/[0.04] rounded px-1.5 py-0.5 shrink-0">
                          ✓ abgeschlossen
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-500">{date} {time}</span>
                      <span className="text-[11px] text-gray-600">{ev._count.registrations} Teilnehmer</span>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${statusStyle}`}>
                    {statusLabel}
                  </span>
                  <Edit2 className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
