"use client";
import { useState } from "react";
import Link from "next/link";
import EventGoalPanel, { goalSummary } from "../../[id]/EventGoalPanel";
import { supportsCommunityGoal } from "@/lib/community-goal";
import { resolveEventGoal } from "@/lib/event-goal";
import { parseGoalState } from "@/lib/goal-state";
import { formatBerlinDate } from "@/lib/time";
import { ChevronDown, ChevronRight } from "@/components/icons";

export type CycleEvent = {
  id: string;
  title: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  status: string;
  format?: string | null;
  statConfigJson?: string | null;
  goalStateJson?: string | null;
};

const SOURCE_LABEL = { event: "eigenes Ziel", series: "Ziel der Reihe", off: "kein Ziel", none: "kein Ziel" } as const;

/**
 * Community-Ziel je Zyklus (Termin) einer Eventreihe auf einen Blick: welches Ziel gilt (geerbt,
 * eigenes oder keins) und wie es ausgegangen ist. Jeder Zyklus lässt sich direkt hier anpassen —
 * gespeichert wird wie im Termin selbst über EventGoalPanel (PATCH /api/events/[id]/goal).
 */
export default function SeriesCycleGoals({ events, tournamentTemplateJson, statFields, disabled }: {
  events: CycleEvent[];
  /** Turniervorlage der Reihe (enthält das Reihen-Ziel) — gespeicherter Stand, nicht der ungespeicherte Formularstand */
  tournamentTemplateJson: string | null;
  statFields: string[];
  disabled?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  // Zeitpunkt einmal beim ersten Rendern festhalten (Render muss rein bleiben)
  const [now] = useState(() => Date.now());

  const cycles = events
    .filter(e => supportsCommunityGoal(e.format))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  if (cycles.length === 0) return null;

  const isPast = (e: CycleEvent) =>
    e.status === "finished" || e.status === "closed" || (!!e.endAt && new Date(e.endAt).getTime() <= now);
  const past = cycles.filter(isPast);
  const current = cycles.filter(e => !isPast(e));
  const shown = showPast ? [...past, ...current] : current;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Jeder Zyklus übernimmt das Ziel der Reihe. Für einzelne Zyklen kannst du hier ein eigenes Ziel setzen
        (z. B. diese Woche „Ø mind. 2 Kills“, nächste Woche „5.000 Tore zusammen“) oder es abschalten.
      </p>
      {shown.length === 0 && (
        <p className="text-xs text-gray-600">Keine laufenden oder kommenden Zyklen — lege unten den nächsten Termin an.</p>
      )}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] divide-y divide-white/[0.05]">
        {shown.map(ev => {
          const resolved = resolveEventGoal({ format: ev.format, statConfigJson: ev.statConfigJson, series: { tournamentTemplateJson } });
          const state = parseGoalState(ev.goalStateJson);
          const ended = isPast(ev);
          const reached = state.milestones.includes(100);
          const open = openId === ev.id;
          const running = !ended && new Date(ev.startAt).getTime() <= now;
          return (
            <div key={ev.id} className={ended ? "opacity-70" : ""}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {ev.title}
                    <span className="text-gray-500 font-normal">
                      {" · "}{formatBerlinDate(ev.startAt, { day: "numeric", month: "numeric" })}
                      {ev.endAt && <>–{formatBerlinDate(ev.endAt, { day: "numeric", month: "numeric" })}</>}
                    </span>
                    {running && <span className="ml-2 text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded px-1.5 py-0.5">läuft</span>}
                  </p>
                  <p className="text-xs truncate">
                    <span className={resolved.goal ? "text-teal-300/90" : "text-gray-600"}>
                      🎯 {resolved.goal ? goalSummary(resolved.goal) : "Kein Ziel"}
                    </span>
                    <span className="text-gray-600"> · {SOURCE_LABEL[resolved.source]}</span>
                    {ended && resolved.goal && (
                      <span className={reached ? "text-amber-300" : "text-gray-500"}>
                        {" · "}{reached ? "🏆 erreicht" : state.settledAt || ev.status === "finished" ? "verfehlt" : "wird abgerechnet"}
                      </span>
                    )}
                  </p>
                </div>
                <Link href={`/tournament/${ev.id}`} className="text-[11px] text-gray-500 hover:text-white shrink-0" title="Turnierseite öffnen">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                {!disabled && !ended && (
                  <button type="button" onClick={() => setOpenId(open ? null : ev.id)}
                    className="flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-white border border-teal-600/40 hover:bg-teal-600 rounded-lg px-2.5 py-1 transition-colors shrink-0">
                    Ziel anpassen <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {open && (
                <div className="px-3 pb-3">
                  <EventGoalPanel eventId={ev.id} source={resolved.source} ownGoal={resolved.ownGoal}
                    seriesGoal={resolved.seriesGoal} statFields={statFields} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {past.length > 0 && (
        <button type="button" onClick={() => setShowPast(v => !v)} className="text-[11px] text-gray-500 hover:text-gray-300">
          {showPast ? "Vergangene Zyklen ausblenden" : `${past.length} vergangene Zyklen anzeigen`}
        </button>
      )}
    </div>
  );
}
