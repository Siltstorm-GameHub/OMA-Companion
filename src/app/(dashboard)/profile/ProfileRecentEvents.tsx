import Link from "next/link";

/**
 * "Letzte Events"-Liste — extrahiert aus `page.tsx`, damit sie sowohl von der
 * Desktop-Ansicht als auch vom mobilen "Einstellungen"-Reiter
 * (`ProfileMobileView.tsx`, siehe Teil B des Umbau-Plans) genutzt werden
 * kann, ohne das Markup zu duplizieren. Reines Refactoring — keine visuelle
 * Änderung gegenüber dem vorherigen Inline-Code.
 */
export interface ProfileRecentEventEntry {
  id:    string;
  event: {
    id:               string;
    title:            string;
    startAt:          Date | string;
    game:             string | null;
    finalRankingJson: string | null;
  };
}

interface Props {
  eventRegs: ProfileRecentEventEntry[];
  userId:    string;
}

export default function ProfileRecentEvents({ eventRegs, userId }: Props) {
  if (eventRegs.length === 0) return null;

  return (
    <section>
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">📅 Letzte Events</h2>
      <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {eventRegs.map(reg => {
          let placement: number | null = null;
          try {
            const ranking: string[] = JSON.parse(reg.event.finalRankingJson ?? "[]");
            const idx = ranking.indexOf(userId);
            if (idx !== -1) placement = idx + 1;
          } catch { /* ignore */ }
          return (
            <Link key={reg.id} href={`/tournament/${reg.event.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">{reg.event.title}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {new Date(reg.event.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                  {reg.event.game ? ` · ${reg.event.game}` : ""}
                </p>
              </div>
              {placement !== null && (
                <span className={`ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums ${
                  placement === 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  placement === 2 ? "bg-gray-400/10 text-gray-300 border-gray-400/20" :
                  placement === 3 ? "bg-orange-700/10 text-orange-400 border-orange-700/20" :
                                    "bg-white/[0.04] text-gray-500 border-white/[0.06]"
                }`}>#{placement}</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
