import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarRange, ChevronRight, CalendarDays, Repeat } from "lucide-react";
import SeriesCreateInline from "./SeriesCreateInline";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:     { label: "Offen",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  active:   { label: "Aktiv",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  umfrage:  { label: "Umfrage",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  finished: { label: "Beendet", color: "text-gray-500 bg-white/[0.03] border-white/[0.06]" },
};

export default async function AdminSeriesPage() {
  await requireRole("moderator");

  const allSeries = await prisma.eventSeries.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: true } },
      events: {
        where: { startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        take: 1,
        select: { startAt: true, status: true },
      },
    },
  });

  return (
    <div className="space-y-4">
      <SeriesCreateInline />

      {allSeries.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
          Noch keine Eventreihen vorhanden.
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-gray-900/50">
        {allSeries.map((series, i) => {
          const nextEvent = series.events[0];
          const nextStatus = nextEvent ? STATUS_LABELS[nextEvent.status] : null;

          return (
            <Link
              key={series.id}
              href={`/admin/series/${series.id}`}
              className={`flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.03] transition-colors ${
                i > 0 ? "border-t border-white/[0.05]" : ""
              }`}
            >
              <Repeat className="w-4 h-4 text-teal-400 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm truncate">{series.name}</span>
                  {series.fixedGame && (
                    <span className="text-[10px] text-gray-500 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                      {series.fixedGame}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {series._count.events} {series._count.events === 1 ? "Event" : "Events"}
                  </span>
                  {nextEvent ? (
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      Nächstes: {formatDate(nextEvent.startAt)}
                      {nextStatus && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${nextStatus.color}`}>
                          {nextStatus.label}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-700">Kein kommendes Event</span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
