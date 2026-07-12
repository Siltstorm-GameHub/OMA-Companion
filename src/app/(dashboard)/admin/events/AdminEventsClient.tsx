"use client";
import { useState } from "react";
import Link from "next/link";
import { Edit2, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import { EventCategory } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

type Event = {
  id: string;
  title: string;
  status: string;
  startAt: Date;
  game: string | null;
  format: string | null;
  category: string | null;
  completionData: boolean | string | number | null | object;
  hidden: boolean;
  _count: { registrations: number };
};

type Series = {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
  recurrenceType: string | null;
  hidden: boolean;
  _count: { events: number };
  events: Event[];
};

function HiddenToggle({ id, type, hidden }: { id: string; type: "event" | "series"; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const url  = type === "event" ? "/api/admin/events" : "/api/admin/event-series";
    const body = type === "event"
      ? { eventId: id, hidden: !hidden }
      : { seriesId: id, hidden: !hidden };
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) {
      toast.success(hidden ? "Wieder sichtbar" : "Ausgeblendet");
      router.refresh();
    } else {
      toast.error("Fehler");
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={hidden ? "Einblenden (für alle sichtbar machen)" : "Ausblenden (nur im Admin sichtbar)"}
      className={`shrink-0 p-1.5 rounded transition-colors disabled:opacity-40 ${
        hidden
          ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]"
      }`}
    >
      {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    </button>
  );
}

function EventRow({ ev }: { ev: Event }) {
  const statusStyle = STATUS_STYLES[ev.status] ?? STATUS_STYLES.finished;
  const statusLabel = STATUS_LABELS[ev.status] ?? ev.status;
  const date = new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = new Date(ev.startAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return (
    <Link
      href={`/admin/events/${ev.id}`}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors group ${ev.hidden ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{ev.title}</span>
          {ev.hidden && (
            <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" /> ausgeblendet
            </span>
          )}
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
      <HiddenToggle id={ev.id} type="event" hidden={ev.hidden} />
      <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${statusStyle}`}>
        {statusLabel}
      </span>
      <Edit2 className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
    </Link>
  );
}

function SeriesRow({ s }: { s: Series }) {
  const upcomingCount = s.events.length;
  const seriesColor = resolveSeriesColor(s.icon);
  return (
    <Link
      href={`/admin/series/${s.id}`}
      className={`relative flex items-center gap-3 pl-5 pr-4 py-3 border-t border-white/[0.04] first:border-t-0 hover:bg-white/[0.02] transition-colors ${s.hidden ? "opacity-60" : ""}`}
    >
      <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: seriesColor }} />
      <SeriesIcon name={s.icon} className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: seriesColor }}>{s.name}</span>
          {s.hidden && (
            <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" /> ausgeblendet
            </span>
          )}
          {s.category && <EventCategoryBadge category={s.category as EventCategory} />}
          {s.recurrenceType && (
            <span className="text-[10px] text-violet-500 border border-violet-800/40 rounded px-1.5 py-0.5 shrink-0">
              {s.recurrenceType === "weekly" ? "wöchentlich" : s.recurrenceType === "biweekly" ? "2-wöchentl." : s.recurrenceType === "monthly" ? "monatlich" : s.recurrenceType}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-600 mt-0.5">
          {s._count.events} Events gesamt · {upcomingCount} kommend{upcomingCount !== 1 ? "e" : ""}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
    </Link>
  );
}

export default function AdminEventsClient({
  standaloneEvents,
  allSeries,
  pastEvents,
}: {
  standaloneEvents: Event[];
  allSeries: Series[];
  pastEvents: Event[];
}) {
  const [pastOpen, setPastOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Standalone Events */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05]">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Standalone Events ({standaloneEvents.length})
          </h2>
        </div>
        {standaloneEvents.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">Keine aktiven Standalone-Events.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {standaloneEvents.map(ev => <EventRow key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>

      {/* Eventreihen */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Eventreihen ({allSeries.length})
          </h2>
          <Link href="/admin/events/new?mode=series"
            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
            + Neue Reihe
          </Link>
        </div>
        {allSeries.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">Keine Eventreihen vorhanden.</div>
        ) : (
          <div>
            {allSeries.map(s => <SeriesRow key={s.id} s={s} />)}
          </div>
        )}
      </div>

      {/* Vergangene Events */}
      {pastEvents.length > 0 && (
        <div className="rounded-xl border border-white/[0.04] overflow-hidden opacity-70">
          <button
            type="button"
            onClick={() => setPastOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
          >
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Vergangene Events ({pastEvents.length})
            </h2>
            {pastOpen ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
          </button>
          {pastOpen && (
            <div className="divide-y divide-white/[0.03]">
              {pastEvents.map(ev => <EventRow key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
