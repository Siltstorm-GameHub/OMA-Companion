"use client";
import { useState } from "react";
import Link from "next/link";
import EventGoalPanel, { goalSummary } from "../../[id]/EventGoalPanel";
import { goalFieldsFor, supportsCommunityGoal } from "@/lib/community-goal";
import { parseTournamentTemplate } from "@/lib/series-seasons";
import GoalPlanEditor from "./GoalPlanEditor";
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
 * gespeichert wird wie im Termin selbst über EventGoalPanel (PATCH /api/events/[id]/goal). Darunter die
 * Ziel-Planung für noch nicht angelegte Zyklen (GoalPlanEditor, lib/goal-plan.ts).
 */
export default function SeriesCycleGoals({ seriesId, fixedFormat, events, tournamentTemplateJson, statFields, disabled, goalLimits = null }: {
  seriesId: string;
  /** Festes Format der Reihe — bestimmt, was geplante Ziele auswerten (Stat-Felder oder Spielergebnis) */
  fixedFormat: string | null;
  events: CycleEvent[];
  /** Turniervorlage der Reihe (enthält das Reihen-Ziel) — gespeicherter Stand, nicht der ungespeicherte Formularstand */
  tournamentTemplateJson: string | null;
  statFields: string[];
  disabled?: boolean;
  /** Mitglieder: Obergrenzen der Ziel-Belohnungen (Anzeige am Feld) */
  goalLimits?: { coins: number; seriesPoints: number } | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  // Zeitpunkt einmal beim ersten Rendern festhalten (Render muss rein bleiben)
  const [now] = useState(() => Date.now());

  const cycles = events
    .filter(e => supportsCommunityGoal(e.format))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const goalPlan = parseTournamentTemplate(tournamentTemplateJson).goalPlan ?? [];
  const planFields = fixedFormat ? goalFieldsFor(fixedFormat, statFields) : statFields;

  const isPast = (e: CycleEvent) =>
    e.status === "finished" || (!!e.endAt && new Date(e.endAt).getTime() <= now);
  const past = cycles.filter(isPast);
  const current = cycles.filter(e => !isPast(e));
  const shown = showPast ? [...past, ...current] : current;

  return (
    <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-xs text-subtle">
        Jeder Zyklus übernimmt das Ziel der Reihe. Für einzelne Zyklen kannst du hier ein eigenes Ziel setzen
        (z. B. diese Woche „Ø mind. 2 Kills“, nächste Woche „5.000 Tore zusammen“) oder es abschalten.
      </p>
      {shown.length === 0 && (
        <p className="text-xs text-subtle">Keine laufenden oder kommenden Zyklen — lege unten den nächsten Termin an.</p>
      )}
      <div className="rounded-control overflow-hidden border border-line divide-y divide-line">
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
                  <p className="text-sm text-fg truncate">
                    {ev.title}
                    <span className="text-subtle font-normal">
                      {" · "}{formatBerlinDate(ev.startAt, { day: "numeric", month: "numeric" })}
                      {ev.endAt && <>–{formatBerlinDate(ev.endAt, { day: "numeric", month: "numeric" })}</>}
                    </span>
                    {running && <span className="ml-2 text-xs text-primary-fg bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">läuft</span>}
                  </p>
                  <p className="text-xs truncate">
                    <span className={resolved.goal ? "text-primary-fg/90" : "text-subtle"}>
                      🎯 {resolved.goal ? goalSummary(resolved.goal) : "Kein Ziel"}
                    </span>
                    <span className="text-subtle"> · {SOURCE_LABEL[resolved.source]}</span>
                    {ended && resolved.goal && (
                      <span className={reached ? "text-amber-300" : "text-subtle"}>
                        {" · "}{reached ? "🏆 erreicht" : state.settledAt || ev.status === "finished" ? "verfehlt" : "wird abgerechnet"}
                        {reached && (state.streak ?? 0) >= 2 && ` · 🔥 ${state.streak}× in Folge`}
                      </span>
                    )}
                  </p>
                </div>
                <Link href={`/tournament/${ev.id}`} className="text-xs text-subtle hover:text-fg shrink-0" title="Turnierseite öffnen">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                {!disabled && !ended && (
                  <button type="button" onClick={() => setOpenId(open ? null : ev.id)}
                    className="flex items-center gap-1 text-xs font-medium text-primary-fg hover:text-fg border border-primary/40 hover:bg-primary-hover rounded-control px-2.5 py-1 transition-colors shrink-0 max-lg:min-h-10">
                    Ziel anpassen <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {open && (
                <div className="px-3 pb-3">
                  <EventGoalPanel goalLimits={goalLimits} eventId={ev.id} source={resolved.source} ownGoal={resolved.ownGoal}
                    seriesGoal={resolved.seriesGoal} statFields={goalFieldsFor(ev.format, statFields)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {past.length > 0 && (
        <button type="button" onClick={() => setShowPast(v => !v)} className="text-xs text-subtle hover:text-fg/90">
          {showPast ? "Vergangene Zyklen ausblenden" : `${past.length} vergangene Zyklen anzeigen`}
        </button>
      )}
    </div>

    <div className="space-y-2 pt-4 border-t border-line">
      <p className="text-sm font-semibold text-fg">🗓️ Ziele im Voraus planen</p>
      <GoalPlanEditor goalLimits={goalLimits} key={JSON.stringify(goalPlan)} seriesId={seriesId} initialPlan={goalPlan} goalFields={planFields} disabled={disabled} />
    </div>
    </div>
  );
}
