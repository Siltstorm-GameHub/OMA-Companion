import Link from "next/link";
import { CalendarDays } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import { placementOf } from "@/lib/event-display";

/**
 * "Letzte Events": eine Liste mit Platzierung (ersetzt die getrennten "Turnier-Ergebnisse").
 * Platz 1–3 farbig, sonst "#4", ohne Endplatzierung "dabei", anstehend "angemeldet".
 */
export interface ProfileRecentEventEntry {
  id: string;
  role?: string;
  event: {
    id: string;
    title: string;
    startAt: Date | string;
    game: string | null;
    status?: string;
    finalRankingJson: string | null;
  };
}

const PLACE_CLS = [
  "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  "bg-slate-300/10 text-slate-200 border-slate-300/25",
  "bg-orange-500/15 text-orange-300 border-orange-400/30",
];

export default function ProfileRecentEvents({ eventRegs, userId, isOwn }: { eventRegs: ProfileRecentEventEntry[]; userId: string; isOwn: boolean }) {
  return (
    <section aria-label="Letzte Events">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-teal-500/70" /> Letzte Events
        </h2>
        {isOwn && <Link href="/events?tab=mine" className="text-[11px] text-teal-500 hover:text-teal-300">Meine Events →</Link>}
      </div>
      {eventRegs.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-5 text-center">
          <p className="text-sm text-gray-400">{isOwn ? "Du warst noch bei keinem Event dabei." : "Noch bei keinem Event dabei."}</p>
          {isOwn && <Link href="/events" className="mt-1 inline-block text-xs text-teal-400 hover:text-teal-300">Zu den Events →</Link>}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-line">
          {eventRegs.map(reg => {
            const place = placementOf(reg.event.finalRankingJson, userId);
            const upcoming = reg.event.status && reg.event.status !== "finished" && reg.event.status !== "umfrage";
            const badge = place
              ? <span className={`shrink-0 min-w-[2.25rem] text-center text-xs font-bold px-1.5 py-0.5 rounded-md border tabular-nums ${PLACE_CLS[place - 1] ?? "bg-line text-gray-300 border-line"}`}>{place}.</span>
              : <span className="shrink-0 min-w-[2.25rem] text-center text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-line text-gray-400">
                  {upcoming ? "bald" : reg.role === "spectator" ? "Zusch." : "dabei"}
                </span>;
            return (
              <Link key={reg.id} href={`/tournament/${reg.event.id}`}
                className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-2 transition-colors group">
                {badge}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">{reg.event.title}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatBerlinDate(reg.event.startAt, { day: "2-digit", month: "short", year: "numeric" })}
                    {reg.event.game ? ` · ${reg.event.game}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
