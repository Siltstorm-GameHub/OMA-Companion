"use client";
import SeriesGoalEditor from "@/components/SeriesGoalEditor";
import { GOAL_FORMATS, supportsCommunityGoal } from "@/lib/community-goal";
import { TOURNAMENT_FORMATS } from "@/lib/tournament-formats";
import SeriesCycleGoals, { type CycleEvent } from "./SeriesCycleGoals";
import { Section } from "./series-shared";
import type { SeriesDetail } from "./useSeriesDetail";

const formatLabel = (f: string) => TOURNAMENT_FORMATS.find(x => x.value === f)?.label ?? f;
const GOAL_FORMAT_NAMES = [...new Set(GOAL_FORMATS.filter(f => f !== "liga").map(formatLabel))].join(", ");

/**
 * Reiter "🎯 Ziel" der Eventreihe: die eine Stelle für Community-Ziele der Reihe — Ziel der Reihe
 * (gespeichert mit "Speichern" oben, wie die übrigen Einstellungen), Abweichungen zurücksetzen und je
 * Zyklus/Termin plus Ziel-Planung (wirken sofort).
 */
export default function SeriesTabGoal({ ctx }: { ctx: SeriesDetail }) {
  const {
    series, isArchived, isTournamentSeries, tournamentTemplate, setTournamentTemplate, fixedFormat, setFixedFormat,
    eventStatFields, upcomingTermineCount, applyingGoal, applyGoalNow, goalLimits,
  } = ctx;
  const capable = fixedFormat ? supportsCommunityGoal(fixedFormat) : isTournamentSeries;

  if (!capable) {
    return (
      <Section title="🎯 Community-Ziel">
        {fixedFormat ? (
          <p className="text-sm text-gray-300">Das Format „{formatLabel(fixedFormat)}“ kennt kein Community-Ziel. Ziele gibt es bei: {GOAL_FORMAT_NAMES}.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              Für ein gemeinsames Ziel werden bei jedem Termin Werte gezählt, z. B. Tore oder Schritte. Schalte dafür die
              Werte-Erfassung ein. Die Felder legst du im Reiter „Stats &amp; Bonus“ fest. Eine Platzierung gibt es weiterhin nicht.
            </p>
            {!isArchived && (
              <button type="button" onClick={() => setFixedFormat("coop_stats")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-primary-hover text-white">
                Werte-Erfassung einschalten
              </button>
            )}
            <p className="text-xs text-gray-500">Danach erscheint hier das Ziel. Gespeichert wird mit „Speichern“ oben.</p>
          </div>
        )}
      </Section>
    );
  }

  return (
    <>
      <Section title="🎯 Ziel der Reihe">
        <SeriesGoalEditor format={fixedFormat || null} value={tournamentTemplate} onChange={setTournamentTemplate}
          statFields={eventStatFields} disabled={isArchived}
          rewardLimit={goalLimits?.coins ?? null} seriesPointsLimit={goalLimits?.seriesPoints ?? null} />
        <p className="text-xs text-primary-fg/80 mt-2">
          Änderst du das Ziel, während ein Termin schon läuft, behalten laufende und vergangene Termine ihr bisheriges Ziel.
          Alle kommenden übernehmen das neue. Gespeichert wird mit „Speichern“ oben.
        </p>
        {!isArchived && upcomingTermineCount > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap pt-3 mt-3 border-t border-line">
            <p className="text-xs text-gray-500 flex-1 min-w-[200px]">
              Einzelne kommende Termine haben ein eigenes Ziel oder keins? Hier setzt du alle {upcomingTermineCount}
              {" "}kommenden Termine auf das Ziel der Reihe zurück. Wirkt sofort.
            </p>
            <button type="button" onClick={applyGoalNow} disabled={applyingGoal}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-line hover:bg-line border border-line-strong text-gray-200 transition-colors disabled:opacity-50">
              {applyingGoal ? "Setzt zurück…" : "Abweichungen zurücksetzen"}
            </button>
          </div>
        )}
      </Section>

      <Section title="Ziel je Termin und Planung">
        <p className="text-xs text-gray-500 mb-2">Änderungen in diesem Abschnitt gelten sofort, ohne „Speichern“.</p>
        <SeriesCycleGoals seriesId={series.id} fixedFormat={fixedFormat || null}
          events={series.events as CycleEvent[]} tournamentTemplateJson={series.tournamentTemplateJson ?? null}
          statFields={eventStatFields} disabled={isArchived} goalLimits={goalLimits} />
      </Section>
    </>
  );
}
